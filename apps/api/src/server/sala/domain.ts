/** Routing only: no database, credentials or patient information. */
export const SALA_CANONICAL_HOST = "sala.laudousg.com.br";
export const SALA_LEGACY_HOST = "sala.laudousg.com";
const SHORT_CODE = /^\/([23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6})\/?$/i;

export function salaCanonicalEnabled(value = process.env.SALA_CANONICAL_ENABLED): boolean {
  return value === "true";
}

export function salaPairingLinks(code: string, canonical = salaCanonicalEnabled()) {
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code)) {
    throw new Error("Invalid Sala pairing code");
  }
  const origin = `https://${canonical ? SALA_CANONICAL_HOST : SALA_LEGACY_HOST}`;
  return { salaUrl: `${origin}/sala/${code}`, salaShortUrl: origin };
}

export function salaPairingPayload(code: string, expiresAt: string, canonical = salaCanonicalEnabled()) {
  const links = salaPairingLinks(code, canonical);
  // Existing Swift decoders use snake_case; Android expects camelCase.
  // Both spellings MUST remain identical for convertFromSnakeCase decoders.
  return {
    code, token: code,
    expires_at: expiresAt, sala_url: links.salaUrl, sala_short_url: links.salaShortUrl,
    expiresAt, ...links,
  };
}

export type SalaRouting = { kind: "next" } | { kind: "rewrite" | "redirect"; url: URL };
export function salaRouting(input: URL, method: string, canonical = salaCanonicalEnabled()): SalaRouting {
  const host = input.hostname.toLowerCase();
  if (host !== SALA_CANONICAL_HOST && host !== SALA_LEGACY_HOST) return { kind: "next" };
  if (method !== "GET" && method !== "HEAD") return { kind: "next" };
  const path = input.pathname;
  // Existing tabs and clients must keep API/auth requests on their original host.
  if (path === "/api" || path.startsWith("/api/") || path === "/_next" || path.startsWith("/_next/") || /\.[^/]+$/.test(path)) {
    return { kind: "next" };
  }
  const short = path.match(SHORT_CODE);
  if (host === SALA_LEGACY_HOST && canonical) {
    const url = new URL(`https://${SALA_CANONICAL_HOST}`);
    url.pathname = input.pathname;
    url.search = input.search;
    if (short) url.pathname = `/sala/${short[1]!.toUpperCase()}`;
    return { kind: "redirect", url };
  }
  if (path === "/" || short) {
    const url = new URL(input);
    url.pathname = short ? `/sala/${short[1]!.toUpperCase()}` : "/sala";
    return { kind: "rewrite", url };
  }
  return { kind: "next" };
}
