import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

const fetchChatHistoryCount = jest.fn();
mock.module("@/lib/supabase-check", () => ({
  fetchChatHistoryCount,
  SupabaseCheckError: class SupabaseCheckError extends Error {},
}));

const { default: HistoryCount } = await import("./history-count");

function renderPage() {
  const r = createMemoryRouter(
    [{ path: "/history/count", element: <HistoryCount /> }],
    { initialEntries: ["/history/count"] },
  );
  render(<RouterProvider router={r} />);
}

describe("history/count route", () => {
  beforeEach(() => {
    fetchChatHistoryCount.mockReset();
  });

  it("auto-loads and shows the count on mount (no interaction)", async () => {
    fetchChatHistoryCount.mockResolvedValue(1234);
    renderPage();
    expect(await screen.findByText(/1234/)).toBeInTheDocument();
    expect(fetchChatHistoryCount).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the fetch fails", async () => {
    fetchChatHistoryCount.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByText(/ผิดพลาด/)).toBeInTheDocument();
  });
});
