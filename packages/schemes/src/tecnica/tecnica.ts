/**
 * Seção COMENTÁRIOS (técnica) — fonte única da frase padrão por categoria × via (W15).
 * Renderers, prompts, o ajuste pós-geração e a web leem daqui.
 *
 * Frases = as dos laudos finais assinados (180 dias, W15 fase 1), com as decisões do Luiz (10/10/2026):
 * - obstétrica sem via ditada = transabdominal; TV = "com a finalidade de realizar a técnica transvaginal",
 *   título inalterado; TA+TV = o texto da pelve;
 * - cervicometria no morfológico/Doppler = "Foi realizada avaliação complementar do colo uterino pela via transvaginal.";
 * - contexto clínico ditado no fim da seção; idade só quando ditada;
 * - documentação "que possuem várias metodologias" em todas, sem "em NN fotos";
 * - MSK com 12 MHz + "Avaliação dinâmica quando aplicável." ("abrangendo a avaliação do {segmento}" é antiga);
 * - parede abdominal sempre linear com avaliação dinâmica e manobra de Valsalva;
 * - pelve: "transvaginal" sem "transabdominal" = só TV; sem via = TA+TV;
 * - próstata: a frase longa dos finais (rodada 2).
 */

export type ViaTecnica = "ta" | "tv" | "ta_tv";

export const DOCUMENTACAO_FOTOGRAFICA =
  "A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

export const COMPLEMENTO_DOPPLER_FETAL = "Foi utilizado Doppler colorido para avaliação hemodinâmica fetal.";
export const COMPLEMENTO_CERVICOMETRIA = "Foi realizada avaliação complementar do colo uterino pela via transvaginal.";

const PELVE_TA_TV =
  "Exame realizado inicialmente com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta e paciente em decúbito dorsal. Após a micção, foi introduzido transdutor de 6.5 MHz com a finalidade de realizar a técnica transvaginal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais, abrangendo toda a pelve.";
const PELVE_TV = "Exame realizado com transdutor de 6.5 MHz, pela técnica transvaginal.";
const PELVE_TA =
  "Exame realizado com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta e paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais, abrangendo toda a pelve.";

const OBST_TA = "Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante.";
const OBST_TV = "Exame realizado com transdutor de 6.5 MHz, com a finalidade de realizar a técnica transvaginal.";
const OBST = { padrao: "ta" as const, vias: { ta: OBST_TA, tv: OBST_TV, ta_tv: PELVE_TA_TV } };

export const MSK_TECNICA =
  "Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável.";
export const PAREDE_TECNICA =
  "Exame realizado com transdutor linear de alta frequência, com avaliação dinâmica da parede abdominal e manobra de Valsalva.";

export type TecnicaCategoria = {
  /** Via quando nada é ditado; null = categoria sem via. */
  padrao: ViaTecnica | null;
  /** Frase(s) da técnica antes da documentação, por via (ou `unica`). */
  vias: Partial<Record<ViaTecnica | "unica", string>>;
  /** Frase(s) fixas depois da documentação (ex.: escrotal em ortostase). */
  depois?: string;
};

export const TECNICA_POR_CATEGORIA: Readonly<Record<string, TecnicaCategoria>> = {
  OBSTETRICA: OBST,
  DOPPLER_OBSTETRICO: OBST,
  MORFOLOGICO: OBST,
  PELVE_FEMININA: { padrao: "ta_tv", vias: { ta_tv: PELVE_TA_TV, tv: PELVE_TV, ta: PELVE_TA } },
  CERVICOMETRIA: { padrao: "tv", vias: { tv: PELVE_TV } },
  ABDOMEN_TOTAL: {
    padrao: null,
    vias: {
      unica:
        "Exame realizado com transdutor de 4.0 MHz, inicialmente do abdome superior com paciente em jejum e posteriormente com a bexiga repleta do abdome inferior. Foram realizados múltiplos cortes, abrangendo todo o abdome, em decúbito dorsal como também em ortostase.",
    },
  },
  ABDOMEN_SUPERIOR: {
    padrao: null,
    vias: { unica: "Exame realizado com transdutor de 4.0 MHz, com paciente em jejum. Foram realizados múltiplos cortes do andar superior do abdome, em decúbito dorsal e laterais." },
  },
  VIAS_URINARIAS: {
    padrao: null,
    vias: {
      unica:
        "Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes dos rins, em decúbito dorsal e ventral. Após repleção vesical foram realizados cortes da pelve com o paciente em decúbito dorsal.",
    },
  },
  TIREOIDE: {
    padrao: null,
    vias: { unica: "Exame realizado com transdutor de 12 MHz, abrangendo todos os segmentos da glândula tireoide, como também a cadeia ganglionar cervical de I a V." },
  },
  MAMARIA: { padrao: null, vias: { unica: "Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas." } },
  ESCROTAL: {
    padrao: null,
    vias: { unica: "Exame realizado com transdutor de 12 MHz, abrangendo todo conteúdo escrotal. Foram realizados múltiplos cortes dos epidídimos, dos testículos e dos plexos pampiniformes." },
    depois: "Exame realizado com o paciente em ortostase e com manobra de Valsalva.",
  },
  // Rodada 2 do Luiz (10/10): a frase longa dos finais (13/14); a Biblioteca no banco muda por SQL.
  PROSTATA_SUPRAPUBICA: {
    padrao: null,
    vias: {
      unica:
        "Exame realizado com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais abrangendo toda a pelve.",
    },
  },
  CERVICAL: { padrao: null, vias: { unica: "Exame realizado com transdutor de 12 MHz, abrangendo a avaliação das cadeias ganglionares cervicais." } },
  PAREDE_ABDOMINAL: { padrao: null, vias: { unica: PAREDE_TECNICA } },
  MUSCULOESQUELETICO_V2: { padrao: null, vias: { unica: MSK_TECNICA } },
  /** Id da categoria na web (o código no banco é MUSCULOESQUELETICO_V2). */
  MUSCULOESQUELETICO: { padrao: null, vias: { unica: MSK_TECNICA } },
};

/** Categorias em que a via ditada troca a frase sem mudar o título (família obstétrica). */
export const CATEGORIAS_VIA_SEM_TITULO = ["OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO"] as const;

/** Frase da técnica (sem documentação) da categoria na via; via ausente/indisponível → a padrão. */
export function fraseTecnica(categoria: string, via?: ViaTecnica | null): string | null {
  const t = TECNICA_POR_CATEGORIA[categoria];
  if (!t) return null;
  if (t.padrao === null) return t.vias.unica ?? null;
  return (via ? t.vias[via] : undefined) ?? t.vias[t.padrao] ?? null;
}

/** Parágrafo completo dos COMENTÁRIOS (sem o cabeçalho): técnica + complementos + documentação + fixas. */
export function comentariosPadrao(
  categoria: string,
  opts: { via?: ViaTecnica | null; complementos?: Array<string | null | undefined> } = {},
): string | null {
  const frase = fraseTecnica(categoria, opts.via);
  if (!frase) return null;
  const comp = (opts.complementos ?? []).filter((c): c is string => Boolean(c));
  const depois = TECNICA_POR_CATEGORIA[categoria]?.depois;
  return [frase, ...comp, DOCUMENTACAO_FOTOGRAFICA, ...(depois ? [depois] : [])].join(" ");
}

const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Variantes de ASR vistas nos ditados: "transapdominal", "transabdômen", "abdominial e transvaginal".
const RE_TA = /\btrans\s?-?a[bp]d[o]m(?:in\w*|en)\b|\bvia\s+(?:supra\s?pubica|abdominal)\b|\bsuprapubic\w*/;
const RE_TA_COLADA = /\babdomin\w*\s*(?:,|e)?\s*(?:e\s+)?trans\s?-?vaginal/;
const RE_TV = /\btrans\s?-?vaginal\b|\bendovaginal\b|\bvia\s+vaginal\b|\bendocavitari\w*/;
// TV que não é a via do exame: cervicometria/colo pela via transvaginal, negação, comando de remoção.
const RE_TV_NAO_EXAME =
  /(?:cervicometria|colo(?:\s+uterino)?|medida\s+do\s+colo)[^.;\n]{0,60}(?:trans\s?-?vaginal|endovaginal|via\s+vaginal|endocavitari\w*)|(?:trans\s?-?vaginal|endovaginal)[^.;\n]{0,30}(?:cervicometria|colo)|(?:nao|sem|remov\w*|tir\w*)\s+(?:\w+\s+){0,3}(?:trans\s?-?vaginal|endovaginal)/g;

/**
 * Via do exame ditada, ou null se nada foi dito. "transvaginal" sozinho = TV; com transabdominal = TA+TV.
 * Cervicometria/colo "pela via transvaginal" não é a via do exame (é o complemento).
 */
export function viaDoDitado(ditado: string | null | undefined): ViaTecnica | null {
  if (!ditado) return null;
  const s = sem(ditado);
  const tvLimpo = s.replace(RE_TV_NAO_EXAME, " ");
  const tv = RE_TV.test(tvLimpo);
  const ta = RE_TA.test(s) || RE_TA_COLADA.test(tvLimpo);
  if (tv && ta) return "ta_tv";
  if (tv) return "tv";
  if (ta) return "ta";
  return null;
}

/** Via escrita num parágrafo de COMENTÁRIOS (pelas frases da casa); null se não reconhecida. */
export function viaDoTexto(comentarios: string): ViaTecnica | null {
  const s = sem(comentarios);
  const tv = /transvaginal|endocavitari/.test(s.replace(sem(COMPLEMENTO_CERVICOMETRIA), " ").replace(/cervicometria[^.]*\./g, " "));
  const ta = /transabdominal|abdome da gestante|4[.,]0 mhz/.test(s);
  return tv && ta ? "ta_tv" : tv ? "tv" : ta ? "ta" : null;
}

const EXTENSO_PEQUENO: Record<string, string> = {
  um: "1", uma: "1", dois: "2", duas: "2", tres: "3", quatro: "4", cinco: "5", seis: "6", sete: "7", oito: "8",
  nove: "9", dez: "10", onze: "11", doze: "12", treze: "13", quatorze: "14", catorze: "14", quinze: "15",
  dezesseis: "16", dezessete: "17", dezoito: "18",
};
const NUM = "(\\d{1,2}|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito)";
const num = (w: string) => EXTENSO_PEQUENO[sem(w)] ?? w;
const NEGA_ANTES = /(?:n[ãa]o|sem|remov\w*|tir[ae]\w*|apag\w*)\s+(?:\S+\s+){0,3}$/i;

/** Uma frase de contexto clínico ditada → texto do laudo + chave para saber se já está escrita. */
export type ContextoTecnica = { frase: string; chave: RegExp };

/**
 * Contexto clínico ditado que vai no fim dos COMENTÁRIOS (decisão do Luiz): idade de recém-nascido,
 * criança ou adolescente, urgência, mama masculina, estudo comparativo. Só o que foi ditado; nada do cadastro.
 * Na família obstétrica só vale a frase explícita ("exame realizado em …"), porque "gestante" e
 * idade gestacional estão em todo ditado.
 */
export function contextoDoDitado(ditado: string | null | undefined, categoria: string): ContextoTecnica[] {
  if (!ditado) return [];
  const out: ContextoTecnica[] = [];
  const add = (frase: string, chave: RegExp) => {
    if (!out.some((c) => c.chave.source === chave.source)) out.push({ frase, chave });
  };
  const obst = (CATEGORIAS_VIA_SEM_TITULO as readonly string[]).includes(categoria);
  const livre = (m: RegExpExecArray) => !NEGA_ANTES.test(ditado.slice(Math.max(0, m.index - 40), m.index));

  for (const m of ditado.matchAll(new RegExp(`rec[eé]m[- ]?nascid([oa])\\s+(?:de|com)\\s+${NUM}\\s+(dias?|semanas?|m[eê]s(?:es)?)(?:\\s+de\\s+vida)?`, "gi"))) {
    if (obst || !livre(m)) continue;
    const n = num(m[2]!);
    const unidade = sem(m[3]!).startsWith("m") ? (n === "1" ? "mês" : "meses") : sem(m[3]!).startsWith("s") ? (n === "1" ? "semana" : "semanas") : n === "1" ? "dia" : "dias";
    add(`Exame realizado em ${m[1] === "a" ? "uma recém-nascida" : "um recém-nascido"} de ${n} ${unidade} de vida.`, /rec[eé]m[- ]?nascid/i);
  }
  for (const m of ditado.matchAll(new RegExp(`\\b(crian[cç]a|adolescente|lactente)\\s+(?:de|com)\\s+${NUM}\\s+(anos?|m[eê]s(?:es)?)`, "gi"))) {
    if (obst || !livre(m)) continue;
    const n = num(m[2]!);
    const quem = sem(m[1]!).startsWith("crian") ? "uma criança" : sem(m[1]!).startsWith("adol") ? "uma adolescente" : "um lactente";
    const unidade = sem(m[3]!).startsWith("m") ? (n === "1" ? "mês" : "meses") : n === "1" ? "ano" : "anos";
    add(`Exame realizado em ${quem} de ${n} ${unidade}.`, new RegExp(sem(m[1]!).slice(0, 5), "i"));
  }
  for (const m of ditado.matchAll(/(?:exame|realizad\w*|feit\w*)[^.\n]{0,30}\b(?:de|na|em)\s+urg[eê]ncia|contexto\s+de\s+urg[eê]ncia/gi)) {
    if (livre(m)) add("Exame realizado em contexto de urgência.", /urg[eê]ncia/i);
  }
  for (const m of ditado.matchAll(/\bmama\s+masculina(?:\s*,?\s*por\s+queixa\s+de\s+([^.\n]{3,60}))?/gi)) {
    if (categoria !== "MAMARIA" || !livre(m)) continue;
    add(`Exame realizado em mama masculina${m[1] ? `, por queixa de ${m[1].trim().replace(/[,;]+$/, "")}` : ""}.`, /mama\s+masculina/i);
  }
  for (const m of ditado.matchAll(/estudo\s+comparativo\s+com\s+o\s+lado\s+contralateral|compara(?:tivo|ção|r)\s+com\s+o\s+(?:lado\s+)?contralateral/gi)) {
    if (!obst && livre(m)) add("Foi realizado estudo comparativo com o lado contralateral.", /contralateral/i);
  }
  return out;
}

/** "transdutor de 9 MHz" ditado (um só valor) → "9"; senão null. */
export function mhzDoDitado(ditado: string | null | undefined): string | null {
  if (!ditado) return null;
  const vals = new Set(
    [...ditado.matchAll(/transdutor\s+(?:linear\s+|convexo\s+|endocavit\w+\s+|setorial\s+)?(?:de\s+alta\s+frequ[eê]ncia\s+)?(?:de\s+)?(\d{1,2}(?:[.,]\d)?)\s*(?:mhz|mega(?:-?hertz)?)\b/gi)]
      .map((m) => m[1]!.replace(",", ".")),
  );
  return vals.size === 1 ? [...vals][0]! : null;
}

/** Limite da frase de técnica preferida (preferência por usuário e categoria). */
export const TECNICA_PREFERIDA_MAX = 600;

/**
 * Frase de técnica preferida do usuário para a categoria (decisão do Luiz, 10/10: editável por usuário e por
 * categoria). Substitui só a frase padrão da via padrão, quando ela está no laudo: via escolhida/ditada,
 * complementos (Doppler, cervicometria), documentação e contexto ficam como estão. Vazia → laudo intocado.
 */
export function aplicarTecnicaPreferida(laudo: string, categoria: string, preferida: string | null | undefined): string {
  const nova = (preferida ?? "").replace(/\s+/g, " ").trim().slice(0, TECNICA_PREFERIDA_MAX);
  const padrao = fraseTecnica(categoria);
  if (!nova || !padrao || nova === padrao) return laudo;
  const cab = /COMENT[ÁA]RIOS\s*:\s*/.exec(laudo);
  if (!cab) return laudo;
  const ini = cab.index + cab[0].length;
  // Só dentro da seção (até a primeira linha em branco depois do texto dela).
  const fim = laudo.slice(ini).search(/\n[ \t]*\n/);
  const secao = fim < 0 ? laudo.slice(ini) : laudo.slice(ini, ini + fim);
  const k = secao.indexOf(padrao);
  if (k < 0) return laudo;
  const j = ini + k;
  return laudo.slice(0, j) + (/[.!?]$/.test(nova) ? nova : `${nova}.`) + laudo.slice(j + padrao.length);
}
