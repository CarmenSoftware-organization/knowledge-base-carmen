import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const adminApiJson = jest.fn();
mock.module("@/lib/admin-fetch", () => ({ adminApiJson }));
mock.module("@/hooks/use-business-units", () => ({
  useBusinessUnits: () => [{ id: "1", slug: "carmen" }],
}));

const { ResetPanel } = await import("./reset-panel");

describe("ResetPanel", () => {
  beforeEach(() => adminApiJson.mockReset());

  it("keeps Run reset disabled until the confirm token matches", () => {
    render(<ResetPanel />);
    const btn = screen.getByRole("button", { name: /Run reset/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/เพื่อยืนยัน/), { target: { value: "carmen" } });
    expect(btn).not.toBeDisabled();
  });

  it("posts to /api/index/reset with confirm=slug for the BU scope", async () => {
    adminApiJson.mockResolvedValue({ data: { message: "ok" } });
    render(<ResetPanel />);
    fireEvent.change(screen.getByLabelText(/เพื่อยืนยัน/), { target: { value: "carmen" } });
    fireEvent.click(screen.getByRole("button", { name: /Run reset/i })); // open dialog
    fireEvent.click(await screen.findByRole("button", { name: /ยืนยัน reset/i })); // confirm
    await waitFor(() =>
      expect(adminApiJson).toHaveBeenCalledWith(
        "/api/index/reset?bu=carmen",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ confirm: "carmen" }) }),
      ),
    );
  });
});
