#!/usr/bin/env bash
#
# Dry-run: compare local contents/*.md paths vs Wiki.js pages (GraphQL).
# Read-only. Does not create/update/delete pages.
#
# Usage (prefer token file — avoids secrets in shell history):
#   From repo root: ./scripts/wikijs-dry-run-compare.sh
#   From backend/:   ./wikijs-dry-run-compare.sh   (wrapper in backend/)
#   Put the API key on the first line of backend/.wikijs.token (gitignored), or run in
#   a normal terminal: you will be prompted for the token (input hidden) if missing.
#   WIKIJS_URL in backend/.env is enough for the base URL.
#
# Optional env:
#   WIKIJS_TOKEN_FILE — path to file whose first line is the token (default: backend/.wikijs.token or backend/wikijs.token)
#   WIKIJS_NO_PROMPT=1 — do not prompt for token on stdin (for CI / non-interactive)
#   CONTENTS_ROOT — default: <repo>/contents
#   LOCALE        — default: en (Wiki.js locale code)
#   WIKIJS_PATH_PREFIX — strip this leading segment from remote paths (e.g. "en")
#   WIKIJS_PREPEND_CONTENTS — if "1", prefix remote paths with "contents/" when they lack it
#
# You may put WIKIJS_URL (and optionally WIKIJS_TOKEN) in backend/.env (not committed).
# Avoid: export WIKIJS_TOKEN='eyJ...' on the command line — it is saved in shell history.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTENTS_ROOT="${CONTENTS_ROOT:-$ROOT_DIR/contents}"
LOCALE="${LOCALE:-en}"
WIKIJS_PATH_PREFIX="${WIKIJS_PATH_PREFIX:-}"
WIKIJS_PREPEND_CONTENTS="${WIKIJS_PREPEND_CONTENTS:-}"

# shellcheck disable=SC1090
source "$ROOT_DIR/scripts/wikijs-load-credentials.sh"

# Align URL trim if credentials left edge spaces (redundant; loader already trims)
WIKIJS_URL="${WIKIJS_URL%"${WIKIJS_URL##*[![:space:]]*}"}"
WIKIJS_URL="${WIKIJS_URL#"${WIKIJS_URL%%[![:space:]]*}"}"

if [[ ! -d "$CONTENTS_ROOT" ]]; then
  echo "ERROR: CONTENTS_ROOT not found: $CONTENTS_ROOT"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

export CONTENTS_ROOT LOCALE WIKIJS_PATH_PREFIX WIKIJS_PREPEND_CONTENTS WIKIJS_URL WIKIJS_TOKEN

LOCAL_PATHS_FILE="$TMP_DIR/local_paths.txt"
REMOTE_PATHS_FILE="$TMP_DIR/remote_paths.txt"

python3 - <<'PY' > "$LOCAL_PATHS_FILE"
import os
from pathlib import Path

contents_root = Path(os.environ["CONTENTS_ROOT"]).resolve()
out = []
for p in contents_root.rglob("*.md"):
    rel = p.relative_to(contents_root).as_posix()
    if not rel.lower().endswith(".md"):
        continue
    wiki_path = "contents/" + rel[:-3]
    out.append(wiki_path)

for x in sorted(set(out)):
    print(x)
PY

python3 - <<'PY' > "$REMOTE_PATHS_FILE"
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

base = os.environ["WIKIJS_URL"].rstrip("/")
url = base + "/graphql"
token = os.environ["WIKIJS_TOKEN"]
locale = os.environ.get("LOCALE", "en")
prefix = os.environ.get("WIKIJS_PATH_PREFIX", "").strip().strip("/")
prepend = os.environ.get("WIKIJS_PREPEND_CONTENTS", "").strip() == "1"

queries = [
    (
        """
query Pages($locale: String!, $limit: Int!) {
  pages {
    list(locale: $locale, limit: $limit, orderBy: PATH) {
      path
    }
  }
}
""",
        {"locale": locale, "limit": 10000},
    ),
    (
        """
query Pages($limit: Int!) {
  pages {
    list(limit: $limit, orderBy: PATH) {
      path
    }
  }
}
""",
        {"limit": 10000},
    ),
    (
        """
query Pages {
  pages {
    list {
      path
    }
  }
}
""",
        None,
    ),
]

def post(body: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


last_err = None
data = None
for q, variables in queries:
    body = {"query": q.strip()}
    if variables is not None:
        body["variables"] = variables
    try:
        data = post(body)
    except urllib.error.HTTPError as e:
        last_err = (e.code, e.read().decode("utf-8", errors="replace"))
        continue
    except urllib.error.URLError as e:
        last_err = (None, str(e))
        continue
    errs = data.get("errors")
    if errs:
        last_err = ("graphql", json.dumps(errs, indent=2))
        continue
    pages = data.get("data", {}).get("pages", {}).get("list")
    if pages is None:
        last_err = ("graphql", "missing data.pages.list")
        continue
    break
else:
    print("ERROR: Could not list Wiki.js pages.", file=sys.stderr)
    if last_err:
        code, msg = last_err
        print(code, msg, sep="\n", file=sys.stderr)
    sys.exit(1)

pages = data["data"]["pages"]["list"]
out = []
for row in pages:
    p = (row.get("path") or "").strip().lstrip("/")
    if not p:
        continue
    if prefix and (p == prefix or p.startswith(prefix + "/")):
        p = p[len(prefix) + 1 :] if p.startswith(prefix + "/") else ""
    if prepend and p and not p.startswith("contents/"):
        p = "contents/" + p
    if not p:
        continue
    out.append(p)

for x in sorted(set(out)):
    print(x)
PY

sort -u "$LOCAL_PATHS_FILE" -o "$LOCAL_PATHS_FILE"
sort -u "$REMOTE_PATHS_FILE" -o "$REMOTE_PATHS_FILE"

echo "=== Only in local repo (missing in Wiki.js) ==="
comm -23 "$LOCAL_PATHS_FILE" "$REMOTE_PATHS_FILE" || true
echo ""
echo "=== Only in Wiki.js (extra vs local repo) ==="
comm -13 "$LOCAL_PATHS_FILE" "$REMOTE_PATHS_FILE" || true
echo ""
echo "=== Counts ==="
echo "local .md paths: $(wc -l < "$LOCAL_PATHS_FILE" | tr -d ' ')"
echo "wiki.js paths:   $(wc -l < "$REMOTE_PATHS_FILE" | tr -d ' ')"
