import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getCategory: vi.fn().mockResolvedValue({
    category: "ap",
    items: [{ slug: "invoice", path: "ap/invoice.md", title: "Invoice" }],
  }),
  getContent: vi.fn().mockResolvedValue({ content: "", title: "AP" }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
  getSidebarTree: vi.fn().mockResolvedValue([]),
  getBusinessUnits: vi.fn().mockResolvedValue({ items: [] }),
  getAllArticles: vi.fn().mockResolvedValue([]),
  searchWiki: vi.fn().mockResolvedValue([]),
  setSelectedBU: vi.fn(),
  clearWikiClientCaches: vi.fn(),
  invalidateSidebarCache: vi.fn(),
  wikiPathToRoute: vi.fn().mockReturnValue("/categories/ap/invoice"),
  resolveWikiMarkdownHref: vi.fn().mockReturnValue("/categories/ap/invoice"),
  wikiDirFromContentPath: vi.fn().mockReturnValue("ap"),
  encodeWikiPathForFetch: vi.fn().mockImplementation((p: string) => p),
  normalizeWikiRelPath: vi.fn().mockImplementation((p: string) => p),
}));

vi.mock("gray-matter", () => ({
  default: vi.fn().mockReturnValue({ data: { title: "AP" }, content: "" }),
}));

import Category, { categoryLoader } from "./category";

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
