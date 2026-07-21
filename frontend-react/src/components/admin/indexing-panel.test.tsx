import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const adminApiJson = jest.fn();
mock.module("@/lib/admin-fetch", () => ({ adminApiJson }));
mock.module("@/hooks/use-business-units", () => ({
  useBusinessUnits: () => [{ id: "1", slug: "carmen" }],
}));

const { IndexingPanel } = await import("./indexing-panel");

describe("IndexingPanel", () => {
  beforeEach(() => adminApiJson.mockReset());

  it("calls the status endpoint and logs the result", async () => {
    adminApiJson.mockResolvedValue({ data: { bu: "carmen", running: false } });
    render(<IndexingPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Check Status/i }));
    await waitFor(() =>
      expect(adminApiJson).toHaveBeenCalledWith("/api/index/rebuild/status?bu=carmen"),
    );
    expect(await screen.findByText(/running/)).toBeInTheDocument();
  });
});
