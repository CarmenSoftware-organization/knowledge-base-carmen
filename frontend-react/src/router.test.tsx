import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { routes } from "./router";

describe("router", () => {
  it("renders the home route at /", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<RouterProvider router={r} />);
    expect(await screen.findByTestId("route-home")).toBeInTheDocument();
  });
  it("renders not-found for unknown path", async () => {
    const r = createMemoryRouter(routes, { initialEntries: ["/nope"] });
    render(<RouterProvider router={r} />);
    expect(await screen.findByTestId("route-not-found")).toBeInTheDocument();
  });
});
