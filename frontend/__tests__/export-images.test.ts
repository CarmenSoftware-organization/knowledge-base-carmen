import { rewriteAndFilterImages, embedSafeImages } from "@/lib/export-images";

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

describe("embedSafeImages (PDF)", () => {
  const okFetch = async (_url: string) => ({
    ok: true,
    headers: { get: (_k: string) => "image/png" },
    status: 200,
    arrayBuffer: async () => new Uint8Array([80, 78, 71, 68, 65, 84, 65]).buffer, // "PNGDATA"
  });

  it("inlines a safe image as a base64 data URI", async () => {
    const html = `<img src="https://cdn.example.com/x.png">`;
    const out = await embedSafeImages(html, BASE, {
      isSafe: safeFor(["https://cdn.example.com/x.png"]),
      fetchFn: okFetch as never,
    });
    expect(out).toMatch(/src="data:image\/png;base64,[A-Za-z0-9+/=]+"/);
    expect(out).not.toContain("https://cdn.example.com/x.png");
  });

  it("strips an unsafe image and never fetches it", async () => {
    let fetched = 0;
    const spyFetch = async (url: string) => {
      fetched++;
      return okFetch(url);
    };
    const html = `<img src="http://127.0.0.1:8080/admin">`;
    const out = await embedSafeImages(html, BASE, {
      isSafe: safeFor([]),
      fetchFn: spyFetch as never,
    });
    expect(out).not.toContain("127.0.0.1");
    expect(out).not.toMatch(/<img/i);
    expect(fetched).toBe(0);
  });

  it("does not fetch or alter data: image URIs", async () => {
    let fetched = 0;
    const spyFetch = async (url: string) => {
      fetched++;
      return okFetch(url);
    };
    const html = `<img src="data:image/png;base64,AAAA">`;
    const out = await embedSafeImages(html, BASE, {
      isSafe: safeFor([]),
      fetchFn: spyFetch as never,
    });
    expect(out).toContain("data:image/png;base64,AAAA");
    expect(fetched).toBe(0);
  });
});
