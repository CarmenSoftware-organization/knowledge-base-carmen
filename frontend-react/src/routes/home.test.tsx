import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getBusinessUnits: vi.fn().mockResolvedValue({ items: [] }),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
  setSelectedBU: vi.fn(),
  getSidebarTree: vi.fn().mockResolvedValue([]),
  getCategories: vi.fn().mockResolvedValue({ items: [] }),
  getAllArticles: vi.fn().mockResolvedValue([]),
  searchWiki: vi.fn().mockResolvedValue([]),
  clearWikiClientCaches: vi.fn(),
  invalidateSidebarCache: vi.fn(),
}));

import Home, { homeLoader } from "./home";

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
