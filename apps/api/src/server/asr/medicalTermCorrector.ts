/**
 * Correção DETERMINÍSTICA de termos médicos que o ASR erra de forma sistemática.
 *
 * Por que isto existe: medindo 18 amostras em 03/08 (ver
 * `docs/brainstorm-transcricao-ao-vivo-2026-08-02.md` §1.1), os keyterms do
 * Deepgram levam o acerto de termo de 68% → 77% — e aí **estacionam**. Os termos
 * que continuam falhando falham SEMPRE DO MESMO JEITO:
 *
 *   hipoecoico   → "hipoicoico"      isoecoico → "isoicoico"
 *   retroareolar → "retroariolar"    safena magna → "safeina magna"
 *   BI-RADS      → "birads"          TI-RADS   → "trads"
 *   Hadlock      → "adlock"          tendinopatia → "dinopatia"
 *
 * Erro sistemático se conserta com tabela, não com mais biasing. E tabela é
 * auditável, testável e **independente do motor** — vale para o Deepgram hoje e
 * para o SpeechTranscriber da Apple amanhã.
 *
 * REGRA DE OURO desta tabela: a grafia ERRADA nunca pode ser uma palavra
 * legítima do português médico. Se houver qualquer chance de o "errado" ser o
 * que o médico realmente disse, a entrada NÃO entra aqui.
 *
 * Caso deliberadamente FORA: "biometria" → sai como "miometria". Não corrigimos,
 * porque "miométrio"/"miometrial" são termos reais de pelve — o risco de
 * estragar um laudo ginecológico supera o ganho no obstétrico.
 */

interface Correction {
  /** Grafia(s) erradas. Casadas com limite de palavra, sem diferenciar caixa. */
  readonly wrong: RegExp;
  /** Grafia correta. `$1`, `$2`… disponíveis para os grupos do regex. */
  readonly right: string;
}

const CORRECTIONS: readonly Correction[] = [
  // ── Família -ecoico ────────────────────────────────────────────────────────
  // O ASR troca o "e" por "i": hipoecoico → hipoicoico. Uma regra cobre todas.
  // "anicoico"/"hipoicoico"/"isoicoico"/"hipericoico" não existem em português.
  { wrong: /\b(hipo|hiper|iso|an)icoico(s)?\b/gi, right: "$1ecoico$2" },
  { wrong: /\b(hipo|hiper|iso|an)icoic(a|as|os)\b/gi, right: "$1ecoic$2" },
  // Variantes vistas no motor on-device da Apple.
  { wrong: /\banec[ií]co(s)?\b/gi, right: "anecoico$1" },

  // ── Classificações ─────────────────────────────────────────────────────────
  // O modo de falha clássico do jargão radiológico: o acrônimo vira palavra.
  { wrong: /\bb[iy][\s-]?rads\b/gi, right: "BI-RADS" },
  { wrong: /\bt[i1][\s-]?rads\b/gi, right: "TI-RADS" },
  { wrong: /\btrads\b/gi, right: "TI-RADS" },
  { wrong: /\bo[\s-]?rads\b/gi, right: "O-RADS" },
  { wrong: /\borads\b/gi, right: "O-RADS" },
  { wrong: /\bp[i1][\s-]?rads\b/gi, right: "PI-RADS" },
  { wrong: /\bpirads\b/gi, right: "PI-RADS" },

  // ── Epônimos ───────────────────────────────────────────────────────────────
  { wrong: /\b(?:h?ad|rad)lock\b/gi, right: "Hadlock" },
  { wrong: /\baddoc\b/gi, right: "Hadlock" },
  { wrong: /\b(?:cadi|di)acimoto\b/gi, right: "Hashimoto" },
  { wrong: /\bhachimoto\b/gi, right: "Hashimoto" },
  { wrong: /\bgran[nh]?um\b/gi, right: "Grannum" },
  { wrong: /\bbosniac\b/gi, right: "Bosniak" },

  // ── Trocas de vogal / truncamentos ─────────────────────────────────────────
  { wrong: /\bsafeina\b/gi, right: "safena" },
  { wrong: /\bretroariolar\b/gi, right: "retroareolar" },
  { wrong: /\bdinopatia\b/gi, right: "tendinopatia" },
  { wrong: /\bani[óo]tico\b/gi, right: "amniótico" },
  { wrong: /\b(?:cole[íi]ase|coleitiase|colelitiase)\b/gi, right: "colelitíase" },
  { wrong: /\bestiaatose\b/gi, right: "esteatose" },
  // "maior bolsão vertical" (MBV, líquido amniótico) — o "ls" some no decode.
  // Nenhuma destas grafias existe em português; "bolsa" (amniótica) não casa,
  // porque o limite de palavra exige o "-ão"/"-ao" no fim.
  { wrong: /\b(?:bo[çc][ãa]o|bol[çc][ãa]o|bolsao)\b/gi, right: "bolsão" },

  // ── Artigo comido pelo `numerals=true` ─────────────────────────────────────
  // O Deepgram ouve "o maior" como "um maior" e o smart-format converte para
  // "1 maior". Precisa vir DEPOIS da regra de grafia acima, para que
  // "1 maior boçao" já tenha virado "1 maior bolsão" quando esta rodar.
  // Restrito ao substantivo conhecido de propósito: "o" e "a" têm gênero, e
  // adivinhar errado estraga a frase. Ampliar só com caso medido em mãos.
  { wrong: /\b1\s+(maior|menor)\s+bolsão\b/gi, right: "o $1 bolsão" },
];

/**
 * Aplica as correções preservando a capitalização inicial do trecho original —
 * "Hipoicoico" no começo da frase volta como "Hipoecoico", não "hipoecoico".
 */
export function correctMedicalTerms(text: string): string {
  let out = text;
  for (const { wrong, right } of CORRECTIONS) {
    out = out.replace(wrong, (...args) => {
      const match = args[0] as string;
      const groups = args.slice(1, -2) as (string | undefined)[];
      let replaced = right.replace(/\$(\d)/g, (_, d) => groups[Number(d) - 1] ?? "");
      // Só reaplica caixa quando o alvo NÃO é um acrônimo/nome próprio fixo.
      const isFixedForm = /[A-Z]/.test(right.replace(/\$\d/g, ""));
      if (!isFixedForm && /^[A-ZÀ-Ý]/.test(match)) {
        replaced = replaced.charAt(0).toUpperCase() + replaced.slice(1);
      }
      return replaced;
    });
  }
  return out;
}

/** Exposto só para teste — permite afirmar que a tabela não tem entrada perigosa. */
export const MEDICAL_TERM_CORRECTION_COUNT = CORRECTIONS.length;
