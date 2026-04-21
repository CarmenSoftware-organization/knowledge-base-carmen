#!/usr/bin/env python3
from __future__ import annotations

import re
import shutil
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import mammoth


SOURCE_ROOTS = [
    Path("/Users/sunshine/Documents/Carmen Cloud/AddIn"),
    Path("/Users/sunshine/Documents/Carmen Cloud/AP"),
    Path("/Users/sunshine/Documents/Carmen Cloud/AR"),
    Path("/Users/sunshine/Documents/Carmen Cloud/Asset"),
    Path("/Users/sunshine/Documents/Carmen Cloud/Asset Checker"),
    Path("/Users/sunshine/Documents/Carmen Cloud/GL"),
]

TARGET_FAQ_ROOT = Path("/Users/sunshine/Documents/GitHub/kb-carmen/contents/carmen/faq")
TARGET_IMAGES_ROOT = TARGET_FAQ_ROOT / "_images"

DEFAULT_TAGS = "carmen,faq,documentation"
DEFAULT_EDITOR = "markdown"


@dataclass
class DocItem:
    source: Path
    category_folder: str
    module: str
    submodule: str
    category: str


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    return normalized or "item"


def split_meta_from_folder(folder_name: str) -> tuple[str, str, str]:
    parts = [p.strip() for p in folder_name.split("-") if p.strip()]
    if len(parts) >= 3:
        return parts[0], parts[1], "-".join(parts[2:])
    if len(parts) == 2:
        return parts[0], parts[1], "General"
    if len(parts) == 1:
        return parts[0], "General", "General"
    return "General", "General", "General"


def cleanup_markdown(md: str, title: str) -> str:
    out = md.replace("\r\n", "\n").strip()
    out = re.sub(r"\n{3,}", "\n\n", out)
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n([^\n#\-\*\d][^\n]{0,160})\n-{3,}\n", r"\n## \1\n", out)
    out = out.replace("\\.", ".")
    out = out.replace("\\-", "-")

    section_map = {
        r"^Title\s*:\s*": "## Title\n\n",
        r"^Sample case\s*:\s*": "## Sample case\n\n",
        r"^Cause of Problems?\s*:\s*": "## Cause of problems\n\n",
        r"^Cause of problem\s*:\s*": "## Cause of problems\n\n",
        r"^Solution\s*:\s*": "## Solution\n\n",
        r"^Tag\s*:\s*": "## Tags\n\n",
    }
    lines = out.split("\n")
    normalized_lines: list[str] = []
    for line in lines:
        replaced = False
        for pattern, replacement in section_map.items():
            if re.match(pattern, line, flags=re.IGNORECASE):
                content = re.sub(pattern, "", line, flags=re.IGNORECASE).strip()
                normalized_lines.append(replacement.rstrip())
                if content:
                    normalized_lines.append(content)
                replaced = True
                break
        if replaced:
            continue
        if re.match(r"^Related topics\s*:\s*$", line, flags=re.IGNORECASE):
            continue
        normalized_lines.append(line)
    out = "\n".join(normalized_lines)

    # Move any image that is glued to text onto a fresh line.
    out = re.sub(r"([^\n])(!\[[^\]]*\]\([^)]+\))", r"\1\n\n\2", out)
    out = re.sub(r"(!\[[^\]]*\]\([^)]+\))([^\n])", r"\1\n\n\2", out)
    out = re.sub(r"\n{3,}", "\n\n", out)

    if not out.startswith("# "):
        out = f"# {title}\n\n{out}" if out else f"# {title}"

    if "## Tags" not in out:
        out = f"{out}\n\n## Tags\n\nCarmen"

    return out.strip() + "\n"


def discover_docs() -> list[DocItem]:
    items: list[DocItem] = []
    for root in SOURCE_ROOTS:
        if not root.exists():
            continue
        for doc in root.rglob("*.docx"):
            parent = doc.parent.name.strip()
            module, submodule, category = split_meta_from_folder(parent)
            items.append(
                DocItem(
                    source=doc,
                    category_folder=parent,
                    module=module,
                    submodule=submodule,
                    category=category,
                )
            )
    return sorted(items, key=lambda d: str(d.source).lower())


def convert_doc(item: DocItem) -> tuple[Path, str]:
    title = item.source.stem.strip()
    hierarchy_parts = [item.module, item.submodule]
    if item.category and item.category.lower() != "general":
        hierarchy_parts.append(item.category)
    target_folder = TARGET_FAQ_ROOT.joinpath(*hierarchy_parts)
    target_folder.mkdir(parents=True, exist_ok=True)

    image_bucket = (
        f"{slugify(item.category_folder)}-{slugify(title)}".strip("-") or "images"
    )
    image_dir = TARGET_IMAGES_ROOT / image_bucket
    image_dir.mkdir(parents=True, exist_ok=True)

    image_index = 0

    def convert_image(image):
        nonlocal image_index
        image_index += 1
        ext = image.content_type.split("/")[-1].lower()
        if ext == "jpeg":
            ext = "jpg"
        if ext == "svg+xml":
            ext = "svg"
        if ext not in {"png", "jpg", "gif", "webp", "bmp", "svg"}:
            ext = "png"
        img_name = f"img-{image_index:03d}.{ext}"
        img_path = image_dir / img_name
        with image.open() as image_bytes:
            content = image_bytes.read()
        with img_path.open("wb") as f:
            f.write(content)
        return {"src": f"_images/{image_bucket}/{img_name}"}

    with item.source.open("rb") as docx_file:
        result = mammoth.convert_to_markdown(
            docx_file,
            convert_image=mammoth.images.img_element(convert_image),
        )

    body = cleanup_markdown(result.value, title)

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    frontmatter = "\n".join(
        [
            "---",
            f"title: {title}",
            "description: ",
            "published: true",
            f"date: {now}",
            f"tags: {DEFAULT_TAGS}",
            f"editor: {DEFAULT_EDITOR}",
            f"dateCreated: {now}",
            f"faq_module: {item.module}",
            f"faq_submodule: {item.submodule}",
            f"faq_category: {item.category}",
            "---",
            "",
        ]
    )
    final_md = frontmatter + body

    target_md = target_folder / f"{title}.md"
    target_md.write_text(final_md, encoding="utf-8")
    return target_md, item.module


def write_index(modules: set[str]) -> None:
    module_lines = "\n".join(f"- {m}" for m in sorted(modules))
    index_content = (
        "---\n"
        "title: FAQ\n"
        "description: Carmen FAQ\n"
        "published: true\n"
        "editor: markdown\n"
        "tags: carmen,faq,documentation\n"
        "---\n\n"
        "# Carmen FAQ\n\n"
        "Generated from Carmen Cloud source documents with module-first hierarchy.\n\n"
        "Supported paths: `faq/Module/Submodule/Article.md` and `faq/Module/Submodule/Category/Article.md`.\n\n"
        "## Modules\n\n"
        f"{module_lines}\n"
    )
    (TARGET_FAQ_ROOT / "index.md").write_text(index_content, encoding="utf-8")


def main() -> None:
    docs = discover_docs()
    if not docs:
        raise SystemExit("No DOCX files found in source folders.")

    if TARGET_FAQ_ROOT.exists():
        shutil.rmtree(TARGET_FAQ_ROOT)
    TARGET_IMAGES_ROOT.mkdir(parents=True, exist_ok=True)

    modules: set[str] = set()
    for item in docs:
        _, module = convert_doc(item)
        modules.add(module)
    write_index(modules)

    print(f"Converted {len(docs)} documents into {TARGET_FAQ_ROOT}")


if __name__ == "__main__":
    main()
