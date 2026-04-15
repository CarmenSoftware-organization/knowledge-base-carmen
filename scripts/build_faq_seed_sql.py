#!/usr/bin/env python3
"""
Generate FAQ seed SQL from markdown files.

Default target is Blueledgers FAQ markdown:
  contents/blueledgers/faq/**/*.md
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
from dataclasses import dataclass
from pathlib import Path


def split_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    closing = text.find("\n---\n", 4)
    if closing < 0:
        return {}, text
    raw = text[4:closing]
    body = text[closing + 5 :]
    meta: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, body


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def clean_title(value: str) -> str:
    return normalize_spaces(value.replace("_", " ").replace("-", " "))


def slugify(value: str) -> str:
    text = normalize_spaces(value).lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = text.replace("_", "-")
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "untitled"


def parse_tags(meta: dict[str, str]) -> list[str]:
    raw = meta.get("tags", "")
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


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

    out: dict[str, str] = {}
    for i, match in enumerate(matches):
        raw_label = normalize_spaces(match.group(1).lower())
        key = label_map.get(raw_label)
        if not key:
            continue
        start = match.start(2)
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        value = body[start:end].strip()
        if value:
            out[key] = value
    return out


def find_heading_value(body: str, patterns: list[str]) -> str:
    heading_re = re.compile(r"(?m)^(#{1,6})\s+(.+?)\s*$")
    matches = list(heading_re.finditer(body))
    if not matches:
        return ""
    normalized_patterns = [p.lower() for p in patterns]
    for i, match in enumerate(matches):
        title = normalize_spaces(match.group(2)).lower()
        if any(p in title for p in normalized_patterns):
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
            return body[start:end].strip()
    return ""


def first_heading(body: str) -> str:
    m = re.search(r"(?m)^#\s+(.+?)\s*$", body)
    return normalize_spaces(m.group(1)) if m else ""


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_text_array(values: list[str]) -> str:
    if not values:
        return "'{}'::text[]"
    quoted = ",".join(sql_literal(v) for v in values)
    return f"ARRAY[{quoted}]::text[]"


@dataclass(frozen=True)
class Hierarchy:
    module: str
    submodule: str
    category: str


@dataclass
class Entry:
    hierarchy: Hierarchy
    title: str
    sample_case: str
    problem_cause: str
    solution: str
    tags: list[str]


def parse_hierarchy_from_meta_or_stem(meta: dict[str, str], stem: str, parent_folder: str = "") -> Hierarchy:
    mod = meta.get("faq_module", "").strip()
    sub = meta.get("faq_submodule", "").strip()
    cat = meta.get("faq_category", "").strip()
    if mod and sub and cat:
        return Hierarchy(mod, sub, cat)

    if parent_folder:
        from_folder = [p.strip() for p in parent_folder.split("-") if p.strip()]
        if len(from_folder) >= 3:
            return Hierarchy(from_folder[0], from_folder[1], "-".join(from_folder[2:]))
        if len(from_folder) == 2:
            return Hierarchy(from_folder[0], from_folder[1], "General")
        if len(from_folder) == 1:
            return Hierarchy(from_folder[0], "General", "General")

    parts = [p.strip() for p in stem.replace("_", " ").split("-") if p.strip()]
    if len(parts) >= 3:
        return Hierarchy(parts[0], parts[1], "-".join(parts[2:]))
    if len(parts) == 2:
        return Hierarchy(parts[0], parts[1], "General")
    if len(parts) == 1:
        return Hierarchy(parts[0], "General", "General")
    return Hierarchy("General", "General", "General")


def build_entries(faq_dir: Path) -> list[Entry]:
    entries: list[Entry] = []
    for md in sorted(faq_dir.rglob("*.md")):
        if md.name.lower() == "index.md":
            continue
        raw = md.read_text(encoding="utf-8")
        meta, body = split_frontmatter(raw)
        parent_folder = ""
        try:
            rel = md.relative_to(faq_dir)
            if len(rel.parts) > 1:
                parent_folder = rel.parts[0]
        except ValueError:
            parent_folder = md.parent.name
        hierarchy = parse_hierarchy_from_meta_or_stem(meta, md.stem, parent_folder)
        labeled = parse_labeled_sections(body)

        title = (
            meta.get("title", "").strip()
            or labeled.get("title", "")
            or first_heading(body)
            or clean_title(md.stem)
        )
        sample = find_heading_value(body, ["ตัวอย่างเคส", "sample case", "example"]) or labeled.get("sample_case", "")
        cause = find_heading_value(body, ["สาเหตุ", "problem cause", "cause"]) or labeled.get("problem_cause", "")
        solution = find_heading_value(body, ["วิธีแก้", "แนวทางแก้", "solution"]) or labeled.get("solution", "")
        if not solution:
            solution = body.strip()

        tags = parse_tags(meta)
        if not tags and labeled.get("tags"):
            tags = [x.strip() for x in labeled["tags"].split(",") if x.strip()]
        entries.append(
            Entry(
                hierarchy=hierarchy,
                title=title,
                sample_case=sample,
                problem_cause=cause,
                solution=solution,
                tags=tags,
            )
        )
    return entries


def render_sql(entries: list[Entry], bu_slug: str, purge_bu: bool) -> str:
    lines: list[str] = []
    now = dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    lines.append(f"-- generated at {now}")
    lines.append(f"-- bu: {bu_slug}")
    lines.append("BEGIN;")
    lines.append("")
    lines.append(
        "DO $$ BEGIN "
        f"IF NOT EXISTS (SELECT 1 FROM public.business_units WHERE slug = {sql_literal(bu_slug)}) "
        f"THEN RAISE EXCEPTION 'BU not found: {bu_slug}'; END IF; END $$;"
    )
    lines.append("")

    if purge_bu:
        lines.extend(
            [
                "-- reset existing FAQ tree for this BU",
                "DELETE FROM public.faq_entries e",
                "USING public.faq_categories c, public.faq_submodules s, public.faq_modules m, public.business_units bu",
                "WHERE e.category_id = c.id",
                "  AND c.submodule_id = s.id",
                "  AND s.module_id = m.id",
                "  AND m.bu_id = bu.id",
                f"  AND bu.slug = {sql_literal(bu_slug)};",
                "",
                "DELETE FROM public.faq_categories c",
                "USING public.faq_submodules s, public.faq_modules m, public.business_units bu",
                "WHERE c.submodule_id = s.id",
                "  AND s.module_id = m.id",
                "  AND m.bu_id = bu.id",
                f"  AND bu.slug = {sql_literal(bu_slug)};",
                "",
                "DELETE FROM public.faq_submodules s",
                "USING public.faq_modules m, public.business_units bu",
                "WHERE s.module_id = m.id",
                "  AND m.bu_id = bu.id",
                f"  AND bu.slug = {sql_literal(bu_slug)};",
                "",
                "DELETE FROM public.faq_modules m",
                "USING public.business_units bu",
                "WHERE m.bu_id = bu.id",
                f"  AND bu.slug = {sql_literal(bu_slug)};",
                "",
            ]
        )

    modules: list[str] = []
    submodules: list[tuple[str, str]] = []
    categories: list[tuple[str, str, str]] = []
    seen_mod: set[str] = set()
    seen_sub: set[tuple[str, str]] = set()
    seen_cat: set[tuple[str, str, str]] = set()

    for item in entries:
        mod = item.hierarchy.module
        sub = item.hierarchy.submodule
        cat = item.hierarchy.category
        if mod not in seen_mod:
            seen_mod.add(mod)
            modules.append(mod)
        if (mod, sub) not in seen_sub:
            seen_sub.add((mod, sub))
            submodules.append((mod, sub))
        if (mod, sub, cat) not in seen_cat:
            seen_cat.add((mod, sub, cat))
            categories.append((mod, sub, cat))

    lines.append("-- upsert modules")
    for i, mod in enumerate(modules, start=1):
        mod_slug = slugify(mod)
        lines.append(
            "INSERT INTO public.faq_modules (bu_id, name, slug, sort_order)\n"
            "SELECT bu.id, {name}, {slug}, {sort_order}\n"
            "FROM public.business_units bu\n"
            "WHERE bu.slug = {bu}\n"
            "ON CONFLICT (bu_id, slug) DO UPDATE\n"
            "SET name = EXCLUDED.name,\n"
            "    sort_order = EXCLUDED.sort_order;".format(
                name=sql_literal(mod),
                slug=sql_literal(mod_slug),
                sort_order=i * 10,
                bu=sql_literal(bu_slug),
            )
        )
    lines.append("")

    lines.append("-- upsert submodules")
    for i, (mod, sub) in enumerate(submodules, start=1):
        mod_slug = slugify(mod)
        sub_slug = slugify(sub)
        lines.append(
            "INSERT INTO public.faq_submodules (module_id, name, slug, sort_order)\n"
            "SELECT m.id, {name}, {slug}, {sort_order}\n"
            "FROM public.faq_modules m\n"
            "JOIN public.business_units bu ON bu.id = m.bu_id\n"
            "WHERE bu.slug = {bu} AND m.slug = {mod_slug}\n"
            "ON CONFLICT (module_id, slug) DO UPDATE\n"
            "SET name = EXCLUDED.name,\n"
            "    sort_order = EXCLUDED.sort_order;".format(
                name=sql_literal(sub),
                slug=sql_literal(sub_slug),
                sort_order=i * 10,
                bu=sql_literal(bu_slug),
                mod_slug=sql_literal(mod_slug),
            )
        )
    lines.append("")

    lines.append("-- upsert categories")
    for i, (mod, sub, cat) in enumerate(categories, start=1):
        mod_slug = slugify(mod)
        sub_slug = slugify(sub)
        cat_slug = slugify(cat)
        lines.append(
            "INSERT INTO public.faq_categories (submodule_id, name, slug, sort_order)\n"
            "SELECT s.id, {name}, {slug}, {sort_order}\n"
            "FROM public.faq_submodules s\n"
            "JOIN public.faq_modules m ON m.id = s.module_id\n"
            "JOIN public.business_units bu ON bu.id = m.bu_id\n"
            "WHERE bu.slug = {bu}\n"
            "  AND m.slug = {mod_slug}\n"
            "  AND s.slug = {sub_slug}\n"
            "ON CONFLICT (submodule_id, slug) DO UPDATE\n"
            "SET name = EXCLUDED.name,\n"
            "    sort_order = EXCLUDED.sort_order;".format(
                name=sql_literal(cat),
                slug=sql_literal(cat_slug),
                sort_order=i * 10,
                bu=sql_literal(bu_slug),
                mod_slug=sql_literal(mod_slug),
                sub_slug=sql_literal(sub_slug),
            )
        )
    lines.append("")

    lines.append("-- insert FAQ entries")
    for item in entries:
        mod_slug = slugify(item.hierarchy.module)
        sub_slug = slugify(item.hierarchy.submodule)
        cat_slug = slugify(item.hierarchy.category)
        lines.append(
            "INSERT INTO public.faq_entries\n"
            "  (category_id, title, sample_case, problem_cause, solution, tags, is_active, created_by)\n"
            "SELECT c.id, {title}, {sample}, {cause}, {solution}, {tags}, TRUE, 'seed-script'\n"
            "FROM public.faq_categories c\n"
            "JOIN public.faq_submodules s ON s.id = c.submodule_id\n"
            "JOIN public.faq_modules m ON m.id = s.module_id\n"
            "JOIN public.business_units bu ON bu.id = m.bu_id\n"
            "WHERE bu.slug = {bu}\n"
            "  AND m.slug = {mod_slug}\n"
            "  AND s.slug = {sub_slug}\n"
            "  AND c.slug = {cat_slug};".format(
                title=sql_literal(item.title),
                sample=sql_literal(item.sample_case),
                cause=sql_literal(item.problem_cause),
                solution=sql_literal(item.solution),
                tags=sql_text_array(item.tags),
                bu=sql_literal(bu_slug),
                mod_slug=sql_literal(mod_slug),
                sub_slug=sql_literal(sub_slug),
                cat_slug=sql_literal(cat_slug),
            )
        )
    lines.append("")
    lines.append("COMMIT;")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build FAQ seed SQL from markdown")
    parser.add_argument("--faq-dir", default="contents/blueledgers/faq", help="FAQ markdown directory")
    parser.add_argument("--bu", default="blueledgers", help="Business unit slug")
    parser.add_argument("--out-sql", default="scripts/seed_blueledgers_faq.sql", help="Output SQL file")
    parser.add_argument(
        "--no-purge",
        action="store_true",
        help="Do not delete current FAQ records of this BU before inserting",
    )
    args = parser.parse_args()

    faq_dir = Path(args.faq_dir)
    if not faq_dir.is_dir():
        raise SystemExit(f"FAQ dir not found: {faq_dir}")

    entries = build_entries(faq_dir)
    sql = render_sql(entries, args.bu, purge_bu=not args.no_purge)

    out_path = Path(args.out_sql)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(sql, encoding="utf-8")

    print(f"FAQ entries: {len(entries)}")
    print(f"SQL written to: {out_path}")


if __name__ == "__main__":
    main()
