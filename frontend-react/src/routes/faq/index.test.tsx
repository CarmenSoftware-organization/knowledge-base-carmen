import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getCategory: vi.fn().mockResolvedValue({
    category: "faq",
    title: "FAQ",
    items: [],
  }),
  getContent: vi.fn().mockResolvedValue(null),
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
  getSidebarTree: vi.fn().mockResolvedValue([]),
  getBusinessUnits: vi.fn().mockResolvedValue({ items: [] }),
  getAllArticles: vi.fn().mockResolvedValue([]),
  searchWiki: vi.fn().mockResolvedValue([]),
  setSelectedBU: vi.fn(),
  clearWikiClientCaches: vi.fn(),
  invalidateSidebarCache: vi.fn(),
}));

vi.mock("@/lib/faq-cache", () => ({
  getCachedFaqNavItems: vi.fn().mockResolvedValue([]),
}));

vi.mock("gray-matter", () => ({
  default: vi.fn().mockReturnValue({ data: {}, content: "" }),
}));

import Faq, { faqLoader } from "./index";

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
