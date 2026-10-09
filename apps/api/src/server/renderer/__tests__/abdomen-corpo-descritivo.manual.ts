import assert from "node:assert/strict";
import { ABDOMEN_ORGAN_KEYS, AbdomenTotalFindingsSchema, type AbdomenFinding, type AbdomenTotalFindings } from "../findingsSchemas/ABDOMEN_TOTAL";
import { renderOrgan, renderAbdomenTotalClassico, renderAbdomenTotalObjetivo } from "../phrases/ABDOMEN_TOTAL";

const finding = (patch: Partial<AbdomenFinding>): AbdomenFinding => ({
  tipo: "outro", grau: null, quantidade: null, lateralidade: null, mobilidade: null,
  localizacao: null, medidas_cm: null, valor_ml: null, termo_do_medico: null, descricao_livre: null, ...patch,
});
const base = (): AbdomenTotalFindings => AbdomenTotalFindingsSchema.parse({
  orgaos: Object.fromEntries(ABDOMEN_ORGAN_KEYS.map(k => [k, { status: "normal", achados: [] }])),
  achados_extra_abdominais: [], observacoes_do_medico: null,
});
const template = `OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${ABDOMEN_ORGAN_KEYS.map(k => `{{orgao:${k}|${k} NORMAL}}`).join("\n")}\n{{extra_abdominais}}\nCONCLUSÃO:\n{{conclusao}}`;

for (const descricao of ["Vesícula hipodistendida", "Vesícula hipodistendido"]) {
  const achado = finding({ descricao_livre: descricao });
  {
    const rendered = renderOrgan("vesicula", { status: "alterado", achados: [achado] });
    assert.equal(rendered.body, "");
    assert.deepEqual(rendered.freeSlotFindings, [achado]);
  }
}
assert.match(renderOrgan("vesicula", { status: "alterado", achados: [finding({ descricao_livre: "Vesícula distendida" })] }).body!, /Vesícula biliar distendida/);

// “Móvel” não pode casar dentro de “imóvel” e transformar uma imagem
// parietal em cálculo, com sombra acústica que ninguém ditou.
for (const descricao of ["Imagem hiperecoica imóvel aderida à parede", "Imagens hiperecoicas imóveis"]) {
  const achado = finding({ descricao_livre: descricao, mobilidade: "imovel" });
  const rendered = renderOrgan("vesicula", { status: "alterado", achados: [achado] });
  assert.equal(rendered.body, "");
  assert.deepEqual(rendered.conclusao, []);
  assert.deepEqual(rendered.freeSlotFindings, [achado]);
}
assert.match(renderOrgan("vesicula", { status: "alterado", achados: [finding({ descricao_livre: "Imagem hiperecoica móvel" })] }).body!, /imagem hiperecoica/);

for (const organ of ABDOMEN_ORGAN_KEYS) {
  const f = base();
  const texto = `${organ} com alteração fora do catálogo`;
  f.orgaos[organ] = { status: "alterado", achados: [finding({ descricao_livre: texto })] };
  const rendered = renderOrgan(organ, f.orgaos[organ]);
  assert.equal(rendered.body, "", `${organ}: não pode emitir normalidade`);
  assert.equal(rendered.freeSlotFindings.length, 1);
  for (const laudo of [renderAbdomenTotalClassico(f, template), renderAbdomenTotalObjetivo(f)]) {
    assert.ok(laudo.toLowerCase().includes(texto));
    assert.ok(!laudo.includes(`${organ} NORMAL`));
  }
}
for (const organ of ["rim_direito", "rim_esquerdo"] as const) {
  for (const descricao of ["Rim não visualizado", "Nefropatia crônica", "Agenesia renal"]) {
    const rendered = renderOrgan(organ, { status: "alterado", achados: [finding({ descricao_livre: descricao })] });
    assert.equal(rendered.body, "");
    assert.equal(rendered.freeSlotFindings[0]?.descricao_livre, descricao);
  }
  const f = base();
  f.orgaos[organ] = { status: "ausente_cirurgico", achados: [] };
  for (const laudo of [renderAbdomenTotalClassico(f, template), renderAbdomenTotalObjetivo(f)]) {
    assert.match(laudo, /ausente cirurgicamente/);
    assert.ok(!laudo.includes(`${organ} NORMAL`));
    const lado = organ === "rim_direito" ? "direito" : "esquerdo";
    assert.ok(!laudo.includes(`Rim ${lado} com diâmetros`));
  }
  // Achado livre não pode apagar a lesão canônica, suas medidas ou sua conclusão.
  const rendered = renderOrgan(organ, { status: "alterado", achados: [finding({ tipo: "cisto_simples", medidas_cm: [2.1, 1.8] }), finding({ descricao_livre: "Nefropatia crônica" })] });
  assert.match(rendered.body!, /2,1 x 1,8 cm/);
  assert.ok(!/limites normais|preservada|contornos regulares|tópico/.test(rendered.body!));
  assert.equal(rendered.conclusao.length, 1);
  assert.equal(rendered.freeSlotFindings.length, 1);
}
const figadoMisto = renderOrgan("figado", { status: "alterado", achados: [
  finding({ tipo: "esteatose", grau: "moderado" }),
  finding({ descricao_livre: "Imagem hepática fora do catálogo" }),
] });
assert.match(figadoMisto.body!, /^Fígado com aumento difuso/);
assert.ok(!figadoMisto.body!.includes("dimensões normais"));
assert.equal(figadoMisto.freeSlotFindings.length, 1);

for (const [organ, achado] of [
  ["rim_direito", finding({ tipo: "cisto_simples" })],
  ["rim_esquerdo", finding({ tipo: "litiase" })],
  ["baco", finding({ descricao_livre: "cisto esplênico" })],
  ["vesicula", finding({ descricao_livre: "lama biliar" })],
  ["veia_cava", finding({ descricao_livre: "trombo na veia cava" })],
] as const) {
  const rendered = renderOrgan(organ, { status: "alterado", achados: [achado] });
  assert.ok(!/compatíve(?:l|is) com|sugestiv[ao] de/.test(rendered.body!));
  assert.ok(rendered.conclusao.length > 0, "interpretação preservada na conclusão");
}
console.log("PASS: corpo descritivo, hipodistensão, achados livres e ausência cirúrgica renal (clássico e objetivo).");
