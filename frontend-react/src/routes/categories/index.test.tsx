import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

mock.module("@/lib/wiki-api", () => ({
  getCategories: jest.fn().mockResolvedValue({ items: [{ slug: "ap", title: "AP" }] }),
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
  getSidebarTree: jest.fn().mockResolvedValue([]),
  getBusinessUnits: jest.fn().mockResolvedValue({ items: [] }),
  getAllArticles: jest.fn().mockResolvedValue([]),
  searchWiki: jest.fn().mockResolvedValue([]),
  setSelectedBU: jest.fn(),
  clearWikiClientCaches: jest.fn(),
  invalidateSidebarCache: jest.fn(),
  getCategory: jest.fn().mockResolvedValue({ category: "", items: [] }),
  getContent: jest.fn().mockResolvedValue({ content: "", title: "" }),
  wikiPathToRoute: jest.fn().mockReturnValue("/"),
  wikiDirFromContentPath: jest.fn().mockReturnValue(""),
  resolveWikiMarkdownHref: jest.fn().mockReturnValue("/"),
  findBestArticleForQuery: jest.fn().mockResolvedValue({ route: "/" }),
  normalizeWikiRelPath: jest.fn().mockImplementation((p: string) => p),
  encodeWikiPathForFetch: jest.fn().mockImplementation((p: string) => p),
  askChat: jest.fn(),
  getActivityLogs: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  syncWiki: jest.fn().mockResolvedValue({ ok: true, message: "ok" }),
  rebuildIndex: jest.fn().mockResolvedValue({ message: "ok" }),
}));

const { default: Categories, categoriesLoader } = await import("./index");

describe("categories route", () => {
  it("renders categories from loader", async () => {
    const r = createMemoryRouter(
      [{ path: "/categories", element: <Categories />, loader: categoriesLoader }],
      { initialEntries: ["/categories"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
