/**
 * Guard determinístico do SANITY DE MAGNITUDE da biometria.
 *
 * BUG corrigido (2026-06-04, achado na auditoria): a regra de magnitude em
 * prompts/global.ts (§ SANITY CHECK DE MAGNITUDE) pede para sinalizar
 * "[REVISAR — magnitude]" APENAS valores ABAIXO do piso (truncação de voz, ex.
 * "DBP 7 mm"). Mas o LLM super-flagava valores no LIMITE SUPERIOR — DBP 90 mm,
 * CC 321 mm, CA 330 mm (todos NORMAIS no termo) saíam com "[REVISAR — magnitude]".
 * Isso polui laudos corretos e mina a confiança do médico.
 *
 * Solução: pós-processamento determinístico. Para cada linha de biometria com o
 * flag, se o valor está DENTRO da faixa fisiológica do parâmetro, remove o flag
 * espúrio. Valores genuinamente fora (truncados) mantêm o flag.
 */

const FLAG_RE = /\s*\[REVISAR\s*[—–-]\s*magnitude\]/gi;

// [piso, teto] em mm. Só remove o flag quando piso <= valor <= teto.
const RANGES: { test: RegExp; range: [number, number] }[] = [
  { test: /di[âa]metro biparietal|\bdbp\b/i, range: [10, 200] },
  { test: /circunfer[êe]ncia da cabe[çc]a|\bcc\b/i, range: [50, 500] },
  { test: /circunfer[êe]ncia abdominal|\bca\b/i, range: [40, 500] },
  { test: /comprimento do f[êe]mur|\bcf\b/i, range: [8, 150] },
  { test: /colo (?:uterino|do útero|medindo)|comprimento do colo/i, range: [5, 80] },
];

function rangeForLine(line: string): [number, number] | null {
  for (const { test, range } of RANGES) if (test.test(line)) return range;
  return null;
}

export function stripSpuriousMagnitudeFlags(output: string): string {
  if (!/\[REVISAR/i.test(output)) return output;
  return output
    .split("\n")
    .map((line) => {
      if (!FLAG_RE.test(line)) return line;
      FLAG_RE.lastIndex = 0;
      const range = rangeForLine(line);
      if (!range) return line; // parâmetro desconhecido → conservador, mantém
      const m = line.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm)\b/i);
      if (!m) return line;
      let val = parseFloat(m[1]!.replace(",", "."));
      if (m[2]!.toLowerCase() === "cm") val *= 10;
      const [lo, hi] = range;
      // Dentro da faixa fisiológica → flag era espúrio, remove.
      return val >= lo && val <= hi ? line.replace(FLAG_RE, "") : line;
    })
    .join("\n");
}
