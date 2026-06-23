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

# Directories never shown in the tree.
IGNORE_DIRS = {
    ".git", ".claude", ".vscode", ".remember", ".superpowers",
    "node_modules", "__pycache__", ".next", "dist", "_images",
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
