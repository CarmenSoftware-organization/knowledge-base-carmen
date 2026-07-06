import { describe, it, expect } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/fetch-utils";
import { useAdminAction } from "./use-admin-action";

function Harness() {
  const { entries, run } = useAdminAction();
  return (
    <div>
      <button onClick={() => run("ok-title", async () => ({ ok: 1 }))}>go-ok</button>
      <button
        onClick={() => run("err-title", async () => {
          throw new ApiError("X", "boom", 500);
        }).catch(() => {})}
      >
        go-err
      </button>
      <ul>
        {entries.map((e, i) => (
          <li key={i}>{e.ok ? "OK" : "ERR"}:{e.title}</li>
        ))}
      </ul>
    </div>
  );
}

describe("useAdminAction", () => {
  it("records a success entry", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("go-ok"));
    expect(await screen.findByText("OK:ok-title")).toBeInTheDocument();
  });

  it("records an error entry when the action throws", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("go-err"));
    await waitFor(() => expect(screen.getByText("ERR:err-title")).toBeInTheDocument());
  });
});
