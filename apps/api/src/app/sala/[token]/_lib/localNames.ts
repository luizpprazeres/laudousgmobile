/**
 * Nome do paciente digitado pela auxiliar para se orientar na lista do dia.
 *
 * Fica SÓ no sessionStorage deste navegador, por código + dia (BRT) + laudo,
 * num envelope `{ expiresAt, names }` (meia-noite BRT ou validade do código).
 * Nunca vai para servidor, anotação, cópia, impressão, URL ou título. Some ao
 * fechar a aba, ao clicar em Sair, ao vencer, ao trocar de código e quando o
 * código deixa de valer.
 */
export type NameStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;
export type NameMap = Record<string, string>;

export const NAME_KEY_PREFIX = "sala:names:v1:";
export const NAME_MAX_LENGTH = 60;

/** AAAA-MM-DD no fuso de Brasília (UTC-3), igual ao "hoje" do backend. */
export function brtDay(now: Date): string {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function nameKey(token: string, now: Date): string {
  return `${NAME_KEY_PREFIX}${token.toUpperCase()}:${brtDay(now)}`;
}

/** Próxima meia-noite de Brasília (00h BRT = 03h UTC), em ms. */
export function nextBrtMidnight(now: Date): number {
  const [y, m, d] = brtDay(now).split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d + 1, 3, 0, 0, 0);
}

/**
 * Validade dos nomes: a meia-noite BRT ou a validade do código, o que vier
 * antes. `tokenExpiresAt` só é usado quando o backend informa (ISO válido).
 */
export function namesExpiry(now: Date, tokenExpiresAt?: string | null): number {
  const midnight = nextBrtMidnight(now);
  const token = tokenExpiresAt ? Date.parse(tokenExpiresAt) : NaN;
  return Number.isFinite(token) ? Math.min(midnight, token) : midnight;
}

/** Envelope gravado: `{ expiresAt, names }`. Qualquer outro formato é descartado. */
type Envelope = { expiresAt: number; names: Record<string, unknown> };

function readEnvelope(raw: string | null): Envelope | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const { expiresAt, names } = parsed as Partial<Envelope>;
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return null;
  if (!names || typeof names !== "object" || Array.isArray(names)) return null;
  return { expiresAt, names };
}

function prefixedKeys(storage: NameStorage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(NAME_KEY_PREFIX)) keys.push(k);
  }
  return keys;
}

export function normalizeName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, NAME_MAX_LENGTH);
}

/**
 * Lê os nomes do código+dia atuais. Apaga os de outros dias/códigos, os
 * vencidos (`expiresAt`) e os em formato desconhecido. Chame em toda leitura,
 * escrita, foco e volta de visibilidade.
 */
export function loadNames(storage: NameStorage | null, token: string, now: Date): NameMap {
  if (!storage || !token) return {};
  try {
    const current = nameKey(token, now);
    for (const k of prefixedKeys(storage)) if (k !== current) storage.removeItem(k);
    let envelope: Envelope | null = null;
    try {
      envelope = readEnvelope(storage.getItem(current));
    } catch {
      envelope = null;
    }
    if (!envelope || envelope.expiresAt <= now.getTime()) {
      storage.removeItem(current);
      return {};
    }
    const out: NameMap = {};
    for (const [id, value] of Object.entries(envelope.names)) {
      if (typeof value === "string" && normalizeName(value)) out[id] = normalizeName(value);
    }
    return out;
  } catch {
    return {};
  }
}

/** Grava (ou apaga, se vazio) o nome de um laudo. Retorna o mapa resultante. */
export function saveName(
  storage: NameStorage | null,
  token: string,
  now: Date,
  reportId: string,
  raw: string,
  tokenExpiresAt?: string | null,
): NameMap {
  const names = loadNames(storage, token, now);
  const value = normalizeName(raw);
  if (value) names[reportId] = value;
  else delete names[reportId];
  const expiresAt = namesExpiry(now, tokenExpiresAt);
  // Código já vencido: não grava nada.
  if (expiresAt <= now.getTime()) {
    clearAllNames(storage);
    return {};
  }
  if (!storage || !token) return names;
  try {
    const key = nameKey(token, now);
    if (Object.keys(names).length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify({ expiresAt, names } satisfies Envelope));
  } catch {}
  return names;
}

/** Regrava a validade (ex.: o backend passou a informar a expiração do código). */
export function restampNames(
  storage: NameStorage | null,
  token: string,
  now: Date,
  tokenExpiresAt?: string | null,
): NameMap {
  const names = loadNames(storage, token, now);
  const expiresAt = namesExpiry(now, tokenExpiresAt);
  if (expiresAt <= now.getTime()) {
    clearAllNames(storage);
    return {};
  }
  if (!storage || !token || Object.keys(names).length === 0) return names;
  try {
    storage.setItem(nameKey(token, now), JSON.stringify({ expiresAt, names } satisfies Envelope));
  } catch {}
  return names;
}

export function clearAllNames(storage: NameStorage | null): void {
  if (!storage) return;
  try {
    for (const k of prefixedKeys(storage)) storage.removeItem(k);
  } catch {}
}

/** sessionStorage pode lançar (modo privado, bloqueio de site): trate como ausente. */
export function sessionNameStorage(): NameStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
