/**
 * Cliente da Jev (TypeSafe AI, modelo "System One"): só ESCOLHE entre opções que nós damos
 * (choice) ou dá probabilidade (noul). Não escreve texto nem número.
 * POST https://api.typesafe.ai/v1/systemone — Authorization: Bearer JEV_API_KEY.
 *
 * Nunca derruba quem chama: sem chave, erro de rede, HTTP ≠ 2xx ou tempo esgotado → null.
 * Quem chama trata null como "a Jev não opinou" e segue como hoje.
 * Só trechos curtos, sem identificadores (privacy/scrub.ts), saem por aqui.
 */
import { env } from "@/server/env";

const URL = "https://api.typesafe.ai/v1/systemone";

export type JevChoice = { type: "choice"; instructions: string; criteria: Record<string, string> };
export type JevNoul = { type: "noul"; instructions: string; criteria?: { true?: string; false?: string } };
export type JevQuestion = JevChoice | JevNoul;
export type JevAnswer =
  | { type: "choice"; choice: string; confidence: number; probabilities?: Record<string, number> }
  | { type: "noul"; noul: number };

export function jevConfigured(): boolean {
  return !!env().JEV_API_KEY;
}

export async function askJev(
  state: unknown,
  questions: Record<string, JevQuestion>,
  opts: { timeoutMs?: number; tag?: string } = {},
): Promise<{ answers: Record<string, JevAnswer>; ms: number; inputTokens: number } | null> {
  const key = env().JEV_API_KEY;
  if (!key || !Object.keys(questions).length) return null;
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 1500);
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: env().JEV_MODEL, state, questions }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[jev ${opts.tag ?? "-"}] HTTP ${res.status} em ${Date.now() - t0} ms`);
      return null;
    }
    const d = (await res.json()) as { answers?: Record<string, JevAnswer>; usage?: { input_tokens?: number } };
    const out = { answers: d.answers ?? {}, ms: Date.now() - t0, inputTokens: d.usage?.input_tokens ?? 0 };
    console.log(`[jev ${opts.tag ?? "-"}] ${Object.keys(questions).length} perguntas, ${out.ms} ms, ${out.inputTokens} tokens`);
    return out;
  } catch (e) {
    console.warn(`[jev ${opts.tag ?? "-"}] ${(e as Error).name === "AbortError" ? "tempo esgotado" : "falha de rede"} em ${Date.now() - t0} ms`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
