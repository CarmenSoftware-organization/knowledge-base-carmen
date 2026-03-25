#!/usr/bin/env python3
"""
แปลงไฟล์ .docx ในโฟลเดอร์ KB เป็น .md สำหรับ Wiki / carmen_cloud / indexing

การติดตั้ง (ครั้งเดียว):
  pip install -r scripts/requirements-kb-convert.txt

การใช้งาน (จาก root โปรเจกต์) — ปลายทางแนะนำเป็น faq ไม่ใช้โฟลเดอร์ kb ใต้ carmen_cloud แล้ว:
  python scripts/kb_docx_to_md.py --input contents/KB --output carmen_cloud/faq
  python scripts/kb_docx_to_md.py --input contents/KB --output carmen_cloud/faq --mirror

--mirror: เขียน .md ทั้งที่ output และที่ input (แทนที่เฉพาะไฟล์ .md ที่สร้างใหม่)

หมายเหตุ: ค่าเริ่มต้นจะบันทึกรูปจาก Word เป็นไฟล์ใต้ `_images/<ชื่อบทความ>/`
  เพื่อไม่ให้เกิดบรรทัด base64 ยาวๆ (ที่ดูเหมือน "ภาษาเพี้ยน" ใน editor)
  ใช้ --inline-images ถ้าต้องการพฤติกรรมเดิม (embed data: URI)
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path


def slugify_stem(name: str) -> str:
    """ชื่อไฟล์ปลอดภัยสำหรับ URL / Git (คงอักษรไทยและตัวเลขไว้ได้บ้าง)."""
    stem = Path(name).stem
    # ตัดอักขระที่ path มักมีปัญหา
    stem = re.sub(r'[<>:"/\\|?*]', "", stem)
    stem = stem.strip()
    if not stem:
        stem = "untitled"
    # ย่อช่องว่าง
    stem = re.sub(r"\s+", " ", stem)
    return stem


def convert_one(
    docx: Path,
    out_md: Path,
    *,
    inline_images: bool = False,
) -> bool:
    try:
        import mammoth
        import mammoth.images
    except ImportError:
        print(
            "ต้องติดตั้ง mammoth ก่อน:\n  pip install -r scripts/requirements-kb-convert.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    stem = slugify_stem(docx.name)
    out_md.parent.mkdir(parents=True, exist_ok=True)

    kwargs = {}
    if not inline_images:
        img_dir = out_md.parent / "_images" / stem
        if img_dir.exists():
            shutil.rmtree(img_dir)
        img_dir.mkdir(parents=True, exist_ok=True)
        counter = {"i": 0}

        def save_image(image):
            counter["i"] += 1
            raw_ext = (image.content_type or "image/png").split("/")[-1].lower()
            if raw_ext in ("jpeg", "jpe"):
                raw_ext = "jpg"
            if raw_ext not in ("png", "jpg", "jpeg", "gif", "webp", "bmp"):
                raw_ext = "png"
            fname = f"img-{counter['i']:03d}.{raw_ext}"
            dest = img_dir / fname
            with image.open() as image_bytes:
                dest.write_bytes(image_bytes.read())
            rel = f"_images/{stem}/{fname}".replace("\\", "/")
            return {"src": rel}

        kwargs["convert_image"] = mammoth.images.img_element(save_image)

    with docx.open("rb") as f:
        result = mammoth.convert_to_markdown(f, **kwargs)
        md = result.value or ""
        if result.messages:
            for m in result.messages:
                print(f"  [{docx.name}] {m}", file=sys.stderr)

    # front matter บางอย่างช่วยให้ Wiki จัดหมวดได้ง่าย
    header = (
        "---\n"
        f"title: {docx.stem}\n"
        "published: true\n"
        "tags: faq,documentation\n"
        "editor: markdown\n"
        "---\n\n"
    )
    out_md.write_text(header + md, encoding="utf-8")
    return True


def main() -> None:
    p = argparse.ArgumentParser(description="Convert KB folder .docx to .md")
    p.add_argument("--input", required=True, help="โฟลเดอร์ที่มีไฟล์ .docx")
    p.add_argument(
        "--output",
        required=True,
        help="โฟลเดอร์ปลายทางสำหรับ .md (เช่น carmen_cloud/faq)",
    )
    p.add_argument(
        "--mirror",
        action="store_true",
        help="เขียน .md ลงใน input ด้วย (ชื่อเดียวกับ docx แต่เป็น .md)",
    )
    p.add_argument(
        "--inline-images",
        action="store_true",
        help="ฝังรูปเป็น data: URI ใน .md (ไฟล์ใหญ่มาก — ไม่แนะนำ)",
    )
    args = p.parse_args()

    inp = Path(args.input)
    out = Path(args.output)
    if not inp.is_dir():
        print(f"ไม่พบโฟลเดอร์: {inp}", file=sys.stderr)
        sys.exit(1)

    docx_files = sorted(inp.glob("*.docx"))
    if not docx_files:
        print(f"ไม่พบไฟล์ .docx ใน {inp}")
        return

    for docx in docx_files:
        stem = slugify_stem(docx.name)
        target = out / f"{stem}.md"
        print(f"{docx.name} -> {target}")
        convert_one(docx, target, inline_images=args.inline_images)
        if args.mirror:
            mirror_path = inp / f"{stem}.md"
            shutil.copy2(target, mirror_path)
            print(f"  (mirror) -> {mirror_path}")
            if not args.inline_images:
                src_imgs = out / "_images" / stem
                if src_imgs.is_dir():
                    dst_imgs = inp / "_images" / stem
                    if dst_imgs.exists():
                        shutil.rmtree(dst_imgs)
                    shutil.copytree(src_imgs, dst_imgs)
                    print(f"  (mirror images) -> {dst_imgs}")

    print(f"เสร็จ {len(docx_files)} ไฟล์")


if __name__ == "__main__":
    main()
