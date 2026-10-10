/** PACOTE2 (10/10): (1) IG de hoje da calculadora ("IG pela ultrassonografia precoce: 23s3d") posta
 * pela extração em primeira_us_ig sem data não some; (2) item livre igual a item fixo não sai duas
 * vezes na conclusão do morfológico.
 * Rodar em apps/api: pnpm exec tsx src/server/renderer/__tests__/pacote2-ig-dedup.manual.ts
 * Fixtures sintéticas; sem banco, rede ou LLM.
 */
import assert from "node:assert/strict";
import {
  MORFOLOGICO_JSON_SCHEMA,
  MorfologicoFindingsSchema,
  dedupItensLivres,
  normalizarExtracaoMorfologico,
  renderMorfologico,
  type MorfologicoFindings,
} from "../categories/MORFOLOGICO";
import { parseIgUsPrecoceCalculadora, reconciliarIgUsPrecoce } from "../ig";

function vazio(over: Record<string, unknown>): MorfologicoFindings {
  const shape = MorfologicoFindingsSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
  const base: Record<string, unknown> = {};
  for (const k of MORFOLOGICO_JSON_SCHEMA.required) if (shape[k]?.safeParse(null).success) base[k] = null;
  return MorfologicoFindingsSchema.parse({ ...base, ...over });
}
let n = 0;
const ok = (nome: string) => { console.log(`✓ ${nome}`); n++; };

// ── (1) IG da US precoce sem data ───────────────────────────────────────────
const ditado = `Feto único, cefálico. Peso fetal estimado: 629.57 g
IG pela ultrassonografia precoce: 23s3d
IG pela biometria: 23s0d`;
assert.deepEqual(parseIgUsPrecoceCalculadora(ditado), { semanas: 23, dias: 3 });
assert.deepEqual(parseIgUsPrecoceCalculadora("IG pela Ultrassonografia precoce : 39s"), { semanas: 39, dias: 0 });
assert.equal(parseIgUsPrecoceCalculadora("IG pela ultrassonografia precoce: 23s3d\nIG pela ultrassonografia precoce: 25s"), null, "duas linhas diferentes: ambíguo");
assert.equal(parseIgUsPrecoceCalculadora("Primeira ultrassonografia com 8 semanas."), null);
ok("linha da calculadora lida (formato de máquina)");

const errado = { primeira_us_data: null, primeira_us_ig_semanas: 23, primeira_us_ig_dias: 3, ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null, referencia_fonte: null };
assert.deepEqual(reconciliarIgUsPrecoce(errado, ditado), {
  primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
  ig_referencia_hoje_semanas: 23, ig_referencia_hoje_dias: 3, referencia_fonte: "usg_precoce",
});
ok("IG de hoje posta em primeira_us_ig sem data vira a referência de hoje (formato da obstétrica e do morfológico)");

const morfo = vazio({ trimestre: "2t", ig_semanas: 23, ig_dias: 0, primeira_us_ig_semanas: 23, primeira_us_ig_dias: 3 });
assert.ok(!/23 semanas e 3 dias/.test(renderMorfologico(morfo, null, { igCorrection: true })), "sem a correção o defeito reproduz");
for (const objetivo of [false, true]) {
  const t = renderMorfologico(normalizarExtracaoMorfologico(morfo, ditado), null, { igCorrection: true, objetivo });
  assert.ok(t.includes("Gestação em torno de 23 semanas e 3 dias, corrigida pela ultrassonografia precoce."), `${objetivo ? "Objetivo" : "Clássico"}: conclusão da W5`);
  assert.ok(!/realizada em \d|\d{2}\/\d{2}\/\d{4}/.test(t), "nenhuma data inventada");
}
ok("morfológico: conclusão 'corrigida pela ultrassonografia precoce' sem data inventada (2 estilos)");

// Fora do alvo: nada muda.
const comRef = { ...errado, ig_referencia_hoje_semanas: 22, ig_referencia_hoje_dias: 6 };
assert.deepEqual(reconciliarIgUsPrecoce(comRef, ditado), comRef, "referência de hoje já extraída fica");
const comData = { ...errado, primeira_us_data: "16/06/2026", primeira_us_ig_semanas: 8, primeira_us_ig_dias: 2 };
assert.deepEqual(reconciliarIgUsPrecoce(comData, ditado), comData, "1ª US com data: o motor projeta, nada muda");
const genuina = { ...errado, primeira_us_ig_semanas: 8, primeira_us_ig_dias: 2 };
const g = reconciliarIgUsPrecoce(genuina, ditado);
assert.equal(g.primeira_us_ig_semanas, 8, "IG da 1ª US diferente da de hoje é mantida");
assert.equal(g.ig_referencia_hoje_semanas, 23);
assert.deepEqual(reconciliarIgUsPrecoce(errado, "IG pela biometria: 23s0d"), errado, "sem a linha da calculadora nada muda");
const dum = { ...errado, referencia_fonte: "dum" as const };
assert.equal(reconciliarIgUsPrecoce(dum, ditado).referencia_fonte, "dum", "fonte atribuída pelo médico não é trocada");
ok("fora do alvo nada muda");

// ── (2) item livre repetido na conclusão ────────────────────────────────────
assert.deepEqual(
  dedupItensLivres(["A.", "Colo uterino ecograficamente normal.", "B.", "Colo uterino ecograficamente normal"], ["B.", "Colo uterino ecograficamente normal"]),
  ["A.", "Colo uterino ecograficamente normal.", "B."], "livre igual a fixo (antes dele) sai; fixo fica");
assert.deepEqual(
  dedupItensLivres(["A.", "Morfologia normal.", "C.", "Colo normal."], ["Morfologia normal.", "C."]).length, 4,
  "sem duplicata nada sai");
assert.deepEqual(
  dedupItensLivres(["A.", "X.", "Colo uterino ecograficamente normal."], ["X.", "colo uterino  ecograficamente normal"]),
  ["A.", "X.", "Colo uterino ecograficamente normal."], "livre antes do fixo acrescentado depois: sai o livre");
assert.deepEqual(dedupItensLivres(["A.", "Gestação em torno de 20 semanas.", "Gestação em torno de 20 semanas e 5 dias."], ["Gestação em torno de 20 semanas e 5 dias."]).length, 3,
  "conteúdo diferente nunca sai");
assert.deepEqual(dedupItensLivres(["A.", "Y.", "Y."], ["Y.", "Y."]), ["A.", "Y."], "livre repetido entre si sai uma vez");
ok("dedup: só igualdade inequívoca, fixo preservado");

const normal2t = vazio({ trimestre: "2t", ig_semanas: 20, ig_dias: 5 });
const base = renderMorfologico(normal2t, null, {});
const fixo = "Morfologia fetal sem evidência de alteração detectável pelo método.";
assert.ok(base.includes(fixo), "pré-condição: item fixo do 2º tri");
for (const objetivo of [false, true]) {
  const t = renderMorfologico(vazio({ trimestre: "2t", ig_semanas: 20, ig_dias: 5, itens_conclusao_livres: [fixo, "Achado livre genuíno."] }), null, { objetivo });
  assert.equal(t.split(fixo).length - 1, 1, `${objetivo ? "Objetivo" : "Clássico"}: item fixo repetido`);
  assert.ok(t.includes("Achado livre genuíno."), "item livre genuíno fica");
}
ok("morfológico 2º tri: item normal copiado nos livres sai uma vez (2 estilos)");

console.log(`${n} blocos verificados`);
