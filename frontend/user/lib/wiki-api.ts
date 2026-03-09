const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  const res = await fetch(`${BASE_URL}/api/business-units`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch business units");
  return res.json();
}

/**
 * ดึง BU ที่เลือกไว้ (Client-side เท่านั้น)
 */
export function getSelectedBUClient(): string {
  if (typeof window === "undefined") return "carmen";
  const match = document.cookie.match(/(^| )selected_bu=([^;]+)/);
  if (match) return match[2];
  return "carmen";
}

export function setSelectedBU(slug: string) {
  if (typeof window !== "undefined") {
    document.cookie = `selected_bu=${slug}; path=/; max-age=${60 * 60 * 24 * 30}`;
    window.dispatchEvent(new Event("bu-changed"));
  }
}

/* =========================
   Categories
========================= */

// GET /api/wiki/categories
export async function getCategories(bu?: string): Promise<{
  items: { slug: string; title: string }[];
}> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(`${BASE_URL}/api/wiki/categories?bu=${selectedBU}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }

  return res.json();
}

// GET /api/wiki/category/:slug
export async function getCategory(slug: string, bu?: string): Promise<{
  category: string;
  items: (WikiListItem & { slug: string })[];
}> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(
    `${BASE_URL}/api/wiki/category/${slug}?bu=${selectedBU}`, 
    { cache: "no-store" }
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

// GET /api/wiki/list
export async function getAllArticles(bu?: string): Promise<WikiListItem[]> {
  const selectedBU = bu || getSelectedBUClient();
  if (cachedList[selectedBU]) return cachedList[selectedBU];

  const res = await fetch(`${BASE_URL}/api/wiki/list?bu=${selectedBU}`, {
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
  const parts = normalizedPath.split("/").filter(Boolean);
  
  if (parts.length === 0) return "/";

  // Root level index.md
  if (parts.length === 1) {
    const slug = parts[0].replace(/\.md$/i, "");
    if (slug === "index") return "/";
    return `/categories/root/${slug}`;
  }

  const category = parts[0];
  const file = parts[parts.length - 1];
  const slug = file.replace(/\.md$/i, "");

  if (slug === "index") {
    return `/categories/${category}`;
  }

  return `/categories/${category}/${slug}`;
}

// หาบทความที่ตรงกับคำค้นมากที่สุดคืนทั้ง item และ route
export async function findBestArticleForQuery(query: string, bu?: string): Promise<{
  item: WikiListItem | null;
  route: string | null;
}> {
  const q = query.trim().toLowerCase();
  if (!q) return { item: null, route: null };

  // 1. ลองหาแบบ Keyword Match ก่อน
  const items = await getAllArticles(bu);
  const scored = items
    .map((item) => {
      const haystack = `${item.title} ${item.path}`.toLowerCase();
      let score = 0;
      if (haystack.includes(q)) score += 2;
      if (item.title.toLowerCase().startsWith(q)) score += 5;
      if (item.path.toLowerCase().startsWith(q)) score += 3;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const best = scored[0].item;
    return { item: best, route: wikiPathToRoute(best.path) };
  }

  // 2. ถ้า Keyword Match ไม่เจอ ให้ใช้ Semantic Search (AI)
  try {
    const aiResults = await searchWiki(query, bu);
    if (aiResults && aiResults.length > 0) {
      const best = aiResults[0];
      return { item: best, route: wikiPathToRoute(best.path) };
    }
  } catch (err) {
    console.error("Semantic search fallback failed:", err);
  }

  return { item: null, route: null };
}

/* =========================
   Content
========================= */

// GET /api/wiki/content/*
export async function getContent(path: string, bu?: string): Promise<{
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
  const res = await fetch(
    `${BASE_URL}/api/wiki/content/${path}?bu=${selectedBU}`,
    { cache: "no-store" }
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
  bu?: string
): Promise<ChatAskResponse> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(`${BASE_URL}/api/chat/ask?bu=${selectedBU}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: question.trim(),
      preferredPath,
    }),
  });

  const data = (await res.json()) as ChatAskResponse;
  if (!res.ok) {
    throw new Error(data.error || "Failed to get answer");
  }
  return data;
}

export type SearchResultItem = WikiListItem & {
  snippet: string;
};

export async function searchWiki(query: string, bu?: string): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const selectedBU = bu || getSelectedBUClient();
  try {
    const res = await fetch(`${BASE_URL}/api/wiki/search?q=${encodeURIComponent(q)}&bu=${selectedBU}`, {
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch (error) {
    console.error("Search Wiki Error:", error);
    return [];
  }
}

/* =========================
   Activity Logs
========================= */

export type ActivityLog = {
  id: number;
  bu_slug: string;
  user_id?: string | null;
  action: string;
  details?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
};

// GET /api/activity/list
export async function getActivityLogs(bu?: string, limit: number = 50, offset: number = 0): Promise<{ items: ActivityLog[] }> {
  const selectedBU = bu || getSelectedBUClient();
  const res = await fetch(`${BASE_URL}/api/activity/list?bu=${selectedBU}&limit=${limit}&offset=${offset}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch activity logs");
  return res.json();
}