#!/usr/bin/env bash
#
# drift-check.sh — detect production-vs-git drift across FIVUCSAS surfaces.
#
# Catches the recurring pattern where a fix is shipped straight to production
# (scp'd to Hostinger, or a Docker image built from an unmerged branch) but
# never reconciled back to git. READ-ONLY: it only fetches, curls and diffs.
#
# What it checks:
#   1. STATIC      Every deploy-as-is static file (bys-demo, links-website,
#                  landing-website/public) diffed LIVE vs <ref>.
#   2. SUBMODULES  Each submodule checkout: on its default branch? ahead of
#                  origin (unmerged)? dirty? — catches "verify/dashboard built
#                  from an unmerged web-app branch".
#   3. DOCKER      docs / verify container image age vs their source commits
#                  (heuristic — content-verify before acting; TZ-safe epochs).
#
# Compares against origin/master by default (NOT the working tree), so it is
# correct even while the parent repo sits on a feature branch.
# Built apps (dashboard, landing React root, amispoof) ship as hashed bundles,
# so source-vs-live diffing is not meaningful and is intentionally out of scope.
#
# Usage:
#   scripts/drift-check.sh                 # full check
#   scripts/drift-check.sh --static        # only Hostinger static files
#   scripts/drift-check.sh --submodules    # only submodule branch hygiene
#   scripts/drift-check.sh --docker        # only docs/verify image age
#   scripts/drift-check.sh --no-fetch -q   # skip git fetch, summary only
#
# Env:  DRIFT_REF=<ref>  (default origin/master)   DRIFT_ROOT=<repo path>
# Exit: 0 = clean · 1 = drift found · 2 = a check could not run
#
set -uo pipefail

REF="${DRIFT_REF:-origin/master}"
HTTP_TIMEOUT=20
FETCH=1 QUIET=0
DO_STATIC=1 DO_SUB=1 DO_DOCKER=1
DRIFT=0 ERRS=0 WARN=0

# ── args ──────────────────────────────────────────────────────────────────
SEL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --static)     SEL="$SEL static" ;;
    --submodules) SEL="$SEL sub" ;;
    --docker)     SEL="$SEL docker" ;;
    --no-fetch)   FETCH=0 ;;
    -q|--quiet)   QUIET=1 ;;
    -h|--help)    sed -n '2,/^set -uo/p' "$0" | sed 's/^# \{0,1\}//; $d'; exit 0 ;;
    *) echo "drift-check: unknown arg '$1' (try --help)" >&2; exit 2 ;;
  esac
  shift
done
if [ -n "$SEL" ]; then
  DO_STATIC=0; DO_SUB=0; DO_DOCKER=0
  for s in $SEL; do case "$s" in static) DO_STATIC=1;; sub) DO_SUB=1;; docker) DO_DOCKER=1;; esac; done
fi

# ── repo root ─────────────────────────────────────────────────────────────
ROOT="${DRIFT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)}"
if [ -z "${ROOT:-}" ] || [ ! -d "$ROOT/.git" -a ! -f "$ROOT/.git" ]; then
  echo "drift-check: cannot locate repo root (set DRIFT_ROOT)" >&2; exit 2
fi

# ── colours ───────────────────────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; C=$'\e[36m'; B=$'\e[1m'; N=$'\e[0m'
else R=; G=; Y=; C=; B=; N=; fi
ok()   { [ "$QUIET" = 1 ] || printf '  %sOK%s   %s\n'   "$G" "$N" "$1"; }
bad()  { printf '  %sDRIFT%s %s\n' "$R" "$N" "$1"; DRIFT=$((DRIFT+1)); }
warn() { printf '  %sWARN%s  %s\n'  "$Y" "$N" "$1"; WARN=$((WARN+1)); }
err()  { printf '  %s????%s  %s\n'  "$Y" "$N" "$1"; ERRS=$((ERRS+1)); }
hdr()  { printf '\n%s== %s ==%s\n' "$B" "$1" "$N"; }
fmt()  { date -u -d "@$1" '+%Y-%m-%d %H:%M UTC' 2>/dev/null || echo "$1"; }

g() { git -C "$ROOT" "$@"; }

printf '%sdrift-check%s  ref=%s  root=%s\n' "$B" "$N" "$C$REF$N" "$ROOT"
if [ "$FETCH" = 1 ]; then g fetch origin --quiet 2>/dev/null || warn "parent fetch failed (using cached refs)"; fi
g rev-parse --verify "$REF" >/dev/null 2>&1 || { echo "drift-check: ref '$REF' not found" >&2; exit 2; }

# ── 1. STATIC ─────────────────────────────────────────────────────────────
if [ "$DO_STATIC" = 1 ]; then
  hdr "STATIC FILES (live vs $REF)"
  # "<repo-subdir>|<live-base-url>"
  SITES=(
    "bys-demo|https://demo.fivucsas.com"
    "links-website|https://links.fivucsas.com"
    "landing-website/public|https://fivucsas.com"
  )
  INCLUDE_RE='\.(html|css|js|mjs|txt|xml|json|webmanifest|svg|asc)$'
  # skip: poster pipeline binaries, Apache config (not HTTP-served), and the
  # qr-links.* QR source images (kept in-repo, never linked/deployed).
  EXCLUDE_RE='(^|/)poster/files/|(^|/)\.htaccess$|(^|/)qr-links\.'
  tmpL=$(mktemp); tmpM=$(mktemp); trap 'rm -f "$tmpL" "$tmpM"' EXIT
  for entry in "${SITES[@]}"; do
    sub="${entry%%|*}"; base="${entry##*|}"
    printf '%s%s/  →  %s%s\n' "$C" "$sub" "$base" "$N"
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      echo "$f" | grep -Eq "$INCLUDE_RE" || continue
      echo "$f" | grep -Eq "$EXCLUDE_RE" && continue
      rel="${f#"$sub"/}"; url="$base/$rel"
      code=$(curl -s -o "$tmpL" -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
                  -w '%{http_code}' --max-time "$HTTP_TIMEOUT" "$url" 2>/dev/null)
      if [ "$code" != 200 ]; then err "$rel — live HTTP $code"; continue; fi
      if ! g show "$REF:$f" > "$tmpM" 2>/dev/null; then err "$rel — missing in $REF"; continue; fi
      if cmp -s "$tmpL" "$tmpM"; then ok "$rel"
      else
        if LC_ALL=C grep -Iq . "$tmpM" 2>/dev/null; then
          n=$(diff "$tmpL" "$tmpM" 2>/dev/null | grep -cE '^[<>]')
          bad "$rel — $n line(s) differ (live ahead of/behind $REF)"
        else bad "$rel — binary differs"; fi
      fi
    done < <(g ls-tree -r --name-only "$REF" "$sub" 2>/dev/null)
  done
fi

# ── 2. SUBMODULES ─────────────────────────────────────────────────────────
if [ "$DO_SUB" = 1 ]; then
  hdr "SUBMODULE BRANCH HYGIENE"
  if [ -f "$ROOT/.gitmodules" ]; then
    while IFS= read -r s; do
      [ -z "$s" ] && continue
      sd="$ROOT/$s"
      if [ ! -e "$sd/.git" ]; then err "$s — not initialized"; continue; fi
      [ "$FETCH" = 1 ] && git -C "$sd" fetch origin --quiet 2>/dev/null
      def=$(git -C "$sd" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
      def="${def:-main}"
      br=$(git -C "$sd" rev-parse --abbrev-ref HEAD 2>/dev/null)
      ahead=$(git -C "$sd" rev-list --count "origin/$def..HEAD" 2>/dev/null || echo 0)
      behind=$(git -C "$sd" rev-list --count "HEAD..origin/$def" 2>/dev/null || echo 0)
      dirty=$(git -C "$sd" status --porcelain 2>/dev/null | head -1)
      # Advisory (WARN): a submodule carrying unmerged commits or local edits is
      # the signature of "deployed but not reconciled" — but it is not proof of a
      # live divergence, so it never hard-fails (that is reserved for STATIC).
      issues=""
      [ "${ahead:-0}" -gt 0 ] 2>/dev/null && issues="$issues; $ahead commit(s) ahead of origin/$def (unmerged — deployed-but-not-merged risk)"
      [ -n "$dirty" ]                     && issues="$issues; dirty working tree"
      if [ -n "$issues" ]; then warn "$s — on '$br'${issues}"
      else
        note=""; [ "$br" != "$def" ] && note=" (on '$br' but == origin/$def)"
        [ "${behind:-0}" -gt 0 ] 2>/dev/null && note="$note (behind origin/$def by $behind — pull)"
        ok "$s — clean$note"
      fi
    done < <(git config -f "$ROOT/.gitmodules" --get-regexp '\.path$' 2>/dev/null | awk '{print $2}')
  else warn "no .gitmodules at root"; fi
fi

# ── 3. DOCKER (heuristic) ─────────────────────────────────────────────────
if [ "$DO_DOCKER" = 1 ]; then
  hdr "DOCKER IMAGE AGE (heuristic — content-verify before acting)"
  if command -v docker >/dev/null 2>&1; then
    img_epoch() { # <container-name> -> epoch of its image Created
      local cid img created
      cid=$(docker ps --filter "name=$1" --format '{{.ID}}' 2>/dev/null | head -1); [ -z "$cid" ] && return 1
      img=$(docker inspect -f '{{.Image}}' "$cid" 2>/dev/null); [ -z "$img" ] && return 1
      created=$(docker image inspect -f '{{.Created}}' "$img" 2>/dev/null); [ -z "$created" ] && return 1
      date -d "$created" +%s 2>/dev/null
    }
    src_epoch() { g log -1 --format=%ct "$REF" -- "$@" 2>/dev/null; }   # %ct = committer UNIX ts (UTC)
    cmp_age() { # <label> <image-epoch> <source-epoch>
      local label="$1" ie="$2" se="$3"
      if [ -z "$ie" ]; then err "$label — container not running"; return; fi
      if [ -z "$se" ]; then err "$label — no source commit found"; return; fi
      if [ "$se" -gt "$ie" ]; then warn "$label — source newer than image ($(fmt "$se") > built $(fmt "$ie")) → rebuild or content-verify"
      else ok "$label — image ($(fmt "$ie")) newer than its source"; fi
    }
    cmp_age "docs"   "$(img_epoch fivucsas-docs)"          "$(src_epoch docs-site/book docs-site/nginx.conf docs-site/Dockerfile)"
    vse_widget=$(src_epoch verify-widget)
    vse_webapp=$(git -C "$ROOT/web-app" log -1 --format=%ct origin/main 2>/dev/null)
    vse=$vse_widget; [ -n "$vse_webapp" ] && { [ -z "$vse" ] || [ "$vse_webapp" -gt "$vse" ]; } && vse=$vse_webapp
    cmp_age "verify" "$(img_epoch fivucsas-verify-widget)" "$vse"
  else warn "docker not available here — skipping image-age check"; fi
fi

# ── summary ───────────────────────────────────────────────────────────────
printf '\n%s── summary ──%s  ' "$B" "$N"
if [ "$DRIFT" -gt 0 ]; then printf '%s%d drift%s' "$R" "$DRIFT" "$N"; else printf '%sno drift%s' "$G" "$N"; fi
[ "$WARN" -gt 0 ] && printf '  ·  %s%d warn%s' "$Y" "$WARN" "$N"
[ "$ERRS" -gt 0 ] && printf '  ·  %s%d unchecked%s' "$Y" "$ERRS" "$N"
printf '\n'
[ "$DRIFT" -gt 0 ] && exit 1
exit 0
