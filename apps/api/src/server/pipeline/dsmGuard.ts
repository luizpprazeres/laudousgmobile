/**
 * Guard determinístico do DSM (Diâmetro Médio do Saco Gestacional).
 *
 * Regra do dono: como o volume, o DSM só é calculado quando o médico PEDE
 * explicitamente ("calcule o DSM", "calcule o diâmetro médio do saco
 * gestacional"). O contract OBSTETRICA já descreve a regra, mas o LLM nem sempre
 * obedece (prompt não vence → determinístico).
 *
 * Fórmula: DSM = (D1 + D2 + D3) / 3, reportado em MM no laudo.
 * Unidade das medidas ditadas: explícita (cm/mm) tem prioridade; sem unidade,
 * usa heurística de tamanho (valores < 10 → cm; >= 10 → mm). Converte p/ mm.
 */

const num = (s: string): number => parseFloat(s.replace(",", "."));
const fmt = (n: number): string =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** O médico pediu o cálculo do DSM? */
export function requestedDsmCalc(rawInput: string): boolean {
  return /calcul\w*[^.]{0,30}(?:\bdsm\b|di[âa]metro\s+m[ée]dio)|\bdsm\b[^.]{0,15}(?:pelas?\s+medidas?|calcul)|di[âa]metro\s+m[ée]dio\s+do\s+saco/i.test(
    rawInput,
  );
}

// Medidas do saco gestacional no input: "saco gestacional ... medindo X por/x Y por/x Z [cm|mm]".
const SAC_MEAS =
  /saco\s+gestacional[^.]{0,40}?medindo\s+([\d.,]+)\s*(?:x|×|por)\s*([\d.,]+)\s*(?:x|×|por)\s*([\d.,]+)\s*(cm|mm)?/i;

// Slot do DSM no laudo: "diâmetro médio de ____ mm" (ou com número).
const DSM_SLOT = /(di[âa]metro\s+m[ée]dio\s+(?:de\s+)?)(?:[\d.,]+|_+)(\s*mm)/i;

/** Calcula o DSM em MM a partir das 3 medidas + unidade detectada. */
function computeDsmMm(d: number[], explicitUnit: string): number | null {
  if (d.length !== 3 || !d.every((x) => Number.isFinite(x) && x > 0)) return null;
  const avg = (d[0]! + d[1]! + d[2]!) / 3;
  const unit = explicitUnit.toLowerCase();
  if (unit === "mm") return avg; // já em mm
  if (unit === "cm") return avg * 10; // cm → mm
  // sem unidade: heurística de tamanho (saco gestacional em cm é ~1-5; em mm ~10-50)
  const allSmall = d.every((x) => x < 10);
  return allSmall ? avg * 10 : avg;
}

/**
 * Aplica a política do DSM: SÓ calcula quando o médico pede. Preenche o slot
 * "diâmetro médio de ____ mm" com o DSM. No-op se não pediu, se não achar as
 * 3 medidas, ou se não houver slot.
 */
export function applyDsmPolicy(laudo: string, rawInput: string): string {
  if (!DSM_SLOT.test(laudo)) return laudo;

  // 1. Pediu cálculo → computa o DSM das 3 medidas e preenche o slot.
  if (requestedDsmCalc(rawInput)) {
    const m = rawInput.match(SAC_MEAS);
    if (!m) return laudo;
    const dsm = computeDsmMm([num(m[1]!), num(m[2]!), num(m[3]!)], m[4] ?? "");
    if (dsm === null) return laudo;
    return laudo.replace(DSM_SLOT, (_full, pre: string, post: string) => `${pre}${fmt(dsm)}${post}`);
  }

  // 2. Médico referenciou o DSM/diâmetro médio (está ditando) → não mexe.
  if (/\bdsm\b|di[âa]metro\s+m[ée]dio/i.test(rawInput)) return laudo;

  // 3. Padrão: NUNCA calcular → zera o DSM que o LLM auto-calculou.
  return laudo.replace(DSM_SLOT, (_full, pre: string, post: string) => `${pre}____${post}`);
}
