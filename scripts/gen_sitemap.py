#!/usr/bin/env python3
"""Regenerate the auto-tree span of the repo sitemap.md.

The hand-written narrative in sitemap.md is left untouched; only the span
between the AUTO-TREE markers is rewritten. Standard library only.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITEMAP = REPO_ROOT / "sitemap.md"

BEGIN_MARKER = "<!-- BEGIN AUTO-TREE -->"
END_MARKER = "<!-- END AUTO-TREE -->"

# Directories never shown in the tree (VCS/editor metadata + build artifacts).
IGNORE_DIRS = {
    ".git", ".claude", ".vscode", ".remember", ".superpowers",
    "node_modules", "__pycache__", ".next", ".swc", ".vercel", "dist", "_images",
    "bin",  # Go build output (backend/bin/, gitignored) — not part of the repo
}

# Max directory depth below the repo root (root children = depth 1).
MAX_DEPTH = 3

# Directory (relative to root) whose children are Business Units.
CONTENTS_DIR = "contents"

INDENT = "  "


def read_frontmatter_title(md_path: Path):
    """Return the YAML frontmatter ``title:`` of a markdown file, or None."""
    try:
        with md_path.open(encoding="utf-8") as fh:
            if fh.readline().strip() != "---":
                return None
            for line in fh:
                if line.strip() == "---":
                    return None
                if line.startswith("title:"):
                    title = line[len("title:"):].strip()
                    if len(title) >= 2 and title[0] == title[-1] and title[0] in "\"'":
                        title = title[1:-1]
                    return title or None
    except (OSError, UnicodeDecodeError):
        return None
    return None


def count_md(directory: Path) -> int:
    """Count ``*.md`` files recursively under a directory."""
    return sum(1 for _ in directory.rglob("*.md"))


def _subdirs(directory: Path):
    """Sorted, filtered immediate subdirectories."""
    return sorted(
        (p for p in directory.iterdir() if p.is_dir() and p.name not in IGNORE_DIRS),
        key=lambda p: p.name.lower(),
    )


def _dir_label(directory: Path) -> str:
    """Directory name with an optional index.md title annotation."""
    label = directory.name + "/"
    index = directory / "index.md"
    if index.is_file():
        title = read_frontmatter_title(index)
        if title:
            label += f"  — {title}"
    return label


def _walk_contents(contents_dir: Path, depth: int, lines: list) -> None:
    """Collapse contents/ at the BU level: BU (md count) + first-level categories."""
    bu_indent = INDENT * (depth - 1)
    cat_indent = INDENT * depth
    for bu in _subdirs(contents_dir):
        lines.append(f"{bu_indent}{bu.name}/  ({count_md(bu)} md)")
        for category in _subdirs(bu):
            lines.append(f"{cat_indent}{_dir_label(category)}")


def _walk(directory: Path, depth: int, rel: str, lines: list) -> None:
    for sub in _subdirs(directory):
        rel_sub = f"{rel}/{sub.name}" if rel else sub.name
        indent = INDENT * (depth - 1)
        if rel_sub == CONTENTS_DIR:
            lines.append(f"{indent}{sub.name}/")
            _walk_contents(sub, depth + 1, lines)
            continue
        lines.append(f"{indent}{_dir_label(sub)}")
        if depth < MAX_DEPTH:
            _walk(sub, depth + 1, rel_sub, lines)


def build_tree(root=None) -> str:
    """Return the directories-only tree text for the repo."""
    root = Path(root) if root else REPO_ROOT
    lines = ["."]
    _walk(root, 1, "", lines)
    return "\n".join(lines)


def replace_marker_span(content: str, tree: str) -> str:
    """Replace the text between the AUTO-TREE markers with a fenced tree block."""
    if BEGIN_MARKER not in content or END_MARKER not in content:
        raise ValueError("sitemap.md is missing the AUTO-TREE markers")
    begin = content.index(BEGIN_MARKER)
    end = content.index(END_MARKER)
    if end < begin:
        raise ValueError("AUTO-TREE markers are out of order")
    head = content[: begin + len(BEGIN_MARKER)]
    tail = content[end:]
    return f"{head}\n```\n{tree}\n```\n{tail}"


def render(root=None, sitemap=None) -> str:
    """Return sitemap content with a freshly built tree spliced into the markers."""
    root = Path(root) if root else REPO_ROOT
    sitemap = Path(sitemap) if sitemap else SITEMAP
    if not sitemap.is_file():
        raise FileNotFoundError(f"{sitemap} does not exist")
    return replace_marker_span(sitemap.read_text(encoding="utf-8"), build_tree(root))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Regenerate the sitemap.md auto-tree span."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit non-zero if sitemap.md is stale (no write)",
    )
    args = parser.parse_args(argv)
    try:
        updated = render()
        current = SITEMAP.read_text(encoding="utf-8")
    except (FileNotFoundError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if args.check:
        if current != updated:
            print(
                "sitemap.md auto-tree is stale; run scripts/gen_sitemap.py",
                file=sys.stderr,
            )
            return 1
        print("sitemap.md auto-tree is up to date")
        return 0
    if current == updated:
        print("sitemap.md already up to date")
        return 0
    SITEMAP.write_text(updated, encoding="utf-8")
    print("sitemap.md auto-tree regenerated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
