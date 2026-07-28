import { parseConclusion, renderWithConclusion } from "./conclusionUtils";

/**
 * Guard determinístico de FORMA para DUM / Primeira USG / idade gestacional.
 *
 * Roda APÓS o writer emitir — não compete com a geração (por isso não desloca
 * vitalidade/líquido, ao contrário do bloco de prompt, que deu 2× NO-GO no A/B).
 * NÃO decide qual IG governa a conclusão (âncora clínica) — só normaliza a forma,
 * corrigindo desvios REAIS observados nos laudos-100:
 *
 *  1. "Primeira ultrassonografia realizada DD/MM/AAAA com ..." → frase canônica
 *     "Primeira USG: DD/MM/AAAA, com ..." (c0c85ac5).
 *  2. Linha fabricada "Data da última menstruação correspondente a X ... na data
 *     do exame." (quando só veio IG em semanas) → "Idade gestacional de X ..."
 *     (4d8d3cb5 / f541e337).
 *  3. Item de conclusão "N) Gestação em torno de ____ semanas." (placeholder de
 *     IG) → removido e a conclusão renumerada (e9e44aec / 19e3816b).
 *  4. Concordância "1 dias" → "1 dia" (singular) em contexto de dias.
 *
 * Idempotente e conservador: só age nas assinaturas de defeito acima; qualquer
 * outro texto passa inalterado (byte-idêntico).
 */
export function normalizeDumFormat(text: string): string {
  let out = text;

  // 1. Frase da Primeira USG reescrita → canônica "Primeira USG: DATA, com ...".
  //    Só casa a forma derivada exata (verbo "realizada" + data), inserindo o
  //    rótulo canônico e a vírgula após a data. Não toca em "Primeira USG:" já correto.
  out = out.replace(
    /Primeira ultrassonografia realizada\s+(\d{2}\/\d{2}\/\d{4})\s+com\s+/gi,
    "Primeira USG: $1, com ",
  );

  // 2. Linha de DUM fabricada a partir de IG em semanas → idade gestacional.
  out = out.replace(
    /Data da [uú]ltima menstrua[çc][ãa]o correspondente a\s+(.+?)\s+na data do exame\./gi,
    "Idade gestacional de $1.",
  );

  // 4. Concordância "1 dias" → "1 dia" (só o numeral 1 isolado; "21 dias" fica).
  out = out.replace(/\b1 dias\b/g, "1 dia");

  // 3. Remove o item de conclusão cujo conteúdo é "Gestação em torno de ____
  //    semanas" (placeholder de IG) — tipicamente o item duplicado ao lado de
  //    uma gestação real (e9e44aec/19e3816b). Reusa o parser p/ renumerar.
  //    SÓ remove se sobrar ao menos um item: nunca esvazia a conclusão (se o
  //    placeholder for o ÚNICO item, deixar — conclusão vazia é pior; o dado de
  //    IG faltou na origem e isso é problema do ditado, não de forma).
  const parsed = parseConclusion(out);
  if (parsed.found) {
    const kept = parsed.items.filter(
      (item) => !/^Gesta[çc][ãa]o em torno de\s+_+\s*semanas\.?$/i.test(item.trim()),
    );
    if (kept.length !== parsed.items.length && kept.length > 0) {
      out = renderWithConclusion(parsed, kept);
    }
  }

  return out;
}
