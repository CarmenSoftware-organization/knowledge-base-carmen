import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

mock.module("@/lib/wiki-api", () => ({
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
  getActivityLogs: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  syncWiki: jest.fn().mockResolvedValue({ ok: true, message: "ok" }),
  rebuildIndex: jest.fn().mockResolvedValue({ message: "ok" }),
  getBusinessUnits: jest.fn().mockResolvedValue({ items: [] }),
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
}));

const { default: Activity } = await import("./activity");

describe("activity route", () => {
  it("renders activity heading", async () => {
    const r = createMemoryRouter(
      [{ path: "/activity", element: <Activity /> }],
      { initialEntries: ["/activity"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("heading")).toBeInTheDocument();
  });
});
