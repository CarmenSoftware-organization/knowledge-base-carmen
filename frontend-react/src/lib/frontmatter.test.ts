import { describe, it, expect } from "bun:test";
import { parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("parses a leading frontmatter block and strips it from content", () => {
    const input =
      '---\ntitle: "Install Config"\nweight: 10\n---\n\n\n# Carmen Add-in\nbody';
    const { data, content } = parseFrontmatter(input);
    expect(data.title).toBe("Install Config");
    expect(data.weight).toBe(10);
    expect(content).not.toContain("---");
    expect(content).toContain("# Carmen Add-in");
  });

  it("keeps tags written as a comma string as a string (gray-matter parity)", () => {
    const { data } = parseFrontmatter(
      "---\ntags: carmen_cloud,documentation\n---\nbody",
    );
    expect(data.tags).toBe("carmen_cloud,documentation");
  });

  it("parses tags written as a YAML list into an array", () => {
    const { data } = parseFrontmatter("---\ntags:\n  - a\n  - b\n---\nbody");
    expect(data.tags).toEqual(["a", "b"]);
  });

  it("returns empty data and untouched content when there is no frontmatter", () => {
    const input = "# Just a heading\nno frontmatter here";
    const { data, content } = parseFrontmatter(input);
    expect(data).toEqual({});
    expect(content).toBe(input);
  });

  it("handles an empty string", () => {
    expect(parseFrontmatter("")).toEqual({ data: {}, content: "" });
  });

  it("handles CRLF line endings", () => {
    const { data, content } = parseFrontmatter(
      "---\r\ntitle: Hi\r\n---\r\nbody",
    );
    expect(data.title).toBe("Hi");
    expect(content).toBe("body");
  });

  it("falls back to empty data on malformed YAML without throwing", () => {
    const input = "---\n: : : not valid : :\n---\nbody";
    const { data, content } = parseFrontmatter(input);
    expect(data).toEqual({});
    expect(content).toBe("body");
  });
});
