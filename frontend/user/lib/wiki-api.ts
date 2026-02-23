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

/* =========================
   Categories
========================= */

// GET /api/wiki/categories
export async function getCategories(): Promise<{
  items: { slug: string; title: string }[];
}> {
  const res = await fetch(`${BASE_URL}/api/wiki/categories`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }

  return res.json();
}

// GET /api/wiki/category/:slug
export async function getCategory(slug: string): Promise<{
  category: string;
  items: {
    slug: string;
    title: string;
    description?: string;
    published?: boolean;
    date?: string;
    path: string;
    tags?: string[];
    editor?: string;
    dateCreated?: string;
    publishedAt?: string;
  }[];
}> {
  const res = await fetch(
    `${BASE_URL}/api/wiki/category/${slug}`,
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

let cachedList: WikiListItem[] | null = null;

// GET /api/wiki/list — ใช้ดึงรายการบทความทั้งหมดครั้งเดียวแล้ว cache ไว้ใน memory ฝั่ง browser
export async function getAllArticles(): Promise<WikiListItem[]> {
  if (cachedList) return cachedList;

  const res = await fetch(`${BASE_URL}/api/wiki/list`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch wiki list");
  }

  const data = (await res.json()) as { items?: WikiListItem[] };
  cachedList = data.items ?? [];
  return cachedList;
}

// แปลง path จาก wiki (เช่น configuration/CF-company_profile.md) → route ของหน้า content
export function wikiPathToRoute(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return "/";

  const category = parts[0];
  const file = parts[parts.length - 1];
  const slug = file.replace(/\.md$/i, "");

  return `/categories/${category}/${slug}`;
}

// หาบทความที่ตรงกับคำค้นมากที่สุดจาก title + path แล้วคืนทั้ง item และ route
export async function findBestArticleForQuery(query: string): Promise<{
  item: WikiListItem | null;
  route: string | null;
}> {
  const q = query.trim().toLowerCase();
  if (!q) return { item: null, route: null };

  const items = await getAllArticles();
  if (items.length === 0) return { item: null, route: null };

  // ให้คะแนนแบบง่าย ๆ จาก title + path
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

  const best = scored[0]?.item ?? null;
  if (!best) return { item: null, route: null };

  return {
    item: best,
    route: wikiPathToRoute(best.path),
  };
}

/* =========================
   Content
========================= */

// GET /api/wiki/content/*
export async function getContent(path: string): Promise<{
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
  const res = await fetch(
    `${BASE_URL}/api/wiki/content/${path}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch content: ${path}`);
  }

  return res.json();
}

/* =========================
   Chat (RAG) — ใช้แทนการเทสใน Postman
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

// POST /api/chat/ask — ถามคำถามจากคู่มือ (vector + Ollama + OpenClaw routing)
export async function askChat(
  question: string,
  preferredPath?: string
): Promise<ChatAskResponse> {
  const res = await fetch(`${BASE_URL}/api/chat/ask`, {
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

export async function searchWiki(query: string): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(`${BASE_URL}/api/wiki/search?q=${encodeURIComponent(q)}`, {
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