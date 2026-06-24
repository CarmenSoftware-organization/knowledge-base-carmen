import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

mock.module("@/lib/wiki-api", () => ({
  getCategory: jest.fn().mockResolvedValue({
    category: "faq",
    title: "FAQ",
    items: [],
  }),
  getContent: jest.fn().mockResolvedValue(null),
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
  getSidebarTree: jest.fn().mockResolvedValue([]),
  getBusinessUnits: jest.fn().mockResolvedValue({ items: [] }),
  getAllArticles: jest.fn().mockResolvedValue([]),
  searchWiki: jest.fn().mockResolvedValue([]),
  setSelectedBU: jest.fn(),
  clearWikiClientCaches: jest.fn(),
  invalidateSidebarCache: jest.fn(),
  getCategories: jest.fn().mockResolvedValue({ items: [] }),
  wikiPathToRoute: jest.fn().mockReturnValue("/"),
  wikiDirFromContentPath: jest.fn().mockReturnValue(""),
  resolveWikiMarkdownHref: jest.fn().mockReturnValue("/"),
  encodeWikiPathForFetch: jest.fn().mockImplementation((p: string) => p),
  normalizeWikiRelPath: jest.fn().mockImplementation((p: string) => p),
  findBestArticleForQuery: jest.fn().mockResolvedValue({ route: "/" }),
  askChat: jest.fn(),
  getActivityLogs: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  syncWiki: jest.fn().mockResolvedValue({ ok: true, message: "ok" }),
  rebuildIndex: jest.fn().mockResolvedValue({ message: "ok" }),
}));

mock.module("@/lib/faq-cache", () => ({
  getCachedFaqNavItems: jest.fn().mockResolvedValue([]),
}));

mock.module("gray-matter", () => ({
  default: jest.fn().mockReturnValue({ data: {}, content: "" }),
}));

const { default: Faq, faqLoader } = await import("./index");

describe("faq index route", () => {
  it("renders the faq landing", async () => {
    const r = createMemoryRouter(
      [{ path: "/faq", element: <Faq />, loader: faqLoader }],
      { initialEntries: ["/faq"] },
    );
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
});
