import type { HepaticModuleKey, HepaticModule } from "./contracts";

type Method = NonNullable<HepaticModule["method"]>;
type Unit = HepaticModule["measurements"][number]["unit"];
export type HepaticQualityProfile = {
  module: HepaticModuleKey; method: Method; unit: Unit;
  manufacturer: string; equipmentModel: string;
  scope: "method" | "manufacturer";
  minimumAcquisitions: number; minimumFastingHours: number;
  reference: { id: string; version: string; citation: string };
  metrics: Array<{ code: string; label: string; unit: string; required: boolean;
    source?: "reported" | "derived_iqr_median_percent";
    appliesWhenMedianAbove?: number;
    rule: { version: string; kind: "range"; min: number; max: number } | { version: string; kind: "allowed_values"; values: number[] } }>;
};
const version = "laudousg-quality/2026-10-05-v1";
const stiffnessCitation = "WFUMB 2024, protocolo de aquisição, tabela 1; DOI: 10.1016/j.ultrasmedbio.2024.03.013";
const fatCitation = "WFUMB 2024, quantificação de gordura, tabela 5; DOI: 10.1016/j.ultrasmedbio.2024.03.014";
/** Critérios técnicos, nunca limiares diagnósticos. O médico confirma também
 * as condições por aquisição/protocolo que não são calculáveis pelo formulário. */
export const HEPATIC_COMMON_QUALITY_PROFILES: readonly HepaticQualityProfile[] = [
  ...(["2D-SWE", "pSWE/ARFI", "TE"] as const).flatMap((method) =>
    (method === "TE" ? ["kPa"] as const : ["kPa", "m/s"] as const).map((unit): HepaticQualityProfile => ({
      module: "stiffness", method, unit, manufacturer: method === "TE" ? "Echosens" : "*", equipmentModel: "*", scope: method === "TE" ? "manufacturer" : "method",
      minimumAcquisitions: method === "TE" ? 10 : method === "2D-SWE" ? 3 : 5,
      minimumFastingHours: method === "TE" ? 3 : 4,
      reference: { id: method === "TE" ? "echosens-fibroscan-te-2026" : `wfumb-2024-${method.toLowerCase().replace(/[^a-z0-9]/g, "-")}`, version, citation: method === "TE" ? "Echosens, FibroScan procedure; https://www.echosens.com/fibroscanprocedure/ (consulta 2026-10-05)" : stiffnessCitation },
      metrics: [
        { code: "iqr-median-percent", label: "IQR/mediana calculado", unit: "%", required: true, source: "derived_iqr_median_percent", appliesWhenMedianAbove: method === "TE" ? 7.1 : undefined, rule: { version, kind: "range", min: 0, max: unit === "kPa" ? 30 : 15 } },
        { code: "protocol-confirmed", label: method === "TE" ? "Confirme FibroScan/Echosens, repouso de 5 min, sonda indicada/calibrada e 10 medidas no mesmo local" : "Confirme repouso de 10 min, janela/ROI e critérios do fabricante; em 2D-SWE, CV por aquisição <0,25 entre 8,8–11,9 kPa e <0,10 a partir de 12 kPa", unit: "confirmação", required: true, rule: { version, kind: "allowed_values", values: [1] } },
      ],
    }))),
  ...(["ATI", "UGAP"] as const).map((method): HepaticQualityProfile => ({
    module: "fat", method, unit: "dB/cm/MHz", manufacturer: "*", equipmentModel: "*", scope: "method", minimumAcquisitions: 3, minimumFastingHours: 4,
    reference: { id: `wfumb-2024-${method.toLowerCase()}`, version, citation: fatCitation },
    metrics: [
      { code: "iqr-median-percent", label: "IQR/mediana calculado", unit: "%", required: true, source: "derived_iqr_median_percent", rule: { version, kind: "range", min: 0, max: 15 } },
      { code: "protocol-confirmed", label: "Confirme qualidade por aquisição, posição/ROI e critérios específicos do fabricante", unit: "confirmação", required: true, rule: { version, kind: "allowed_values", values: [1] } },
    ],
  })),
];

export function hepaticQualityByMethod(module: HepaticModuleKey) {
  return Object.fromEntries(HEPATIC_COMMON_QUALITY_PROFILES.filter((profile) => profile.module === module)
    .map((profile) => [profile.method, { reference: profile.reference, minimumAcquisitions: profile.minimumAcquisitions,
      metrics: profile.metrics.map(({ code, label, unit, source }) => ({ code, label, unit, source })) }]));
}

/** Pré-checagem de aquisição para o formulário. A API refaz a validação completa. */
export function hepaticQualityAcquisitionIssues(module: HepaticModule): string[] {
  const median = module.measurements.find((item) => item.role === "median");
  const profile = HEPATIC_COMMON_QUALITY_PROFILES.find((item) => item.method === module.method && item.unit === median?.unit);
  if (!profile) return ["Informe método, mediana e unidade nativa."];
  const messages: string[] = [];
  if (profile.scope === "manufacturer" && module.equipment?.manufacturer.toLowerCase() !== profile.manufacturer.toLowerCase()) messages.push(`Este perfil requer equipamento ${profile.manufacturer}.`);
  if ((module.acquisition?.count ?? 0) < profile.minimumAcquisitions) messages.push(`Registre pelo menos ${profile.minimumAcquisitions} aquisições válidas.`);
  if (module.fasting?.status !== "fasting" || (module.fasting.hours ?? 0) < profile.minimumFastingHours) messages.push(`Este perfil requer jejum de pelo menos ${profile.minimumFastingHours} horas.`);
  if (module.acquisition?.lobe !== "right") messages.push("Este perfil requer aquisição no lobo direito.");
  const ratio = module.derived.find((item) => item.id === "iqr-median-percent");
  const metric = profile.metrics.find((item) => item.source === "derived_iqr_median_percent");
  if (!ratio) messages.push("Calcule IQR/mediana a partir das medidas nativas.");
  else if (metric?.rule.kind === "range" && (metric.appliesWhenMedianAbove === undefined || median!.value > metric.appliesWhenMedianAbove) && ratio.value > metric.rule.max) messages.push(`IQR/mediana acima de ${metric.rule.max}%: revise as aquisições.`);
  return messages;
}
