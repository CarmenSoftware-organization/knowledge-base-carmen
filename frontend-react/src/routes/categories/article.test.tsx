import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getContent: vi.fn().mockResolvedValue({
    path: "ap/intro",
    title: "Intro",
    content: "---\ntitle: Intro\n---\n# Hi",
  }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
  getCategory: vi.fn().mockResolvedValue({ category: "ap", items: [] }),
  getSidebarTree: vi.fn().mockResolvedValue([]),
  getBusinessUnits: vi.fn().mockResolvedValue({ items: [] }),
  normalizeWikiRelPath: vi.fn().mockImplementation((p: string) => p),
  wikiDirFromContentPath: vi.fn().mockReturnValue("ap"),
}));

vi.mock("@/lib/faq-cache", () => ({
  getCachedFaqNavItems: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/locale", () => ({
  getLocaleFromClient: vi.fn().mockReturnValue("th"),
}));

import Article, { articleLoader } from "./article";

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
    const wikiApi = await import("@/lib/wiki-api");
    vi.mocked(wikiApi.getContent)
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
