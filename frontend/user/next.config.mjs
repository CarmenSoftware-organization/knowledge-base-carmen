/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";

    // Note: In dev, Next may require eval for HMR.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com"
      : "script-src 'self' https://va.vercel-scripts.com";

    // Keep this CSP reasonably strict but compatible with the app:
    // - allow YouTube embeds in KB markdown renderer
    // - allow data/blob images for chat uploads and diagrams
    // - in dev, allow http images (e.g. localhost)
    const imgSrc = isDev
      ? "img-src 'self' data: blob: https: http:"
      : "img-src 'self' data: blob: https:";
    const connectSrc = isDev
      ? "connect-src 'self' https: http: ws: wss:"
      : "connect-src 'self' https: wss:";
    const upgrade = isDev ? "" : "upgrade-insecure-requests";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      imgSrc,
      "font-src 'self' data:",
      connectSrc,
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      upgrade,
    ].filter(Boolean).join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
}

export default nextConfig
