import { validateClinicalModelInput } from "@laudousg/shared";
import { HEPATIC_VESSEL_KEYS, HepaticDopplerExtractionSchema, hepaticExtractionToContract, type HepaticDopplerExtraction } from "../renderer/categories/DOPPLER_HEPATICO";

export type HepaticDopplerAudit = { ok: boolean; issues: string[] };
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const vesselLabels = {
  portalVein: /(?:veia |tronco (?:da veia )?)porta(?:l)?\b/,
  hepaticVeins: /veias? hepaticas?\b/,
  splenicVein: /veia esplenica\b/,
  superiorMesentericVein: /veia mesenterica superior\b/,
  commonHepaticArtery: /arteria hepatica comum\b/,
} as const;
const valuePattern = "(\\d+(?:[.,]\\d+)?)";
const measureLabels = {
  caliberCm: "(?:calibre|diametro)", velocityCms: "(?:velocidade(?: media)?|vel)",
  peakSystolicVelocityCms: "(?:vps|velocidade (?:de pico )?sistolica)",
  endDiastolicVelocityCms: "(?:vdf|velocidade (?:diastolica final|final diastolica|diastolica))",
  resistanceIndex: "(?:ir|indice de resistencia)",
} as const;
const wordValue = "\\s*(?:(?:de|igual a|:|=)\\s*)?";

function hasMeasure(quote: string, parameter: keyof typeof measureLabels, expected: number) {
  const unitPattern = parameter === "resistanceIndex" ? "" : parameter === "caliberCm" ? "\\s*(mm|cm)\\b" : "\\s*(cm\\s*\\/\\s*s|m\\s*\\/\\s*s)\\b";
  const re = new RegExp(`\\b${measureLabels[parameter]}${wordValue}${valuePattern}${unitPattern}`, "g");
  for (const match of quote.matchAll(re)) {
    let n = Number(match[1]!.replace(",", "."));
    const unit = match[2]?.replace(/\s/g, "");
    if (parameter === "caliberCm" && unit === "mm") n /= 10;
    if (parameter !== "caliberCm" && unit === "m/s") n *= 100;
    if (Math.abs(n - expected) <= 1e-9 * Math.max(1, expected)) return true;
  }
  return false;
}

/** Evidence audit before any text is yielded; quoted source is checked against the actual dictation. */
export function auditHepaticDopplerExtraction(rawInput: string, value: unknown): HepaticDopplerAudit {
  const parsed = HepaticDopplerExtractionSchema.safeParse(value);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const data: HepaticDopplerExtraction = parsed.data;
  const raw = normalize(rawInput);
  const issues: string[] = [];
  const quotedSources: string[] = [];
  const literal = (quote: string | null, label: string) => {
    if (!quote || !raw.includes(normalize(quote))) { issues.push(`${label}: evidência não é trecho literal do ditado`); return ""; }
    quotedSources.push(normalize(quote));
    return normalize(quote);
  };
  if (/\btips\b|transplant|shunt|cavernomat|colaterais|aneurism|estenose|congestao/.test(raw) || data.unmappedFindings.length) issues.push("achados fora do contrato hepático básico exigem revisão, sem writer livre");
  for (const key of HEPATIC_VESSEL_KEYS) {
    const vessel = data.vessels[key];
    if (!vessel.evaluated) {
      if (key === "portalVein") issues.push("veia porta precisa ser avaliada");
      if (Object.entries(vessel).some(([k, v]) => k !== "evaluated" && v !== null)) issues.push(`${key}: vaso não avaliado contém resultados`);
      if (vesselLabels[key].test(raw) && !new RegExp(`${vesselLabels[key].source}[^.;]{0,35}(?:nao avaliad|nao examinad)`).test(raw)) issues.push(`${key}: vaso mencionado foi omitido da extração`);
      continue;
    }
    const quote = literal(vessel.sourceQuote, key);
    if (!vesselLabels[key].test(quote)) issues.push(`${key}: evidência sem nome do vaso`);
    if (HEPATIC_VESSEL_KEYS.some((other) => other !== key && vesselLabels[other].test(quote))) issues.push(`${key}: evidência mistura vasos`);
    for (const parameter of Object.keys(measureLabels) as Array<keyof typeof measureLabels>) {
      const val = vessel[parameter];
      if (val !== null && !hasMeasure(quote, parameter, val)) issues.push(`${key}.${parameter}: medida/unidade sem suporte no vaso correto`);
      if (val === null && new RegExp(`\\b${measureLabels[parameter]}${wordValue}${valuePattern}`, "i").test(quote)) issues.push(`${key}.${parameter}: medida ditada omitida`);
    }
    if (vessel.flow !== null) {
      const flow = vessel.flow === "ausente" ? /(?:fluxo ausente|ausencia de fluxo|sem fluxo)/ : new RegExp(`\\b${vessel.flow}\\b`);
      if (!flow.test(quote)) issues.push(`${key}.flow: direção não documentada`);
      if (new RegExp(`nao (?:e |ha |esta )?${vessel.flow}|(?:sem|ausencia de|nao ha) fluxo ${vessel.flow}|fluxo ${vessel.flow} (?:ausente|nao identificado)`).test(quote)) issues.push(`${key}.flow: direção negada no ditado`);
    }
    if (vessel.patency === "patent" && (!/\bpervi[oa]s?\b/.test(quote) || /nao pervi/.test(quote))) issues.push(`${key}.patency: perviedade sem suporte`);
    if (vessel.patency === "thrombosis" && (!/trombo|trombose/.test(quote) || /(?:sem|ausencia de)\s+(?:sinais de\s+)?tromb/.test(quote))) issues.push(`${key}.patency: trombose sem suporte`);
    if (vessel.spectralPattern && vessel.spectralPattern !== "not_assessed") {
      const pattern = vessel.spectralPattern === "preserved" ? /(?:padrao (?:espectral )?(?:preservado|normal|trifasico)|espectro (?:preservado|normal|trifasico))/ : /(?:padrao|espectro)[^.;]{0,20}(?:alterado|outro)/;
      if (!pattern.test(quote) || /(?:padrao|espectro)[^.;]{0,15}nao/.test(quote)) issues.push(`${key}.spectralPattern: padrão sem suporte`);
    }
  }
  const pathology = data.portalPathology;
  const q = literal(pathology.sourceQuote, "portalPathology");
  if (pathology.status === "absent" && !/(?:sem|ausencia de)[^.;]{0,35}trombose[^.;]{0,35}hipertensao portal|(?:sem|ausencia de)[^.;]{0,35}hipertensao portal[^.;]{0,35}trombose/.test(q)) issues.push("ausência de doença portal não explicitada");
  if (pathology.status === "confirmed" || pathology.status === "suspected") {
    if (!/confirmo|confirmad[oa] pelo medico/.test(q)) issues.push("confirmação médica da alteração não ditada");
    if (/nao[^.;]{0,15}confirm|descartad|(?:sem|ausencia de)[^.;]{0,20}(?:trombose portal|hipertensao portal)/.test(q)) issues.push("alteração ou confirmação negada no ditado");
    if (pathology.status === "confirmed" && /suspeit|possivel|provavel/.test(q)) issues.push("suspeita não pode virar diagnóstico confirmado");
    if (pathology.status === "suspected" && !/suspeit|possivel|provavel/.test(q)) issues.push("status suspeito não documentado");
    const kind = pathology.kind === "portal_thrombosis" ? /trombose (?:da veia )?portal?/ : pathology.kind === "portal_hypertension" ? /hipertensao portal/ : /alteracao/;
    if (!kind.test(q)) issues.push("tipo de alteração portal sem suporte");
    if (!pathology.evidence || !q.includes(normalize(pathology.evidence))) issues.push("critérios da alteração não são literais da confirmação");
  }
  if (data.normalHemodynamicsConfirmed) {
    const qn = literal(data.normalSourceQuote, "normalHemodynamicsConfirmed");
    if (!/(?:hemodinamica normal|sem alteracoes hemodinamicas)/.test(qn) || /nao[^.;]{0,30}(?:normal|sem alteracoes)|alteracoes hemodinamicas presentes/.test(qn)) issues.push("normalidade hemodinâmica não confirmada pelo ditado");
  } else if (data.normalSourceQuote !== null) issues.push("evidência de normalidade sem confirmação");
  // Nunca perder uma segunda frase sobre o mesmo vaso, uma medida extra ou
  // um achado novo só porque a extração escolheu citar o trecho normal.
  let uncovered = raw;
  for (const quote of [...new Set(quotedSources)].sort((a, b) => b.length - a.length)) uncovered = uncovered.replace(quote, " ");
  uncovered = uncovered.replace(/\b(?:ultrassonografia|ultrassom|doppler hepatico|exame de|laudo de|laudo|por favor)\b/g, " ").replace(/[\s.,;:!?()\-–—]+/g, "");
  if (uncovered.length > 0) issues.push("ditado contém trecho não representado pelas evidências; revise antes de gerar");
  try {
    const contract = hepaticExtractionToContract(data);
    const valid = validateClinicalModelInput(contract, { requirePhysicianReview: false });
    if (!valid.success) issues.push(...valid.issues.map((i) => `${i.path}: ${i.message}`));
  } catch (error) { issues.push(error instanceof Error ? error.message : "contrato inválido"); }
  return { ok: issues.length === 0, issues };
}

export function assertHepaticDopplerAuditPassed(audit: HepaticDopplerAudit): void {
  if (!audit.ok) throw new Error(`DOPPLER_HEPATICO_FACT_AUDIT_FAILED: ${audit.issues.join("; ")}`);
}
