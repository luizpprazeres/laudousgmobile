import assert from "node:assert/strict";
import { POST } from "@/app/api/catalog/[category]/render/route";
import { createInitialDopplerArteriasTemporaisInput } from "@laudousg/shared";

const TOKEN = "token-de-teste-com-tamanho-suficiente-1234";
process.env.CATALOG_SERVICE_TOKEN = TOKEN;

async function render(dados: unknown, estilo = "CLASSICO_COMPLETO") {
  const response = await POST(new Request("https://x/api/catalog/DOPPLER_ARTERIAS_TEMPORAIS/render", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ estilo, dados }),
  }), { params: Promise.resolve({ category: "DOPPLER_ARTERIAS_TEMPORAIS" }) });
  return { status: response.status, body: await response.json() as { laudo?: string; conflitos?: unknown[] } };
}

async function main() {
  const normal = createInitialDopplerArteriasTemporaisInput();
  for (const side of ["right", "left"] as const) {
    normal.sides[side].branches = normal.sides[side].branches.map((b) => ({ ...b, assessment: "evaluated" as const, flow: "detected" as const, halo: "absent" as const }));
  }
  const ok = await render(normal);
  assert.equal(ok.status, 200);
  assert.match(ok.body.laudo!, /CONCLUSÃO:\nSem alterações ecográficas nos segmentos avaliados da artéria temporal superficial direita\./);
  assert.match((await render(normal, "OBJETIVO")).body.laudo!, /IMPRESSÃO:/);

  const blank = await render(createInitialDopplerArteriasTemporaisInput());
  assert.equal(blank.status, 409);
  assert.ok((blank.body.conflitos ?? []).length > 0);

  // Hipótese por marcador único é recusada mesmo com confirmação.
  const single = structuredClone(normal);
  single.sides.right.branches[1] = { ...single.sides.right.branches[1]!, halo: "present" };
  single.arteritisHypothesis = { include: true, physicianConfirmed: true };
  assert.equal((await render(single)).status, 409);

  console.log("✓ Doppler artérias temporais: renderer estruturado e endpoint fail-closed aprovados");
}

main().catch((error) => { console.error(error); process.exit(1); });
