import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { routes } from "./router";

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

describe("router", () => {
  it("renders the home route at /", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<RouterProvider router={r} />);
    // Home is now the real component (not a placeholder); check for its main element
    expect(await screen.findByRole("main")).toBeInTheDocument();
  });
  it("renders not-found for unknown path", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/nope"] });
    render(<RouterProvider router={r} />);
    expect(await screen.findByRole("heading")).toBeInTheDocument();
  });
});
