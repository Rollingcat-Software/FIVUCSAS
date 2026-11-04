import json
import unittest

from fivucsas_deployer.github import GitHubClient, GitHubError, RateLimited

RUNS = {"workflow_runs": [{"head_sha": "a" * 40, "head_branch": "main", "event": "push",
                           "status": "completed", "conclusion": "success",
                           "created_at": "2026-11-02T11:00:00Z",
                           "head_commit": {"timestamp": "2026-11-02T10:59:00Z", "message": "x"},
                           "head_repository": {"full_name": "org/repo", "id": 1},
                           "html_url": "ignored"}]}


class FakeFetch:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, url, headers):
        self.calls.append((url, dict(headers)))
        return self.responses.pop(0)


def ok(body, etag='"e1"', remaining="50"):
    return 200, {"etag": etag, "x-ratelimit-remaining": remaining,
                 "x-ratelimit-reset": "9999999999"}, json.dumps(body).encode()


class GitHubClientTest(unittest.TestCase):
    def test_successfulPushRuns_WhenCalled_ShouldFilterServerSideToGreenPushesOnBranch(self):
        fetch = FakeFetch([ok(RUNS)])
        runs, cached = GitHubClient("https://api", "org", fetch).successful_push_runs(
            "repo", "ci.yml", "main", {})
        url = fetch.calls[0][0]
        self.assertIn("/repos/org/repo/actions/workflows/ci.yml/runs?", url)
        for part in ("branch=main", "event=push", "status=success"):
            self.assertIn(part, url)
        self.assertFalse(cached)
        self.assertEqual(runs[0]["head_sha"], "a" * 40)
        self.assertNotIn("html_url", runs[0])
        # Kept so decision.green_shas can reject runs whose head is a fork.
        self.assertEqual(runs[0]["head_repository"], {"full_name": "org/repo"})

    def test_successfulPushRuns_WhenEtagCached_ShouldSendConditionalRequestAndReuseBodyOn304(self):
        fetch = FakeFetch([ok(RUNS), (304, {"x-ratelimit-remaining": "50"}, b"")])
        client = GitHubClient("https://api", "org", fetch)
        cache = {}
        client.successful_push_runs("repo", "ci.yml", "main", cache)
        runs, cached = client.successful_push_runs("repo", "ci.yml", "main", cache)
        self.assertEqual(fetch.calls[1][1].get("If-None-Match"), '"e1"')
        self.assertTrue(cached)
        self.assertEqual(runs[0]["head_sha"], "a" * 40)

    def test_get_WhenRateLimitExhausted_ShouldRaiseRateLimited(self):
        fetch = FakeFetch([(403, {"x-ratelimit-remaining": "0", "x-ratelimit-reset": "1"}, b"{}")])
        with self.assertRaises(RateLimited):
            GitHubClient("https://api", "org", fetch).compare_status("repo", "a", "b")

    def test_get_WhenBudgetLow_ShouldStopCallingUntilReset(self):
        fetch = FakeFetch([ok({"status": "ahead"}, remaining="2")])
        client = GitHubClient("https://api", "org", fetch, clock=lambda: 1000.0)
        self.assertEqual(client.compare_status("repo", "a", "b"), "ahead")
        with self.assertRaises(RateLimited):
            client.compare_status("repo", "a", "b")
        self.assertEqual(len(fetch.calls), 1)

    def test_get_WhenServerError_ShouldRaiseGitHubError(self):
        fetch = FakeFetch([(502, {}, b"")])
        with self.assertRaises(GitHubError):
            GitHubClient("https://api", "org", fetch).compare_status("repo", "a", "b")


if __name__ == "__main__":
    unittest.main()
