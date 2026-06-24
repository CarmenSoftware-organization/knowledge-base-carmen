import { describe, it, expect, mock, jest } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

mock.module("@/lib/wiki-api", () => ({
  askChat: jest.fn(),
  getSelectedBUClient: jest.fn().mockReturnValue("carmen"),
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
  getActivityLogs: jest.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  syncWiki: jest.fn().mockResolvedValue({ ok: true, message: "ok" }),
  rebuildIndex: jest.fn().mockResolvedValue({ message: "ok" }),
}));

const { default: Chat } = await import("./chat");

describe("chat route", () => {
  it("renders the question form", () => {
    render(<MemoryRouter><Chat /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /ส่งคำถาม|Send/ })).toBeInTheDocument();
  });
});
