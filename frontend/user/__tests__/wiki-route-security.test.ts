import { wikiPathToRoute } from "@/lib/wiki-api";

describe("wikiPathToRoute hardening", () => {
  it("encodes segments and strips query/hash", () => {
    expect(wikiPathToRoute("foo/bar.md?x=1#y")).toBe("/categories/foo/bar");
    expect(wikiPathToRoute("foo/a b.md")).toBe("/categories/foo/a%20b");
  });

  it("drops dot segments to avoid traversal-like paths", () => {
    expect(wikiPathToRoute("../secret.md")).toBe("/categories/root/secret");
    expect(wikiPathToRoute("foo/../bar.md")).toBe("/categories/foo/bar");
  });
});

