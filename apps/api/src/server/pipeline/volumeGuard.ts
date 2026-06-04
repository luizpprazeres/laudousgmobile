/**
 * Guard determinístico de VOLUME.
 *
 * Regra do dono (2026-06-04): o PADRÃO é NUNCA calcular volume. O sistema só
 * deve calcular quando o médico PEDIR explicitamente. Hoje o writer (LLM)
 * auto-calcula sem ser pedido (ex.: inventa "volume de 57,9 cm³" na pelve) —
 * comportamento indesejado. Reforço de prompt não vence → determinístico.
 *
 * Comportamento:
 *  1. Médico PEDIU cálculo ("calcule o volume", "me dá o volume", ...):
 *     computa V = X · Y · Z · 0,52 (elipsóide) das 3 medidas e preenche o slot.
 *  2. Médico NÃO pediu E NÃO mencionou volume no input:
 *     remove qualquer volume que o LLM inventou → vira placeholder "____"
 *     (coerente com a filosofia de placeholders intencionais).
 *  3. Médico mencionou "volume" no input mas não pediu cálculo:
 *     deixa como está (ele está ditando os volumes; não mexer).
 */

const FACTOR = 0.52; // elipsóide padrão (x·y·z·0,52)

const num = (s: string): number => parseFloat(s.replace(",", "."));
const fmt = (n: number): string =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** O médico pediu explicitamente o cálculo do volume? */
export function requestedVolumeCalc(rawInput: string): boolean {
  return /calcul\w*[^.]{0,20}volum|volum[^.]{0,20}calcul|me\s+d[êéáe][^.]{0,12}volum|qual[^.]{0,15}volum/i.test(
    rawInput,
  );
}

// Inline (tireoide): "medindo A x|por B x|por C cm (volume de <slot> ml)".
// Grupo 1 = tudo até "volume de "; 2,3,4 = medidas; 5 = slot; 6 = unidade+fecho.
const INLINE_RE =
  /(medindo\s+([\d.,]+)\s*(?:x|×|por)\s*([\d.,]+)\s*(?:x|×|por)\s*([\d.,]+)\s*cm\s*\(\s*volume\s+de\s+)([\d.,]+|_+)(\s*(?:ml|cm³|cc))/gi;

// Slots de volume com NÚMERO (pra zerar no modo padrão). Duas formas:
//  a) "(volume de 6,2 ml)"        — parêntese antes de "volume"
//  b) "volume normal (57,9 cm³)"  — parêntese depois de "volume"
const STRIP_A = /(\(\s*volume\s+de\s+)([\d.,]+)(\s*(?:ml|cm³|cc))/gi;
const STRIP_B = /(volume[^.()]{0,25}\(\s*)([\d.,]+)(\s*(?:ml|cm³|cc)\s*\))/gi;

/**
 * Aplica a política de volume sobre o laudo final, a partir do input bruto.
 */
export function applyVolumePolicy(laudo: string, rawInput: string): string {
  // 1. Pediu cálculo → computa os slots inline a partir das medidas, e o total
  // da glândula (linha "X de volume normal (...)") como SOMA dos volumes inline
  // (evita o total errado que o LLM inventa, ex.: 26,11 em vez de 13,5).
  if (requestedVolumeCalc(rawInput)) {
    const volumes: number[] = [];
    let out = laudo.replace(
      INLINE_RE,
      (_m, pre: string, a: string, b: string, c: string, _slot: string, unit: string) => {
        const v = num(a) * num(b) * num(c) * FACTOR;
        if (!Number.isFinite(v)) return `${pre}____${unit}`;
        volumes.push(v);
        return `${pre}${fmt(v)}${unit}`;
      },
    );
    // Total da glândula = soma dos volumes inline computados; se não houve
    // medidas inline, zera (não deixa o número inventado pelo LLM).
    const total = volumes.reduce((s, v) => s + v, 0);
    out = out.replace(STRIP_B, (_m, pre: string, _n: string, post: string) =>
      volumes.length > 0 ? `${pre}${fmt(total)}${post}` : `${pre}____${post}`,
    );
    return out;
  }

  // 3. Mencionou "volume" sem pedir cálculo → está ditando; não mexe.
  if (/volume/i.test(rawInput)) return laudo;

  // 2. Padrão (não pediu, não ditou) → NUNCA calcular: zera volumes inventados.
  return laudo
    .replace(STRIP_A, (_m, pre: string, _n: string, unit: string) => `${pre}____${unit}`)
    .replace(STRIP_B, (_m, pre: string, _n: string, post: string) => `${pre}____${post}`);
}
