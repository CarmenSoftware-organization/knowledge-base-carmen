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
