import path from "node:path";
import type { NextConfig } from "next";
import { fonteImagensSocial } from "./src/lib/social/csp";

const dev = process.env.NODE_ENV !== "production";
// Prévia do Instagram: só o caminho público do bucket `social` no Storage (lido de SUPABASE_URL no build).
const imagensSocial = fonteImagensSocial(process.env.SUPABASE_URL);

// CSP estrita: nada de terceiros. 'unsafe-inline' em script fica até haver nonce (Next injeta scripts inline).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data:${imagensSocial ? ` ${imagensSocial}` : ""}`,
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const cabecalhos = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  basePath: "/admin",
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  async headers() {
    return [{ source: "/:path*", headers: cabecalhos }];
  },
};

export default nextConfig;
