#!/usr/bin/env python3
"""
คัดลอกไฟล์ KB (.md) ไปไว้ที่โฟลเดอร์ FAQ ของ Wiki.js

เป้าหมาย: ให้ Wiki.js แสดงหมวด `faq` (เช่น /categories/carmen_cloud/faq/...)
โดยใช้เนื้อหาจากชุด KB เดิม

การจัดการรูป:
- KB เดิมอ้างรูปเป็น `_images/<stem>/img-XXX.png`
- เมื่อย้ายไปไว้ใต้ `faq/` จะแก้ลิงก์ให้ชี้ไปที่ `../kb/_images/...`
  (ไม่ต้องก็อปไฟล์รูปซ้ำ)
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


def update_image_links(md: str) -> str:
    # แก้ path ของรูปใน markdown สำหรับภาพที่เป็น local relative:
    # ![](_images/<stem>/img-001.png)  -> ![](../kb/_images/<stem>/img-001.png)
    md = re.sub(r"!\[\]\(\s*_images/", "![](/__KB_PLACEHOLDER__images/", md)
    md = md.replace("/__KB_PLACEHOLDER__images/", "../kb/_images/")
    # เผื่อบางครั้งมี backslash
    md = re.sub(r"!\[\]\(\s*_images\\", "![](../kb/_images/", md)
    return md


def main() -> None:
    p = argparse.ArgumentParser(description="Mirror KB markdown into FAQ folder")
    p.add_argument("--kb-dir", required=True, help="แหล่ง KB md (เช่น contents/carmen_cloud/kb)")
    p.add_argument("--faq-dir", required=True, help="ปลายทาง FAQ md (เช่น contents/carmen_cloud/faq)")
    p.add_argument(
        "--exclude-index",
        action="store_true",
        help="ไม่คัดลอก kb/index.md (แนะนำ เพราะเราจะสร้าง faq/index.md แยกเอง)",
    )
    args = p.parse_args()

    kb_dir = Path(args.kb_dir)
    faq_dir = Path(args.faq_dir)

    if not kb_dir.is_dir():
        raise SystemExit(f"KB dir not found: {kb_dir}")
    faq_dir.mkdir(parents=True, exist_ok=True)

    copied = 0
    for md_path in sorted(kb_dir.glob("*.md")):
        if args.exclude_index and md_path.name.lower() in ("index.md",):
            continue
        dst = faq_dir / md_path.name
        text = md_path.read_text(encoding="utf-8")
        text = update_image_links(text)
        dst.write_text(text, encoding="utf-8")
        copied += 1

    print(f"Copied {copied} KB md files -> FAQ")
    print("Note: image links point to ../kb/_images (no image files copied).")


if __name__ == "__main__":
    main()

