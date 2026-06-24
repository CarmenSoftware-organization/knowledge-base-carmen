import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

mock.module("@/lib/wiki-api", () => ({
  getCategory: jest.fn().mockResolvedValue({
    category: "ap",
    items: [{ slug: "invoice", path: "ap/invoice.md", title: "Invoice" }],
  }),
  getContent: jest.fn().mockResolvedValue({ content: "", title: "AP" }),
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
  getSidebarTree: jest.fn().mockResolvedValue([]),
  getBusinessUnits: jest.fn().mockResolvedValue({ items: [] }),
  getAllArticles: jest.fn().mockResolvedValue([]),
  searchWiki: jest.fn().mockResolvedValue([]),
  setSelectedBU: jest.fn(),
  clearWikiClientCaches: jest.fn(),
  invalidateSidebarCache: jest.fn(),
  wikiPathToRoute: jest.fn().mockReturnValue("/categories/ap/invoice"),
  resolveWikiMarkdownHref: jest.fn().mockReturnValue("/categories/ap/invoice"),
  wikiDirFromContentPath: jest.fn().mockReturnValue("ap"),
  encodeWikiPathForFetch: jest.fn().mockImplementation((p: string) => p),
  normalizeWikiRelPath: jest.fn().mockImplementation((p: string) => p),
  findBestArticleForQuery: jest.fn().mockResolvedValue({ route: "/" }),
  getCategories: jest.fn().mockResolvedValue({ items: [] }),
  askChat: jest.fn(),
  getActivityLogs: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  syncWiki: jest.fn().mockResolvedValue({ ok: true, message: "ok" }),
  rebuildIndex: jest.fn().mockResolvedValue({ message: "ok" }),
}));

mock.module("gray-matter", () => ({
  default: jest.fn().mockReturnValue({ data: { title: "AP" }, content: "" }),
}));

const { default: Category, categoryLoader } = await import("./category");

describe("category detail route", () => {
  it("renders for a category param", async () => {
    const r = createMemoryRouter(
      [
        {
          path: "/categories/:category",
          element: <Category />,
          loader: categoryLoader,
        },
      ],
      { initialEntries: ["/categories/ap"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
