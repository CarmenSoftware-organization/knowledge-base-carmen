"""
ความสะอาด Markdown หลังแปลงจาก Word (Carmen / mammoth).

ลบบรรทัดฟิลด์แบบฟอร์ม เช่น "Title : ..." ออกจากเนื้อหา — ไม่ให้แสดงซ้ำกับหัวข้อหน้า Wiki
"""
from __future__ import annotations

import re
from pathlib import Path

# บรรทัดเดียวจาก template Word — ใช้เฉพาะ "Title" ตัว T ใหญ่ เพื่อไม่ชนกับ YAML `title:` ใน frontmatter บล็อกที่สอง
_TITLE_LINE_PLAIN = re.compile(r"^\s*Title\s*:.*$")
_TITLE_LINE_BOLD = re.compile(r"^\s*\*\*Title\s*:\s*.+\*\*\s*$")


def title_from_mammoth_body(body: str, fallback: str) -> str:
    """ดึงชื่อเรื่องจาก body ก่อนลบบรรทัด Title — ลำดับ: Title : … → # heading → fallback"""
    for line in body.splitlines():
        t = line.strip()
        m = re.match(r"^Title\s*:\s*(.+)$", t)
        if m:
            got = m.group(1).strip()
            if got:
                return got
    for line in body.splitlines():
        t = line.strip()
        if t.startswith("#"):
            return re.sub(r"^#+\s*", "", t).strip() or fallback
    return fallback


def strip_docx_title_body_lines(body: str) -> str:
    """ลบบรรทัดที่เป็นฟิลด์ Title : … (และแบบห่อ **…**) ออกจากส่วน body"""
    out_lines: list[str] = []
    removed = False
    for line in body.splitlines():
        if _TITLE_LINE_PLAIN.match(line) or _TITLE_LINE_BOLD.match(line):
            removed = True
            continue
        out_lines.append(line)
    if not removed:
        return body
    s = "\n".join(out_lines)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.rstrip() + ("\n" if s.strip() else "")


def split_yaml_front_matter(text: str) -> tuple[str | None, str]:
    """
    คืน (frontmatter รวม --- ปิดท้ายและ newline ต่อท้าย, body)
    ถ้าไม่มี frontmatter คืน (None, text เต็ม)
    """
    if not text.startswith("---"):
        return None, text
    raw_lines = text.splitlines(keepends=True)
    if not raw_lines or raw_lines[0].strip() != "---":
        return None, text
    for i in range(1, len(raw_lines)):
        if raw_lines[i].strip() == "---":
            head = "".join(raw_lines[: i + 1])
            body = "".join(raw_lines[i + 1 :])
            return head, body
    return None, text


def strip_title_lines_from_markdown_document(text: str) -> str:
    """ลบบรรทัด Title : เฉพาะใน body (หลัง YAML ถ้ามี)"""
    head, body = split_yaml_front_matter(text)
    if head is None:
        return strip_docx_title_body_lines(text)
    return head + strip_docx_title_body_lines(body)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def main(argv: list[str]) -> int:
    import sys

    root = Path(argv[1]).resolve() if len(argv) > 1 else _repo_root() / "contents" / "carmen"
    if not root.is_dir():
        print("Not a directory:", root, file=sys.stderr)
        return 1
    changed = 0
    for p in sorted(root.rglob("*.md")):
        s = p.read_text(encoding="utf-8")
        n = strip_title_lines_from_markdown_document(s)
        if n != s:
            p.write_text(n, encoding="utf-8")
            print("updated", p.relative_to(_repo_root()))
            changed += 1
    print(f"Done. {changed} file(s) updated.")
    return 0


if __name__ == "__main__":
    import sys

    raise SystemExit(main(sys.argv))
