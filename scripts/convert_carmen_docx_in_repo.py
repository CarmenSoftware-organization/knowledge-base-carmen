#!/usr/bin/env python3
"""
แปลงทุกไฟล์ .docx ใต้ contents/carmen ใน repo เป็น .md แบบเดียวกับ import จาก Drive:

  - โมดูล: workbook (AddIn), ap, ar, asset, asset-checker, gl
  - โครงสร้าง: <module>/<topic>/บทความ.md
  - รูป: <module>/_images/<slug>/img-NNN.ext  และใน md อ้างเป็น _images/<slug>/...

หลังแปลงสำเร็จ ลบไฟล์ .docx ต้นทาง และลบโฟลเดอร์ระดับบนแบบ Drive (AddIn, AP, …)
จากนั้นรัน regenerate index (เรียก import_carmen_docx_from_drive.py --indexes-only)

  pip3 install -r scripts/requirements-carmen-import.txt
  python3 scripts/convert_carmen_docx_in_repo.py
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import mammoth
except ImportError:
    print(
        "Missing dependency: pip3 install -r scripts/requirements-carmen-import.txt",
        file=sys.stderr,
    )
    raise SystemExit(1)

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
import carmen_markdown_clean as _mdc

REPO = Path(__file__).resolve().parents[1]
DEST = REPO / "contents" / "carmen"

TOP_SEGMENTS_ORDERED: list[tuple[str, str]] = [
    ("AddIn", "workbook"),
    ("AP", "ap"),
    ("AR", "ar"),
    ("Asset", "asset"),
    ("Asset Checker", "asset-checker"),
    ("GL", "gl"),
]
TOP_SEGMENT: dict[str, str] = dict(TOP_SEGMENTS_ORDERED)
DRIVE_TOP_DIR_NAMES = frozenset(dict(TOP_SEGMENTS_ORDERED).keys())


def now_iso() -> str:
    import datetime

    return datetime.datetime.now(datetime.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%S.000Z"
    )


def sanitize_segment(name: str) -> str:
    name = name.strip()
    name = re.sub(r"\s+", "-", name)
    for ch in '\\/:*?"<>|':
        name = name.replace(ch, "-")
    name = re.sub(r"-{2,}", "-", name).strip("-")
    return name or "untitled"


def images_folder_slug(image_rel_key: str) -> str:
    h = hashlib.sha256(image_rel_key.encode("utf-8")).hexdigest()[:10]
    tail = image_rel_key.rsplit("/", 1)[-1]
    safe = re.sub(r"[^a-zA-Z0-9]+", "-", tail.lower())
    safe = re.sub(r"-{2,}", "-", safe).strip("-")[:40]
    return f"{safe}-{h}" if safe else h


def article_slug(stem: str) -> str:
    s = stem.replace(".docx", "").strip()
    s = re.sub(r"\s+", "-", s)
    for ch in ',\\/:*?"<>|':
        s = s.replace(ch, "-")
    s = re.sub(r"-{2,}", "-", s).strip("-")
    if len(s) > 150:
        s = s[:150].rstrip("-")
    return s or "article"


def docx_to_markdown(
    docx: Path,
    out_md: Path,
    module: str,
    image_rel_key: str,
    *,
    content_root: Path,
) -> None:
    """content_root = โฟลเดอร์รากของโครงสร้างโมดูล (ปกติ DEST; ตอนแปลงใช้ staging เพื่อหลีกเลี่ยงชนกับ AP/ap บน macOS)"""
    out_dir = out_md.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    folder_slug = images_folder_slug(image_rel_key)
    img_dir = content_root / module / "_images" / folder_slug
    img_dir.mkdir(parents=True, exist_ok=True)
    counter = [0]

    def convert_image(image):
        counter[0] += 1
        ext = image.content_type.partition("/")[2] or "png"
        if ext == "jpeg":
            ext = "jpg"
        fn = f"img-{counter[0]:03d}.{ext}"
        dest = img_dir / fn
        with image.open() as f:
            dest.write_bytes(f.read())
        return {"src": f"_images/{folder_slug}/{fn}"}

    with open(docx, "rb") as f:
        result = mammoth.convert_to_markdown(
            f,
            convert_image=mammoth.images.img_element(convert_image),
        )
    body = result.value.strip()
    title = _mdc.title_from_mammoth_body(body, docx.stem)
    body = _mdc.strip_docx_title_body_lines(body)
    tj = json.dumps(title, ensure_ascii=False)
    dj = json.dumps(title, ensure_ascii=False)
    d = now_iso()
    header = f"""---
title: {tj}
description: {dj}
lang: th-TH
published: true
date: {d}
tags: carmen_cloud,documentation
editor: markdown
dateCreated: {d}
---

"""
    if not body.lstrip().startswith("#"):
        body = f"# {title}\n\n{body}"
    out_md.write_text(header + body + "\n", encoding="utf-8")


def repo_docx_to_dest_parts(docx: Path) -> tuple[Path, Path] | None:
    """เหมือน drive_docx_to_dest_parts แต่ฐานคือ DEST (contents/carmen)"""
    try:
        rel = docx.relative_to(DEST)
    except ValueError:
        return None
    parts = list(rel.parts)
    if not parts:
        return None
    top = parts[0]
    if top not in TOP_SEGMENT:
        return None
    bu = TOP_SEGMENT[top]
    rest: list[str] = []
    for p in parts[1:-1]:
        if re.match(r"^20\d{2}\s+Pass\s+", p):
            continue
        rest.append(sanitize_segment(p))
    topic = "-".join(rest) if rest else "General"
    stem = article_slug(docx.stem)
    out_md = DEST / bu / topic / f"{stem}.md"
    return out_md, out_md.relative_to(DEST)


def remove_drive_layout_roots() -> None:
    """ลบโฟลเดอร์ AddIn, AP, AR, … หลังย้ายเนื้อหาแล้ว (ไม่แตะ ap/, workbook/, …)"""
    for name in sorted(DRIVE_TOP_DIR_NAMES):
        p = DEST / name
        if p.is_dir():
            shutil.rmtree(p)


def main() -> int:
    if not DEST.is_dir():
        print("Missing", DEST, file=sys.stderr)
        return 1

    staging = DEST / ".carmen_docx_convert_staging"

    docx_files = sorted(DEST.rglob("*.docx"))
    docx_files = [
        p
        for p in docx_files
        if p.is_file()
        and not p.name.startswith("~$")
        and ".carmen_docx_convert_staging" not in p.parts
    ]
    if not docx_files:
        print("No .docx under", DEST, file=sys.stderr)
        return 0

    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    for docx in docx_files:
        mapped = repo_docx_to_dest_parts(docx)
        if not mapped:
            print("Skip (unknown top segment):", docx.relative_to(REPO), file=sys.stderr)
            continue
        out_md, rel_from_dest = mapped
        rel_pos = rel_from_dest.as_posix()
        image_rel_key = rel_pos[:-3] if rel_pos.endswith(".md") else rel_pos
        module = rel_from_dest.parts[0]
        staging_md = staging.joinpath(*rel_from_dest.parts)
        if docx.resolve() == staging_md.resolve():
            print("Skip (source equals output):", docx, file=sys.stderr)
            continue
        docx_to_markdown(
            docx, staging_md, module, image_rel_key, content_root=staging
        )
        docx.unlink()
        print("Wrote", staging_md.relative_to(REPO))

    remove_drive_layout_roots()

    shutil.copytree(staging, DEST, dirs_exist_ok=True)
    shutil.rmtree(staging)

    idx_script = REPO / "scripts" / "import_carmen_docx_from_drive.py"
    r = subprocess.run(
        [sys.executable, str(idx_script), "--indexes-only"],
        cwd=str(REPO),
    )
    if r.returncode != 0:
        print("index regeneration failed", file=sys.stderr)
        return r.returncode

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
