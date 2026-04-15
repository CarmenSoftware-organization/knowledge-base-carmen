#!/usr/bin/env python3
"""
Build Blueledgers FAQ markdown from a Drive export folder.

Expected source structure (preferred):
  <source>/
    Material-Procedure-Closing Balance/
      <article>.docx | <article>.md
      image-1.png

Folder names use "-" to encode hierarchy:
  Module-Submodule-Category

Output:
  contents/blueledgers/faq/
    index.md
    Material-Procedure-Closing_Balance_<article>.md
    _images/<article-slug>/*
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import shutil
import sys
from pathlib import Path
from typing import Iterable

SUPPORTED_DOC_EXTS = {".md", ".docx"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}


def log_line(message: str, *, to_stderr: bool = False) -> None:
    stream = sys.stderr if to_stderr else sys.stdout
    try:
        print(message, file=stream)
    except UnicodeEncodeError:
        payload = (message + "\n").encode("utf-8", errors="replace")
        raw = getattr(stream, "buffer", None)
        if raw is not None:
            raw.write(payload)
        else:
            # Fallback for environments without binary buffer.
            stream.write(payload.decode("utf-8", errors="replace"))


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def safe_component(text: str, *, keep_dash: bool = True, sep: str = "_") -> str:
    value = normalize_spaces(text)
    value = re.sub(r'[<>:"/\\|?*]', "", value)
    if not keep_dash:
        value = value.replace("-", " ")
    value = value.replace(" ", sep)
    value = re.sub(rf"{re.escape(sep)}+", sep, value).strip(sep)
    value = value.strip(".")
    return value or "untitled"


def safe_slug(text: str) -> str:
    value = normalize_spaces(text).lower()
    value = re.sub(r"[^\w\-\s]", "", value)
    value = value.replace("_", "-")
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "untitled"


def split_hierarchy(parts: list[str]) -> tuple[str, str, str]:
    if len(parts) >= 3:
        return parts[0], parts[1], "-".join(parts[2:])
    if len(parts) == 2:
        return parts[0], parts[1], "General"
    if len(parts) == 1:
        return parts[0], "General", "General"
    return "General", "General", "General"


def parse_hierarchy(rel_path: Path) -> tuple[str, str, str]:
    parent_parts = list(rel_path.parent.parts)
    if not parent_parts:
        return "General", "General", "General"

    top_folder = normalize_spaces(parent_parts[0])
    from_dash = [normalize_spaces(x) for x in top_folder.split("-") if normalize_spaces(x)]
    if from_dash:
        return split_hierarchy(from_dash)

    direct_parts = [normalize_spaces(x) for x in parent_parts if normalize_spaces(x)]
    return split_hierarchy(direct_parts[:3])


def read_markdown_without_frontmatter(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if text.startswith("---\n"):
        closing = text.find("\n---\n", 4)
        if closing >= 0:
            return text[closing + 5 :]
    return text


def extract_title(stem: str, body: str) -> str:
    heading = re.search(r"(?m)^\s*#\s+(.+?)\s*$", body)
    if heading:
        return normalize_spaces(heading.group(1))
    return normalize_spaces(stem.replace("_", " ").replace("-", " "))


def parse_labeled_sections(body: str) -> dict[str, str]:
    label_map = {
        "title": "title",
        "sample case": "sample_case",
        "sample_case": "sample_case",
        "cause of problems": "problem_cause",
        "problem cause": "problem_cause",
        "cause": "problem_cause",
        "solution": "solution",
        "tag": "tags",
        "tags": "tags",
        "related topics": "related_topics",
    }
    label_re = re.compile(
        r"(?im)^\s*(title|sample case|sample_case|cause of problems|problem cause|cause|solution|tag|tags|related topics)\s*:\s*(.*)$"
    )
    matches = list(label_re.finditer(body))
    if not matches:
        return {}

    result: dict[str, str] = {}
    for i, match in enumerate(matches):
        raw_label = normalize_spaces(match.group(1).lower())
        key = label_map.get(raw_label)
        if not key:
            continue
        start = match.start(2)
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        value = body[start:end].strip()
        if value:
            result[key] = value
    return result


def normalize_faq_body(body: str, fallback_title: str) -> tuple[str, str]:
    labeled = parse_labeled_sections(body)
    if not labeled:
        return fallback_title, body.strip()

    title = normalize_spaces(labeled.get("title", "")) or fallback_title
    parts = [f"# {title}"]

    sample_case = labeled.get("sample_case", "").strip()
    problem_cause = labeled.get("problem_cause", "").strip()
    solution = labeled.get("solution", "").strip()
    tags = labeled.get("tags", "").strip()

    if sample_case:
        parts.extend(["## Sample case", sample_case])
    if problem_cause:
        parts.extend(["## Cause of problems", problem_cause])
    if solution:
        parts.extend(["## Solution", solution])
    if tags:
        parts.extend(["## Tags", tags])

    cleaned = "\n\n".join(parts).strip()
    if len(cleaned) <= len(parts[0]) + 2:
        # No useful parsed content, keep original body.
        return title, body.strip()
    return title, cleaned


def ensure_unique_name(base: str, used: set[str]) -> str:
    if base not in used:
        used.add(base)
        return base
    i = 2
    while True:
        candidate = f"{base}_{i}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        i += 1


def is_external_image(src: str) -> bool:
    low = src.lower()
    return low.startswith(("http://", "https://", "data:", "#", "mailto:"))


def rewrite_md_images(content: str, source_file: Path, image_target_dir: Path, article_slug: str) -> str:
    image_target_dir.mkdir(parents=True, exist_ok=True)
    copied: dict[str, str] = {}
    counter = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal counter
        alt = match.group(1)
        raw_src = match.group(2).strip().strip('"').strip("'")
        if is_external_image(raw_src):
            return match.group(0)
        if raw_src.startswith("/"):
            return match.group(0)

        normalized_src = raw_src.replace("\\", "/")
        src_path = (source_file.parent / normalized_src).resolve()
        if not src_path.exists() or src_path.suffix.lower() not in IMAGE_EXTS:
            return match.group(0)

        if raw_src in copied:
            rel = copied[raw_src]
            return f"![{alt}]({rel})"

        counter += 1
        ext = src_path.suffix.lower() or ".png"
        image_name = f"img-{counter:03d}{ext}"
        dst = image_target_dir / image_name
        shutil.copy2(src_path, dst)
        rel = f"_images/{article_slug}/{image_name}".replace("\\", "/")
        copied[raw_src] = rel
        return f"![{alt}]({rel})"

    return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", replace, content)


def convert_docx_to_markdown(docx: Path, image_target_dir: Path, article_slug: str) -> str:
    try:
        import mammoth
        import mammoth.images
    except ImportError:
        print(
            "Missing dependency for .docx conversion. Install with:\n"
            "  pip install -r scripts/requirements-kb-convert.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    image_target_dir.mkdir(parents=True, exist_ok=True)
    counter = {"i": 0}

    def save_image(image):
        counter["i"] += 1
        raw_ext = (image.content_type or "image/png").split("/")[-1].lower()
        if raw_ext in ("jpeg", "jpe"):
            raw_ext = "jpg"
        if raw_ext not in ("png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"):
            raw_ext = "png"
        name = f"img-{counter['i']:03d}.{raw_ext}"
        dest = image_target_dir / name
        with image.open() as image_bytes:
            dest.write_bytes(image_bytes.read())
        rel = f"_images/{article_slug}/{name}".replace("\\", "/")
        return {"src": rel}

    with docx.open("rb") as f:
        result = mammoth.convert_to_markdown(
            f,
            convert_image=mammoth.images.img_element(save_image),
        )
        if result.messages:
            for message in result.messages:
                log_line(f"[{docx.name}] {message}", to_stderr=True)
        return result.value or ""


def render_frontmatter(title: str, module: str, submodule: str, category: str) -> str:
    now_iso = dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return (
        "---\n"
        f"title: {title}\n"
        "description: \n"
        "published: true\n"
        f"date: {now_iso}\n"
        "tags: blueledgers,faq,documentation\n"
        "editor: markdown\n"
        f"dateCreated: {now_iso}\n"
        f"faq_module: {module}\n"
        f"faq_submodule: {submodule}\n"
        f"faq_category: {category}\n"
        "---\n\n"
    )


def iter_source_docs(source_dir: Path) -> Iterable[Path]:
    for path in sorted(source_dir.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_DOC_EXTS:
            yield path


def build_index(target_dir: Path, modules: list[str]) -> None:
    uniq = []
    seen = set()
    for module in modules:
        key = module.casefold()
        if key not in seen:
            seen.add(key)
            uniq.append(module)

    bullets = "\n".join(f"- {name}" for name in uniq) if uniq else "- (waiting for source files)"
    content = (
        "---\n"
        "title: FAQ\n"
        "description: Blueledgers FAQ\n"
        "published: true\n"
        "editor: markdown\n"
        "tags: blueledgers,faq,documentation\n"
        "---\n\n"
        "# Blueledgers FAQ\n\n"
        "Generated from source docs with folder naming `Module-Submodule-Category`.\n\n"
        "## Modules\n\n"
        f"{bullets}\n"
    )
    (target_dir / "index.md").write_text(content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Drive docs to Blueledgers FAQ markdown")
    parser.add_argument("--source-dir", required=True, help="Input folder from Drive export")
    parser.add_argument(
        "--output-dir",
        default="contents/blueledgers/faq",
        help="Output faq directory",
    )
    parser.add_argument(
        "--clean-output",
        action="store_true",
        help="Delete old generated markdown/images in output before writing",
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)

    if not source_dir.is_dir():
        raise SystemExit(f"Source folder not found: {source_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    images_root = output_dir / "_images"
    if args.clean_output:
        for old_md in output_dir.glob("*.md"):
            if old_md.name.lower() != "index.md":
                old_md.unlink(missing_ok=True)
        if images_root.exists():
            shutil.rmtree(images_root)
    images_root.mkdir(parents=True, exist_ok=True)

    docs = list(iter_source_docs(source_dir))
    used_bases: set[str] = set()
    modules: list[str] = []
    written = 0

    for src in docs:
        rel = src.relative_to(source_dir)
        module, submodule, category = parse_hierarchy(rel)
        modules.append(module)

        hierarchy_parts = [module, submodule]
        if category.casefold() != "general":
            hierarchy_parts.append(category)
        hierarchy_raw = "-".join(hierarchy_parts)
        hierarchy_name = safe_component(hierarchy_raw, keep_dash=True, sep="_")
        stem_name = safe_component(src.stem, keep_dash=True, sep="_")

        base_name = hierarchy_name
        if stem_name.casefold() not in {hierarchy_name.casefold(), "index"}:
            base_name = f"{hierarchy_name}_{stem_name}"
        base_name = ensure_unique_name(base_name, used_bases)

        article_slug = safe_slug(base_name)
        image_target_dir = images_root / article_slug

        if src.suffix.lower() == ".docx":
            body = convert_docx_to_markdown(src, image_target_dir, article_slug)
        else:
            body = read_markdown_without_frontmatter(src)
            body = rewrite_md_images(body, src, image_target_dir, article_slug)

        if not body.strip():
            body = f"# {src.stem}\n"

        fallback_title = extract_title(src.stem, body)
        title, body = normalize_faq_body(body, fallback_title)
        frontmatter = render_frontmatter(title, module, submodule, category)

        out_path = output_dir / f"{base_name}.md"
        out_path.write_text(frontmatter + body.strip() + "\n", encoding="utf-8")
        written += 1
        log_line(f"{rel} -> {out_path}")

    build_index(output_dir, modules)
    log_line(f"\nDone. Wrote {written} article(s) into: {output_dir}")
    if written == 0:
        log_line("No .md or .docx files found in source folder.")


if __name__ == "__main__":
    main()
