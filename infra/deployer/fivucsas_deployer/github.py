"""Unauthenticated GitHub REST client with ETag caching.

Budget: unauthenticated calls get 60 requests per hour per IP, and a 304 to a
conditional request still counts when there is no token (measured on
mordecai 2026-11-04). The deployer therefore asks the API only when
``git ls-remote`` shows the branch moved, or with backoff while the tip is
not green yet (see decision.should_query). A quiet repository costs no API
calls; ETags are kept because they are free to send and make 304s cheap.
"""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Callable, Dict, List, Optional, Tuple

log = logging.getLogger("deployer")

USER_AGENT = "fivucsas-pull-deployer"
MIN_REMAINING = 6  # leave headroom for other users of the same IP

Fetch = Callable[[str, Dict[str, str]], Tuple[int, Dict[str, str], bytes]]


def _urllib_fetch(url: str, headers: Dict[str, str]) -> Tuple[int, Dict[str, str], bytes]:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, {k.lower(): v for k, v in resp.headers.items()}, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, {k.lower(): v for k, v in (exc.headers or {}).items()}, exc.read() or b""


class RateLimited(RuntimeError):
    pass


class GitHubError(RuntimeError):
    pass


class GitHubClient:
    def __init__(
        self,
        api_base: str,
        owner: str,
        fetch: Fetch = _urllib_fetch,
        clock: Callable[[], float] = time.time,
    ):
        self.api_base = api_base.rstrip("/")
        self.owner = owner
        self._fetch = fetch
        self._clock = clock
        self._blocked_until = 0.0

    def _get(self, url: str, cache: Optional[Dict[str, Any]] = None) -> Tuple[Any, bool]:
        """GET JSON. Returns (body, from_cache). ``cache`` holds 'etag' and 'body'."""
        if self._clock() < self._blocked_until:
            raise RateLimited(f"rate limited until {int(self._blocked_until)}")
        headers = {"Accept": "application/vnd.github+json", "User-Agent": USER_AGENT,
                   "X-GitHub-Api-Version": "2022-11-28"}
        if cache and cache.get("etag") and "body" in cache:
            headers["If-None-Match"] = cache["etag"]
        status, resp_headers, raw = self._fetch(url, headers)
        self._note_rate_limit(resp_headers)
        if status == 304 and cache is not None and "body" in cache:
            return cache["body"], True
        if status in (403, 429) and resp_headers.get("x-ratelimit-remaining") == "0":
            raise RateLimited(f"GitHub rate limit exhausted ({status})")
        if status != 200:
            raise GitHubError(f"GET {url} -> HTTP {status}")
        body = json.loads(raw.decode("utf-8"))
        if cache is not None:
            etag = resp_headers.get("etag")
            if etag:
                cache["etag"] = etag
                cache["body"] = body
        return body, False

    def _note_rate_limit(self, headers: Dict[str, str]) -> None:
        remaining = headers.get("x-ratelimit-remaining")
        reset = headers.get("x-ratelimit-reset")
        if remaining is None or reset is None:
            return
        try:
            if int(remaining) < MIN_REMAINING:
                self._blocked_until = float(reset)
                log.warning("GitHub API budget low (%s left); pausing API calls until %s",
                            remaining, reset)
        except ValueError:
            pass

    def successful_push_runs(self, repo: str, workflow: str, branch: str,
                             cache: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], bool]:
        query = urllib.parse.urlencode(
            {"branch": branch, "event": "push", "status": "success", "per_page": 20})
        url = f"{self.api_base}/repos/{self.owner}/{repo}/actions/workflows/{workflow}/runs?{query}"
        body, cached = self._get(url, cache)
        runs = [
            {
                "head_sha": r.get("head_sha"),
                "head_branch": r.get("head_branch"),
                "event": r.get("event"),
                "status": r.get("status"),
                "conclusion": r.get("conclusion"),
                "created_at": r.get("created_at"),
                "head_repository": {
                    "full_name": (r.get("head_repository") or {}).get("full_name")},
            }
            for r in body.get("workflow_runs", [])
        ]
        if cache.get("body") is body:
            # Keep only the fields the decision needs so the state file stays small.
            cache["body"] = {"workflow_runs": runs}
        return runs, cached

    def compare_status(self, repo: str, base: str, head: str) -> str:
        url = f"{self.api_base}/repos/{self.owner}/{repo}/compare/{base}...{head}?per_page=1"
        body, _ = self._get(url)
        return str(body.get("status", ""))
