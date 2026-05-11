#!/usr/bin/env bash
#
# sync-assets.sh — Stage freshly-built verify-app assets into html/ before
# building the docker image.
#
# Background:
#   The parent .gitignore excludes verify-widget/html/assets/*.{js,css} so
#   generated bundles never pollute git history. The Dockerfile's
#   `COPY html/ /usr/share/nginx/html/` therefore needs the build pipeline
#   to populate that directory immediately before `docker compose build`
#   runs — otherwise the image ships with an empty assets/ folder and the
#   browser fetches /assets/*.js as 404.
#
# Run order (from feedback_widget_deploy_sync memory rule):
#   1. npm run build:verify        (web-app repo)
#   2. ./sync-assets.sh            (this script)
#   3. docker compose build verify-widget
#
# Usage:
#   cd verify-widget && ./sync-assets.sh
#
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_APP_DIST="${SCRIPT_DIR}/../web-app/dist-verify"
WIDGET_HTML="${SCRIPT_DIR}/html"

if [ ! -d "${WEB_APP_DIST}/assets" ]; then
  echo "ERROR: ${WEB_APP_DIST}/assets does not exist." >&2
  echo "Run 'npm run build:verify' in web-app first." >&2
  exit 1
fi

mkdir -p "${WIDGET_HTML}/assets"

rsync -a --delete \
  "${WEB_APP_DIST}/assets/" \
  "${WIDGET_HTML}/assets/"

if [ -f "${WEB_APP_DIST}/index.html" ]; then
  cp "${WEB_APP_DIST}/index.html" "${WIDGET_HTML}/index.html"
fi

echo "Assets synced: $(ls -1 "${WIDGET_HTML}/assets" | wc -l) files staged."
