const FEMININE_CARDINALS: Record<string, string> = {
  "1": "uma",
  "2": "duas",
  "3": "três",
};

const MASCULINE_CARDINALS: Record<string, string> = {
  "1": "um",
  "2": "dois",
  "3": "três",
};

const FEMININE_ORDINALS = [
  "",
  "primeira",
  "segunda",
  "terceira",
  "quarta",
  "quinta",
  "sexta",
  "sétima",
  "oitava",
  "nona",
  "décima",
] as const;

const MASCULINE_ORDINALS = [
  "",
  "primeiro",
  "segundo",
  "terceiro",
  "quarto",
  "quinto",
  "sexto",
  "sétimo",
  "oitavo",
  "nono",
  "décimo",
] as const;

const FEMININE_LANGUAGE_NOUN =
  "frase|frases|vez|vezes|linha|linhas|palavra|palavras";
const MASCULINE_LANGUAGE_NOUN = "item|itens|achado|achados|ponto|pontos|parágrafo|parágrafos";

function ordinal(value: string, gender: "f" | "m"): string {
  const number = Number(value);
  return gender === "f"
    ? (FEMININE_ORDINALS[number] ?? value)
    : (MASCULINE_ORDINALS[number] ?? value);
}

/**
 * Reverte escolhas de `numerals=true` somente em linguagem editorial.
 * Não interpreta números nem toca unidades, dimensões ou números clínicos.
 */
export function normalizeLanguageNumbers(text: string): string {
  let out = text;

  // Ordinal explícito do ASR: o símbolo já informa sem ambiguidade número/gênero.
  out = out.replace(
    /(?<!\d)(10|[1-9])\s*([ªº])(?=\s|[.,;:!?)]|$)/g,
    (_, value: string, marker: "ª" | "º") =>
      ordinal(value, marker === "ª" ? "f" : "m"),
  );

  // Posição editorial inequívoca: "na 2 linha" / "no 3 item".
  out = out.replace(
    new RegExp(`\\b(na|à)\\s+([1-3])\\s+(${FEMININE_LANGUAGE_NOUN})\\b`, "gi"),
    (_, prefix: string, value: string, noun: string) =>
      `${prefix} ${ordinal(value, "f")} ${noun}`,
  );
  out = out.replace(
    new RegExp(`\\b(no|ao)\\s+([1-3])\\s+(${MASCULINE_LANGUAGE_NOUN})\\b`, "gi"),
    (_, prefix: string, value: string, noun: string) =>
      `${prefix} ${ordinal(value, "m")} ${noun}`,
  );

  // Contagem de elementos de linguagem. O substantivo dá o gênero; nenhuma
  // inferência clínica é necessária. "ponto 5" fica protegido como possível
  // decimal falado e não é convertido.
  out = out.replace(
    new RegExp(`\\b([1-3])\\s+(${FEMININE_LANGUAGE_NOUN})\\b`, "gi"),
    (_, value: string, noun: string) =>
      `${FEMININE_CARDINALS[value] ?? value} ${noun}`,
  );
  out = out.replace(
    new RegExp(`\\b([1-3])\\s+(${MASCULINE_LANGUAGE_NOUN})\\b(?!\\s+\\d)`, "gi"),
    (_, value: string, noun: string) =>
      `${MASCULINE_CARDINALS[value] ?? value} ${noun}`,
  );

  // Comando seguido diretamente de contagem, sem substantivo que informe
  // gênero: usa cardinal masculino. Exclui explicitamente decimal, dimensão,
  // unidade, percentual, data e ordinal.
  out = out.replace(
    /\b(acrescente|coloque|adicione|escreva|remova)\s+([1-3])\b(?!\s*(?:[.,]\d|x\b|cm\b|mm\b|ml\b|mL\b|%|\/|[ªº]))/gi,
    (_, command: string, value: string) =>
      `${command} ${MASCULINE_CARDINALS[value] ?? value}`,
  );

  return out;
}
