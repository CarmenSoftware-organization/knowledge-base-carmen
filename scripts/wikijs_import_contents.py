#!/usr/bin/env python3
"""
Import local contents/**/*.md into Wiki.js (GraphQL: create or update by path).

Canonical page path (same as wikijs-dry-run-compare.sh): contents/<rel-without-.md>

Env (required):
  WIKIJS_URL, WIKIJS_TOKEN
Optional:
  LOCALE (default en), WIKIJS_PATH_PREFIX (e.g. en), CONTENTS_ROOT, WIKIJS_PREPEND_CONTENTS=1
Paths: Wiki.js error 6005 disallows spaces and many special chars. This script maps each path
  segment to a URL-safe slug (spaces to hyphens, no dots in segments, non-Latin to hashed id).
  Dry-run shows "local -> safe" when they differ.
Args:
  --dry-run     print actions only
  --limit N     process at most N files (after sort)
"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import re
import socket
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path


def post_graphql(url: str, token: str, body: dict) -> dict:
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
    max_attempts = 4
    for attempt in range(1, max_attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            try:
                return json.loads(err_body)
            except json.JSONDecodeError:
                return {
                    "errors": [
                        {
                            "message": f"HTTP {e.code}: {err_body[:2000]}",
                        }
                    ]
                }
        except (socket.timeout, TimeoutError, urllib.error.URLError, http.client.RemoteDisconnected) as e:
            if attempt == max_attempts:
                return {
                    "errors": [
                        {
                            "message": f"Network timeout after {max_attempts} attempts: {e}",
                        }
                    ]
                }
            time.sleep(0.5 * (2 ** (attempt - 1)))
    return {"errors": [{"message": "Network request failed"}]}


def normalize_remote_path(
    p: str, prefix: str, prepend_contents: bool
) -> str:
    p = (p or "").strip().lstrip("/")
    if not p:
        return ""
    if prefix and (p == prefix or p.startswith(prefix + "/")):
        p = p[len(prefix) + 1 :] if p.startswith(prefix + "/") else ""
    if prepend_contents and p and not p.startswith("contents/"):
        p = "contents/" + p
    return p


def try_list_pages(
    base: str, token: str, locale: str
) -> list[dict] | None:
    url = base.rstrip("/") + "/graphql"
    queries: list[tuple[str, dict | None]] = [
        (
            """
query PagesList($locale: String!, $limit: Int!) {
  pages { list(locale: $locale, limit: $limit, orderBy: PATH) { id path } }
}
""",
            {"locale": locale, "limit": 10000},
        ),
        (
            """
query PagesList($limit: Int!) {
  pages { list(limit: $limit, orderBy: PATH) { id path } }
}
""",
            {"limit": 10000},
        ),
        (
            """
query PagesList { pages { list { id path } } }
""",
            None,
        ),
    ]
    last_err = None
    for q, variables in queries:
        body: dict = {"query": q.strip()}
        if variables is not None:
            body["variables"] = variables
        try:
            data = post_graphql(url, token, body)
        except urllib.error.HTTPError as e:
            last_err = (e.code, e.read().decode("utf-8", errors="replace"))
            continue
        except urllib.error.URLError as e:
            last_err = (None, str(e))
            continue
        if data.get("errors"):
            last_err = ("graphql", data["errors"])
            continue
        pages = data.get("data", {}).get("pages", {}).get("list")
        if pages is None:
            last_err = "missing list"
            continue
        return pages
    if last_err:
        print("ERROR: could not list pages:", last_err, file=sys.stderr)
    return None


def build_path_index(
    pages: list[dict], prefix: str, prepend: bool
) -> dict[str, int]:
    """Map canonical path -> page id."""
    m: dict[str, int] = {}
    for row in pages:
        raw = (row.get("path") or "").strip()
        pid = row.get("id")
        if pid is None:
            continue
        key = normalize_remote_path(raw, prefix, prepend)
        if key:
            m[key] = int(pid)
    return augment_path_index(m)


# Wiki.js reserves some single-segment paths; `import` etc. as a lone segment breaks create.
_RESERVED_SEG = frozenset(
    {
        "graphql",
        "import",
        "export",
        "class",
        "new",
        "return",
        "void",
        "const",
        "var",
        "let",
        "static",
        "default",
        "api",
        "favicon",
        "healthz",
        "register",
        "home",
        "logout",
    }
)


def _wiki_safe_segment(seg: str) -> str:
    s = (seg or "").strip()
    if not s:
        return "p"
    s = re.sub(r"\s+", "-", s)
    for ch in ' "\'’‘"「」«»!?:#@$%^&*+=[]{}|\\,;<>/()':
        s = s.replace(ch, "-")
    s = s.replace("–", "-").replace("—", "-").replace("…", "-")
    s = s.replace(".", "-")
    t = (
        unicodedata.normalize("NFKD", s)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    # Allow "_" (e.g. training_center); Wiki.js allows it. Spaces and most punctuation are stripped.
    t = re.sub(r"[^a-zA-Z0-9_\-]+", "-", t)
    t = re.sub(r"-+", "-", t).strip("-")
    if not t:
        t = "p-" + hashlib.md5(seg.encode("utf-8")).hexdigest()[:12]
    elif t in _RESERVED_SEG or len(t) == 1:
        t = t + "-p"
    return t


def wiki_js_safe_path(full_path: str) -> str:
    """
    Map repo page path to Wiki.js-legal path (avoid 6005: illegal path characters).
    Not identical to the file tree under contents/; Carmen backend still reads from disk.
    """
    p = (full_path or "").strip().lstrip("/")
    if not p:
        return ""
    return "/".join(_wiki_safe_segment(s) for s in p.split("/") if s != "")


def augment_path_index(m: dict[str, int]) -> dict[str, int]:
    out = {**m}
    for k, v in m.items():
        s = wiki_js_safe_path(k)
        if s and s not in out:
            out[s] = v
    return out


def lookup_id(by_path: dict[str, int], local_wiki_path: str) -> int | None:
    if local_wiki_path in by_path:
        return by_path[local_wiki_path]
    s = wiki_js_safe_path(local_wiki_path)
    if s in by_path:
        return by_path[s]
    return None


def title_from_markdown(text: str, fallback: str) -> str:
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("# "):
            return s[2:].strip()[:500]
        if s.startswith("#"):
            t = s.lstrip("#").strip()
            if t:
                return t[:500]
    return fallback


def local_md_jobs(contents_root: Path) -> list[tuple[str, Path]]:
    out: list[tuple[str, Path]] = []
    for p in contents_root.rglob("*.md"):
        if not p.is_file():
            continue
        rel = p.relative_to(contents_root).as_posix()
        if not rel.lower().endswith(".md"):
            continue
        wiki_path = "contents/" + rel[:-3]
        out.append((wiki_path, p))
    out.sort(key=lambda x: (x[0].count("/"), x[0]))
    return out


# Wiki.js schema requires create(..., tags: [String]!). Omitted tags can crash the resolver
# ("Cannot read properties of undefined (reading 'map')"). Pass tags: [] always.
MUTATION_CREATE = """
mutation CreatePage(
  $path: String!
  $title: String!
  $content: String!
  $description: String!
  $editor: String!
  $isPublished: Boolean!
  $isPrivate: Boolean!
  $locale: String!
  $tags: [String]!
) {
  pages {
    create(
      path: $path
      title: $title
      content: $content
      description: $description
      editor: $editor
      isPublished: $isPublished
      isPrivate: $isPrivate
      locale: $locale
      tags: $tags
    ) {
      responseResult { succeeded errorCode message slug }
      page { id path }
    }
  }
}
"""

MUTATION_UPDATE = """
mutation UpdatePage(
  $id: Int!
  $path: String!
  $title: String!
  $content: String!
  $description: String!
  $editor: String!
  $isPublished: Boolean!
  $isPrivate: Boolean!
  $locale: String!
  $tags: [String]
) {
  pages {
    update(
      id: $id
      path: $path
      title: $title
      content: $content
      description: $description
      editor: $editor
      isPublished: $isPublished
      isPrivate: $isPrivate
      locale: $locale
      tags: $tags
    ) {
      responseResult { succeeded errorCode message slug }
    }
  }
}
"""


def run_mutation(
    base: str, token: str, name: str, query: str, variables: dict
) -> dict:
    url = base.rstrip("/") + "/graphql"
    body = {"query": query.strip(), "variables": variables}
    data = post_graphql(url, token, body)
    if data.get("errors"):
        return {"errors": data["errors"], "data": data.get("data")}
    return data


def main() -> int:
    ap = argparse.ArgumentParser(description="Import contents/ into Wiki.js")
    ap.add_argument(
        "--dry-run", action="store_true", help="List create/update only"
    )
    ap.add_argument("--limit", type=int, default=0, help="Max files (0=all)")
    ap.add_argument(
        "--contents-root",
        type=Path,
        default=None,
        help="Default: <repo>/contents (from env CONTENTS_ROOT)",
    )
    args = ap.parse_args()

    base = os.environ.get("WIKIJS_URL", "").strip()
    token = os.environ.get("WIKIJS_TOKEN", "").strip()
    if not base or not token:
        print(
            "ERROR: WIKIJS_URL and WIKIJS_TOKEN required (env or backend/.env).",
            file=sys.stderr,
        )
        return 1

    locale = os.environ.get("LOCALE", "en").strip() or "en"
    prefix = os.environ.get("WIKIJS_PATH_PREFIX", "").strip().strip("/")
    prepend = os.environ.get("WIKIJS_PREPEND_CONTENTS", "").strip() == "1"

    root = args.contents_root
    if root is None:
        cr = os.environ.get("CONTENTS_ROOT", "")
        if cr:
            root = Path(cr)
        else:
            root = Path(__file__).resolve().parent.parent / "contents"
    root = root.resolve()
    if not root.is_dir():
        print("ERROR: contents root not found:", root, file=sys.stderr)
        return 1

    pages = try_list_pages(base, token, locale)
    if pages is None:
        return 1
    by_path = build_path_index(pages, prefix, prepend)

    jobs = local_md_jobs(root)
    if args.limit and args.limit > 0:
        jobs = jobs[: args.limit]

    print(
        f"Wiki.js: {len(by_path)} pages indexed, {len(jobs)} local .md to sync (locale={locale})"
    )
    ok = 0
    err = 0
    for wiki_path, fpath in jobs:
        try:
            text = fpath.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            print("READ FAIL", fpath, e, file=sys.stderr)
            err += 1
            continue
        if not text.strip():
            print("SKIP empty", wiki_path, file=sys.stderr)
            err += 1
            continue
        api_path = wiki_js_safe_path(wiki_path)
        page_id = lookup_id(by_path, wiki_path)
        title = title_from_markdown(
            text, wiki_path.rstrip("/").split("/")[-1] or wiki_path
        )
        desc = ""
        if args.dry_run:
            op = "UPDATE" if page_id is not None else "CREATE"
            if api_path != wiki_path:
                print(
                    f"[dry-run] {op} {wiki_path}  ->  {api_path} ({fpath.name})"
                )
            else:
                print(f"[dry-run] {op} {wiki_path} ({fpath.name})")
            ok += 1
            continue

        common = {
            "path": api_path,
            "title": title,
            "content": text,
            "description": desc,
            "editor": "markdown",
            "isPublished": True,
            "isPrivate": False,
            "locale": locale,
            "tags": [],
        }
        if page_id is not None:
            common["id"] = page_id
            data = run_mutation(
                base, token, "update", MUTATION_UPDATE, common
            )
        else:
            data = run_mutation(
                base, token, "create", MUTATION_CREATE, common
            )
        gerr = data.get("errors")
        if gerr:
            print(
                "FAIL",
                api_path,
                "GraphQL",
                gerr[0].get("message", gerr) if isinstance(gerr, list) else gerr,
                file=sys.stderr,
            )
            err += 1
            time.sleep(0.05)
            continue

        if page_id is not None:
            block = (data.get("data") or {}).get("pages", {}).get("update")
        else:
            block = (data.get("data") or {}).get("pages", {}).get("create")
            if block and block.get("page"):
                new_id = block["page"].get("id")
                if new_id is not None:
                    nid = int(new_id)
                    by_path[api_path] = nid
                    if api_path != wiki_path:
                        by_path[wiki_path] = nid
        if not block:
            print("FAIL", api_path, data, file=sys.stderr)
            err += 1
            time.sleep(0.05)
            continue
        rr = block.get("responseResult") or {}
        if rr.get("succeeded"):
            if api_path != wiki_path:
                print("OK", api_path, f"(source: {wiki_path})")
            else:
                print("OK", api_path)
            ok += 1
            time.sleep(0.05)
            continue

        code = rr.get("errorCode")
        if code in (6002, 6006):
            pages2 = try_list_pages(base, token, locale)
            if pages2:
                by_path = build_path_index(pages2, prefix, prepend)
            new_id = lookup_id(by_path, wiki_path) or lookup_id(
                by_path, api_path
            )
            if new_id is not None:
                common["id"] = new_id
                data = run_mutation(
                    base, token, "update", MUTATION_UPDATE, common
                )
                block2 = (data.get("data") or {}).get("pages", {}).get("update")
                rr2 = (block2 or {}).get("responseResult") or {}
                if rr2.get("succeeded"):
                    print("OK", api_path, "(update after duplicate path)")
                    ok += 1
                    time.sleep(0.05)
                    continue

        print(
            "FAIL",
            api_path,
            rr.get("message"),
            rr.get("errorCode"),
            file=sys.stderr,
        )
        err += 1
        time.sleep(0.05)

    print(f"Done: ok={ok} err={err}")
    return 0 if err == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
