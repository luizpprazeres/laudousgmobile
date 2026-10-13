import { getDbClient } from "@laudousg/db";
import { sql } from "drizzle-orm";
import type { AsrOriginal } from "@laudousg/shared";

/**
 * Opção B do estudo de 12/10/2026: guarda o texto do Deepgram ANTES da edição do médico, a confiança
 * de cada palavra e as diferenças para o texto enviado. É o que permite medir o erro real de
 * transcrição (o banco só tinha o texto já corrigido). Ligado por ASR_GUARDAR_ORIGINAL.
 */

export type AsrCorrection = { antes: string; depois: string };

const MAX_CORRECOES = 120;
const MAX_TRECHO = 200;

function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}
const chave = (w: string) => w.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^\p{L}\d,]/gu, "");

/** Diferenças palavra a palavra (LCS), agrupadas em trechos contíguos. Pontuação/caixa não contam. */
export function diffWords(original: string, enviado: string): AsrCorrection[] {
  const a = tokens(original), b = tokens(enviado);
  const ka = a.map(chave), kb = b.map(chave);
  if (a.length * b.length > 4_000_000) return [{ antes: "(texto longo demais para comparar)", depois: "" }];
  const L: Uint16Array[] = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) L[i]![j] = ka[i] === kb[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const out: AsrCorrection[] = [];
  let i = 0, j = 0, ra: string[] = [], rb: string[] = [];
  const flush = () => {
    if ((ra.length || rb.length) && out.length < MAX_CORRECOES)
      out.push({ antes: ra.join(" ").slice(0, MAX_TRECHO), depois: rb.join(" ").slice(0, MAX_TRECHO) });
    ra = []; rb = [];
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && ka[i] === kb[j]) { flush(); i++; j++; }
    else if (j < b.length && (i >= a.length || L[i]![j + 1]! >= L[i + 1]![j]!)) rb.push(b[j++]!);
    else ra.push(a[i++]!);
  }
  flush();
  return out;
}

export function buildAsrCapture(asr: AsrOriginal, enviado: string) {
  const correcoes = diffWords(asr.texto, enviado);
  const palavras = (asr.palavras ?? []).map((p) => [p.w, Math.round(p.c * 1000) / 1000, p.s ?? null]);
  return {
    provedor: asr.provedor,
    modelo: asr.modelo ?? null,
    texto_original: asr.texto,
    texto_enviado: enviado,
    palavras: palavras.length ? palavras : null,
    correcoes,
    editado: correcoes.length > 0,
    baixa_confianca: asr.palavras ? asr.palavras.filter((p) => p.c < 0.65).length : null,
  };
}

/** Grava sem bloquear a geração; falha só gera log (sem texto). */
export async function recordAsrCapture(args: { reportId: string; userId: string; categoria: string | null; asr: AsrOriginal; enviado: string }) {
  try {
    const c = buildAsrCapture(args.asr, args.enviado);
    await getDbClient().execute(sql`
      insert into public.asr_capturas
        (report_id, user_id, categoria, provedor, modelo, texto_original, texto_enviado, palavras, correcoes, editado, baixa_confianca)
      values (${args.reportId}, ${args.userId}, ${args.categoria}, ${c.provedor}, ${c.modelo}, ${c.texto_original}, ${c.texto_enviado},
              ${c.palavras ? JSON.stringify(c.palavras) : null}::jsonb, ${JSON.stringify(c.correcoes)}::jsonb, ${c.editado}, ${c.baixa_confianca})`);
    console.log(`[asr_captura ${args.reportId}] provedor=${c.provedor} correcoes=${c.correcoes.length} baixa_confianca=${c.baixa_confianca ?? "-"}`);
  } catch (e) {
    console.warn(`[asr_captura ${args.reportId}] falhou: ${(e as Error).message?.slice(0, 120)}`);
  }
}
