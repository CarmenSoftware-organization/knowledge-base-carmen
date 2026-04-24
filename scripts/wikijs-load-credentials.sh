# shellcheck shell=bash
# Source only (do not execute):  source /path/to/repo/scripts/wikijs-load-credentials.sh
# Optional env: WIKIJS_NO_PROMPT, WIKIJS_TOKEN_FILE, LOCALE, WIKIJS_PATH_PREFIX, WIKIJS_PREPEND_CONTENTS
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "ERROR: source this file instead of running it, e.g.  source $0" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${LOCALE:=en}"
: "${WIKIJS_PATH_PREFIX:=}"
: "${WIKIJS_PREPEND_CONTENTS:=}"

# Load backend/.env. Turn off nounset for source() — some .env lines can reference unset vars; with -u the
# whole source fails and nothing (including WIKIJS_URL at the end of the file) gets set.
if [[ -f "$ROOT_DIR/backend/.env" ]]; then
  # shellcheck disable=SC1090
  set -a
  set +u
  source "$ROOT_DIR/backend/.env" 2>/dev/null || true
  set -u
  set +a
fi

WIKIJS_URL="${WIKIJS_URL:-}"
WIKIJS_TOKEN="${WIKIJS_TOKEN:-}"

# If still empty, read WIKIJS_* from backend/.env without full shell eval.
_wiki_env="$ROOT_DIR/backend/.env"
_read_kv_from_env_file() {
  local _key="$1" _f="$2" _line
  while IFS= read -r _line || [[ -n "$_line" ]]; do
    [[ "$_line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$_line" =~ ^[[:space:]]*${_key}[[:space:]]*=(.*)$ ]]; then
      _line="${BASH_REMATCH[1]}"
      _line="${_line%$'\r'}"
      if [[ "$_line" == \"*\" ]]; then _line="${_line#\"}"; _line="${_line%\"}"; fi
      if [[ "$_line" == \'*\' ]]; then _line="${_line#\'}"; _line="${_line%\'}"; fi
      printf '%s' "$_line"
      return 0
    fi
  done < "$_f"
  return 1
}
# Python: BOM + optional spaces before/after =
_read_wikijs_from_dotenv_py() {
  local _f="$1"
  WIKI_ENV_PATH="$_f" python3 - <<'PY' || true
import os, re, sys

def get(path: str, key: str) -> str:
    k = re.escape(key)
    pat = re.compile(r"^\s*" + k + r"\s*=\s*(.*)$")
    with open(path, "r", encoding="utf-8-sig", errors="replace") as f:
        for line in f:
            s = line.rstrip("\r\n").strip()
            if not s or s.lstrip().startswith("#"):
                continue
            m = pat.match(s)
            if m:
                v = m.group(1).strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1]
                return v
    return ""

path = os.environ["WIKI_ENV_PATH"]
u = get(path, "WIKIJS_URL")
t = get(path, "WIKIJS_TOKEN")
sys.stdout.write(u + "\n" + t)
PY
}
if [[ -f "$_wiki_env" ]]; then
  if [[ -z "$WIKIJS_URL" ]]; then
    WIKIJS_URL="$(_read_kv_from_env_file WIKIJS_URL "$_wiki_env" 2>/dev/null)" || true
  fi
  if [[ -z "$WIKIJS_TOKEN" ]]; then
    WIKIJS_TOKEN="$(_read_kv_from_env_file WIKIJS_TOKEN "$_wiki_env" 2>/dev/null)" || true
  fi
  if [[ -z "$WIKIJS_URL" || -z "$WIKIJS_TOKEN" ]]; then
    _pout="$(_read_wikijs_from_dotenv_py "$_wiki_env")" || true
    if [[ -n "$_pout" ]]; then
      _u=$(printf '%s' "$_pout" | sed -n '1p')
      _t=$(printf '%s' "$_pout" | sed -n '2p')
      if [[ -z "$WIKIJS_URL" ]]; then
        WIKIJS_URL="$_u"
      fi
      if [[ -z "$WIKIJS_TOKEN" ]]; then
        WIKIJS_TOKEN="$_t"
      fi
    fi
  fi
fi
WIKIJS_URL="${WIKIJS_URL%"${WIKIJS_URL##*[![:space:]]*}"}"
WIKIJS_URL="${WIKIJS_URL#"${WIKIJS_URL%%[![:space:]]*}"}"

_default_token_file="$ROOT_DIR/backend/.wikijs.token"
_alt_token_file="$ROOT_DIR/backend/wikijs.token"
_token_file="${WIKIJS_TOKEN_FILE:-}"

if [[ -z "$WIKIJS_TOKEN" ]]; then
  if [[ -n "$_token_file" ]]; then
    if [[ ! -f "$_token_file" ]]; then
      echo "ERROR: WIKIJS_TOKEN_FILE not found: $_token_file" >&2
      return 1
    fi
    IFS= read -r WIKIJS_TOKEN < "$_token_file" || true
  elif [[ -f "$_default_token_file" ]]; then
    IFS= read -r WIKIJS_TOKEN < "$_default_token_file" || true
  elif [[ -f "$_alt_token_file" ]]; then
    IFS= read -r WIKIJS_TOKEN < "$_alt_token_file" || true
  fi
fi
WIKIJS_TOKEN="${WIKIJS_TOKEN//$'\r'/}"
WIKIJS_TOKEN="${WIKIJS_TOKEN#"${WIKIJS_TOKEN%%[![:space:]]*}"}"
WIKIJS_TOKEN="${WIKIJS_TOKEN%"${WIKIJS_TOKEN##*[![:space:]]}"}"

if [[ -z "$WIKIJS_TOKEN" && -t 0 && -z "${WIKIJS_NO_PROMPT:-}" ]]; then
  read -r -s -p "Wiki.js API token (Admin → API Access; hidden): " WIKIJS_TOKEN
  echo
  WIKIJS_TOKEN="${WIKIJS_TOKEN//$'\r'/}"
  WIKIJS_TOKEN="${WIKIJS_TOKEN#"${WIKIJS_TOKEN%%[![:space:]]*}"}"
  WIKIJS_TOKEN="${WIKIJS_TOKEN%"${WIKIJS_TOKEN##*[![:space:]]}"}"
fi

if [[ -z "$WIKIJS_URL" || -z "$WIKIJS_TOKEN" ]]; then
  echo "ERROR: Wiki.js credentials incomplete." >&2
  if [[ -z "$WIKIJS_URL" ]]; then
    echo "  Missing WIKIJS_URL — add to backend/.env, e.g. WIKIJS_URL=http://dev.example.com:3985" >&2
    if [[ ! -f "$ROOT_DIR/backend/.env" ]]; then
      echo "  (No file: $ROOT_DIR/backend/.env)" >&2
    else
      _g=$(grep -E -c '^[[:space:]]*WIKIJS_URL[[:space:]]*=' "$ROOT_DIR/backend/.env" 2>/dev/null) || _g=0
      if [[ "$_g" -eq 0 ]]; then
        echo "  (backend/.env has no WIKIJS_URL= line — add and save.)" >&2
      fi
    fi
  fi
  if [[ -z "$WIKIJS_TOKEN" ]]; then
    echo "  Missing WIKIJS_TOKEN: backend/.wikijs.token, or WIKIJS_TOKEN= in .env, or run in a TTY to be prompted." >&2
  fi
  echo "  See: ./scripts/wikijs-dry-run-compare.sh or ./scripts/wikijs-import-contents.sh" >&2
  return 1
fi

export WIKIJS_URL WIKIJS_TOKEN LOCALE WIKIJS_PATH_PREFIX WIKIJS_PREPEND_CONTENTS
export ROOT_DIR
