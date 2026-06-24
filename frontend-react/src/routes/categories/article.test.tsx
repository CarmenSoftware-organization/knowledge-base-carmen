import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

const mockGetContent = jest.fn().mockResolvedValue({
  path: "ap/intro",
  title: "Intro",
  content: "---\ntitle: Intro\n---\n# Hi",
});

mock.module("@/lib/wiki-api", () => ({
  getContent: mockGetContent,
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
  getCategory: jest.fn().mockResolvedValue({ category: "ap", items: [] }),
  getSidebarTree: jest.fn().mockResolvedValue([]),
  getBusinessUnits: jest.fn().mockResolvedValue({ items: [] }),
  normalizeWikiRelPath: jest.fn().mockImplementation((p: string) => p),
  wikiDirFromContentPath: jest.fn().mockReturnValue("ap"),
  getAllArticles: jest.fn().mockResolvedValue([]),
  searchWiki: jest.fn().mockResolvedValue([]),
  setSelectedBU: jest.fn(),
  clearWikiClientCaches: jest.fn(),
  invalidateSidebarCache: jest.fn(),
  getCategories: jest.fn().mockResolvedValue({ items: [] }),
  wikiPathToRoute: jest.fn().mockReturnValue("/"),
  resolveWikiMarkdownHref: jest.fn().mockReturnValue("/"),
  encodeWikiPathForFetch: jest.fn().mockImplementation((p: string) => p),
  findBestArticleForQuery: jest.fn().mockResolvedValue({ route: "/" }),
  askChat: jest.fn(),
  getActivityLogs: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  syncWiki: jest.fn().mockResolvedValue({ ok: true, message: "ok" }),
  rebuildIndex: jest.fn().mockResolvedValue({ message: "ok" }),
}));

mock.module("@/lib/faq-cache", () => ({
  getCachedFaqNavItems: jest.fn().mockResolvedValue([]),
}));

mock.module("@/lib/locale", () => ({
  getLocaleFromClient: jest.fn().mockReturnValue("th"),
  setLocaleCookie: jest.fn(),
}));

const { default: Article, articleLoader } = await import("./article");

describe("article route", () => {
  it("renders an article from a splat path", async () => {
    const r = createMemoryRouter(
      [
        {
          path: "/categories/:category/*",
          element: <Article />,
          loader: articleLoader,
        },
      ],
      { initialEntries: ["/categories/ap/intro"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });

  it("renders missing-content fallback when content not found for non-faq category", async () => {
    mockGetContent
      .mockRejectedValueOnce(new Error("not found"))
      .mockRejectedValueOnce(new Error("not found"));

    const r = createMemoryRouter(
      [
        {
          path: "/categories/:category/*",
          element: <Article />,
          loader: articleLoader,
        },
      ],
      { initialEntries: ["/categories/ap/missing-doc"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
