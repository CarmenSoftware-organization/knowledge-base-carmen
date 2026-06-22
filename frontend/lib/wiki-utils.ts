import { categoryDisplayMap } from "@/configs/sidebar-map";

export function formatCategoryName(slug: string) {
  const key = (slug || "").trim().toLowerCase();
  if (key && categoryDisplayMap[key]) return categoryDisplayMap[key];
  return (slug || "").toUpperCase();
}

/** แปลงชื่อไฟล์ / slug เป็น label อ่านง่าย (ไม่บังคับ title case — รักษาภาษาไทย) */
export function humanizeWikiStem(stem: string): string {
  let s = stem.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    // keep
  }
  return s
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normTitleKey(s: string): string {
  return s.toLowerCase().replace(/[-_\s]+/g, " ").trim();
}

function stemFromWikiPath(path: string): string {
  const base = path.replace(/\\/g, "/").split("/").pop() || "";
  return base.replace(/\.md$/i, "");
}

/**
 * เลือกชื่อที่โชว์ในเมนู/การ์ด: ไม่โชว์ชื่อไฟล์ยาวหรือ error message เต็มย่อหน้าเมื่อมีทางเลือกอ่านง่ายกว่า
 */
export function displayWikiArticleTitle(
  title: string | undefined,
  slug: string,
  path: string,
): string {
  const stem = stemFromWikiPath(path) || slug;
  const human = humanizeWikiStem(stem);

  const t = (title || "").trim();
  if (!t) return human;

  if (normTitleKey(t) === normTitleKey(stem)) return human;
  if (normTitleKey(t.replace(/[-_]+/g, " ")) === normTitleKey(stem)) {
    return human;
  }
  if (normTitleKey(t.replace(/\s+/g, "-")) === normTitleKey(slug)) {
    return human;
  }

  if (
    t.length > 45 &&
    (/error\s*:/i.test(t) ||
      /\[Dr\/?Cr/i.test(t) ||
      (/\\/.test(t) && /error/i.test(t)))
  ) {
    return human;
  }

  return t;
}

export function getCategoryColor(slug: string) {
  return "bg-primary/10 text-primary border-primary/20";
}
