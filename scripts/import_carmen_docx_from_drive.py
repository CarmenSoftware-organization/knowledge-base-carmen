#!/usr/bin/env python3
"""
Import all .docx under Google Drive export → contents/carmen with:
  - six top-level modules matching Drive: workbook, ap, ar, asset, asset-checker, gl
    (AddIn → workbook; Asset Checker → asset-checker; empty modules still get a folder + index)
  - folder layout: module / topic / article.md (รูปรวมที่ module/_images/<slug>/ เหมือน blueledgers)
  - markdown อ้างรูปเป็น _images/<slug>/img-NNN.ext (ไม่วางไฟล์ยาวข้าง .md)

Requires: pip3 install -r scripts/requirements-carmen-import.txt

Run: python3 scripts/import_carmen_docx_from_drive.py
"""
from __future__ import annotations

import datetime
import hashlib
import json
import re
import shutil
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
SRC = Path(
    "/Users/sunshine/Documents/BU carmen/drive-download-20260420T033943Z-3-001"
)
DEST = REPO / "contents" / "carmen"

# Drive top-level folder (6 โฟลเดอร์) → slug ใต้ contents/carmen/
# AddIn → workbook (ชื่อเดิมในระบบ UI / chat / synonyms — ใช้งานได้กับของเดิม)
TOP_SEGMENTS_ORDERED: list[tuple[str, str]] = [
    ("AddIn", "workbook"),
    ("AP", "ap"),
    ("AR", "ar"),
    ("Asset", "asset"),
    ("Asset Checker", "asset-checker"),
    ("GL", "gl"),
]
TOP_SEGMENT: dict[str, str] = dict(TOP_SEGMENTS_ORDERED)

# ชื่อโชว์ใน index.md / frontmatter ให้ตรงกับ UI (sidebar-map)
MODULE_DISPLAY_NAME: dict[str, str] = {
    "workbook": "Work Book",
    "ap": "Account Payable",
    "ar": "Account Receivable",
    "asset": "Asset",
    "asset-checker": "Asset Checker",
    "gl": "General Ledger",
}


def now_iso() -> str:
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
    """โฟลเดอร์ใต้ <module>/_images/… ไม่ชนกันระหว่างบทความ (คีย์ = path ไม่มี .md)"""
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


def docx_to_markdown(docx: Path, out_md: Path, module: str, image_rel_key: str) -> None:
    """เขียน .md ที่ out_md; รูปไปที่ DEST/<module>/_images/<slug>/img-NNN.ext"""
    out_dir = out_md.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    folder_slug = images_folder_slug(image_rel_key)
    img_dir = DEST / module / "_images" / folder_slug
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


def drive_docx_to_dest_parts(docx: Path) -> tuple[Path, Path] | None:
    """
    Map .../SRC/AP/2026 Pass AP/Account Payable-Invoice/file.docx
    → (DEST/ap/Account-Payable-Invoice/file.md Path for file stem)
    Returns (out_md_path, relative from DEST) or None if skipped.
    """
    try:
        rel = docx.relative_to(SRC)
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


def read_yaml_title(md_path: Path) -> str | None:
    try:
        text = md_path.read_text(encoding="utf-8")
    except OSError:
        return None
    m = re.match(r"^---\s*\r?\n(.*?)\r?\n---", text, re.DOTALL)
    if not m:
        return None
    fm = m.group(1)
    for line in fm.splitlines():
        stripped = line.strip()
        if not stripped.lower().startswith("title:"):
            continue
        raw = stripped.split(":", 1)[1].strip()
        if raw.startswith('"') and raw.endswith('"'):
            try:
                return str(json.loads(raw))
            except json.JSONDecodeError:
                return raw[1:-1]
        if raw.startswith("'") and raw.endswith("'"):
            return raw[1:-1]
        return raw.strip().strip('"').strip("'")
    return None


def escape_md_link_text(s: str) -> str:
    """ข้อความใน [...] ของ markdown — ห้ามใช้ json.dumps ทั้งสตริง (จะได้ \" ในลิงก์)"""
    return s.replace("\\", "\\\\").replace("]", "\\]")


def link_label_for_article(md: Path) -> str:
    stem = md.stem
    human = stem.replace("-", " ").strip()
    t = read_yaml_title(md)
    if not t:
        return human
    if len(t) > 45 and (
        "Error" in t
        or "\\" in t
        or "[Dr" in t
        or "Dr/Cr" in t
    ):
        return human
    if t.replace(" ", "-").lower() == stem.lower():
        return human
    if t.replace("-", " ").strip().lower() == human.lower():
        return human
    return t


def ensure_six_module_dirs() -> None:
    """สร้างโฟลเดอร์ระดับบนครบ 6 อันให้ตรง Drive (แม้ยังไม่มี .docx)"""
    for _drive_name, slug in TOP_SEGMENTS_ORDERED:
        (DEST / slug).mkdir(parents=True, exist_ok=True)


def write_root_and_module_indexes() -> None:
    d = now_iso()
    modules = [slug for _drive, slug in TOP_SEGMENTS_ORDERED]

    lines = [
        "---",
        'title: "Carmen Cloud"',
        'description: "Carmen Cloud — imported from Drive"',
        "published: true",
        f"date: {d}",
        "tags: carmen_cloud,documentation",
        "editor: markdown",
        f"dateCreated: {d}",
        "---",
        "",
        '---',
        'title: "Carmen Cloud"',
        "weight: 1",
        "---",
        "",
        "# Carmen Cloud",
        "",
        "โครงสร้างคล้าย BlueLedgers: โมดูล → หัวข้อ → บทความ `.md` และรูปอยู่ที่ `<โมดูล>/_images/<slug>/`",
        "",
    ]
    for m in modules:
        label = MODULE_DISPLAY_NAME.get(m, m.replace("-", " ").title())
        lines.append(f"- [{escape_md_link_text(label)}](./{m}/)")
    (DEST / "index.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # weight ตามลำดับบน Drive (AddIn → GL)
    weight_map = {slug: 2 + i for i, (_, slug) in enumerate(TOP_SEGMENTS_ORDERED)}
    for m in modules:
        subdirs: list[str] = []
        loose_md: list[str] = []
        mp = DEST / m
        mp.mkdir(parents=True, exist_ok=True)
        for c in sorted(mp.iterdir()):
            if c.is_dir():
                rel = c.relative_to(mp)
                subdirs.append(str(rel).replace("\\", "/"))
            elif c.suffix.lower() == ".md" and c.name != "index.md":
                loose_md.append(c.name)
        mod_title = MODULE_DISPLAY_NAME.get(m, m.replace("-", " ").title())
        body = [f"# {mod_title}", ""]
        for sd in subdirs:
            sd_label = sd.replace("-", " ").replace("/", " ").strip()
            body.append(f"- [{sd_label}](./{sd}/)")
        for fn in loose_md:
            lp = mp / fn
            lbl = link_label_for_article(lp)
            body.append(f"- [{escape_md_link_text(lbl)}](./{fn})")
        if len(body) == 2:
            body.append(
                "_ยังไม่มีหัวข้อย่อย — ถ้าเป็นโฟลเดอร์ว่าง (เช่น Asset Checker) ให้เพิ่ม `.docx` ใน Drive แล้วรัน import อีกครั้ง_"
            )
        w = weight_map.get(m, 10)
        mod_disp = MODULE_DISPLAY_NAME.get(m, m)
        tj = json.dumps(mod_disp, ensure_ascii=False)
        dj = json.dumps(mod_disp, ensure_ascii=False)
        (mp / "index.md").write_text(
            "\n".join(
                [
                    "---",
                    f"title: {tj}",
                    f"description: {dj}",
                    "published: true",
                    f"date: {d}",
                    "tags: carmen_cloud,documentation",
                    "editor: markdown",
                    f"dateCreated: {d}",
                    "---",
                    "",
                    "---",
                    f"title: {tj}",
                    f"weight: {w}",
                    "---",
                    "",
                    *body,
                    "",
                ]
            ),
            encoding="utf-8",
        )

        # Topic-level index (one level below module)
        for c in sorted(mp.iterdir()):
            if not c.is_dir():
                continue
            mds = sorted(c.glob("*.md"))
            mds = [x for x in mds if x.name != "index.md"]
            if not mds:
                continue
            topic_title = c.name.replace("-", " ")
            ttj = json.dumps(topic_title, ensure_ascii=False)
            tlines = [
                "---",
                f"title: {ttj}",
                f"description: {ttj}",
                "published: true",
                f"date: {d}",
                "tags: carmen_cloud,documentation",
                "editor: markdown",
                f"dateCreated: {d}",
                "---",
                "",
                "---",
                f"title: {ttj}",
                "weight: 1",
                "---",
                "",
                f"# {topic_title}",
                "",
            ]
            for md in mds:
                lbl = link_label_for_article(md)
                tlines.append(f"- [{escape_md_link_text(lbl)}](./{md.name})")
            (c / "index.md").write_text("\n".join(tlines) + "\n", encoding="utf-8")


def main() -> int:
    if not SRC.is_dir():
        print("Source not found:", SRC, file=sys.stderr)
        return 1

    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)

    docx_files = sorted(SRC.rglob("*.docx"))
    docx_files = [p for p in docx_files if p.name != ".DS_Store"]
    if not docx_files:
        print("No .docx under", SRC, file=sys.stderr)
        return 1

    for docx in docx_files:
        mapped = drive_docx_to_dest_parts(docx)
        if not mapped:
            print("Skip (unknown top):", docx, file=sys.stderr)
            continue
        out_md, rel_from_dest = mapped
        rel_pos = rel_from_dest.as_posix()
        image_rel_key = rel_pos[:-3] if rel_pos.endswith(".md") else rel_pos
        module = rel_from_dest.parts[0]
        docx_to_markdown(docx, out_md, module, image_rel_key)
        print("Wrote", out_md.relative_to(REPO))

    ensure_six_module_dirs()
    write_root_and_module_indexes()
    print("Done. If new .docx appear under the Drive folder, re-run this script.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--indexes-only":
        if not DEST.is_dir():
            print("Missing", DEST, file=sys.stderr)
            raise SystemExit(1)
        ensure_six_module_dirs()
        write_root_and_module_indexes()
        print("Regenerated index.md files under", DEST)
        raise SystemExit(0)
    raise SystemExit(main())
