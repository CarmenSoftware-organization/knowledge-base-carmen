import { isBlockedIp, isUrlSafe } from "@/lib/ssrf-guard";

describe("isBlockedIp", () => {
  it("blocks IPv4 loopback (whole 127.0.0.0/8)", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("127.5.5.5")).toBe(true);
  });

  it("blocks 0.0.0.0/8 (unspecified / this-host)", () => {
    expect(isBlockedIp("0.0.0.0")).toBe(true);
    expect(isBlockedIp("0.1.2.3")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isBlockedIp("10.0.0.1")).toBe(true);
    expect(isBlockedIp("172.16.0.1")).toBe(true);
    expect(isBlockedIp("172.31.255.255")).toBe(true);
    expect(isBlockedIp("192.168.1.1")).toBe(true);
  });

  it("blocks link-local 169.254.0.0/16 (cloud metadata)", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
  });

  it("blocks IPv6 loopback and unspecified", () => {
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("::")).toBe(true);
  });

  it("blocks IPv6 ULA fc00::/7 and link-local fe80::/10", () => {
    expect(isBlockedIp("fc00::1")).toBe(true);
    expect(isBlockedIp("fd12:3456::1")).toBe(true);
    expect(isBlockedIp("fe80::1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 pointing at a private v4", () => {
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIp("::ffff:169.254.169.254")).toBe(true);
  });

  it("allows public IPv4 addresses", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("1.1.1.1")).toBe(false);
    expect(isBlockedIp("93.184.216.34")).toBe(false);
  });

  it("allows addresses just outside the private ranges", () => {
    expect(isBlockedIp("172.15.0.1")).toBe(false);
    expect(isBlockedIp("172.32.0.1")).toBe(false);
    expect(isBlockedIp("11.0.0.1")).toBe(false);
  });

  it("allows public IPv6 addresses", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });
});

describe("isUrlSafe", () => {
  // fake resolver: maps hostname -> list of {address, family}
  const fakeLookup = (map: Record<string, string[]>) => async (hostname: string) => {
    const addrs = map[hostname];
    if (!addrs) throw new Error(`ENOTFOUND ${hostname}`);
    return addrs.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
  };

  it("rejects non-http(s) protocols", async () => {
    const lookup = fakeLookup({ "example.com": ["93.184.216.34"] });
    expect(await isUrlSafe("file:///etc/passwd", lookup)).toBe(false);
    expect(await isUrlSafe("ftp://example.com/x", lookup)).toBe(false);
    expect(await isUrlSafe("data:text/plain,hi", lookup)).toBe(false);
  });

  it("rejects malformed URLs", async () => {
    const lookup = fakeLookup({});
    expect(await isUrlSafe("not a url", lookup)).toBe(false);
    expect(await isUrlSafe("", lookup)).toBe(false);
  });

  it("rejects IP-literal hosts in private ranges without needing DNS", async () => {
    const lookup = fakeLookup({});
    expect(await isUrlSafe("http://127.0.0.1:8080/internal", lookup)).toBe(false);
    expect(await isUrlSafe("http://169.254.169.254/latest/meta-data/", lookup)).toBe(false);
    expect(await isUrlSafe("http://[::1]/x", lookup)).toBe(false);
  });

  it("allows IP-literal hosts that are public", async () => {
    const lookup = fakeLookup({});
    expect(await isUrlSafe("https://8.8.8.8/x", lookup)).toBe(true);
  });

  it("allows hostnames that resolve to public addresses", async () => {
    const lookup = fakeLookup({ "cdn.example.com": ["93.184.216.34"] });
    expect(await isUrlSafe("https://cdn.example.com/img.png", lookup)).toBe(true);
  });

  it("blocks DNS rebinding: innocent hostname resolving to an internal IP", async () => {
    const lookup = fakeLookup({ "evil.example.com": ["169.254.169.254"] });
    expect(await isUrlSafe("https://evil.example.com/x", lookup)).toBe(false);
  });

  it("blocks when ANY resolved address is internal (multi-A record)", async () => {
    const lookup = fakeLookup({ "mixed.example.com": ["93.184.216.34", "10.0.0.5"] });
    expect(await isUrlSafe("https://mixed.example.com/x", lookup)).toBe(false);
  });

  it("rejects hostnames that fail to resolve", async () => {
    const lookup = fakeLookup({});
    expect(await isUrlSafe("https://does-not-exist.invalid/x", lookup)).toBe(false);
  });
});
