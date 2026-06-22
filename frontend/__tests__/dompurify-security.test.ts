import DOMPurify from "dompurify";

describe("DOMPurify security baseline", () => {
  it("removes scripts and inline handlers", () => {
    const dirty =
      '<div>ok</div>' +
      '<script>window.__xss__ = 1</script>' +
      '<img src="x" onerror="window.__xss__ = 2" />' +
      '<a href="javascript:alert(1)">bad</a>';

    const clean = DOMPurify.sanitize(dirty, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "data-lightbox"],
    });

    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/onerror\s*=/i);
    expect(clean).not.toMatch(/javascript:/i);
  });

  it("sanitizes SVG payloads", () => {
    const dirtySvg = `<svg><script>alert(1)</script><circle cx="5" cy="5" r="5"/></svg>`;
    const clean = DOMPurify.sanitize(dirtySvg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    expect(clean).not.toMatch(/<script/i);
  });
});

