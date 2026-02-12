const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/* =========================
   Categories
========================= */

// GET /api/wiki/categories
export async function getCategories(): Promise<{
  items: { slug: string }[];
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
    path: string;
    tags?: string[];
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
   Content
========================= */

// GET /api/wiki/content/*
export async function getContent(path: string): Promise<{
  path: string;
  title: string;
  content: string;
  tags?: string[];
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

export type ChatAskResponse = {
  answer: string;
  sources: ChatSource[];
  error?: string;
};

// POST /api/chat/ask — ถามคำถามจากคู่มือ (vector + Ollama)
export async function askChat(question: string): Promise<ChatAskResponse> {
  const res = await fetch(`${BASE_URL}/api/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: question.trim() }),
  });

  const data = (await res.json()) as ChatAskResponse;
  if (!res.ok) {
    throw new Error(data.error || "Failed to get answer");
  }
  return data;
}
