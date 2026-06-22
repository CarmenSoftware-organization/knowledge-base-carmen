/**
 * SSRF guard for server-side image/URL fetching (PDF/DOCX export).
 *
 * Blocks requests whose target resolves to a loopback, unspecified, private
 * (RFC1918), link-local (incl. 169.254 cloud-metadata), or IPv6 ULA/link-local
 * address. Hostnames are DNS-resolved so an innocent-looking name that points at
 * an internal IP (DNS rebinding) is still rejected.
 */

type LookupResult = { address: string; family: number };
export type LookupFn = (hostname: string) => Promise<LookupResult[]>;

function parseIPv4(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const octets = m.slice(1, 5).map((n) => Number(n));
  if (octets.some((o) => o > 255)) return null;
  return octets;
}

function isBlockedIPv4(o: number[]): boolean {
  const [a, b] = o;
  if (a === 0) return true; // 0.0.0.0/8 (this-host / unspecified)
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}

/** Expand an IPv6 string to its 16 bytes, or null if unparseable. */
function expandIPv6(input: string): number[] | null {
  let s = input.toLowerCase();
  const pct = s.indexOf("%"); // drop zone id
  if (pct >= 0) s = s.slice(0, pct);

  // Embedded IPv4 tail (e.g. ::ffff:127.0.0.1) — rewrite to two hextets.
  const lastColon = s.lastIndexOf(":");
  if (lastColon >= 0 && s.slice(lastColon + 1).includes(".")) {
    const v4 = parseIPv4(s.slice(lastColon + 1));
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    s = `${s.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : null;

  let hextets: string[];
  if (tail === null) {
    hextets = head; // no "::"
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    hextets = [...head, ...Array(missing).fill("0"), ...tail];
  }
  if (hextets.length !== 8) return null;

  const bytes: number[] = [];
  for (const h of hextets) {
    if (!/^[0-9a-f]{1,4}$/.test(h)) return null;
    const n = parseInt(h, 16);
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  return bytes;
}

/** True if the given IP literal is in a blocked (internal/reserved) range. */
export function isBlockedIp(ip: string): boolean {
  const v4 = parseIPv4(ip);
  if (v4) return isBlockedIPv4(v4);

  const bytes = expandIPv6(ip);
  if (!bytes) return true; // fail closed on anything we can't parse

  // IPv4-mapped (::ffff:a.b.c.d) — judge by the embedded IPv4.
  const mapped =
    bytes.slice(0, 10).every((x) => x === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (mapped) return isBlockedIPv4(bytes.slice(12, 16));

  if (bytes.slice(0, 15).every((x) => x === 0) && bytes[15] === 1) return true; // ::1 loopback
  if (bytes.every((x) => x === 0)) return true; // :: unspecified
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 ULA
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  return false;
}

function isIpLiteral(host: string): boolean {
  return parseIPv4(host) !== null || expandIPv6(host) !== null;
}

const defaultLookup: LookupFn = async (hostname) => {
  const dns = await import("node:dns/promises");
  return dns.lookup(hostname, { all: true });
};

/**
 * True if `rawUrl` is safe to fetch server-side: it must be http(s) and its host
 * must not resolve to a blocked address. Returns false on malformed URLs,
 * non-http(s) schemes, resolution failures, or any internal resolved address.
 */
export async function isUrlSafe(
  rawUrl: string,
  lookup: LookupFn = defaultLookup
): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  let host = url.hostname;
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);

  if (isIpLiteral(host)) return !isBlockedIp(host);

  let results: LookupResult[];
  try {
    results = await lookup(host);
  } catch {
    return false;
  }
  if (!results || results.length === 0) return false;
  return results.every((r) => !isBlockedIp(r.address));
}
