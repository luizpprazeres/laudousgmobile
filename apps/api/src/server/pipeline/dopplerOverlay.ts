/**
 * Overlay Doppler determinístico (Fix B + C.2).
 *
 * Quando um laudo tem dados de Doppler ditados (obstétrico OU morfológico com
 * Doppler), monta a seção DOPPLERVELOCIMETRIA (corpo) + itens de conclusão a
 * partir dos VALORES DITADOS, seguindo o spec clínico do médico:
 *
 *  - Umbilical / ACM = MANUAL: assume NORMAL por padrão; só vira frase de
 *    alteração se o médico DITAR alteração (não auto-percentiliza).
 *  - Uterinas = AUTOMÁTICO: incisura, ectasia ou IP médio > percentil 95
 *    alteram a conclusão sozinhos.
 *  - Perfil hemodinâmico fetal = SEMPRE 1/RCP (RCP = ACM/umbilical). RCP<1 →
 *    perfil>1 (alterado); RCP>1 → perfil<1 (normal).
 *  - Percentis, ducto venoso, RCP e perfil são OPCIONAIS na seção corpo (só
 *    aparecem se ditados / calculáveis).
 *
 * Determinístico = a fraseologia é EXATAMENTE a do médico, sem variação do LLM
 * (padrão validado: "prompt não vence → determinístico").
 */
import { parseConclusion, renderWithConclusion } from "./conclusionUtils";

export interface DopplerData {
  ipUmbilical?: number;
  ipACM?: number;
  ipUterinaDir?: number;
  ipUterinaEsq?: number;
  ipMedioUterinas?: number;
  percUmbilical?: number;
  percACM?: number;
  percMedioUterinas?: number;
  ductoVenoso?: string;
  rcp?: number;
  /** Médico DITOU alteração manual (umbilical/ACM). */
  umbilicalAlterado?: boolean;
  acmAlterado?: boolean;
  centralizacao?: boolean;
  preCentralizacao?: boolean;
  /** Uterinas (automático): incisura, ectasia ou IP médio > P95. */
  incisura?: boolean;
  ectasia?: boolean;
  /** Uterinas >P95 por comando/explícito ("uterinas acima do percentil 95"). */
  uterinasAcimaP95?: boolean;
  /** SEGURANÇA: diástole zero/ausente/reversa na umbilical (força alteração). */
  diastoleZeroUmbilical?: boolean;
}

/**
 * SEGURANÇA P0 (boletim 03/07, caso 89ffa1ef reenviado 4×): NUNCA afirmar "IP
 * normal na umbilical" quando o IP umbilical BRUTO é grosseiramente elevado OU há
 * diástole zero/reversa ditada. A lógica de normalidade dependia só do flag
 * verbalizado (`umbilicalAlterado`) + percentil, ignorando o IP bruto (2,11) e a
 * diástole zero → laudo falso-normal em feto PIG (risco clínico direto).
 *
 * Limiar 1,5: acima do percentil 95 de QUALQUER IG obstétrica com Doppler (o P95
 * do IP umbilical varia ~0,8 a ~1,2). Conservador — não gera falso-positivo em
 * umbilical normal. Flag: DOPPLER_UMBILICAL_SAFETY (default OFF).
 */
export const UMBILICAL_IP_ALERTA = 1.5;
export function deriveUmbilicalSafety(d: DopplerData, rawInput?: string): DopplerData {
  const diastoleZero = rawInput
    ? /di[áa]stole\s+(?:zero|ausente|revers)/i.test(rawInput) && /umbilical/i.test(rawInput)
    : false;
  const ipAlto = d.ipUmbilical !== undefined && d.ipUmbilical >= UMBILICAL_IP_ALERTA;
  if (!diastoleZero && !ipAlto) return d;
  return {
    ...d,
    umbilicalAlterado: true,
    diastoleZeroUmbilical: diastoleZero || d.diastoleZeroUmbilical,
  };
}

const numFmt = (n: number): string =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const parseNum = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

const IP = "([0-9](?:[.,]\\d+)?)"; // IP fica entre 0 e ~3

/**
 * Extrai os dados Doppler do input bruto. Umbilical/ACM/uterinas + dir/esq, IP
 * médio, percentis, ducto, RCP e flags de alteração MANUAL (só quando o médico
 * verbaliza alteração — não infere de percentil).
 */
export function extractDopplerData(rawInput: string): DopplerData {
  const t = rawInput.toLowerCase();
  const d: DopplerData = {};

  const m = (re: RegExp): string | undefined => t.match(re)?.[1];

  d.ipUmbilical = parseNum(
    m(new RegExp(`ip\\s+(?:d[ao]\\s+)?art[eé]ria\\s+umbilical\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")) ??
      m(new RegExp(`umbilical[^.]{0,20}?ip\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")) ??
      m(new RegExp(`ip\\s+umbilical\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")),
  );
  d.ipACM = parseNum(
    m(new RegExp(`ip\\s+(?:d[ao]\\s+)?art[eé]ria\\s+cerebral\\s+m[eé]dia\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")) ??
      m(new RegExp(`(?:acm|cerebral\\s+m[eé]dia)[^.]{0,15}?ip\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")) ??
      m(new RegExp(`\\bacm\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")),
  );
  d.ipUterinaDir = parseNum(
    m(new RegExp(`uterina\\s+direita\\s*(?:[:-]|ip|de)?\\s*(?:ip\\s*)?(?:de\\s+|[=:]\\s*)?${IP}`, "i")),
  );
  d.ipUterinaEsq = parseNum(
    m(new RegExp(`uterina\\s+esquerda\\s*(?:[:-]|ip|de)?\\s*(?:ip\\s*)?(?:de\\s+|[=:]\\s*)?${IP}`, "i")),
  );
  d.ipMedioUterinas = parseNum(
    m(new RegExp(`ip\\s+m[eé]dio\\s+(?:d[ao]s?\\s+)?(?:art[eé]rias?\\s+)?uterinas?\\s*(?:mede\\s+|de\\s+|[=:]\\s*)?${IP}`, "i")) ??
      m(new RegExp(`(?:m[eé]dia?\\s+(?:d[ao]s?\\s+)?uterinas?|uterinas?\\s+m[eé]di[ao])\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")),
  );
  if (d.ipMedioUterinas === undefined) {
    // "IP médio uterinas 0,8" sem "artérias"
    d.ipMedioUterinas = parseNum(
      m(new RegExp(`uterinas?\\s*(?:de\\s+|[=:]\\s*)?${IP}`, "i")),
    );
  }

  // Percentis (opcionais) — NÃO cruzar vasos (F2): o percentil só conta se vier
  // ANTES de mencionar outro vaso (lookahead negativo entre o vaso e "percentil").
  d.percUmbilical = parseNum(
    m(/umbilical(?:(?!cerebral|uterina|\bacm\b|ducto)[^.])*?percentil\s+(\d{1,3})/i),
  );
  d.percACM = parseNum(
    m(/(?:acm|cerebral\s+m[eé]dia)(?:(?!umbilical|uterina|ducto)[^.])*?percentil\s+(\d{1,3})/i),
  );
  d.percMedioUterinas = parseNum(
    m(/uterinas?(?:(?!umbilical|cerebral|\bacm\b|ducto)[^.])*?percentil\s+(\d{1,3})/i),
  );

  // RCP
  d.rcp = parseNum(
    m(/(?:rcp|rela[çc][ãa]o\s+c[eé]rebro[\s-]?placent[áa]ria)\s*(?:de\s+|[=:]\s*)?([0-9](?:[.,]\d+)?)/i),
  );

  // Ducto venoso (texto qualitativo) — reproduzir conforme ditado (F6).
  if (/ducto\s+venoso/i.test(t)) {
    if (/onda\s+a\s+ausente/i.test(t)) d.ductoVenoso = "onda A ausente";
    else if (/onda\s+a\s+(?:revers|negativ)/i.test(t)) d.ductoVenoso = "onda A reversa";
    else d.ductoVenoso = "aspecto de onda trifásica (sístole ventricular, diástole ventricular e sístole atrial positivas)";
  }

  // Negação ampla (F3): "sem", "não há", "ausência de" (+ "sinais de" opcional).
  const NEG = "(?:sem|n[ãa]o\\s+h[áa]|aus[êe]ncia\\s+de)\\s+(?:sinais\\s+de\\s+)?";

  // Alterações MANUAIS / AUTO (só quando verbalizadas, respeitando negação).
  d.incisura =
    /incisura/i.test(t) && !new RegExp(NEG + "incisura", "i").test(t);
  // Ectasia das uterinas = automático (F4).
  d.ectasia = /ectasia/i.test(t) && !new RegExp(NEG + "ectasia", "i").test(t);
  // Uterinas >P95 por COMANDO/explícito ("uterinas acima do percentil 95",
  // "uterinas >P95", "uterinas alteradas/elevadas") — cobre o caso em que o
  // médico ACRESCENTA o item das uterinas em vez de ditar o valor do percentil.
  // Resolve o bug de "acima do percentil 95" (número 95) não passar no `> 95`.
  d.uterinasAcimaP95 =
    /uterinas?[^.]{0,55}(?:acima\s+d[eo]\s+(?:percentil\s*)?9[0-9]|maior\s+que\s+(?:o\s+)?percentil\s*9[0-9]|>\s*p?\.?\s*9[0-9]|percentil\s+9[6-9]|alterad|elevad|aumentad)/i.test(
      t,
    ) && !new RegExp(NEG + "(?:alteraç|elevaç)", "i").test(t);

  const isPre = /pr[ée][\s-]?centraliza/i.test(t);
  d.preCentralizacao =
    isPre && !new RegExp(NEG + "pr[ée][\\s-]?centraliza", "i").test(t);
  d.centralizacao =
    /centraliza[çc][ãa]o|brain\s*sparing|redistribui[çc][ãa]o/i.test(t) &&
    !isPre &&
    !new RegExp(NEG + "(?:pr[ée][\\s-]?)?centraliza", "i").test(t) &&
    !/sem\s+(?:brain\s*sparing|sinais\s+de\s+redistribui)/i.test(t);
  d.umbilicalAlterado = /umbilical[^.]{0,40}(?:elevad|alterad|aumentad|acima)/i.test(t);
  d.acmAlterado = /(?:acm|cerebral\s+m[eé]dia)[^.]{0,40}(?:reduzid|baixo|menor|inferior|alterad|diminu)/i.test(t);

  return d;
}

/** Há algum dado Doppler relevante? (valores OU alterações/percentis ditados) */
export function hasDopplerData(d: DopplerData): boolean {
  return (
    d.ipUmbilical !== undefined ||
    d.ipACM !== undefined ||
    d.ipMedioUterinas !== undefined ||
    d.ipUterinaDir !== undefined ||
    d.ipUterinaEsq !== undefined ||
    d.percMedioUterinas !== undefined ||
    d.rcp !== undefined ||
    d.ductoVenoso !== undefined ||
    d.umbilicalAlterado === true ||
    d.acmAlterado === true ||
    d.incisura === true ||
    d.ectasia === true ||
    d.centralizacao === true ||
    d.preCentralizacao === true
  );
}

/** A seção do corpo tem ao menos uma linha de vaso (além do cabeçalho)? */
function sectionHasVessels(d: DopplerData): boolean {
  return (
    d.ipUmbilical !== undefined ||
    d.ipACM !== undefined ||
    d.ipUterinaDir !== undefined ||
    d.ipUterinaEsq !== undefined ||
    d.ipMedioUterinas !== undefined ||
    d.ductoVenoso !== undefined
  );
}

/** RCP = ACM / umbilical (relação cérebro-placentária). */
function computeRCP(d: DopplerData): number | undefined {
  if (d.rcp !== undefined) return d.rcp;
  if (d.ipACM !== undefined && d.ipUmbilical !== undefined && d.ipUmbilical !== 0) {
    return d.ipACM / d.ipUmbilical;
  }
  return undefined;
}

/** Perfil hemodinâmico = 1/RCP. */
function computePerfil(d: DopplerData): number | undefined {
  const rcp = computeRCP(d);
  if (rcp === undefined || rcp === 0) return undefined;
  return 1 / rcp;
}

/** Monta a seção DOPPLERVELOCIMETRIA (corpo). Campos opcionais omitidos. */
export function buildDopplervelocimetriaSection(d: DopplerData): string {
  const lines: string[] = ["DOPPLERVELOCIMETRIA:"];

  if (d.ipUmbilical !== undefined) {
    lines.push(
      `Artéria umbilical: IP ${numFmt(d.ipUmbilical)}${d.percUmbilical !== undefined ? ` (percentil ${d.percUmbilical})` : ""}.`,
    );
  }
  if (d.ipACM !== undefined) {
    lines.push(
      `Artéria cerebral média: IP ${numFmt(d.ipACM)}${d.percACM !== undefined ? ` (percentil ${d.percACM})` : ""}.`,
    );
  }
  if (d.ipUterinaDir !== undefined) {
    lines.push(`Artéria uterina direita: IP ${numFmt(d.ipUterinaDir)}.`);
  }
  if (d.ipUterinaEsq !== undefined) {
    lines.push(`Artéria uterina esquerda: IP ${numFmt(d.ipUterinaEsq)}.`);
  }
  if (d.ipMedioUterinas !== undefined) {
    lines.push(
      `IP médio das artérias uterinas mede ${numFmt(d.ipMedioUterinas)}${d.percMedioUterinas !== undefined ? ` (percentil ${d.percMedioUterinas})` : ""}.`,
    );
  }
  if (d.ductoVenoso) {
    lines.push(`Ducto venoso: ${d.ductoVenoso}.`);
  }
  const rcp = computeRCP(d);
  if (d.rcp !== undefined && rcp !== undefined) {
    lines.push(`Relação cérebro-placentária (RCP): ${numFmt(rcp)}.`);
  }
  const perfil = computePerfil(d);
  if (perfil !== undefined && (d.rcp !== undefined || d.ipACM !== undefined)) {
    lines.push(`Perfil hemodinâmico fetal: ${numFmt(perfil)}.`);
  }

  return lines.join("\n");
}

/** Uterinas >P95? (valor numérico OU comando/explícito "acima do percentil 95"). */
function uterinasAcimaP95(d: DopplerData): boolean {
  return (
    d.uterinasAcimaP95 === true ||
    (d.percMedioUterinas !== undefined && d.percMedioUterinas > 95)
  );
}

/** Uterinas alteradas automaticamente? (>P95 OU incisura OU ectasia) */
function uterinasAlteradas(d: DopplerData): boolean {
  return d.incisura === true || d.ectasia === true || uterinasAcimaP95(d);
}

/** Quais vasos foram REALMENTE medidos (têm IP). */
function vasoMedido(d: DopplerData): { uterinas: boolean; umbilical: boolean; acm: boolean } {
  return {
    uterinas:
      d.ipMedioUterinas !== undefined ||
      d.ipUterinaDir !== undefined ||
      d.ipUterinaEsq !== undefined,
    umbilical: d.ipUmbilical !== undefined,
    acm: d.ipACM !== undefined,
  };
}

/**
 * Frase de normalidade do IP listando SÓ os vasos MEDIDOS (segurança: nunca
 * afirmar normalidade de vaso não medido — boletim 2026-06-17, 8c39aca6). null
 * se nenhum vaso candidato foi medido.
 */
/**
 * ACM COMPROMETIDA → NUNCA afirmar normalidade da cerebral média (boletim
 * 2026-06-19, brain sparing): centralização/pré-centralização, ACM ditada
 * alterada, ou percentil < 5. Risco clínico crítico (falsa tranquilização).
 */
function acmComprometida(d: DopplerData): boolean {
  const rcp = computeRCP(d);
  return (
    d.acmAlterado === true ||
    d.centralizacao === true ||
    d.preCentralizacao === true ||
    // percentil ≤ 5 (inclui "menor que o percentil 5", que captura o número 5).
    (d.percACM !== undefined && d.percACM <= 5) ||
    // RCP < 1 = redistribuição (review dex2): ACM baixa relativa à umbilical.
    (rcp !== undefined && rcp < 1)
  );
}

function fraseNormalIP(d: DopplerData, incluirUterinas: boolean): string | null {
  const v = vasoMedido(d);
  // ACM só pode entrar como NORMAL se medida E não comprometida.
  const acmOk = v.acm && !acmComprometida(d);
  const ut = incluirUterinas && v.uterinas;
  // Frases CANÔNICAS exatas (byte-stability) para os casos completos:
  if (ut && v.umbilical && acmOk)
    return "Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.";
  if (!ut && v.umbilical && acmOk)
    return "Índices de pulsatilidade normais nas artérias umbilical e cerebral média.";
  // Subconjuntos (vaso não medido / ACM comprometida): frase só com o normal.
  const partes: string[] = [];
  if (ut) partes.push("uterinas");
  if (v.umbilical) partes.push("umbilical");
  if (acmOk) partes.push("cerebral média");
  if (partes.length === 0) return null;
  const lista =
    partes.length === 1
      ? partes[0]
      : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
  // Singular só para vaso ÚNICO não-uterino (uterinas = 2 artérias → plural).
  return partes.length === 1 && partes[0] !== "uterinas"
    ? `Índice de pulsatilidade normal na artéria ${lista}.`
    : `Índice de pulsatilidade normal nas artérias ${lista}.`;
}

/** Remove linhas de vaso em branco ("Artéria X: IP ____.") — vaso não medido. */
export function removeBlankVesselLines(laudo: string): string {
  return laudo
    .replace(/^[ \t]*art[ée]ria[^\n:]*:\s*IP\s*_{2,}\.?[ \t]*\n?/gim, "")
    .replace(/^[ \t]*IP\s+m[ée]dio[^\n]*_{2,}[^\n]*\n?/gim, "")
    .replace(/\n{3,}/g, "\n\n");
}

/** Itens de conclusão do Doppler (sem numeração — o caller renumera). */
export function buildDopplerConclusionItems(d: DopplerData): string[] {
  const items: string[] = [];
  const utAlt = uterinasAlteradas(d);
  // ACM alterada EXPLÍCITA (ditada alterada ou percentil < 5) → item próprio de
  // ACM. (Centralização sozinha não duplica: já tem o item de redistribuição;
  // mas continua excluindo a ACM da frase de normalidade via acmComprometida.)
  const acmAltExplicita =
    d.acmAlterado === true || (d.percACM !== undefined && d.percACM <= 5);
  const umbOuAcmAlt = d.umbilicalAlterado || acmAltExplicita;

  // ── Frase do índice de pulsatilidade (umbilical/ACM) ──
  if (umbOuAcmAlt) {
    if (d.umbilicalAlterado && acmAltExplicita) {
      items.push(
        d.diastoleZeroUmbilical
          ? "Fluxo diastólico ausente (diástole zero) na artéria umbilical, com índice de pulsatilidade alterado na artéria cerebral média."
          : "Índices de pulsatilidade alterados na artéria umbilical e na ACM.",
      );
    } else if (d.umbilicalAlterado) {
      items.push(
        d.diastoleZeroUmbilical
          ? "Fluxo diastólico ausente (diástole zero) na artéria umbilical."
          : "Índice de pulsatilidade elevado na artéria umbilical.",
      );
      // ACM comprometida (ex.: centralização) mas não explicitamente alterada →
      // não afirma ACM normal (acmComprometida já a excluiu da frase normal).
    } else {
      // ACM alterada. Percentil < 5 → IP reduzido (brain sparing).
      items.push(
        d.percACM !== undefined && d.percACM <= 5
          ? "Índice de pulsatilidade reduzido na artéria cerebral média."
          : "Índice de pulsatilidade alterado na artéria cerebral média.",
      );
    }
  } else if (utAlt) {
    // umbilical/ACM normais, uterinas alteradas → só os vasos MEDIDOS (sem uterinas).
    const f = fraseNormalIP(d, false);
    if (f) items.push(f);
  } else {
    // Tudo normal → afirma normalidade SÓ dos vasos que foram medidos (8c39aca6).
    const f = fraseNormalIP(d, true);
    if (f) items.push(f);
  }

  // ── Item de uterinas >P95 — INDEPENDENTE do estado de umbilical/ACM (F3) ──
  if (uterinasAcimaP95(d)) {
    items.push(
      "IP médio das artérias uterinas acima do percentil 95 para a idade gestacional.",
    );
  }

  // ── Incisuras (uterinas auto) ──
  if (d.incisura) {
    items.push("Presença de incisura protodiastólica nas artérias uterinas.");
  } else {
    items.push("Ausência de sinais de incisuras.");
  }

  // ── Centralização (manual) ──
  if (d.centralizacao) {
    items.push(
      "Sinais de redistribuição hemodinâmica fetal (brain sparing), compatível com centralização.",
    );
  } else if (d.preCentralizacao) {
    items.push(
      "Achados compatíveis com sinais iniciais de centralização fetal (pré-centralização).",
    );
  } else if (!acmComprometida(d)) {
    // Só afirma ausência de centralização quando a ACM NÃO está comprometida
    // (ACM P≤5 / RCP<1 são a fisiologia inicial do brain sparing — review dex2).
    items.push("Não há sinais de pré-centralização ou de centralização.");
  }

  // ── Perfil hemodinâmico = 1/RCP ──
  const perfil = computePerfil(d);
  if (perfil !== undefined) {
    if (perfil < 1.0) {
      items.push(`Perfil hemodinâmico fetal é normal, menor de 1.0.`);
    } else {
      items.push(`Perfil hemodinâmico fetal alterado, maior de 1.0.`);
    }
  } else if (!acmComprometida(d)) {
    // Sem RCP calculável: só afirma perfil normal se a ACM NÃO estiver comprometida
    // (centralização / P≤5 / RCP<1 não podem coexistir com perfil "normal" — dex2).
    items.push("Perfil hemodinâmico fetal é normal, menor de 1.0.");
  }

  return items;
}

/**
 * Item de conclusão é uma frase de Doppler de VASO/hemodinâmica (pra remover e
 * reescrever)? NÃO casa a palavra "doppler" solta — senão removeria conduta de
 * peso fetal ("...acompanhamento seriado com Doppler colorido", F1 review dex1).
 */
function isDopplerConclusionItem(item: string): boolean {
  // Conduta de peso/seguimento NUNCA é item Doppler de vaso (guarda explícita).
  if (/peso\s+fetal|percentil\s+1?0\b|p\.?i\.?g|g\.?i\.?g|gratac[óo]s|restri[çc][ãa]o\s+do\s+crescimento/i.test(item)) {
    return false;
  }
  return /pulsatilidade|incisura|centraliza|pr[ée][\s-]?centraliza|perfil\s+hemodin[âa]mic|art[eé]ria\s+(umbilical|cerebral|uterina)|art[eé]rias\s+uterinas|ducto\s+venoso/i.test(
    item,
  );
}

/**
 * Reconstrói a lista de itens da conclusão: remove frases de Doppler ad-libadas
 * pelo LLM (variam por execução / vaso errado — bug D2) e anexa os itens
 * canônicos determinísticos. Preserva itens não-Doppler (IG, líquido, peso
 * fetal, morfologia) na ordem original.
 */
function rebuildDopplerItems(items: string[], d: DopplerData): string[] {
  const kept = items.filter((it) => !isDopplerConclusionItem(it));
  return [...kept, ...buildDopplerConclusionItems(d)];
}

/**
 * Fix C.2 (MORFOLOGICO + Doppler): INSERE a seção DOPPLERVELOCIMETRIA antes da
 * CONCLUSÃO e reconstrói a conclusão com os itens Doppler canônicos.
 */
export function applyDopplerOverlay(laudo: string, d: DopplerData): string {
  if (!hasDopplerData(d)) return laudo;
  if (/DOPPLERVELOCIMETRIA/i.test(laudo)) return laudo;

  const parsed = parseConclusion(laudo);
  const finalItems = rebuildDopplerItems(parsed.items, d);
  // Só insere a seção do corpo se houver linhas de vaso (evita seção vazia).
  const section = sectionHasVessels(d)
    ? buildDopplervelocimetriaSection(d)
    : undefined;
  return renderWithConclusion(parsed, finalItems, section);
}

/**
 * Fix B (DOPPLER_OBSTETRICO): a seção DOPPLERVELOCIMETRIA já existe no template;
 * aqui só CORRIGIMOS a conclusão — remove a frase de Doppler do LLM (que pode
 * ter jogado "umbilical >P95" na frase das uterinas, bug D2) e reescreve os
 * itens canônicos a partir dos vasos REALMENTE ditados (umbilical/ACM manual,
 * uterinas auto, perfil=1/RCP). Não toca na seção do corpo.
 */
export function correctDopplerConclusion(laudo: string, d: DopplerData): string {
  if (!hasDopplerData(d)) return laudo;
  // Remove linhas de vaso em branco (IP ____) do corpo — vaso não medido.
  const limpo = removeBlankVesselLines(laudo);
  const parsed = parseConclusion(limpo);
  if (!parsed.found) return limpo;
  const finalItems = rebuildDopplerItems(parsed.items, d);
  return renderWithConclusion(parsed, finalItems);
}

// ── IG duplicada (boletim 2026-06-19, f715875c) ──────────────────────────────
// No DOPPLER_OBSTETRICO (sem renderer Domingos) o LLM às vezes emite a IG DUAS
// vezes — "Gestação em torno de X" (biometria) E "Gestação ... pela ultrassono-
// grafia precoce" (referência) — em itens separados. Combinamos num único item
// pela regra Domingos (correção só se divergir > 5 dias).
type IgItem = { sd: { semanas: number; dias: number }; isRef: boolean; fonte: string };
function parseGestacaoItem(item: string): IgItem | null {
  const m = item.match(/gesta[çc][ãa]o\s+em\s+torno\s+de\s+(\d+)\s+semanas?(?:\s+e\s+(\d+)\s+dias?)?/i);
  if (!m) return null;
  const isRef = /pela\s+(?:ultrassonograf|data|[úu]ltima\s+menstrua|\bdum\b)/i.test(item);
  const fonte = /menstrua|\bdum\b/i.test(item) ? "data da última menstruação" : "ultrassonografia precoce";
  return { sd: { semanas: Number(m[1]), dias: m[2] ? Number(m[2]) : 0 }, isRef, fonte };
}
function fmtSemanas(sd: { semanas: number; dias: number }): string {
  const s = `${sd.semanas} ${sd.semanas === 1 ? "semana" : "semanas"}`;
  if (sd.dias === 0) return s;
  return `${s} e ${sd.dias} ${sd.dias === 1 ? "dia" : "dias"}`;
}
export function mergeIgConclusionItems(laudo: string): string {
  const parsed = parseConclusion(laudo);
  if (!parsed.found) return laudo;
  const igs = parsed.items
    .map((it, i) => ({ i, p: parseGestacaoItem(it) }))
    .filter((x): x is { i: number; p: IgItem } => x.p !== null);
  if (igs.length < 2) return laudo; // 0/1 item de IG → nada a combinar

  const bio = igs.find((x) => !x.p.isRef) ?? igs[0]!;
  const ref = igs.find((x) => x.p.isRef);
  const bioSd = bio.p.sd;
  let merged: string;
  if (ref) {
    const div = Math.abs(
      bioSd.semanas * 7 + bioSd.dias - (ref.p.sd.semanas * 7 + ref.p.sd.dias),
    );
    merged =
      div > 5
        ? `Gestação em torno de ${fmtSemanas(bioSd)} pela biometria atual, devendo ser corrigida pela ${ref.p.fonte}, compatível com ${fmtSemanas(ref.p.sd)}.`
        : `Gestação em torno de ${fmtSemanas(bioSd)}.`;
  } else {
    merged = `Gestação em torno de ${fmtSemanas(bioSd)}.`;
  }

  const firstIdx = igs[0]!.i;
  const drop = new Set(igs.slice(1).map((x) => x.i));
  const items = parsed.items
    .map((it, i) => (i === firstIdx ? merged : it))
    .filter((_, i) => !drop.has(i));
  return renderWithConclusion(parsed, items);
}

// ── Alucinação de gemelaridade (boletim 2026-06-19, c53bbc1f) ────────────────
// O writer às vezes afirma "Dois fetos"/"gestação gemelar" por ruído de áudio,
// sem o médico ter ditado gemelaridade (uma só biometria). Reescrever prosa
// gemelar→único é frágil; sinalizamos com [REVISAR] (padrão da engine) sem tocar
// no texto clínico — o médico confirma o número de fetos.
const GEMELAR_REVISAR = "[REVISAR — gemelaridade não foi ditada; confirmar número de fetos] ";
export function flagGemelarHallucination(output: string, rawInput: string): string {
  const rawHasGemelar =
    /gemelar|dois\s+fetos|tr[êe]s\s+fetos|g[êe]meos?|dupla\s+gesta|bicori|dicori|tricori|monocori|diamni|dois\s+sacos/i.test(
      rawInput,
    );
  if (rawHasGemelar) return output;
  if (output.includes(GEMELAR_REVISAR)) return output;
  const m = output.match(/\b(?:Dois|Tr[êe]s)\s+fetos\b/);
  const assertsGemelar = m !== null || /gesta[çc][ãa]o\s+gemelar|ambos\s+os\s+fetos/i.test(output);
  if (!assertsGemelar) return output;
  if (m && m.index !== undefined) {
    return output.slice(0, m.index) + GEMELAR_REVISAR + output.slice(m.index);
  }
  return GEMELAR_REVISAR + output;
}
