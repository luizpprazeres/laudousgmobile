import { isIP } from "node:net";
export const PAGINAS = new Set(["/", "/privacidade", "/termos", "/suporte", "/excluir-conta", "/aviso-medico"]);
export type ContagemLanding = { day: string; path: string; event: "view" | "qr_open" | "baixar"; src: string; ref_host: string; utm_source: string; utm_campaign: string; device: "iphone" | "ipad" | "android" | "desktop" };
export const origemSrc = (src: string | null) => src && /^[a-z0-9-]{1,32}$/.test(src) ? src : "outro";
const utm = (v: unknown) => typeof v === "string" && /^[a-z0-9._-]{1,40}$/.test(v) ? v : "";
export function hostReferencia(v: unknown): string {
  if (typeof v !== "string" || v.length > 512 || !v) return "";
  try {
    const url = new URL(v.includes("://") ? v : `https://${v}`);
    const host = url.hostname.toLowerCase();
    return /^https?:$/.test(url.protocol) && !isIP(host.replace(/^\[|\]$/g, "")) && host.length <= 253 && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) && host.includes(".") ? host : "";
  } catch { return ""; }
}
export function bot(ua: string): boolean { return /bot|crawler|spider|headless|slurp|facebookexternalhit|preview|lighthouse/i.test(ua); }
export function aparelho(ua: string): ContagemLanding["device"] {
  if (/ipad|macintosh.*mobile/i.test(ua)) return "ipad";
  if (/iphone|ipod/i.test(ua)) return "iphone";
  return /android/i.test(ua) ? "android" : "desktop";
}
export function origemPermitida(req: Request, origem: string | undefined): boolean {
  if (!origem) return false;
  try {
    const esperado = new URL(origem);
    if (esperado.protocol !== "https:" || esperado.origin !== origem) return false;
    const header = req.headers.get("origin");
    if (header) return header === origem;
    return new URL(req.headers.get("referer") ?? "").origin === origem;
  } catch { return false; }
}
export function normalizarBeacon(body: unknown): Pick<ContagemLanding,"event"|"path"|"ref_host"|"utm_source"|"utm_campaign"> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (b.e !== "view" && b.e !== "qr_open") return null;
  if (typeof b.p !== "string") return null;
  const path = b.p.replace(/\/+$/, "") || "/";
  if (!PAGINAS.has(path)) return null;
  return { event: b.e, path, ref_host: hostReferencia(b.ref), utm_source: utm(b.us), utm_campaign: utm(b.uc) };
}
/** Read at most 1 KiB, regardless of Content-Length or content type used by sendBeacon. */
export async function lerBeacon(req: Request): Promise<unknown> {
  if (!req.body) return null;
  const reader = req.body.getReader(); let total = 0; const partes: Uint8Array[] = [];
  try {
    for (;;) { const r = await reader.read(); if (r.done) break; total += r.value.byteLength; if (total > 1024) { void reader.cancel().catch(() => {}); return null; } partes.push(r.value); }
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch { return null; }
}
