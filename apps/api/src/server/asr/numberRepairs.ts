/**
 * Reparos de NÚMERO e MEDIDA no texto do Deepgram, antes do normalizador de medidas.
 *
 * Estudo de 12/10/2026 (54 áudios por streaming igual ao app + 3.976 ditados reais):
 * - Medida partida pela pausa: o endpointing de 300 ms fecha o trecho no meio da medida e o
 *   smart_format põe ponto — "10.2. Por 4.5. Por 4,1 cm". Em 11,7% dos ditados recentes.
 * - Porcentagem: o smart_format lê "cinquenta por cento" como "50 por 100", e o `normalizeMeasures`
 *   transformava em "50 x 100 intramural" (8 ditados reais de mioma FIGO). Tem de virar "50%"
 *   ANTES da junção de medidas.
 * - "por" engolido entre dois decimais de UMA casa ("10,2 4,5 x 4,1 cm"). Com duas casas
 *   ("10,24 0,5") a fusão é ambígua e NÃO é tocada — vira aviso (`medidasSuspeitas`).
 * - Unidade partida ("6,8 cm. Cúbicos"), "cm por segundo"/"por 2º" → cm/s, "1 cm e meio" → 1,5 cm,
 *   ponto decimal de 1–2 casas → vírgula (não toca milhar "1.230", data "12.03.2026", barra).
 *
 * Regra de ouro: nenhum reparo inventa número. Só junta, reescreve unidade ou troca separador.
 * Idempotente. Ligado por ASR_REPARO_NUMEROS.
 */

export function repairNumbers(text: string): string {
  let s = text;
  // "1 cm e meio" / "2 centímetros e meio" → "1,5 cm"
  s = s.replace(/\b(\d+)\s+(cm|mm|cent[íi]metros?|mil[íi]metros?)\s+e\s+meio\b/gi, (_m, n: string, u: string) => `${n},5 ${u}`);
  // porcentagem: "50 por 100", "50 x 100", "50 por cento" → "50%" (não quando segue unidade/medida: "50 x 100 mm")
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(?:por|x)\s*(?:100|cem|cento)\b(?!\s*(?:mm|cm|ml|x\b|por\s+\d|[.,]\d))/gi, "$1%");
  // "50 100 intramural" (o "por" sumiu de "cinquenta por cento"): 1–2 dígitos + 100 + palavra, sem unidade
  s = s.replace(/\b(\d{1,2})\s+100\b(?!\s*(?:mm|cm|ml|x\b|por|g\b|bpm|%|[.,]\d|mil[íi]metros?|cent[íi]metros?|mililitros?|gramas?|batimentos))(?=\s+\p{L})/giu, "$1%");
  // medida partida pela pausa: "10.2. Por 4.5" / "4,2. Por 5,1" / "1.6, por 1,5" → "… por …"
  for (let k = 0; k < 2; k++) s = s.replace(/(\d)[.,;]?\s+por[.,;]?\s+(?=\d)/gi, "$1 por ");
  // "por" engolido entre dois decimais de UMA casa, dentro de cadeia de medida
  for (let k = 0; k < 2; k++) s = s.replace(/(?<![\d,.])(\d+[.,]\d)\s+(\d+[.,]\d)(?![\d,.])(?=\s*(?:x|por|cm|mm|cent[íi]metros?|mil[íi]metros?)\b)/gi, "$1 x $2");
  // unidade partida: "6,8 cm. Cúbicos"
  s = s.replace(/\b(cm|cent[íi]metros?)[.,]?\s+c[úu]bicos\b/gi, "$1 cúbicos");
  // velocidade: "cm por segundo" / "centímetros por 2º" → cm/s
  s = s.replace(/\b(cm|cent[íi]metros?)\s+por\s+(?:segundo|2º)(?![\p{L}\d])/giu, "cm/s");
  // ponto decimal com 1–2 casas → vírgula (não milhar, não data, não barra)
  s = s.replace(/(?<![\d.,/])(\d{1,3})\.(\d{1,2})(?!\d|\.\d|\/)/g, "$1,$2");
  return s;
}

/**
 * Medidas provavelmente fundidas pela formatação ("7.34 0,1 x 5,2" ← "sete vírgula três [por] quatro
 * vírgula um"). Não há como desfazer com segurança: só devolve os trechos para o médico conferir.
 */
export function suspiciousMeasures(text: string): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  for (const m of text.matchAll(/(?<![\d,.])\d+[.,]\d{2}\s+0[.,]\d(?![\d])/g))
    out.push({ start: m.index!, end: m.index! + m[0].length, text: m[0] });
  for (const m of text.matchAll(/\b\d+\s+e\s+0[.,]\d\b/g))
    out.push({ start: m.index!, end: m.index! + m[0].length, text: m[0] });
  return out.sort((a, b) => a.start - b.start);
}
