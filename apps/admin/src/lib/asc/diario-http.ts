import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { gerarToken, type CredenciaisAsc } from "./cliente";
import { ErroApple } from "./diario-parser";
export type ItemAsc = { id: string; attributes: Record<string, any> };
export interface TransporteApple {
  lista(path: string): Promise<ItemAsc[]>;
  sales(query: URLSearchParams): Promise<{ status: number; tsv?: string }>;
  segmento(item: ItemAsc): Promise<string>;
}
const API = "https://api.appstoreconnect.apple.com";
const MAX = 20 * 1024 * 1024;
async function corpo(r: Response, max: number): Promise<Buffer> {
  if (Number(r.headers.get("content-length")) > max)
    throw new ErroApple("report_too_large");
  const reader = r.body?.getReader();
  if (!reader) throw new ErroApple("empty_response");
  const chunks: Uint8Array[] = [];
  let n = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      if (n > max) throw new ErroApple("report_too_large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}
function descompactar(b: Buffer): string {
  try {
    return gunzipSync(b, { maxOutputLength: MAX }).toString("utf8");
  } catch {
    throw new ErroApple("invalid_gzip");
  }
}
export function transporteApple(
  cred: CredenciaisAsc,
  deadline: number,
  http: typeof fetch = fetch,
): TransporteApple {
  async function get(url: string, api = true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new ErroApple("time_budget");
    return http(url, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(Math.min(8000, remaining)),
      headers: api ? { Authorization: `Bearer ${gerarToken(cred)}` } : {},
    });
  }
  return {
    async lista(path) {
      let next: string | null = new URL(path, API).toString();
      const out: ItemAsc[] = [];
      const seen = new Set<string>();
      while (next) {
        const url: URL = new URL(next);
        if (
          url.origin !== API ||
          !url.pathname.startsWith("/v1/") ||
          seen.has(next) ||
          seen.size >= 30
        )
          throw new ErroApple("invalid_pagination");
        seen.add(next);
        const r = await get(next);
        if (!r.ok) throw new ErroApple(`http_${r.status}`);
        const json = JSON.parse(
          (await corpo(r, 2 * 1024 * 1024)).toString("utf8"),
        );
        if (!Array.isArray(json.data)) throw new ErroApple("invalid_response");
        out.push(...json.data);
        next = json.links?.next
          ? new URL(json.links.next, API).toString()
          : null;
      }
      return out;
    },
    async sales(query) {
      const r = await get(`${API}/v1/salesReports?${query}`);
      if (!r.ok) {
        await r.body?.cancel();
        return { status: r.status };
      }
      return { status: r.status, tsv: descompactar(await corpo(r, MAX)) };
    },
    async segmento(item) {
      const a = item.attributes,
        url = new URL(a.url);
      // Signed segment URL is not sent to the DB or logs; never forward the ASC JWT.
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        !/(?:^|\.)(?:apple\.com|amazonaws\.com)$/.test(url.hostname)
      )
        throw new ErroApple("invalid_segment_url");
      const r = await get(url.toString(), false);
      if (!r.ok) throw new ErroApple(`http_${r.status}`);
      const bytes = await corpo(r, MAX);
      if (a.sizeInBytes != null && Number(a.sizeInBytes) !== bytes.length)
        throw new ErroApple("segment_size");
      if (
        a.checksum &&
        (!/^[a-f0-9]{32}$/i.test(a.checksum) ||
          createHash("md5").update(bytes).digest("hex") !==
            a.checksum.toLowerCase())
      )
        throw new ErroApple("segment_checksum");
      return descompactar(bytes);
    },
  };
}
