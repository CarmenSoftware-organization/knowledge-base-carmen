import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({
  getSelectedBUClient: vi.fn().mockReturnValue("carmen"),
  getActivityLogs: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
  syncWiki: vi.fn().mockResolvedValue({ ok: true, message: "ok" }),
  rebuildIndex: vi.fn().mockResolvedValue({ message: "ok" }),
}));

import Activity from "./activity";

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
