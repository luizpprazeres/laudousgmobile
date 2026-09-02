import { z } from "zod";
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
- Flags de alteração só refletem o que foi verbalizado. Para ausência explicitamente avaliada, use false; silêncio é null.
- Nunca invente um índice ausente e nunca transforme IR em IP.`;

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

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
  if (ir !== null) partes.push(`índice de resistividade de ${fmt(ir)}`);
  if (ip !== null) partes.push(`índice de pulsatilidade de ${fmt(ip)}`);
  return partes.length > 0 ? partes.join(" e ") : null;
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
  options?: { rawInput?: string; umbilicalSafety?: boolean },
): { achados: string[]; conclusao: string[] } {
  let data = toDopplerData(module);
  // No módulo v2 a barreira é parte do contrato clínico. `false` existe apenas
  // para comparação/rollback explícito em diagnóstico; ausência significa ON.
  if (options?.umbilicalSafety !== false) data = deriveUmbilicalSafety(data, options?.rawInput);

  const linhas: Array<string | null> = [
    linhaVaso("Artéria uterina direita", module.ir_uterina_dir, module.ip_uterina_dir, null),
    linhaVaso("Artéria uterina esquerda", module.ir_uterina_esq, module.ip_uterina_esq, null),
    linhaVaso("Artéria umbilical", module.ir_umbilical, module.ip_umbilical, module.perc_umbilical),
    linhaVaso("Artéria cerebral média", module.ir_acm, module.ip_acm, module.perc_acm),
    linhaVaso("Ducto venoso", module.ir_ducto_venoso, module.ip_ducto_venoso, module.perc_ducto_venoso),
  ];
  if (module.ip_medio_uterinas !== null) {
    linhas.push(
      `Índice de pulsatilidade médio das artérias uterinas de ${fmt(module.ip_medio_uterinas)}${module.perc_medio_uterinas !== null ? ` (percentil ${fmtPercentil(module.perc_medio_uterinas)})` : ""}.`,
    );
  }
  if (module.rcp !== null) {
    linhas.push(`Relação cérebro-placentária de ${fmt(module.rcp)}${module.perc_rcp !== null ? ` (percentil ${fmtPercentil(module.perc_rcp)})` : ""}.`);
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
    linhas.push(`Perfil hemodinâmico fetal de ${fmt(perfil)}.`);
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

  let conclusao = buildDopplerConclusionItems(data, { strictEvidence: true });
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
