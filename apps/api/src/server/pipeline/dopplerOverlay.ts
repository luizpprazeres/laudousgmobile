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
  d.acmAlterado = /(?:acm|cerebral\s+m[eé]dia)[^.]{0,40}(?:reduzid|baixo|alterad|diminu)/i.test(t);

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
function fraseNormalIP(d: DopplerData, incluirUterinas: boolean): string | null {
  const v = vasoMedido(d);
  const ut = incluirUterinas && v.uterinas;
  // Frases CANÔNICAS exatas (byte-stability) para os casos completos:
  if (ut && v.umbilical && v.acm)
    return "Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.";
  if (!ut && v.umbilical && v.acm)
    return "Índices de pulsatilidade normais nas artérias umbilical e cerebral média.";
  // Subconjuntos (vaso não medido): frase enxuta só com o que foi medido.
  const partes: string[] = [];
  if (ut) partes.push("uterinas");
  if (v.umbilical) partes.push("umbilical");
  if (v.acm) partes.push("cerebral média");
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
  const umbOuAcmAlt = d.umbilicalAlterado || d.acmAlterado;

  // ── Frase do índice de pulsatilidade (umbilical/ACM) ──
  if (umbOuAcmAlt) {
    if (d.umbilicalAlterado && d.acmAlterado) {
      items.push("Índices de pulsatilidade alterados na artéria umbilical e na ACM.");
    } else if (d.umbilicalAlterado) {
      items.push("Índice de pulsatilidade elevado na artéria umbilical.");
    } else {
      items.push("Índice de pulsatilidade alterado na artéria cerebral média.");
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
  } else {
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
  } else {
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
