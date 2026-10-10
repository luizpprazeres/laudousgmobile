/**
 * W14 — correções da revisão Codex (docs/reviews/2026-10-10-revisao-prompts-codex.md) na parte da W10b:
 * A01, A06 (global), A10 (global), M01 (partes moles), M02, M03, B01. Determinístico, sem LLM.
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/prompts/__tests__/w14-revisao-global.manual.ts
 */
import assert from "node:assert/strict";
import type { RagBlockForPrompt } from "@laudousg/shared";
import { buildSystemMessage } from "../buildSystemMessage";
import { GLOBAL_RULES_BLOCK, GLOBAL_RULES_LEAN, CATEGORY_GLOBAL_RULES } from "../global";
import { getStyleOverlay } from "../styles";
import { WRITER_OUTPUT_RULE } from "../../pipeline/writerOutputGuard";
import { buildRawUserMessage } from "../../pipeline/writer";
import { buildPartesMolesWriterSystemMessage } from "../../renderer/categories/PARTES_MOLES";
import { PARTES_MOLES_FEWSHOTS } from "../../renderer/categories/partesMolesFewshots";
import { buildMskWriterSystemMessage } from "../../renderer/categories/MUSCULOESQUELETICO";
import { buildPelveWriterSystemMessage } from "../../renderer/categories/PELVE_FEMININA";

let ok = 0;
function check(nome: string, fn: () => void) {
  fn();
  ok++;
  console.log(`✓ ${nome}`);
}
const MODELO: RagBlockForPrompt[] = [
  { id: "m", kind: "modelo", title: "Modelo", content: "ULTRASSONOGRAFIA\n\nCOMENTÁRIOS:\n…\n\nCONCLUSÃO:\n…", priority: 1, similarity: null } as RagBlockForPrompt,
];
const sys = (categoryCode: string, writingStyleCode: "CLASSICO_COMPLETO" | "OBJETIVO" | "DETALHADO_PROTOCOLAR" = "CLASSICO_COMPLETO") =>
  buildSystemMessage({ categoryCode, categoryLabel: categoryCode, writingStyleCode, ragBlocks: MODELO, inputMode: "raw" });
const conta = (t: string, s: string) => t.split(s).length - 1;

check("A01: a regra das axilas/BI-RADS da mama saiu dos dois globais", () => {
  for (const g of [GLOBAL_RULES_BLOCK, GLOBAL_RULES_LEAN]) {
    assert.doesNotMatch(g, /axila|MAMARIA|Mamas e axilas/i);
  }
  assert.equal(CATEGORY_GLOBAL_RULES.MAMARIA, undefined);
  for (const c of ["OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO", "ABDOMEN_TOTAL", "TIREOIDE"]) {
    assert.doesNotMatch(sys(c), /axila/i, `${c} não pode receber regra de axila`);
  }
});

check("A01: o system da mama mantém escopo axilar e BI-RADS 1 do normal — pelo contrato, uma vez só", () => {
  const m = sys("MAMARIA");
  assert.match(m, /ESCOPO — decida antes de escrever/);
  assert.ok(conta(m, "Mamas ecograficamente normais (Categoria BI-RADS® 1).") >= 1, "BI-RADS 1 do normal vem do contrato");
  assert.equal(conta(GLOBAL_RULES_LEAN + GLOBAL_RULES_BLOCK, "BI-RADS® 1"), 0, "e não do global");
  assert.match(m, /item de maior categoria/);
});

check("A06: nenhum global manda trocar margem por \"circunscritas\"; a espiculada do contrato sobrevive", () => {
  for (const c of ["MAMARIA", "OBSTETRICA"]) assert.doesNotMatch(sys(c), /sempre "circunscritas"/);
  assert.match(sys("MAMARIA"), /espiculada/);
});

check("A10 (global): conduta só ditada — sem delegação genérica ao contrato", () => {
  assert.doesNotMatch(GLOBAL_RULES_LEAN, /contrato da categoria mandar/);
  assert.match(GLOBAL_RULES_LEAN, /só quando o médico ditar, respeitando a redação dele/);
  assert.match(GLOBAL_RULES_LEAN, /classificação só entra quando o contrato da categoria a determinar|ela só entra quando o contrato da categoria a determinar/);
});

check("M01: few-shots de partes moles na fórmula da casa, sem conduta não ditada", () => {
  for (const f of PARTES_MOLES_FEWSHOTS) {
    assert.doesNotMatch(f.laudo, /O diagnóstico mais provável é/);
    if (/Convém/.test(f.laudo)) assert.match(f.laudo, /Convém, a critério clínico, .*com objetivo de/);
    if (/correlação com os achados clínicos/i.test(f.laudo)) assert.match(f.raw, /correla/i, "conduta do exemplo tem de vir do ditado do par");
  }
  assert.ok(PARTES_MOLES_FEWSHOTS.filter((f) => /que tem como diagnóstico mais provável/.test(f.laudo)).length >= 2);
  assert.match(buildPartesMolesWriterSystemMessage(), /servem só de estilo/);
});

check("M02: fora da obstetrícia, a mensagem do usuário segue a política do global (sem exemplo obstétrico)", () => {
  const abd = buildRawUserMessage("Abdome normal.", false, { label: "Abdome Total", code: "ABDOMEN_TOTAL" });
  assert.doesNotMatch(abd, /Gestação em torno de|mantenha o placeholder/);
  assert.match(abd.replace(/\s+/g, " "), /linha de medida não ditada é omitida/);
  assert.match(GLOBAL_RULES_LEAN, /Linha de medida do modelo sem valor ditado: omita a linha/);
  const obst = buildRawUserMessage("IG não informada.", false, { label: "Obstétrica", code: "OBSTETRICA" });
  assert.match(obst, /Gestação em torno de ____ semanas/);
  // sem exame escolhido (Livre, modo difícil, TESTE): igual a antes
  assert.match(buildRawUserMessage("x"), /mantenha o placeholder "____" quando o modelo exigir/);
});

check("M02: a regra de saída não autoriza marca genérica; remete às regras da categoria", () => {
  assert.doesNotMatch(WRITER_OUTPUT_RULE, /dúvida real vai como \[REVISAR: …\]/);
  assert.match(WRITER_OUTPUT_RULE, /nos casos que as regras acima permitem/);
});

check("M03: vocabulário da casa uma vez em cada prompt efetivo de writer (completo, dedicados)", () => {
  const efetivos: Record<string, string> = {
    ABDOMEN_TOTAL: `${sys("ABDOMEN_TOTAL")}\n\n${WRITER_OUTPUT_RULE}`,
    OBSTETRICA: `${sys("OBSTETRICA")}\n\n${WRITER_OUTPUT_RULE}`,
    MAMARIA: `${sys("MAMARIA")}\n\n${WRITER_OUTPUT_RULE}`,
    PARTES_MOLES: `${buildPartesMolesWriterSystemMessage()}\n\n${WRITER_OUTPUT_RULE}`,
    MSK: `${buildMskWriterSystemMessage({})}\n\n${WRITER_OUTPUT_RULE}`,
    PELVE: `${buildPelveWriterSystemMessage()}\n\n${WRITER_OUTPUT_RULE}`,
  };
  for (const [k, t] of Object.entries(efetivos)) {
    assert.equal(conta(t, "Vocabulário da casa: hipoecoico, hiperecoico, anecoico e isoecoico"), 1, k);
    assert.doesNotMatch(t.replace(WRITER_OUTPUT_RULE, ""), /\b(hipo|hiper|an)ecog[êe]nic[oa]s?\b/i, `${k}: adjetivo -ecogênico no prompt`);
  }
});

check("B01: overlay detalhado não manda fechar estrutura com normalidade", () => {
  const o = getStyleOverlay("DETALHADO_PROTOCOLAR" as never) ?? "";
  assert.doesNotMatch(o, /nota explícita do estado|dentro dos limites normais/);
  assert.match(o, /sem repetir a normalidade nem acrescentá-la à estrutura alterada/);
});

console.log(`\nW14 (W10b): ${ok} verificações passaram.`);
