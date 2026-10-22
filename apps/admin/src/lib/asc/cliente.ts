/**
 * Cliente mínimo da App Store Connect API (JWT ES256), só no servidor.
 * A chave vem de env (ASC_PRIVATE_KEY com o PEM, ou ASC_PRIVATE_KEY_PATH só no desenvolvimento).
 * Nunca registra, devolve ou imprime a chave nem o token.
 */
import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";

export interface CredenciaisAsc {
  keyId: string;
  issuerId: string;
  chave: KeyObject;
}

const b64url = (o: unknown) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

/** Lê credenciais de um prefixo de env ("ASC" ou "ASC_REPORTS"). Devolve null se faltar algo. */
export function credenciaisDoEnv(prefixo: "ASC" | "ASC_REPORTS", env: Record<string, string | undefined> = process.env): CredenciaisAsc | null {
  const keyId = env[`${prefixo}_KEY_ID`]?.trim();
  const issuerId = (env[`${prefixo}_ISSUER_ID`] ?? env.ASC_ISSUER_ID)?.trim();
  if (!keyId || !issuerId) return null;
  let pem = env[`${prefixo}_PRIVATE_KEY`]?.replace(/\\n/g, "\n").trim();
  const caminho = env[`${prefixo}_PRIVATE_KEY_PATH`]?.trim();
  if (!pem && caminho && process.env.NODE_ENV !== "production") {
    try {
      pem = readFileSync(caminho, "utf8");
    } catch {
      return null;
    }
  }
  if (!pem) return null;
  try {
    return { keyId, issuerId, chave: createPrivateKey(pem) };
  } catch {
    return null;
  }
}

export function gerarToken(c: CredenciaisAsc, agora = Math.floor(Date.now() / 1000)): string {
  const cab = b64url({ alg: "ES256", kid: c.keyId, typ: "JWT" });
  const corpo = b64url({ iss: c.issuerId, iat: agora, exp: agora + 1100, aud: "appstoreconnect-v1" });
  const assinatura = sign("sha256", Buffer.from(`${cab}.${corpo}`), { key: c.chave, dsaEncoding: "ieee-p1363" });
  return `${cab}.${corpo}.${assinatura.toString("base64url")}`;
}

export interface RespostaAsc<T = any> {
  status: number;
  json: T | null;
  bruto?: ArrayBuffer;
}

/** Só GET. O painel nunca escreve no App Store Connect. */
export async function ascGet<T = any>(c: CredenciaisAsc, caminho: string, opcoes: { binario?: boolean } = {}): Promise<RespostaAsc<T>> {
  if (!caminho.startsWith("/v1/")) throw new Error("caminho ASC inválido");
  const r = await fetch(`https://api.appstoreconnect.apple.com${caminho}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${gerarToken(c)}`, Accept: opcoes.binario ? "application/a-gzip" : "application/json" },
    cache: "no-store",
  });
  if (opcoes.binario && r.ok) return { status: r.status, json: null, bruto: await r.arrayBuffer() };
  const txt = await r.text();
  let json: T | null = null;
  try {
    json = txt ? (JSON.parse(txt) as T) : null;
  } catch {
    json = null;
  }
  return { status: r.status, json };
}
