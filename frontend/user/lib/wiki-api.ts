import Fuse from "fuse.js";
import { API_BASE, DEFAULT_BU } from "./config";

/* =========================
   Types
 ========================= */

export type WikiListItem = {
  path: string;
  title: string;
  description?: string;
  published?: boolean;
  date?: string;
  tags?: string[];
  editor?: string;
  dateCreated?: string;
  publishedAt?: string;
};

export type BusinessUnit = {
  id: number;
  name: string;
  slug: string;
  description?: string;
};

/* =========================
   Business Units
 ========================= */

export async function getBusinessUnits(): Promise<{ items: BusinessUnit[] }> {
  const res = await fetch(`${API_BASE}/api/business-units`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch business units");
  return res.json();
}

export function getSelectedBUClient(): string {
  if (typeof window === "undefined") return DEFAULT_BU;
  const match = document.cookie.match(/(^| )selected_bu=([^;]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[2]).trim().toLowerCase();
    } catch {
      return match[2].trim().toLowerCase();
    }
  }
  return DEFAULT_BU;
}

export function setSelectedBU(slug: string) {
  if (typeof window !== "undefined") {
    const normalized = (slug || DEFAULT_BU).trim().toLowerCase();
    const maxAge = 60 * 60 * 24 * 30;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `selected_bu=${encodeURIComponent(
      normalized,
    )}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
    clearWikiClientCaches();
    window.dispatchEvent(new Event("bu-changed"));
  }
}

/* =========================
   Categories
 ========================= */

// GET /api/wiki/categories
export async function getCategories(
  bu?: string,
  fetchOptions?: RequestInit,
): Promise<{
  items: { slug: string; title: string }[];
}> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(`${API_BASE}/api/wiki/categories?bu=${selectedBU}`, {
    cache: "no-store",
    ...fetchOptions,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }

  return res.json();
}

/* =========================
   Sidebar Tree (single-call optimized)
 ========================= */

export type SidebarArticle = {
  slug: string;
  title: string;
  path: string;
  weight?: number;
};

export type SidebarCategory = {
  slug: string;
  title: string;
  weight?: number;
  articles: SidebarArticle[];
};

const SIDEBAR_TTL = 5 * 60 * 1000; // 5 minutes
let sidebarCache: { [bu: string]: { data: SidebarCategory[]; ts: number } } =
  {};

// GET /api/wiki/sidebar — returns full sidebar tree in a single request
export async function getSidebarTree(bu?: string): Promise<SidebarCategory[]> {
  const selectedBU = bu || getSelectedBUClient();
  const cached = sidebarCache[selectedBU];
  if (cached && Date.now() - cached.ts < SIDEBAR_TTL) return cached.data;

  const res = await fetch(`${API_BASE}/api/wiki/sidebar?bu=${selectedBU}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch sidebar tree");
  const json = await res.json();
  const data: SidebarCategory[] = json.categories ?? [];
  sidebarCache[selectedBU] = { data, ts: Date.now() };
  return data;
}

export function invalidateSidebarCache(bu?: string) {
  if (bu) {
    delete sidebarCache[bu];
  } else {
    sidebarCache = {};
  }
}

// GET /api/wiki/category/:slug
export async function getCategory(
  slug: string,
  bu?: string,
  fetchOptions?: RequestInit,
): Promise<{
  category: string;
  items: (WikiListItem & { slug: string })[];
}> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(
    `${API_BASE}/api/wiki/category/${slug}?bu=${selectedBU}`,
    { cache: "no-store", ...fetchOptions },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch category: ${slug}`);
  }

  return res.json();
}

/* =========================
   List + Search (สำหรับ hero search)
 ========================= */

let cachedList: { [bu: string]: WikiListItem[] } = {};

/** Call when BU changes so list/search/sidebar never reuse another unit's data. */
export function clearWikiClientCaches() {
  sidebarCache = {};
  cachedList = {};
}

// GET /api/wiki/list
export async function getAllArticles(bu?: string): Promise<WikiListItem[]> {
  const selectedBU = bu || getSelectedBUClient();
  if (cachedList[selectedBU]) return cachedList[selectedBU];

  const res = await fetch(`${API_BASE}/api/wiki/list?bu=${selectedBU}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch wiki list");
  }

  const data = (await res.json()) as { items?: WikiListItem[] };
  cachedList[selectedBU] = data.items ?? [];
  return cachedList[selectedBU];
}

// แปลง path จาก wiki → route ของหน้า content
export function wikiPathToRoute(path: string): string {
  const normalizedPath = path.replace(/\\/g, "/");
  const parts = normalizedPath
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean)
    .filter((p) => p !== "." && p !== "..");

  if (parts.length === 0) return "/";

  // Root level index.md
  if (parts.length === 1) {
    const slug = encodeURIComponent(parts[0].replace(/\.md$/i, ""));
    if (slug === "index") return "/";
    return `/categories/root/${slug}`;
  }

  const category = encodeURIComponent(parts[0]);
  const relPath = parts.slice(1).join("/");
  const file = parts[parts.length - 1];
  const baseName = file.replace(/\.md$/i, "");

  if (baseName === "index") {
    if (parts.length === 2) {
      return `/categories/${category}`;
    }
    const middle = parts
      .slice(1, -1)
      .map((p) => encodeURIComponent(p))
      .join("/");
    return `/categories/${category}/${middle}`;
  }

  const slug = encodeURIComponent(baseName);
  if (parts.length === 2) {
    return `/categories/${category}/${slug}`;
  }
  const middle = parts
    .slice(1, -1)
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `/categories/${category}/${middle}/${slug}`;
}

// หาบทความที่ตรงกับคำค้นมากที่สุดคืนทั้ง item และ route

export async function findBestArticleForQuery(
  query: string,
  bu?: string,
): Promise<{
  item: WikiListItem | null;
  route: string | null;
}> {
  const q = query.trim().toLowerCase();
  if (!q) return { item: null, route: null };

  // 1. Vector Search ก่อน (แม่นสุด)
  try {
    const aiResults = await searchWiki(query, bu);
    if (aiResults?.length > 0) {
      return { item: aiResults[0], route: wikiPathToRoute(aiResults[0].path) };
    }
  } catch {
    // vector search unavailable — fall through to keyword match
  }

  const items = await getAllArticles(bu);

  // 2. Exact keyword match
  const scored = items
    .map((item) => {
      const haystack = `${item.title} ${item.path}`.toLowerCase();
      let score = 0;
      if (item.title.toLowerCase().startsWith(q)) score += 5;
      if (item.path.toLowerCase().startsWith(q)) score += 3;
      if (haystack.includes(q)) score += 2;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return {
      item: scored[0].item,
      route: wikiPathToRoute(scored[0].item.path),
    };
  }

  // 3. Fuzzy fallback (พิมผิด / พิมไม่ครบ)
  const fuse = new Fuse(items, {
    keys: [
      { name: "title", weight: 0.7 },
      { name: "path", weight: 0.3 },
    ],
    threshold: 0.45,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const fuzzy = fuse.search(q);
  if (fuzzy.length > 0) {
    const best = fuzzy[0].item;
    return { item: best, route: wikiPathToRoute(best.path) };
  }

  return { item: null, route: null };
}

/* =========================
   Content
 ========================= */

// GET /api/wiki/content/*
// locale: "th" | "en" — when "en", backend translates content via Google Translate (if enabled)
export async function getContent(
  path: string,
  bu?: string,
  locale?: string,
  fetchOptions?: RequestInit,
): Promise<{
  path: string;
  title: string;
  description?: string;
  published?: boolean;
  date?: string;
  content: string;
  tags?: string[];
  editor?: string;
  dateCreated?: string;
  publishedAt?: string;
}> {
  const selectedBU = bu || getSelectedBUClient();
  const params = new URLSearchParams({ bu: selectedBU });
  if (locale) params.set("locale", locale);
  const res = await fetch(
    `${API_BASE}/api/wiki/content/${path}?${params.toString()}`,
    { cache: "no-store", ...fetchOptions },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch content: ${path}`);
  }

  return res.json();
}

/* =========================
   Chat (RAG)
 ========================= */

export type ChatSource = { articleId?: string; title?: string };

export type DisambiguationOption = {
  path: string;
  title?: string;
  reason?: string;
  score?: number;
};

export type ChatAskResponse = {
  answer: string;
  sources: ChatSource[];
  error?: string;
  needDisambiguation?: boolean;
  options?: DisambiguationOption[];
};

// POST /api/chat/ask
export async function askChat(
  question: string,
  preferredPath?: string,
  bu?: string,
): Promise<ChatAskResponse> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(`${API_BASE}/api/chat/ask?bu=${selectedBU}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: question.trim(),
      preferredPath,
    }),
  });

  const raw = await res.text();
  let data: ChatAskResponse;
  try {
    data = JSON.parse(raw) as ChatAskResponse;
  } catch {
    throw new Error(
      `Chat API returned non-JSON (HTTP ${
        res.status
      }). Check NEXT_PUBLIC_API_BASE (${API_BASE}) and that the Go backend is running. Body starts with: ${raw.slice(
        0,
        120,
      )}`,
    );
  }
  if (!res.ok) {
    throw new Error(data.error || "Failed to get answer");
  }
  return data;
}

export type SearchResultItem = WikiListItem & {
  snippet: string;
};

function normalizeQuery(q: string): string {
  return (
    q
      .trim()
      .toLowerCase()
      .normalize("NFC")
      // ✅ ตัดจุดระหว่างตัวอักษรไทยออก: ภ.ง.ด. → ภงด
      .replace(/(\p{L})\.(?=\p{L})/gu, "$1")
      // ✅ ตัดจุดท้ายคำออก: ภ.ง.ด. → ภ.ง.ด
      .replace(/\.$/, "")
      .replace(/\s+/g, " ")
  );
}

export async function searchWiki(
  query: string,
  bu?: string,
): Promise<SearchResultItem[]> {
  const q = normalizeQuery(query);
  if (q.length < 1) return [];

  const selectedBU = bu || getSelectedBUClient();
  try {
    const res = await fetch(
      `${API_BASE}/api/wiki/search?q=${encodeURIComponent(q)}&bu=${selectedBU}`,
      {
        cache: "no-store",
      },
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

/* =========================
   Activity Logs
 ========================= */

export type ActivityLog = {
  id: number;
  bu_slug?: string;
  user_id?: string | null;
  action: string;
  details?: Record<string, unknown> | string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string;
  timestamp?: string;
};

// GET /api/activity/list
export async function getActivityLogs(
  bu?: string,
  limit: number = 20,
  offset: number = 0,
  source: "all" | "user" | "admin" = "all",
): Promise<{
  items: ActivityLog[];
  total: number;
  limit: number;
  offset: number;
}> {
  const selectedBU = bu || getSelectedBUClient();
  const params = new URLSearchParams({
    bu: selectedBU,
    limit: String(limit),
    offset: String(offset),
    source,
  });
  const res = await fetch(`${API_BASE}/api/activity/list?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch activity logs");
  return res.json();
}

// POST /api/wiki/sync
export async function syncWiki(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/wiki/sync`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to sync wiki");
  return res.json();
}

// POST /api/index/rebuild
export async function rebuildIndex(bu?: string): Promise<{ message: string }> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(`${API_BASE}/api/index/rebuild?bu=${selectedBU}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to rebuild index");
  return res.json();
}
