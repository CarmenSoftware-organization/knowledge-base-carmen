import { rewriteAndFilterImages } from "@/lib/export-images";

const BASE = "https://kb.example.com";

// isSafe predicate driven by an explicit set of "safe" absolute URLs.
const safeFor = (safe: string[]) => async (url: string) => safe.includes(url);

describe("rewriteAndFilterImages (DOCX)", () => {
  it("rewrites a safe relative src to an absolute URL", async () => {
    const html = `<p><img src="/media/a.png"></p>`;
    const out = await rewriteAndFilterImages(html, BASE, safeFor([`${BASE}/media/a.png`]));
    expect(out).toContain(`src="${BASE}/media/a.png"`);
    expect(out).not.toContain(`src="/media/a.png"`);
  });

  it("leaves a safe absolute https src unchanged", async () => {
    const html = `<img src="https://cdn.example.com/x.png">`;
    const out = await rewriteAndFilterImages(html, BASE, safeFor(["https://cdn.example.com/x.png"]));
    expect(out).toContain(`src="https://cdn.example.com/x.png"`);
  });

  it("strips an <img> whose absolute host is unsafe (SSRF target)", async () => {
    const html = `<p>before</p><img src="http://169.254.169.254/latest/meta-data/"><p>after</p>`;
    const out = await rewriteAndFilterImages(html, BASE, safeFor([])); // nothing safe
    expect(out).not.toContain("169.254.169.254");
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("strips an <img> whose resolved relative target is unsafe", async () => {
    const html = `<img src="/internal/secret.png">`;
    const out = await rewriteAndFilterImages(html, BASE, safeFor([])); // resolved url not safe
    expect(out).not.toMatch(/<img/i);
  });

  it("leaves data: image URIs untouched (not an SSRF vector)", async () => {
    const html = `<img src="data:image/png;base64,AAAA">`;
    const out = await rewriteAndFilterImages(html, BASE, safeFor([]));
    expect(out).toContain("data:image/png;base64,AAAA");
  });

  it("keeps safe images and strips unsafe ones in the same document", async () => {
    const html =
      `<img src="https://cdn.example.com/ok.png">` +
      `<img src="http://10.0.0.5/x.png">`;
    const out = await rewriteAndFilterImages(html, BASE, safeFor(["https://cdn.example.com/ok.png"]));
    expect(out).toContain("https://cdn.example.com/ok.png");
    expect(out).not.toContain("10.0.0.5");
  });
});

