/**
 * Cifra do token do Instagram em repouso (AES-256-GCM) e leitura da chave SOCIAL_TOKEN_KEY.
 * Envelope: "v1.<iv>.<tag>.<cifra>", tudo em base64url — é o formato que o CHECK de
 * social_accounts.token_ciphertext exige. Nada aqui registra o texto claro ou a chave.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** O mesmo regex do CHECK da migração 20261022212039_admin_social. */
export const ENVELOPE = /^v1\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}$/;

/** Dado extra autenticado: o envelope só abre como token do Instagram, não noutro contexto. */
const AAD = Buffer.from("laudousg/social_accounts/token/v1");

/**
 * SOCIAL_TOKEN_KEY: 32 bytes em base64 padrão, com ou sem o "=" final (a Vercel pode guardar sem).
 * Espaços e quebras de linha nas pontas são ignorados. Qualquer outra coisa → null (falha fechada).
 */
export function lerChaveSocial(valor: string | undefined | null): Buffer | null {
  const v = valor?.trim();
  if (!v) return null;
  // 32 bytes = 43 caracteres de base64 + 1 "=" de padding. O último caractere só pode carregar
  // 4 bits úteis (A, E, I, …), senão sobram bits e o valor não é um base64 canônico.
  const m = /^([A-Za-z0-9+/]{42})([AEIMQUYcgkosw048])(=?)$/.exec(v);
  if (!m) return null;
  const chave = Buffer.from(m[1]! + m[2]! + "=", "base64");
  return chave.length === 32 ? chave : null;
}

const b64u = (b: Buffer) => b.toString("base64url");

export function cifrar(texto: string, chave: Buffer): string {
  if (chave.length !== 32) throw new Error("cifra: chave inválida");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave, iv);
  c.setAAD(AAD);
  const cifra = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  const env = `v1.${b64u(iv)}.${b64u(c.getAuthTag())}.${b64u(cifra)}`;
  // Texto curto demais geraria uma cifra que o CHECK recusa; melhor falhar aqui, sem detalhes.
  if (!ENVELOPE.test(env)) throw new Error("cifra: envelope fora do formato");
  return env;
}

/** Abre o envelope. Chave errada, envelope adulterado ou formato estranho → erro genérico. */
export function decifrar(envelope: string, chave: Buffer): string {
  if (chave.length !== 32 || !ENVELOPE.test(envelope)) throw new Error("cifra: envelope inválido");
  const [, iv, tag, cifra] = envelope.split(".");
  try {
    const d = createDecipheriv("aes-256-gcm", chave, Buffer.from(iv!, "base64url"));
    d.setAAD(AAD);
    d.setAuthTag(Buffer.from(tag!, "base64url"));
    return Buffer.concat([d.update(Buffer.from(cifra!, "base64url")), d.final()]).toString("utf8");
  } catch {
    throw new Error("cifra: não foi possível abrir o envelope");
  }
}
