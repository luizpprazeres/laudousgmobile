import assert from "node:assert/strict";
import { POST } from "@/app/api/catalog/[category]/render/route";
import { createInitialDopplerArterialMmiiInput, createInitialDopplerFistulaAvInput } from "@laudousg/shared";

const TOKEN = "token-de-teste-com-tamanho-suficiente-1234";
process.env.CATALOG_SERVICE_TOKEN = TOKEN;

async function render(category: string, dados: unknown, estilo = "CLASSICO_COMPLETO") {
  const response = await POST(new Request(`https://x/api/catalog/${category}/render`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ estilo, dados }),
  }), { params: Promise.resolve({ category }) });
  return { status: response.status, body: await response.json() as { laudo?: string; conflitos?: unknown[] } };
}

async function main() {
  const arterial = createInitialDopplerArterialMmiiInput();
  arterial.laterality = "right";
  arterial.sides.right.segments = arterial.sides.right.segments.map((s) => s.id === "tibioperoneal_trunk" || s.id === "dorsalis_pedis"
    ? s : { ...s, assessment: "evaluated" as const, waveform: "triphasic" as const, plaque: "absent" as const });
  const normal = await render("DOPPLER_ARTERIAL_MMII", arterial);
  assert.equal(normal.status, 200);
  assert.match(normal.body.laudo!, /DO MEMBRO INFERIOR DIREITO/);
  assert.match(normal.body.laudo!, /CONCLUSÃO:\nArtérias avaliadas do membro inferior direito pérvias/);
  const objective = await render("DOPPLER_ARTERIAL_MMII", arterial, "OBJETIVO");
  assert.match(objective.body.laudo!, /IMPRESSÃO:/);

  const blank = await render("DOPPLER_ARTERIAL_MMII", createInitialDopplerArterialMmiiInput());
  assert.equal(blank.status, 409);
  assert.ok((blank.body.conflitos ?? []).length > 0);

  const fistula = createInitialDopplerFistulaAvInput();
  fistula.segments = fistula.segments.map((s) => ["central_outflow", "distal_artery"].includes(s.id) ? s : { ...s, assessment: "evaluated" as const });
  const ok = await render("DOPPLER_FISTULA_AV", fistula);
  assert.equal(ok.status, 200);
  assert.match(ok.body.laudo!, /pérvia, sem sinais ecográficos de estenose ou trombose/);

  const unconfirmedFlow = { ...fistula, flowVolume: { valueMlMin: 2400, site: "feeding_artery", classification: "high", physicianConfirmed: false } };
  assert.equal((await render("DOPPLER_FISTULA_AV", unconfirmedFlow)).status, 409);

  console.log("✓ Doppler arterial MMII e fístula AV: renderer estruturado e endpoint fail-closed aprovados");
}

main().catch((error) => { console.error(error); process.exit(1); });
