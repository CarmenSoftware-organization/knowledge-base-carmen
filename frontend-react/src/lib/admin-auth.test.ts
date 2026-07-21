import { describe, it, expect, beforeEach } from "bun:test";
import { getAdminKey, setAdminKey, clearAdminKey } from "./admin-auth";

describe("admin-auth", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips the key through sessionStorage", () => {
    expect(getAdminKey()).toBeNull();
    setAdminKey("abc");
    expect(getAdminKey()).toBe("abc");
    clearAdminKey();
    expect(getAdminKey()).toBeNull();
  });

  it("dispatches admin-key-cleared on clear", () => {
    let fired = false;
    const handler = () => { fired = true; };
    window.addEventListener("admin-key-cleared", handler);
    setAdminKey("abc");
    clearAdminKey();
    window.removeEventListener("admin-key-cleared", handler);
    expect(fired).toBe(true);
  });
});
