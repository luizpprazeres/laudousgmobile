import assert from "node:assert/strict";
import { POST } from "@/app/api/catalog/[category]/render/route";
import { renderDopplerCarotidas } from "@/server/renderer/categories/DOPPLER_CAROTIDAS";
import { createInitialDopplerCarotidasWebInput } from "@laudousg/shared";

const TOKEN = "token-de-teste-com-tamanho-suficiente-1234";
process.env.CATALOG_SERVICE_TOKEN = TOKEN;

async function render(dados: unknown, estilo = "CLASSICO_COMPLETO") {
  const response = await POST(new Request("https://x/api/catalog/DOPPLER_CAROTIDAS/render", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ estilo, dados }),
  }), { params: Promise.resolve({ category: "DOPPLER_CAROTIDAS" }) });
  return { status: response.status, body: await response.json() as { laudo?: string; conflitos?: unknown[] } };
}

async function main() {
  // Em branco: nada presumido, a rota recusa.
  const blank = await render(createInitialDopplerCarotidasWebInput());
  assert.equal(blank.status, 409);
  assert.ok((blank.body.conflitos ?? []).length > 0);

  const ok = createInitialDopplerCarotidasWebInput();
  for (const lado of [ok.direita, ok.esquerda]) { lado.avaliacao = "avaliado"; lado.placas_status = "ausentes"; lado.classificacao = "normal"; }
  ok.direita.interna = { vps_cms: 110, vdf_cms: 30 };
  const normal = await render(ok);
  assert.equal(normal.status, 200);
  assert.match(normal.body.laudo!, /Carótida interna direita: PSV de 110 cm\/s, VDF de 30 cm\/s, IR de 0,73\./);
  assert.match(normal.body.laudo!, /CONCLUSÃO:\nEstudo Doppler das artérias carótidas dentro dos limites da normalidade\./);
  assert.doesNotMatch(normal.body.laudo!, /aspecto habitual|anterógrado/);
  const objetivo = await render(ok, "OBJETIVO");
  assert.match(objetivo.body.laudo!, /IMPRESSÃO:/);

  // O renderer compartilhado (mobile/Biblioteca) continua igual.
  const legado = renderDopplerCarotidas({
    direita: { emi_mm: null, comum: { vps_cms: null, vdf_cms: null }, interna: { vps_cms: null, vdf_cms: null }, externa: { vps_cms: null, vdf_cms: null }, vertebral: { vps_cms: null, direcao: null }, placas: [] },
    esquerda: { emi_mm: null, comum: { vps_cms: null, vdf_cms: null }, interna: { vps_cms: null, vdf_cms: null }, externa: { vps_cms: null, vdf_cms: null }, vertebral: { vps_cms: null, direcao: null }, placas: [] },
    classificacao_explicita: null, lado_classificacao: null, conclusao_livre: null, achados_adicionais: null,
  });
  assert.match(legado, /aspecto habitual/);
  console.log("doppler-carotidas-web-structured: ok");
}

main().catch((e) => { console.error(e); process.exit(1); });
