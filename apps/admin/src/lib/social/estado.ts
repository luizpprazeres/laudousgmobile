/**
 * `state` do OAuth do Instagram: "<dados>.<assinatura>", ambos em base64url.
 * dados = JSON { v: 1, a: id do admin, n: nonce, e: expiração em segundos Unix }.
 * assinatura = HMAC-SHA256 com uma subchave derivada (HKDF) da SOCIAL_TOKEN_KEY, para a mesma chave
 * não servir ao mesmo tempo para cifrar e para assinar. Validade: 10 minutos.
 */
import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

export const VALIDADE_STATE_S = 10 * 60;
export const FORMATO_STATE = /^[A-Za-z0-9_-]{16,512}\.[A-Za-z0-9_-]{43}$/;

interface Dados {
  v: 1;
  a: string;
  n: string;
  e: number;
}

const subchave = (chave: Buffer) => Buffer.from(hkdfSync("sha256", chave, Buffer.alloc(0), "laudousg/social/oauth-state/v1", 32));
const assinar = (chave: Buffer, dados: string) => createHmac("sha256", subchave(chave)).update(dados).digest();

export function criarState(adminId: string, chave: Buffer, agora = Date.now()): string {
  const d: Dados = { v: 1, a: adminId, n: randomBytes(16).toString("base64url"), e: Math.floor(agora / 1000) + VALIDADE_STATE_S };
  const dados = Buffer.from(JSON.stringify(d)).toString("base64url");
  return `${dados}.${assinar(chave, dados).toString("base64url")}`;
}

export type MotivoState = "formato" | "assinatura" | "vencido" | "admin";

/** Confere formato, assinatura (tempo constante), validade e o admin da sessão. */
export function conferirState(state: string, adminId: string, chave: Buffer, agora = Date.now()): { ok: true } | { ok: false; motivo: MotivoState } {
  if (!FORMATO_STATE.test(state)) return { ok: false, motivo: "formato" };
  const [dados, sig] = state.split(".") as [string, string];
  const esperado = assinar(chave, dados);
  const recebido = Buffer.from(sig, "base64url");
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return { ok: false, motivo: "assinatura" };
  let d: Partial<Dados>;
  try {
    d = JSON.parse(Buffer.from(dados, "base64url").toString("utf8")) as Partial<Dados>;
  } catch {
    return { ok: false, motivo: "formato" };
  }
  if (d.v !== 1 || typeof d.a !== "string" || typeof d.n !== "string" || typeof d.e !== "number") return { ok: false, motivo: "formato" };
  const s = Math.floor(agora / 1000);
  // Expiração no passado, ou longe demais no futuro (assinado com outra regra) → recusa.
  if (d.e <= s || d.e > s + VALIDADE_STATE_S) return { ok: false, motivo: "vencido" };
  if (d.a !== adminId) return { ok: false, motivo: "admin" };
  return { ok: true };
}
