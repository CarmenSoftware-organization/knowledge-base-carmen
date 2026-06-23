import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/wiki-api", () => ({ askChat: vi.fn() }));

import Chat from "./chat";

describe("chat route", () => {
  it("renders the question form", () => {
    render(<MemoryRouter><Chat /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /ส่งคำถาม|Send/ })).toBeInTheDocument();
  });
});
