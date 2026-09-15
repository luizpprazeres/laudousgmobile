/** T39: diagnóstico por sistema deve chegar à seção final nos dois estilos.
 * Rodar em apps/api: pnpm exec tsx src/server/renderer/__tests__/morfologico-conclusao-sistemas.manual.ts
 * Fixtures sintéticas; sem banco, rede ou LLM.
 */
import assert from "node:assert/strict";
import { adaptarMorfologico } from "../../../../../web/src/lib/catalog/morfologicoParaCatalogo";
import { morfologico } from "../../../../../web/src/lib/deterministic";
import { MorfologicoFindingsSchema, renderMorfologico } from "../categories/MORFOLOGICO";

const casos = [
  { nome: "normal", sistemas: [] },
  { nome: "isolado", sistemas: ["snc"] },
  { nome: "combinado", sistemas: ["snc", "coracao"] },
] as const;
const achados = {
  snc: { corpo: "Ventriculomegalia bilateral de 12 mm.", diagnostico: "Ventriculomegalia bilateral leve." },
  coracao: { corpo: "Comunicação interventricular de 3 mm.", diagnostico: "Comunicação interventricular." },
};

let casosVerificados = 0;
for (const trimestre of ["2t", "3t"] as const) {
  for (const caso of casos) {
    const estado: Record<string, unknown> = {};
    for (const secao of morfologico.sections) {
      if (secao.module) estado[secao.id] = secao.module.initialState();
    }
    const anatomia = { ...(estado.anatomia as Record<string, unknown>) };
    for (const sistema of caso.sistemas) {
      anatomia[sistema] = "alterado";
      anatomia[`${sistema}.alterado.corpo`] = achados[sistema].corpo;
      anatomia[`${sistema}.alterado.diag`] = achados[sistema].diagnostico;
    }
    estado.anatomia = anatomia;
    const adaptado = adaptarMorfologico(estado, { trimestre });
    assert.equal(adaptado.pendencias.some((p) => p.bloqueia), false, `${caso.nome}: entrada bloqueada`);
    const findings = MorfologicoFindingsSchema.parse(adaptado.dados);

    for (const objetivo of [false, true]) {
      const nome = `${trimestre} ${objetivo ? "Objetivo" : "Clássico"} ${caso.nome}`;
      const texto = renderMorfologico(findings, null, { objetivo });
      const partes = texto.split(objetivo ? "\nIMPRESSÃO:\n" : "\nCONCLUSÃO:\n");
      assert.equal(partes.length, 2, `${nome}: seção final ausente ou duplicada`);
      const [corpo, conclusao] = partes as [string, string];
      const diagnosticos = caso.sistemas.map((sistema) => achados[sistema].diagnostico);
      const linhas = conclusao.split("\n").map((linha) => linha.replace(/^\s*(?:\d+[.)]|[-•])\s*/, "").trim());
      assert.deepEqual(linhas.filter((linha) => Object.values(achados).some((a) => a.diagnostico === linha)), diagnosticos,
        `${nome}: diagnóstico perdido, duplicado ou fora de ordem na conclusão`);
      for (const sistema of caso.sistemas) {
        assert.ok(corpo.includes(achados[sistema].corpo), `${nome}: descrição ausente no corpo`);
        assert.ok(!conclusao.includes(achados[sistema].corpo), `${nome}: descrição usada como diagnóstico`);
      }
      assert.equal(conclusao.includes("Morfologia fetal sem evidência de alteração"), caso.sistemas.length === 0,
        `${nome}: normalidade global incompatível`);
      assert.equal(/estruturas cranianas.+normais|crânio, SNC e coluna/.test(corpo), caso.nome === "normal",
        `${nome}: normalidade de SNC incompatível`);
      assert.equal(/Coração com quatro câmaras|coração com quatro câmaras/.test(corpo), caso.nome !== "combinado",
        `${nome}: normalidade cardíaca incompatível`);
      assert.ok(/Nariz e narinas presentes|face/.test(corpo), `${nome}: sistema preservado desapareceu`);
      console.log(`✓ ${nome}`);
      casosVerificados++;
    }
  }
}
// Lacuna 1t apontada por Torno: o adaptador aceita diagnóstico sem descrição.
// Mantida separada da matriz 2t/3t para demonstrar a origem da contradição.
for (const caso of casos) {
  const estado: Record<string, unknown> = {};
  for (const secao of morfologico.sections) {
    if (secao.module) estado[secao.id] = secao.module.initialState();
  }
  const anatomia = { ...(estado.anatomia as Record<string, unknown>) };
  for (const sistema of caso.sistemas) {
    anatomia[sistema] = "alterado";
    anatomia[`${sistema}.alterado.corpo`] = "";
    anatomia[`${sistema}.alterado.diag`] = achados[sistema].diagnostico;
  }
  estado.anatomia = anatomia;
  const adaptado = adaptarMorfologico(estado, { trimestre: "1t" });
  assert.equal(adaptado.pendencias.some((p) => p.bloqueia), false, "1t: diagnóstico sem corpo deve ser alcançável");
  const findings = MorfologicoFindingsSchema.parse(adaptado.dados);
  assert.ok(!findings.achados_adicionais?.trim(), "1t: caso deve chegar sem corpo");
  for (const objetivo of [false, true]) {
    const nome = `1t ${objetivo ? "Objetivo" : "Clássico"} ${caso.nome}, diagnóstico sem corpo`;
    const texto = renderMorfologico(findings, null, { objetivo });
    const partes = texto.split(objetivo ? "\nIMPRESSÃO:\n" : "\nCONCLUSÃO:\n");
    assert.equal(partes.length, 2, `${nome}: seção final ausente ou duplicada`);
    const conclusao = partes[1]!;
    for (const sistema of caso.sistemas) {
      assert.equal(conclusao.split(achados[sistema].diagnostico).length - 1, 1, `${nome}: diagnóstico perdido ou duplicado`);
    }
    assert.equal(conclusao.includes("Morfologia fetal normal para esta fase da gestação."), caso.nome === "normal",
      `${nome}: conclusão normal contradiz diagnóstico`);
    console.log(`✓ ${nome}`);
    casosVerificados++;
  }
}
console.log(`\n${casosVerificados} casos passaram; corpo e conclusão verificados separadamente.`);
