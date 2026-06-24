import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

mock.module("@/lib/wiki-api", () => ({
  getBusinessUnits: jest.fn().mockResolvedValue({ items: [] }),
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
  setSelectedBU: jest.fn(),
  getSidebarTree: jest.fn().mockResolvedValue([]),
  getCategories: jest.fn().mockResolvedValue({ items: [] }),
  getAllArticles: jest.fn().mockResolvedValue([]),
  searchWiki: jest.fn().mockResolvedValue([]),
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

const { default: Home, homeLoader } = await import("./home");

describe("home route", () => {
  it("renders landing shell with loader data", async () => {
    const r = createMemoryRouter(
      [{ path: "/", element: <Home />, loader: homeLoader }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
