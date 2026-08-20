"""Normalize BlueLedgers New manuals into the repository Markdown format."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "contents" / "blueledgers_new"

ORDER = {
    "Material/Store Requisition.md": 1,
    "Material/Stock In.md": 2,
    "Material/Stock Out.md": 3,
    "Material/Closing Balance.md": 4,
    "Material/Close Period.md": 5,
    "Procurement/Purchase Request.md": 1,
    "Procurement/Purchase Order.md": 2,
    "Procurement/Receiving.md": 3,
    "Procurement/Credit Note.md": 4,
    "Procurement/Price List.md": 5,
    "Settings/Administration/User.md": 1,
    "Settings/Administration/Role.md": 2,
    "Settings/Administration/Department.md": 3,
    "Settings/Administration/Workflow Management.md": 4,
    "Settings/Main/6_Product_Revised.md": 1,
    "Settings/Main/7_6_Currency_Revised.md": 2,
    "Settings/Main/7_7_Product_Unit_Revised.md": 3,
    "Settings/Main/7_8_Product_Category_Revised.md": 4,
    "Settings/Main/7_9_Location_Revised.md": 5,
    "Settings/Material/Adjustment_Type_Revised.md": 1,
    "Settings/Material/Standard_Requisition_Revised.md": 2,
    "Settings/Procurement/Account Code Mapping.md": 1,
    "Settings/Procurement/Market List.md": 2,
    "Settings/Procurement/Standard Order.md": 3,
    "Settings/Procurement/Delivery Point.md": 4,
    "Settings/Procurement/Extra Cost Type.md": 5,
}

TITLE_OVERRIDES = {
    "6_Product_Revised": "Product",
    "7_6_Currency_Revised": "Currency Exchange",
    "7_7_Product_Unit_Revised": "Product Unit",
    "7_8_Product_Category_Revised": "Product Category",
    "7_9_Location_Revised": "Location",
    "Adjustment_Type_Revised": "Adjustment Type",
    "Standard_Requisition_Revised": "Standard Requisition",
    "Workflow Management": "Workflow Management",
    "Delivery Point": "Delivery Point",
    "Extra Cost Type": "Extra Cost Type",
}

IMAGE_PREFIX = {
    "Settings/Administration/Workflow Management.md": "Workflow_Management/",
    "Settings/Procurement/Delivery Point.md": "Delivery_Point/",
    "Settings/Procurement/Extra Cost Type.md": "Extra_Cost_Type/",
}


def split_frontmatter(text: str) -> tuple[list[dict[str, str]], str]:
    blocks: list[dict[str, str]] = []
    rest = text.lstrip("\ufeff")
    while rest.startswith("---\n"):
        end = rest.find("\n---", 4)
        if end < 0:
            break
        raw = rest[4:end]
        meta: dict[str, str] = {}
        for line in raw.splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip()] = value.strip().strip('"')
        blocks.append(meta)
        rest = rest[end + 4 :].lstrip("\n")
    return blocks, rest


def clean_inline(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value)
    value = value.replace("**", "").replace("__", "")
    value = re.sub(r"\s+", " ", value).strip(" #*-\t")
    return value


def infer_title(path: Path, body: str, blocks: list[dict[str, str]]) -> str:
    for meta in blocks:
        if meta.get("title"):
            return clean_inline(meta["title"])
    for line in body.splitlines():
        candidate = clean_inline(line)
        if candidate and not line.lstrip().startswith(("<img", "![")):
            return candidate
    return TITLE_OVERRIDES.get(path.stem, path.stem.replace("_Revised", "").replace("_", " "))


def infer_description(title: str, body: str, blocks: list[dict[str, str]]) -> str:
    for meta in blocks:
        if meta.get("description") and meta.get("tags") != "blueledgers_new,documentation":
            return clean_inline(meta["description"])
    for paragraph in re.split(r"\n\s*\n", body):
        candidate = clean_inline(paragraph)
        if not candidate or candidate.casefold() == title.casefold():
            continue
        if paragraph.lstrip().startswith(("<img", "![", "|")):
            continue
        if len(candidate) > 180:
            candidate = candidate[:180].rsplit(" ", 1)[0]
        return candidate.rstrip()
    return f"คู่มือการใช้งาน {title} ในระบบ BlueLedgers New"


def normalize_images(body: str, title: str, image_prefix: str = "") -> str:
    counter = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal counter
        counter += 1
        src = match.group(1).strip()
        src = src.removeprefix("./")
        if image_prefix and not src.startswith(image_prefix):
            src = image_prefix + src
        if not src.startswith(("./", "../", "/", "http://", "https://")):
            src = f"./{src}"
        return f"![{title} - รูปที่ {counter}]({src})"

    return re.sub(r'<img\s+[^>]*?src="([^"]+)"[^>]*?/?>', replace, body, flags=re.I | re.S)


def normalize_body(body: str, title: str, image_prefix: str = "") -> str:
    body = normalize_images(body, title, image_prefix)
    lines = body.replace("\r\n", "\n").splitlines()

    # Remove the converted Word title; a canonical H1 is inserted below.
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines:
        first = clean_inline(lines[0])
        if first.casefold() == title.casefold() or (
            lines[0].startswith("# ") and first.casefold().startswith(title.casefold())
        ):
            lines.pop(0)
            while lines and not lines[0].strip():
                lines.pop(0)
            continue
        break

    normalized: list[str] = [f"# {title}", ""]
    for raw in lines:
        line = raw.rstrip()
        # Pandoc indents top-level Word lists by four spaces. After inserting
        # Markdown section headings that indentation would become a code block,
        # so shift the converted list hierarchy one level to the left.
        if line.startswith("    "):
            line = line[4:]
        stripped = line.strip()

        if stripped == "<!-- -->":
            continue

        heading = re.fullmatch(r"\*\*(.+?)\*\*", stripped)
        numbered_heading = re.fullmatch(r"(\d+)\.\s+\*\*(.+?)\*\*", stripped)
        if numbered_heading and not line.startswith((" ", "\t")):
            line = f"## {numbered_heading.group(1)}. {clean_inline(numbered_heading.group(2))}"
        elif heading and not line.startswith((" ", "\t")):
            candidate = clean_inline(heading.group(1))
            if candidate and len(candidate) <= 100:
                line = f"## {candidate}"
        elif (
            not line.startswith((" ", "\t", "#", "-", "!", "|"))
            and re.match(r"^(ขั้นตอน|การสร้าง|การแก้ไข|การยกเลิก)", stripped)
            and len(stripped) <= 100
        ):
            line = f"## {stripped}"

        line = re.sub(r"^(\s*)(\d+)\.\s{2,}", r"\1\2. ", line)
        normalized.append(line)

    text = "\n".join(normalized)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"\n(!\[[^\n]+\]\([^\n]+\))\n", r"\n\n\1\n\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def yaml_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def normalize_file(path: Path) -> None:
    rel = path.relative_to(ROOT).as_posix()
    blocks, body = split_frontmatter(path.read_text(encoding="utf-8"))
    title = TITLE_OVERRIDES.get(path.stem) or infer_title(path, body, blocks)
    description = infer_description(title, body, blocks)
    weight = ORDER[rel]

    header = "\n".join(
        [
            "---",
            f"title: {yaml_quote(title)}",
            f"description: {yaml_quote(description)}",
            "published: true",
            "tags: blueledgers_new,documentation",
            "editor: markdown",
            "---",
            "---",
            f"title: {yaml_quote(title)}",
            f"weight: {weight}",
            "---",
            "",
        ]
    )
    path.write_text(
        header + normalize_body(body, title, IMAGE_PREFIX.get(rel, "")),
        encoding="utf-8",
        newline="\n",
    )


def main() -> None:
    missing = [rel for rel in ORDER if not (ROOT / rel).is_file()]
    if missing:
        raise SystemExit("Missing expected manuals: " + ", ".join(missing))
    for rel in ORDER:
        normalize_file(ROOT / rel)
    print(f"Normalized {len(ORDER)} BlueLedgers New manuals.")


if __name__ == "__main__":
    main()
