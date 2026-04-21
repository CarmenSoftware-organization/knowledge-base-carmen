#!/usr/bin/env python3
"""
คัดลอกไฟล์ .md จากโฟลเดอร์แหล่ง → ไปไว้ที่ carmen_cloud/faq/ (root โปรเจกต์)

ชื่อเดิม: kb_md_to_faq_md.py (เลิกใช้โฟลเดอร์ kb ใต้ carmen_cloud แล้ว)

─────────────────────────────────────────────────────────────────
FAQ กับ DB มี 2 แบบ (อย่าสับสน)
─────────────────────────────────────────────────────────────────

(1) ไฟล์ .md ใต้ carmen_cloud/faq/ → ใช้เป็นบทความ Wiki + ค้นหา/แชท (vector)

    - ไม่ได้เข้าตาราง public.faq_modules / faq_entries
    - หลังมีไฟล์ใน repo แล้ว ให้ backend ดึงโค้ด + สร้าง embedding:

        ./scripts/sync-wiki-and-reindex-carmen.sh

      หรือ:

        curl -sS -X POST "http://localhost:8080/api/wiki/sync"
        curl -sS -X POST "http://localhost:8080/api/index/rebuild?bu=carmen"

    - ข้อมูล vector อยู่ที่ schema carmen ตาราง documents, document_chunks
      (ต้องตั้ง LLM_API_KEY หรือ OPENROUTER_API_KEY ให้ใช้ OpenRouter)

(2) หน้าเว็บ /faq แบบโครงสร้าง module > หมวด > คำถาม (ตาราง public.faq_*)

    - ไม่ได้เติมอัตโนมัติจากโฟลเดอร์ faq/
    - ต้องใส่ข้อมูลผ่าน flow ที่ทีมออกแบบ (หรือสคริปต์ import แยกในอนาคต)

─────────────────────────────────────────────────────────────────

การจัดการรูป: ลิงก์ `_images/...` ให้วางรูปที่ carmen_cloud/faq/_images/
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def update_image_links(md: str) -> str:
    md = re.sub(r"!\[\]\(\s*_images/", "![](_images/", md)
    md = re.sub(r"!\[\]\(\s*_images\\", "![](_images/", md)
    md = md.replace("../kb/_images/", "_images/")
    md = md.replace("![](/../kb/_images/", "![](_images/")
    md = md.replace("/contents/carmen_cloud/", "/carmen_cloud/")
    return md


def main() -> None:
    p = argparse.ArgumentParser(
        description="Copy markdown files into carmen_cloud/faq"
    )
    p.add_argument(
        "--source-dir",
        "--from-dir",
        dest="source_dir",
        required=True,
        help="โฟลเดอร์แหล่ง .md",
    )
    p.add_argument(
        "--faq-dir",
        required=True,
        help="ปลายทาง (เช่น carmen_cloud/faq)",
    )
    p.add_argument(
        "--exclude-index",
        action="store_true",
        help="ไม่คัดลอก index.md จากแหล่ง",
    )
    args = p.parse_args()

    src = Path(args.source_dir)
    faq_dir = Path(args.faq_dir)

    if not src.is_dir():
        raise SystemExit(f"Source dir not found: {src}")
    faq_dir.mkdir(parents=True, exist_ok=True)

    copied = 0
    for md_path in sorted(src.rglob("*.md")):
        if args.exclude_index and md_path.name.lower() == "index.md":
            continue
        rel = md_path.relative_to(src)
        dst = faq_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        text = md_path.read_text(encoding="utf-8")
        text = update_image_links(text)
        dst.write_text(text, encoding="utf-8")
        copied += 1

    print(f"Copied {copied} md files -> {faq_dir}")
    print("Next: run scripts/sync-wiki-and-reindex-carmen.sh (or curl sync + rebuild) to index vectors.")


if __name__ == "__main__":
    main()
