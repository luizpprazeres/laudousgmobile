import assert from "node:assert/strict";
import { DOPPLER_HEPATICO_FEWSHOTS, emptyHepaticExtractedVessel } from "../../renderer/categories/dopplerHepaticoFewshots";
import { auditHepaticDopplerExtraction } from "../dopplerHepaticoWriterAudit";
import { runDopplerHepaticoWriterStream } from "../dopplerHepaticoWriter";
import { rendererCategoryEnabled, resolveGenerationPath } from "../generationPathResolver";
import { clinicalRendererFallbackBlocked } from "../../clinicalReports/fallbackPolicy";
import { RENDERER_SUPPORTED_CATEGORIES, RENDERER_PROGRAMMATIC_CATEGORIES } from "../../renderer/extraction";

const first = DOPPLER_HEPATICO_FEWSHOTS[0]!;
const thrombosis = DOPPLER_HEPATICO_FEWSHOTS[1]!;
const incomplete = DOPPLER_HEPATICO_FEWSHOTS[2]!;
let count = 0;
function check(name: string, condition: boolean) { assert.ok(condition, name); count += 1; }
function auditInvalid(name: string, modify: (data: typeof first.extraction) => void, raw = first.raw) {
  const data = structuredClone(first.extraction); modify(data);
  check(name, !auditHepaticDopplerExtraction(raw, data).ok);
}

async function main() {
  check("normal explicitly dictated passes", auditHepaticDopplerExtraction(first.raw, first.extraction).ok);
  check("confirmed thrombosis with evidence passes", auditHepaticDopplerExtraction(thrombosis.raw, thrombosis.extraction).ok);
  const denied = structuredClone(thrombosis.extraction);
  denied.portalPathology.sourceQuote = "Não confirmo trombose portal: material intraluminal com ausência de fluxo.";
  check("negated physician confirmation blocked", !auditHepaticDopplerExtraction(`${denied.vessels.portalVein.sourceQuote} ${denied.portalPathology.sourceQuote}`, denied).ok);
  check("missing portal values blocked", !auditHepaticDopplerExtraction(incomplete.raw, incomplete.extraction).ok);
  auditInvalid("invented number", (d) => { d.vessels.portalVein.velocityCms = 21; });
  auditInvalid("invented quote", (d) => { d.vessels.portalVein.sourceQuote = "Veia porta calibre 1,1 cm, velocidade 21 cm/s"; });
  auditInvalid("removed number", (d) => { d.vessels.portalVein.caliberCm = null; });
  auditInvalid("swapped parameter", (d) => { d.vessels.portalVein.caliberCm = 20; d.vessels.portalVein.velocityCms = 1.1; });
  auditInvalid("invented optional vessel", (d) => { d.vessels.splenicVein = { ...d.vessels.portalVein }; });
  auditInvalid("wrong flow", (d) => { d.vessels.portalVein.flow = "hepatofugal"; });
  auditInvalid("invented patency", (d) => { d.vessels.portalVein.patency = "thrombosis"; });
  auditInvalid("normal without source", (d) => { d.normalSourceQuote = null; });
  auditInvalid("results on unassessed vessel", (d) => { d.vessels.hepaticVeins.caliberCm = 1; });
  auditInvalid("unmapped finding", (d) => { d.unmappedFindings = ["colaterais"]; });
  check("TIPS scope blocked", !auditHepaticDopplerExtraction(`${first.raw} Avaliação de TIPS.`, first.extraction).ok);
  check("transplant scope blocked", !auditHepaticDopplerExtraction(`${first.raw} Fígado transplantado.`, first.extraction).ok);
  check("second clause about same vessel not lost", !auditHepaticDopplerExtraction(`${first.raw} Veia porta com material intraluminal.`, first.extraction).ok);
  check("extra number not silently dropped", !auditHepaticDopplerExtraction(`${first.raw} Velocidade adicional 90 cm/s.`, first.extraction).ok);
  check("omitted evaluated vessel blocked", !auditHepaticDopplerExtraction(`${first.raw} Veia esplênica pérvia, calibre 0,8 cm, velocidade 15 cm/s, fluxo hepatopetal.`, first.extraction).ok);
  const cmConverted = structuredClone(first.extraction);
  cmConverted.vessels.portalVein.sourceQuote = "Veia porta pérvia, calibre 11 mm, velocidade 0,2 m/s, fluxo hepatopetal.";
  check("source units conversion accepted", auditHepaticDopplerExtraction(`${cmConverted.vessels.portalVein.sourceQuote} ${cmConverted.portalPathology.sourceQuote} ${cmConverted.normalSourceQuote}`, cmConverted).ok);
  const hypertension = structuredClone(first.extraction);
  hypertension.normalHemodynamicsConfirmed = false;
  hypertension.normalSourceQuote = null;
  hypertension.vessels.portalVein.sourceQuote = "Veia porta pérvia, calibre 1,5 cm, velocidade 9 cm/s, fluxo hepatofugal.";
  hypertension.vessels.portalVein.caliberCm = 1.5;
  hypertension.vessels.portalVein.velocityCms = 9;
  hypertension.vessels.portalVein.flow = "hepatofugal";
  hypertension.portalPathology = { status: "suspected", kind: "portal_hypertension", evidence: "inversão do fluxo portal", physicianConfirmed: true, sourceQuote: "Confirmo suspeita de hipertensão portal: inversão do fluxo portal." };
  const hypertensionRaw = `${hypertension.vessels.portalVein.sourceQuote} ${hypertension.portalPathology.sourceQuote}`;
  check("physician confirmed suspicion preserved", auditHepaticDopplerExtraction(hypertensionRaw, hypertension).ok);
  hypertension.portalPathology.status = "confirmed";
  check("suspicion cannot become confirmed disease", !auditHepaticDopplerExtraction(hypertensionRaw, hypertension).ok);
  const optional = structuredClone(first.extraction);
  optional.vessels.hepaticVeins = { ...emptyHepaticExtractedVessel(), evaluated: true, sourceQuote: "Veias hepáticas pérvias, calibre 0,7 cm, velocidade 25 cm/s, fluxo hepatofugal, padrão espectral preservado.", patency: "patent", caliberCm: 0.7, velocityCms: 25, flow: "hepatofugal", spectralPattern: "preserved" };
  check("physiological hepatic hepatofugal flow", auditHepaticDopplerExtraction(`${first.raw} ${optional.vessels.hepaticVeins.sourceQuote}`, optional).ok);

  const config = { HARD_MODE_ENABLED: "true", RENDERER_CATEGORIES: "", DOPPLER_STANDALONE_V2: "true" };
  check("dedicated enabled by default", rendererCategoryEnabled("DOPPLER_HEPATICO", config));
  check("hard mode cannot bypass audit", resolveGenerationPath({ mode: "hard", categoryCode: "DOPPLER_HEPATICO" }, config).path === "renderer");
  check("explicit false defeats allowlist", !rendererCategoryEnabled("DOPPLER_HEPATICO", { ...config, RENDERER_CATEGORIES: "DOPPLER_HEPATICO", DOPPLER_HEPATICO_WRITER_ENABLED: "false" }));
  check("free fallback blocked", clinicalRendererFallbackBlocked("DOPPLER_HEPATICO"));
  check("extractor registered", RENDERER_SUPPORTED_CATEGORIES.has("DOPPLER_HEPATICO"));
  check("programmatic contract registered", RENDERER_PROGRAMMATIC_CATEGORIES.has("DOPPLER_HEPATICO"));

  const good = runDopplerHepaticoWriterStream({ rawInput: first.raw }, { model: "synthetic", enabled: true, extract: async () => ({ value: first.extraction }) });
  const delivered = await good.next();
  check("audited text emitted once", !delivered.done && /DOPPLER HEPÁTICO/.test(delivered.value));
  check("completion after one audited emission", (await good.next()).done === true);
  const bad = runDopplerHepaticoWriterStream({ rawInput: incomplete.raw }, { model: "synthetic", enabled: true, extract: async () => ({ value: incomplete.extraction }) });
  await assert.rejects(bad.next(), /FACT_AUDIT_FAILED/); count += 1;
  const disabled = runDopplerHepaticoWriterStream({ rawInput: first.raw }, { model: "synthetic", enabled: false, extract: async () => { throw new Error("must not call"); } });
  await assert.rejects(disabled.next(), /WRITER_DISABLED/); count += 1;
  const objective = runDopplerHepaticoWriterStream({ rawInput: thrombosis.raw, objective: true }, { model: "synthetic", enabled: true, extract: async () => ({ value: thrombosis.extraction }) });
  const obj = await objective.next();
  check("objective style and confirmed pathology", !obj.done && /IMPRESSÃO:/.test(obj.value) && /trombose portal/.test(obj.value));
  console.log(`✓ ${count} cenários: writer hepático dedicado, evidências, medidas, fluxo, diagnóstico, roteamento e bloqueio antes do stream`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
