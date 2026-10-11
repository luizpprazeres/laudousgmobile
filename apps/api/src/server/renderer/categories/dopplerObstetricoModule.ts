import { z } from "zod";
import { calcularDopplerParcial } from "@laudousg/shared";
import {
  buildDopplerConclusionItems,
  computePerfilHemodinamico,
  deriveUmbilicalSafety,
  type DopplerData,
} from "../../pipeline/dopplerOverlay";

const nullableNumber = z.number().nullable();
const nullableBoolean = z.boolean().nullable();
const num = { type: ["number", "null"] } as const;
const bool = { type: ["boolean", "null"] } as const;
const str = { type: ["string", "null"] } as const;

/** Contrato único usado pelo exame isolado e pelos complementos obstétricos. */
export const DopplerObstetricoModuleSchema = z.object({
  ir_uterina_dir: nullableNumber,
  ip_uterina_dir: nullableNumber,
  ir_uterina_esq: nullableNumber,
  ip_uterina_esq: nullableNumber,
  ip_medio_uterinas: nullableNumber,
  perc_medio_uterinas: nullableNumber,
  ir_umbilical: nullableNumber,
  ip_umbilical: nullableNumber,
  perc_umbilical: nullableNumber,
  fluxo_diastolico_umbilical: z.enum(["presente", "ausente", "reverso"]).nullable(),
  ir_acm: nullableNumber,
  ip_acm: nullableNumber,
  perc_acm: nullableNumber,
  ir_ducto_venoso: nullableNumber,
  ip_ducto_venoso: nullableNumber,
  perc_ducto_venoso: nullableNumber,
  ducto_venoso_qualitativo: z.string().nullable(),
  rcp: nullableNumber,
  perc_rcp: nullableNumber,
  perfil_hemodinamico: nullableNumber,
  umbilical_alterado: nullableBoolean,
  acm_alterado: nullableBoolean,
  incisura: nullableBoolean,
  ectasia: nullableBoolean,
  pre_centralizacao: nullableBoolean,
  centralizacao: nullableBoolean,
  uterinas_acima_p95: nullableBoolean,
});

export type DopplerObstetricoModule = z.infer<typeof DopplerObstetricoModuleSchema>;

export const DOPPLER_OBSTETRICO_MODULE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "ir_uterina_dir", "ip_uterina_dir", "ir_uterina_esq", "ip_uterina_esq",
    "ip_medio_uterinas", "perc_medio_uterinas",
    "ir_umbilical", "ip_umbilical", "perc_umbilical", "fluxo_diastolico_umbilical",
    "ir_acm", "ip_acm", "perc_acm",
    "ir_ducto_venoso", "ip_ducto_venoso", "perc_ducto_venoso", "ducto_venoso_qualitativo",
    "rcp", "perc_rcp", "perfil_hemodinamico", "umbilical_alterado", "acm_alterado",
    "incisura", "ectasia", "pre_centralizacao", "centralizacao",
    "uterinas_acima_p95",
  ],
  properties: {
    ir_uterina_dir: num, ip_uterina_dir: num,
    ir_uterina_esq: num, ip_uterina_esq: num,
    ip_medio_uterinas: num, perc_medio_uterinas: num,
    ir_umbilical: num, ip_umbilical: num, perc_umbilical: num,
    fluxo_diastolico_umbilical: {
      type: ["string", "null"],
      enum: ["presente", "ausente", "reverso", null],
    },
    ir_acm: num, ip_acm: num, perc_acm: num,
    ir_ducto_venoso: num, ip_ducto_venoso: num, perc_ducto_venoso: num,
    ducto_venoso_qualitativo: str,
    rcp: num, perc_rcp: num, perfil_hemodinamico: num,
    umbilical_alterado: bool, acm_alterado: bool,
    incisura: bool, ectasia: bool,
    pre_centralizacao: bool, centralizacao: bool, uterinas_acima_p95: bool,
  },
} as const;

export const DOPPLER_OBSTETRICO_ADDON_JSON_SCHEMA = {
  ...DOPPLER_OBSTETRICO_MODULE_JSON_SCHEMA,
  type: ["object", "null"],
} as const;

export const DOPPLER_MODULE_EXTRACTION_RULES = `
DOPPLER OBSTÉTRICO OPCIONAL:
- Preencha doppler SOMENTE se o médico realizou/pediu o complemento Doppler ou ditou índices vasculares. Caso contrário, doppler=null.
- Preserve separadamente IR (índice de resistividade) e IP (índice de pulsatilidade) de: uterina direita, uterina esquerda, umbilical, cerebral média e ducto venoso.
- fluxo_diastolico_umbilical: "ausente" ou "reverso" somente quando o médico disser esse achado; "presente" quando explicitamente normal; null no silêncio. Não esconda esse achado dentro de um simples flag de IP alterado.
- ip_medio_uterinas/percentis, RCP e perfil_hemodinamico: somente quando ditados ou fornecidos por bloco estruturado; o código calcula o perfil a partir da RCP quando possível.
- Linha "→ Percentis" do app: copie o percentil de um vaso SOMENTE se o IP associado nessa linha for numericamente IGUAL ao IP ditado para o mesmo vaso (vírgula/ponto e zeros finais equivalem). IP diferente ou ausente na linha, ou vaso sem IP ditado → percentil null; o renderer calcula. Nunca use o percentil de outro vaso. Para perc_medio_uterinas compare o IP médio, não o IP unilateral; para perc_rcp compare a RCP da linha com a RCP ditada.
- Flags de alteração só refletem o que foi verbalizado. Para ausência explicitamente avaliada, use false; silêncio é null.
- Nunca invente um índice ausente e nunca transforme IR em IP.`;

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Índices de vaso saem sempre com duas casas: 0,60 e não 0,6 (decisão de 18/09/2026). */
const fmtIndice = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Percentis Barcelona que FALTAM no ditado, calculados pelo mesmo motor dos apps
 * (`calcularDopplerParcial`, Calculadora v2021) a partir dos IP ditados e da IG do exame.
 *
 * Sem percentil o vaso é só descritivo e a conclusão não afirma normalidade
 * (`fraseNormalIP`). Até aqui o percentil só existia quando o app colava a linha
 * "→ Percentis" no ditado e o extrator a copiava — e essa linha já veio calculada
 * com o IR no lugar do IP (laudo 1304da57). Percentil ditado NUNCA é sobrescrito;
 * sem IG ou fora da faixa do motor (uterinas 11–44 s, demais 20–44 s), nada muda.
 */
export function completarPercentisBarcelona(
  d: DopplerObstetricoModule,
  ig?: { semanas: number | null; dias: number | null },
): DopplerObstetricoModule {
  if (!ig || ig.semanas === null || !Number.isInteger(ig.semanas)) return d;
  const r = calcularDopplerParcial({
    weeks: ig.semanas,
    days: ig.dias ?? 0,
    ipUmbilical: d.ip_umbilical ?? undefined,
    ipMCA: d.ip_acm ?? undefined,
    ipUterinaDireita: d.ip_uterina_dir ?? undefined,
    ipUterinaEsquerda: d.ip_uterina_esq ?? undefined,
    ipMedioUterinas: d.ip_medio_uterinas ?? undefined,
    ipDuctoVenoso: d.ip_ducto_venoso ?? undefined,
  });
  const out = { ...d };
  if (out.perc_umbilical === null && r.arteriaUmbilical) out.perc_umbilical = r.arteriaUmbilical.percentile;
  if (out.perc_acm === null && r.arteriaCerebralMedia) out.perc_acm = r.arteriaCerebralMedia.percentile;
  if (out.perc_ducto_venoso === null && r.ductoVenoso) out.perc_ducto_venoso = r.ductoVenoso.percentile;
  if (r.arteriasUterinas) {
    // IP médio é a média das duas uterinas: vazio → calculado, mesmo quando o percentil
    // veio ditado (W16C: o percentil copiado da linha do app sem o IP médio apagava a frase).
    out.ip_medio_uterinas ??= r.arteriasUterinas.ipMedio;
    if (out.perc_medio_uterinas === null) out.perc_medio_uterinas = r.arteriasUterinas.percentile;
  }
  return out;
}

export function toDopplerData(d: DopplerObstetricoModule): DopplerData {
  const ductoVenoso =
    d.ducto_venoso_qualitativo ??
    (d.ip_ducto_venoso !== null ? `IP ${fmt(d.ip_ducto_venoso)}` : undefined);
  return {
    irUterinaDir: d.ir_uterina_dir ?? undefined,
    ipUterinaDir: d.ip_uterina_dir ?? undefined,
    irUterinaEsq: d.ir_uterina_esq ?? undefined,
    ipUterinaEsq: d.ip_uterina_esq ?? undefined,
    ipMedioUterinas: d.ip_medio_uterinas ?? undefined,
    percMedioUterinas: d.perc_medio_uterinas ?? undefined,
    irUmbilical: d.ir_umbilical ?? undefined,
    ipUmbilical: d.ip_umbilical ?? undefined,
    percUmbilical: d.perc_umbilical ?? undefined,
    irACM: d.ir_acm ?? undefined,
    ipACM: d.ip_acm ?? undefined,
    percACM: d.perc_acm ?? undefined,
    irDuctoVenoso: d.ir_ducto_venoso ?? undefined,
    ipDuctoVenoso: d.ip_ducto_venoso ?? undefined,
    percDuctoVenoso: d.perc_ducto_venoso ?? undefined,
    ductoVenoso,
    rcp: d.rcp ?? undefined,
    percRCP: d.perc_rcp ?? undefined,
    perfilHemodinamico: d.perfil_hemodinamico ?? undefined,
    umbilicalAlterado: d.umbilical_alterado ?? undefined,
    acmAlterado: d.acm_alterado ?? undefined,
    incisura: d.incisura ?? undefined,
    ectasia: d.ectasia ?? undefined,
    preCentralizacao: d.pre_centralizacao ?? undefined,
    centralizacao: d.centralizacao ?? undefined,
    uterinasAcimaP95: d.uterinas_acima_p95 ?? undefined,
  };
}

function indices(ir: number | null, ip: number | null): string | null {
  const partes: string[] = [];
  if (ir !== null) partes.push(`índice de resistividade de ${fmtIndice(ir)}`);
  if (ip !== null) partes.push(`índice de pulsatilidade de ${fmtIndice(ip)}`);
  return partes.length > 0 ? partes.join(" e ") : null;
}

/**
 * MODELO DO DOPPLER ISOLADO (decisão do médico, 18/09/2026): uterinas e cerebral
 * média ganham UMA LINHA POR ÍNDICE; a umbilical fica em linha única com a nota
 * das três medidas; o ducto venoso tem frase própria. O exame combinado mantém a
 * linha única por vaso, já validada.
 */
const NOTA_UMBILICAL =
  "(média de três medidas realizadas próximo à inserção na placenta, próximo ao abdome fetal e em alça livre)";

function linhasPorIndice(rotulo: string, ir: number | null, ip: number | null, percentil: number | null): string[] {
  const linhas: string[] = [];
  if (ir !== null) linhas.push(`Índice de resistividade da ${rotulo} de ${fmtIndice(ir)}.`);
  if (ip !== null) {
    linhas.push(
      `Índice de pulsatilidade da ${rotulo} de ${fmtIndice(ip)}${percentil !== null ? ` (percentil ${fmtPercentil(percentil)})` : ""}.`,
    );
  }
  return linhas;
}

function linhaUmbilicalIsolada(ir: number | null, ip: number | null, percentil: number | null): string | null {
  const valores = indices(ir, ip);
  if (!valores) return null;
  const comRotulo = valores.replace("índice de resistividade de", "Índice de resistividade da artéria umbilical de");
  const texto = ir !== null ? comRotulo : `Índice de pulsatilidade da artéria umbilical de ${fmtIndice(ip as number)}`;
  return `${texto}${percentil !== null ? ` (percentil ${fmtPercentil(percentil)})` : ""}. ${NOTA_UMBILICAL}.`;
}

function linhaDuctoIsolada(ir: number | null, ip: number | null, percentil: number | null): string | null {
  const valores = indices(ir, ip);
  return valores
    ? `O ducto venoso tem ${valores}${percentil !== null ? ` (percentil ${fmtPercentil(percentil)})` : ""}.`
    : null;
}

function fmtPercentil(percentil: number): string {
  if (percentil <= 0) return "< 1";
  if (percentil >= 100) return "> 99";
  return fmt(percentil);
}

function linhaVaso(
  rotulo: string,
  ir: number | null,
  ip: number | null,
  percentil: number | null,
): string | null {
  const valores = indices(ir, ip);
  return valores
    ? `${rotulo} com ${valores}${percentil !== null ? ` (percentil ${fmtPercentil(percentil)})` : ""}.`
    : null;
}

export const DOPPLER_TECNICA_CLASSICO =
  "Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.";

export const DOPPLER_TECNICA_OBJETIVO =
  "Avaliação das artérias maternas e fetais por Doppler pulsado e colorido, com imagem bidimensional.";

export function renderDopplerModule(
  module: DopplerObstetricoModule,
  options?: {
    rawInput?: string;
    umbilicalSafety?: boolean;
    /**
     * "ip": obstétrico/morfológico COM Doppler (combinado) — o laudo do médico usa só o IP;
     * o IR só entra quando é o único índice do vaso. Ausente/"todos": Doppler isolado, IR e IP.
     */
    indices?: "todos" | "ip";
    /** 1º trimestre: não afirmar incisura/centralização, que não foram avaliadas. */
    omitirAusenciasUterinas?: boolean;
    /** IG do exame: completa os percentis Barcelona não ditados (ver completarPercentisBarcelona). */
    ig?: { semanas: number | null; dias: number | null };
  },
): { achados: string[]; conclusao: string[] } {
  module = completarPercentisBarcelona(module, options?.ig);
  let data = toDopplerData(module);
  // No módulo v2 a barreira é parte do contrato clínico. `false` existe apenas
  // para comparação/rollback explícito em diagnóstico; ausência significa ON.
  if (options?.umbilicalSafety !== false) data = deriveUmbilicalSafety(data, options?.rawInput);

  const soIp = options?.indices === "ip";
  const ir = (irValor: number | null, ipValor: number | null) => (soIp && ipValor !== null ? null : irValor);
  const linhas: Array<string | null> = soIp
    ? [
        linhaVaso("Artéria uterina direita", ir(module.ir_uterina_dir, module.ip_uterina_dir), module.ip_uterina_dir, null),
        linhaVaso("Artéria uterina esquerda", ir(module.ir_uterina_esq, module.ip_uterina_esq), module.ip_uterina_esq, null),
        linhaVaso("Artéria umbilical", ir(module.ir_umbilical, module.ip_umbilical), module.ip_umbilical, module.perc_umbilical),
        linhaVaso("Artéria cerebral média", ir(module.ir_acm, module.ip_acm), module.ip_acm, module.perc_acm),
        linhaVaso("Ducto venoso", ir(module.ir_ducto_venoso, module.ip_ducto_venoso), module.ip_ducto_venoso, module.perc_ducto_venoso),
      ]
    : [
        ...linhasPorIndice("artéria uterina direita", module.ir_uterina_dir, module.ip_uterina_dir, null),
        ...linhasPorIndice("artéria uterina esquerda", module.ir_uterina_esq, module.ip_uterina_esq, null),
        linhaUmbilicalIsolada(module.ir_umbilical, module.ip_umbilical, module.perc_umbilical),
        ...linhasPorIndice("artéria cerebral média", module.ir_acm, module.ip_acm, module.perc_acm),
        linhaDuctoIsolada(module.ir_ducto_venoso, module.ip_ducto_venoso, module.perc_ducto_venoso),
      ];
  if (module.ip_medio_uterinas !== null) {
    linhas.push(
      `Índice de pulsatilidade médio das artérias uterinas de ${fmtIndice(module.ip_medio_uterinas)}${module.perc_medio_uterinas !== null ? ` (percentil ${fmtPercentil(module.perc_medio_uterinas)})` : ""}.`,
    );
  }
  if (module.rcp !== null) {
    linhas.push(`Relação cérebro-placentária de ${fmtIndice(module.rcp)}${module.perc_rcp !== null ? ` (percentil ${fmtPercentil(module.perc_rcp)})` : ""}.`);
  }
  const perfil = computePerfilHemodinamico(data);
  const fluxoUmbilicalAnormal =
    module.fluxo_diastolico_umbilical === "ausente" ||
    module.fluxo_diastolico_umbilical === "reverso";
  if (module.fluxo_diastolico_umbilical === "ausente") {
    linhas.push("Fluxo diastólico ausente na artéria umbilical.");
  } else if (module.fluxo_diastolico_umbilical === "reverso") {
    linhas.push("Fluxo diastólico reverso na artéria umbilical.");
  }
  if (perfil !== undefined && !fluxoUmbilicalAnormal) {
    linhas.push(`Perfil hemodinâmico fetal de ${fmtIndice(perfil)}.`);
  }
  if (module.ducto_venoso_qualitativo) {
    linhas.push(`Ducto venoso: ${module.ducto_venoso_qualitativo}.`);
  }
  if (module.perc_medio_uterinas !== null || module.perc_umbilical !== null || module.perc_acm !== null || module.perc_ducto_venoso !== null || module.perc_rcp !== null) {
    linhas.push(
      "Referência: percentis calculados com as equações da Calculadora v2021 disponibilizada pela Fetal Medicine Barcelona.",
    );
  }

  const achados = linhas.filter((v): v is string => Boolean(v));
  if (achados.length === 0) achados.push("Não foram informados índices Doppler mensuráveis.");

  /**
   * No exame combinado o laudo não cita resistividade: a conclusão também não pode
   * dizer "índices de resistividade e de pulsatilidade normais". Zeramos o IR dos
   * vasos que têm IP (os mesmos que saem só com IP no corpo) antes de concluir.
   */
  const dataConclusao = soIp
    ? {
        ...data,
        irUterinaDir: data.ipUterinaDir !== undefined ? undefined : data.irUterinaDir,
        irUterinaEsq: data.ipUterinaEsq !== undefined ? undefined : data.irUterinaEsq,
        irUmbilical: data.ipUmbilical !== undefined ? undefined : data.irUmbilical,
        irACM: data.ipACM !== undefined ? undefined : data.irACM,
      }
    : data;
  let conclusao = buildDopplerConclusionItems(dataConclusao, {
    strictEvidence: true,
    suppressUterineAbsenceStatements: options?.omitirAusenciasUterinas,
  });
  if (fluxoUmbilicalAnormal) {
    conclusao = conclusao.filter((item) =>
      !/^Perfil hemodinâmico fetal é normal/i.test(item) &&
      !/^Índice de pulsatilidade elevado na artéria umbilical/i.test(item),
    );
    conclusao.unshift(
      module.fluxo_diastolico_umbilical === "ausente"
        ? "Fluxo diastólico ausente na artéria umbilical."
        : "Fluxo diastólico reverso na artéria umbilical.",
    );
  }

  return { achados, conclusao };
}

// ---------------------------------------------------------------------------
// Bloco "Doppler obstétrico:" da calculadora do app (W16C, 10/10)
// ---------------------------------------------------------------------------

type CampoIndice =
  | "ir_uterina_dir" | "ip_uterina_dir" | "ir_uterina_esq" | "ip_uterina_esq" | "ip_medio_uterinas"
  | "ir_umbilical" | "ip_umbilical" | "ir_acm" | "ip_acm" | "ir_ducto_venoso" | "ip_ducto_venoso";

/** Rótulos fixos do app (ImageAnalysisService): "IP uterina direita: 0.95". */
const ROTULOS_BLOCO: Array<[RegExp, CampoIndice]> = [
  [/^IR\s+(?:da\s+)?(?:art[ée]ria\s+)?uterina\s+direita$/i, "ir_uterina_dir"],
  [/^IP\s+(?:da\s+)?(?:art[ée]ria\s+)?uterina\s+direita$/i, "ip_uterina_dir"],
  [/^IR\s+(?:da\s+)?(?:art[ée]ria\s+)?uterina\s+esquerda$/i, "ir_uterina_esq"],
  [/^IP\s+(?:da\s+)?(?:art[ée]ria\s+)?uterina\s+esquerda$/i, "ip_uterina_esq"],
  [/^IP\s+m[ée]dio\s+(?:das\s+)?(?:art[ée]rias\s+)?uterinas$/i, "ip_medio_uterinas"],
  [/^IR\s+(?:da\s+)?art[ée]ria\s+umbilical$/i, "ir_umbilical"],
  [/^IP\s+(?:da\s+)?art[ée]ria\s+umbilical$/i, "ip_umbilical"],
  [/^IR\s+(?:da\s+)?art[ée]ria\s+cerebral\s+m[ée]dia$/i, "ir_acm"],
  [/^IP\s+(?:da\s+)?art[ée]ria\s+cerebral\s+m[ée]dia$/i, "ip_acm"],
  [/^IR\s+(?:do\s+)?ducto\s+venoso$/i, "ir_ducto_venoso"],
  [/^IP\s+(?:do\s+)?ducto\s+venoso$/i, "ip_ducto_venoso"],
];

/**
 * Índices do bloco "Doppler obstétrico:" colado pela calculadora do app (saída de
 * MÁQUINA, rótulos fixos). Exige o cabeçalho; lê as linhas "rótulo: número" logo
 * abaixo até a primeira linha vazia ou fora do formato. Campo com dois valores
 * diferentes fica de fora. null se não há bloco ou nenhum índice foi lido.
 */
export function parseDopplerObstetricoBloco(rawInput: string): Partial<Record<CampoIndice, number>> | null {
  const cab = /Doppler\s+obst[ée]trico\s*:\s*\n/i.exec(rawInput);
  if (!cab) return null;
  const out: Partial<Record<CampoIndice, number>> = {};
  const conflito = new Set<CampoIndice>();
  for (const linha of rawInput.slice(cab.index + cab[0].length).split("\n")) {
    const m = /^\s*([^:\n]{4,60}?)\s*:\s*(\d+(?:[.,]\d+)?)\s*$/.exec(linha);
    if (!m) break;
    const campo = ROTULOS_BLOCO.find(([re]) => re.test(m[1]!.trim()))?.[1];
    if (!campo) continue;
    const valor = Number(m[2]!.replace(",", "."));
    if (out[campo] !== undefined && out[campo] !== valor) conflito.add(campo);
    out[campo] = valor;
  }
  for (const c of conflito) delete out[c];
  return Object.keys(out).length ? out : null;
}

/**
 * Nada ditado some (W16C). O extrator — sobretudo sem raciocínio — às vezes deixa vazio
 * um índice que veio pronto no bloco do app (W16A: IP médio das uterinas, IP do ducto
 * venoso). Preenche SÓ campos nulos de um módulo que JÁ EXISTE (obstétrico simples segue
 * sem Doppler); nunca sobrescreve. Percentis e IP médio continuam com
 * completarPercentisBarcelona.
 */
export function mergeDopplerBloco<T extends DopplerObstetricoModule>(d: T | null | undefined, rawInput: string): T | null | undefined {
  if (!d) return d;
  const bloco = parseDopplerObstetricoBloco(rawInput);
  if (!bloco) return d;
  let out: T | null = null;
  for (const [campo, valor] of Object.entries(bloco) as Array<[CampoIndice, number]>) {
    if (d[campo] !== null && d[campo] !== undefined) continue;
    out ??= { ...d };
    (out as DopplerObstetricoModule)[campo] = valor;
  }
  return out ?? d;
}

/** Tolerância entre o perfil extraído e o calculado pelos IPs (arredondamento a 2 casas). */
const TOLERANCIA_PERFIL = 0.05;

/**
 * Perfil hemodinâmico (1/RCP = IP umbilical / IP ACM) extraído que CONTRADIZ os IPs medidos
 * volta a ser calculado pelo código (W16C). Caso real: o ditado "perfil hemodinâmico fetal é
 * normal, menor de 1.0" virou perfil = 1 e o laudo concluiu "alterado, maior de 1.0", com IPs
 * que davam 0,66. Só age com os dois IPs presentes; devolve o aviso para o card.
 */
export function conferirPerfilHemodinamico<T extends DopplerObstetricoModule>(d: T): { modulo: T; aviso: string | null } {
  const { perfil_hemodinamico: perfil, ip_umbilical: ipu, ip_acm: ipacm, rcp } = d;
  if (perfil === null || ipu === null || ipacm === null || ipacm === 0) return { modulo: d, aviso: null };
  const esperado = rcp !== null && rcp !== 0 ? 1 / rcp : ipu / ipacm;
  if (Math.abs(perfil - esperado) <= TOLERANCIA_PERFIL) return { modulo: d, aviso: null };
  return {
    modulo: { ...d, perfil_hemodinamico: null },
    aviso:
      `Perfil hemodinâmico extraído (${fmtIndice(perfil)}) não confere com os índices de pulsatilidade ` +
      `(umbilical ${fmtIndice(ipu)} / cerebral média ${fmtIndice(ipacm)} = ${fmtIndice(esperado)}); o laudo usa o calculado — confira.`,
  };
}

/** Vasos da linha "→ Percentis (…): AU IP 0,50 (P7) · ACM IP 0,70 (P6) · Uterinas média IP 0,81 (P52) · …" do app. */
const LINHA_PERCENTIS: Array<[RegExp, "ip_umbilical" | "ip_acm" | "ip_medio_uterinas" | "ip_ducto_venoso" | "rcp", "perc_umbilical" | "perc_acm" | "perc_medio_uterinas" | "perc_ducto_venoso" | "perc_rcp"]> = [
  [/\bAU\s+IP\s+(\d+(?:[.,]\d+)?)\s*\(P\s*(\d+(?:[.,]\d+)?)\)/i, "ip_umbilical", "perc_umbilical"],
  [/\bACM\s+IP\s+(\d+(?:[.,]\d+)?)\s*\(P\s*(\d+(?:[.,]\d+)?)\)/i, "ip_acm", "perc_acm"],
  [/\bUterinas?\s+m[ée]dia\s+IP\s+(\d+(?:[.,]\d+)?)\s*\(P\s*(\d+(?:[.,]\d+)?)\)/i, "ip_medio_uterinas", "perc_medio_uterinas"],
  [/\bDV\s+IP\s+(\d+(?:[.,]\d+)?)\s*\(P\s*(\d+(?:[.,]\d+)?)\)/i, "ip_ducto_venoso", "perc_ducto_venoso"],
  [/\bRCP\s+(\d+(?:[.,]\d+)?)\s*\(P\s*(\d+(?:[.,]\d+)?)\)/i, "rcp", "perc_rcp"],
];

/**
 * Regra do prompt: o percentil da linha "→ Percentis" só vale se o IP da linha for IGUAL
 * ao ditado (o app já a gerou com o IR no lugar do IP). Sem raciocínio a extração copiou
 * mesmo assim (W16D, 1304da57: IP ditado 0,71, linha "AU IP 0,50 (P7)" → "percentil 7").
 * Percentil copiado de IP diferente sai; completarPercentisBarcelona o recalcula.
 */
export function conferirPercentisDoApp<T extends DopplerObstetricoModule>(d: T, rawInput: string): T {
  const linha = /→\s*Percentis[^\n]*/i.exec(rawInput)?.[0];
  if (!linha) return d;
  let out: T | null = null;
  for (const [re, campoIp, campoPerc] of LINHA_PERCENTIS) {
    const m = re.exec(linha);
    if (!m) continue;
    const ipLinha = Number(m[1]!.replace(",", "."));
    const pLinha = Number(m[2]!.replace(",", "."));
    const perc = d[campoPerc];
    const ip = campoIp === "ip_medio_uterinas" && d.ip_medio_uterinas == null && d.ip_uterina_dir != null && d.ip_uterina_esq != null
      ? (d.ip_uterina_dir + d.ip_uterina_esq) / 2
      : d[campoIp];
    if (perc == null || perc !== pLinha || ip == null || Math.abs(ip - ipLinha) <= 0.005) continue;
    out ??= { ...d };
    (out as DopplerObstetricoModule)[campoPerc] = null;
  }
  return out ?? d;
}
