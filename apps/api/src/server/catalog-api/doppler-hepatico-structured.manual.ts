import assert from "node:assert/strict";
import { type DopplerHepaticoInput } from "@laudousg/shared";
import { POST } from "@/app/api/catalog/[category]/render/route";
import { renderDopplerHepaticoWeb } from "../renderer/categories/dopplerHepaticoWeb";
import { prepareClinicalReport } from "../clinicalReports/service";
import { clinicalRendererFallbackBlocked, structuredClinicalIntent } from "../clinicalReports/fallbackPolicy";

const TOKEN = "hepatic-catalog-synthetic-test-token-12345";
const normal = (): DopplerHepaticoInput => ({
  schemaVersion: 1, categoryCode: "DOPPLER_HEPATICO", physicianReviewed: false,
  normalHemodynamicsConfirmed: true,
  portalVein: { patency: "patent", caliberCm: 1.1, velocityCms: 20, flow: "hepatopetal" },
  hepaticVeins: { evaluated: false }, splenicVein: { evaluated: false },
  superiorMesentericVein: { evaluated: false }, commonHepaticArtery: { evaluated: false },
  portalPathology: { status: "absent", physicianConfirmed: false },
});
async function request(dados?: unknown, estilo = "CLASSICO_COMPLETO", alteracoes: string[] = []) {
  return POST(new Request("https://test.invalid/api/catalog/DOPPLER_HEPATICO/render", {
    method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ dados, estilo, alteracoes }),
  }), { params: Promise.resolve({ category: "DOPPLER_HEPATICO" }) });
}

async function main() {
  process.env.CATALOG_SERVICE_TOKEN = TOKEN;
  const rendered = renderDopplerHepaticoWeb(normal(), "CLASSICO_COMPLETO");
  assert.equal(rendered.ok, true, JSON.stringify(rendered));
  assert.match(rendered.text, /DOPPLER HEPÁTICO/);
  assert.match(rendered.text, /calibre de 1,1 cm/);
  assert.match(rendered.text, /20 cm\/s/);
  assert.match(rendered.text, /sem alterações hemodinâmicas significativas nos vasos avaliados/i);
  assert.doesNotMatch(rendered.text, /Veias hepáticas|Artéria hepática comum|Rim direito|Vesícula/i);
  const response = await request(normal());
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { laudo: string }).laudo, rendered.text);
  const objective = await request(normal(), "OBJETIVO");
  assert.equal(objective.status, 200);
  assert.match((await objective.json() as { laudo: string }).laudo, /IMPRESSÃO:/);

  const expanded = normal();
  expanded.hepaticVeins = { evaluated: true, patency: "patent", caliberCm: 0.7, velocityCms: 25, flow: "hepatofugal", spectralPattern: "preserved" };
  expanded.commonHepaticArtery = { evaluated: true, patency: "patent", caliberCm: 0.4, flow: "hepatopetal", spectralPattern: "preserved", peakSystolicVelocityCms: 90, endDiastolicVelocityCms: 30, resistanceIndex: 0.67 };
  assert.equal((await request(expanded)).status, 200);
  const incompleteArtery = structuredClone(expanded);
  if (incompleteArtery.commonHepaticArtery.evaluated) delete incompleteArtery.commonHepaticArtery.resistanceIndex;
  assert.equal((await request(incompleteArtery)).status, 409);

  const thrombosis = normal();
  thrombosis.normalHemodynamicsConfirmed = false;
  thrombosis.portalVein = { patency: "thrombosis", caliberCm: 1.4, velocityCms: 0, flow: "ausente" };
  thrombosis.portalPathology = { status: "confirmed", kind: "portal_thrombosis", evidence: "Material intraluminal no tronco portal, com ausência de fluxo ao Doppler.", physicianConfirmed: true };
  const altered = await request(thrombosis);
  assert.equal(altered.status, 200, JSON.stringify(await altered.clone().json()));
  const alteredText = (await altered.json() as { laudo: string }).laudo;
  assert.match(alteredText, /trombose portal/i);
  assert.doesNotMatch(alteredText, /sem alterações hemodinâmicas|não foram identificados sinais de trombose/i);
  const unsupported = structuredClone(thrombosis);
  unsupported.portalPathology.physicianConfirmed = false;
  assert.equal((await request(unsupported)).status, 409);
  const conflictingNormal = structuredClone(thrombosis);
  conflictingNormal.normalHemodynamicsConfirmed = true;
  assert.equal((await request(conflictingNormal)).status, 409);

  const unconfirmedNormal = normal();
  unconfirmedNormal.normalHemodynamicsConfirmed = false;
  const missingMeasurement = normal();
  delete missingMeasurement.portalVein.velocityCms;
  const unknownFlow = normal();
  unknownFlow.portalVein.flow = "outro";
  for (const invalid of [undefined, {}, unconfirmedNormal, missingMeasurement, unknownFlow, { ...normal(), categoryCode: "ABDOMEN_TOTAL_DOPPLER" }]) {
    const blocked = await request(invalid);
    assert.equal(blocked.status, 409);
    assert.equal("laudo" in await blocked.json(), false);
  }
  assert.equal((await request(normal(), "CLASSICO_COMPLETO", ["normal"])).status, 400);
  assert.equal(clinicalRendererFallbackBlocked("DOPPLER_HEPATICO"), true);
  assert.equal(structuredClinicalIntent("DOPPLER_HEPATICO", "normal"), "DOPPLER_HEPATICO");
  const prepared = prepareClinicalReport({ ...normal(), physicianReviewed: true });
  assert.equal(prepared.contract.physicianReviewed, false, "client cannot assert trusted review");
  assert.equal(prepared.structuredFindings.tipo_exame, "Doppler hepático");
  assert.equal(prepared.generatedOutput, rendered.text);
  console.log("✓ Doppler hepático: contrato estruturado, endpoint, persistência preparada e bloqueio de fallback livre");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
