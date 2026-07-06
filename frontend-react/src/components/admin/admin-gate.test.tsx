import { describe, it, expect, mock, jest, beforeEach } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/fetch-utils";

const adminApiJson = jest.fn();
mock.module("@/lib/admin-fetch", () => ({ adminApiJson }));

const { AdminGate } = await import("./admin-gate");

describe("AdminGate", () => {
  beforeEach(() => {
    adminApiJson.mockReset();
    sessionStorage.clear();
  });

  it("unlocks on a valid key", async () => {
    adminApiJson.mockResolvedValue({ data: {} });
    const onUnlocked = jest.fn();
    render(<AdminGate onUnlocked={onUnlocked} />);
    fireEvent.change(screen.getByLabelText(/Admin key/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Unlock/i }));
    await waitFor(() => expect(onUnlocked).toHaveBeenCalled());
  });

  it("shows an error and stays locked on 401", async () => {
    adminApiJson.mockRejectedValue(new ApiError("UNAUTHORIZED", "no", 401));
    const onUnlocked = jest.fn();
    render(<AdminGate onUnlocked={onUnlocked} />);
    fireEvent.change(screen.getByLabelText(/Admin key/i), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: /Unlock/i }));
    expect(await screen.findByText(/ไม่ถูกต้อง/)).toBeInTheDocument();
    expect(onUnlocked).not.toHaveBeenCalled();
  });
});
