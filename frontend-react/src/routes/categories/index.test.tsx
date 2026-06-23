import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getCategories: vi.fn().mockResolvedValue({ items: [{ slug: "ap", title: "AP" }] }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
  getSidebarTree: vi.fn().mockResolvedValue([]),
  getBusinessUnits: vi.fn().mockResolvedValue({ items: [] }),
  getAllArticles: vi.fn().mockResolvedValue([]),
  searchWiki: vi.fn().mockResolvedValue([]),
  setSelectedBU: vi.fn(),
  clearWikiClientCaches: vi.fn(),
  invalidateSidebarCache: vi.fn(),
}));

import Categories, { categoriesLoader } from "./index";

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
