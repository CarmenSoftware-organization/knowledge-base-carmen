import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./not-found";

describe("not-found", () => {
  it("renders the 404 heading", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
