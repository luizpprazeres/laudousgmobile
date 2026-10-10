/**
 * "Calcule o volume" ditado na tireoide (decisão do Luiz, 10/10/2026, rodada 2) — sintético, sem LLM.
 * Com o pedido: lobo/istmo com 3 eixos e sem volume ditado recebe C x L x AP x 0,52 (uma casa) e entra no VT.
 * Sem o pedido: nada é calculado (fica "____", como antes).
 * Rodar: pnpm exec tsx src/server/renderer/__tests__/tireoide-calcule-volume.manual.ts
 */
import assert from "node:assert/strict";
import { F as T, L } from "./tireoide-objetivo-fixtures";
import { pedeCalculoDeVolume, renderTireoide } from "../categories/TIREOIDE";
import { getCategoryContract } from "../../prompts/contracts";
import { TIREOIDE_EXTRACTION_PROMPT } from "../categories/TIREOIDE";

let total = 0;
function test(name: string, fn: () => void) {
  fn();
  total++;
  console.log(`✓ ${name}`);
}

// O exemplo da decisão: lobos com volume ditado, istmo só com as medidas, e o pedido.
const DITADO =
  "Ultrassonografia da tireoide. Lobo direito medindo 3,6 x 1,4 x 1,3 com volume de 3.6, lobo esquerdo medindo 3,9 x 1,1 x 1,3 com volume de 2.8, istmo medindo 0,7 x 0,2 x 1,6, calcule o volume.";
const achados = (istmoVol: number | null = null) =>
  T({
    lobo_direito: L({ medidas_cm: [3.6, 1.4, 1.3], volume_ml: 3.6 }),
    lobo_esquerdo: L({ medidas_cm: [3.9, 1.1, 1.3], volume_ml: 2.8 }),
    istmo: L({ medidas_cm: [0.7, 0.2, 1.6], volume_ml: istmoVol }),
  });

// ── Detector do pedido ──
test("detector: variações do pedido contam", () => {
  for (const t of ["calcule o volume", "Calcular o volume do istmo", "calcula o volume", "calcule os volumes", "calcule volume", "com volume calculado", "faça o cálculo do volume"])
    assert.ok(pedeCalculoDeVolume(`istmo medindo 1 x 1 x 1, ${t}.`), t);
});
test("detector: sem pedido, negação ou só 'volume' não contam", () => {
  for (const t of ["istmo medindo 1 x 1 x 1.", "não calcule o volume", "sem calcular o volume", "volume de 3,6", "calcificações grosseiras", "", undefined])
    assert.ok(!pedeCalculoDeVolume(t as string), String(t));
});

// ── Positivos ──
test("com pedido: istmo recebe C x L x AP x 0,52 e o VT soma lobos + istmo", () => {
  const out = renderTireoide(achados(), undefined, { rawInput: DITADO });
  // 0,7 x 0,2 x 1,6 x 0,52 = 0,116 → 0,1 ml; VT = 3,6 + 2,8 + 0,1 = 6,5 ml (o que o médico escreveu no 42fbb3eb).
  assert.match(out, /Istmo medindo 0,7 x 0,2 x 1,6 cm \(volume de 0,1 ml\)/);
  assert.match(out, /Tireoide de volume normal \(6,5 ml\)/);
});
test("com pedido: lobo sem volume ditado também é calculado, com uma casa decimal", () => {
  const f = T({ lobo_direito: L({ medidas_cm: [4.2, 1.5, 1.1], volume_ml: null }), lobo_esquerdo: L({ medidas_cm: [3.9, 1.1, 1.3], volume_ml: 2.8 }), istmo: L({ medidas_cm: [1.2, 0.2, 1.5], volume_ml: 0.3 }) });
  const out = renderTireoide(f, undefined, { rawInput: "lobo direito medindo 4,2 x 1,5 x 1,1, lobo esquerdo 3,9 x 1,1 x 1,3 com volume de 2,8, istmo 1,2 x 0,2 x 1,5 com volume de 0,3, calcule o volume do lobo direito" });
  // 4,2 x 1,5 x 1,1 x 0,52 = 3,6036 → 3,6; VT = 3,6 + 2,8 + 0,3 = 6,7
  assert.match(out, /Lobo direito medindo 4,2 x 1,5 x 1,1 cm \(volume de 3,6 ml\)/);
  assert.match(out, /Tireoide de volume normal \(6,7 ml\)/);
});
test("com pedido: estilo objetivo também calcula e soma", () => {
  const out = renderTireoide(achados(), undefined, { objetivo: true, rawInput: DITADO });
  assert.match(out, /Istmo: 0,7 x 0,2 x 1,6 cm \(volume de 0,1 ml\)/);
  assert.match(out, /6,5 ml/);
});
test("com pedido: volume que o extrator calculou por conta própria (fora do ditado) é refeito pela fórmula", () => {
  const out = renderTireoide(achados(0.12), undefined, { rawInput: DITADO });
  assert.match(out, /Istmo medindo 0,7 x 0,2 x 1,6 cm \(volume de 0,1 ml\)/);
  assert.match(out, /\(6,5 ml\)/);
});

// ── Negativos ──
test("sem pedido: istmo sem volume continua '____' e o VT em aberto", () => {
  const out = renderTireoide(achados(), undefined, { rawInput: DITADO.replace(", calcule o volume", "") });
  assert.match(out, /Istmo medindo 0,7 x 0,2 x 1,6 cm \(volume de ____ ml\)/);
  assert.match(out, /Tireoide de volume normal \(____ ml\)/);
  assert.doesNotMatch(out, /volume de 0,1 ml/);
});
test("sem ditado (catálogo, replay antigo): nada é calculado", () => {
  const out = renderTireoide(achados());
  assert.match(out, /\(volume de ____ ml\)/);
});
test("negação: 'não calcule o volume' não calcula", () => {
  const out = renderTireoide(achados(), undefined, { rawInput: DITADO.replace("calcule o volume", "não calcule o volume") });
  assert.match(out, /Istmo medindo 0,7 x 0,2 x 1,6 cm \(volume de ____ ml\)/);
});
test("com pedido: volume ditado nunca é trocado pelo calculado", () => {
  // Pela fórmula o lobo direito daria 3,4 (3,6 x 1,4 x 1,3 x 0,52 = 3,407); o ditado (3.6) vence.
  const out = renderTireoide(achados(0.4), undefined, { rawInput: DITADO.replace("istmo medindo 0,7 x 0,2 x 1,6", "istmo medindo 0,7 x 0,2 x 1,6 com volume de 0,4") });
  assert.match(out, /Lobo direito medindo 3,6 x 1,4 x 1,3 cm \(volume de 3,6 ml\)/);
  assert.match(out, /Istmo medindo 0,7 x 0,2 x 1,6 cm \(volume de 0,4 ml\)/);
  assert.match(out, /\(6,8 ml\)/);
});
test("com pedido: estrutura sem os 3 eixos não é calculada", () => {
  const f = T({ lobo_direito: L({ medidas_cm: [3.6, 1.4, 1.3], volume_ml: 3.6 }), lobo_esquerdo: L({ medidas_cm: [3.9, 1.1, 1.3], volume_ml: 2.8 }), istmo: L({ medidas_cm: [0.7, 0.2], volume_ml: null }) });
  const out = renderTireoide(f, undefined, { rawInput: DITADO });
  assert.match(out, /\(volume de ____ ml\)/);
  assert.match(out, /Tireoide de volume normal \(____ ml\)/);
});
test("com pedido, sem os 3 eixos: volume que o extrator inventou é descartado", () => {
  const f = T({ lobo_direito: L({ medidas_cm: [3.6, 1.4, 1.3], volume_ml: 3.6 }), lobo_esquerdo: L({ medidas_cm: [3.9, 1.1, 1.3], volume_ml: 2.8 }), istmo: L({ medidas_cm: null, volume_ml: 0.5 }) });
  const out = renderTireoide(f, undefined, { rawInput: DITADO });
  assert.doesNotMatch(out, /volume de 0,5 ml/);
});

// ── Prompts ──
test("prompts: extrator não calcula; contrato documenta a fórmula", () => {
  assert.match(TIREOIDE_EXTRACTION_PROMPT, /nunca calcule, nem com "calcule o volume"/);
  assert.match(getCategoryContract("TIREOIDE", "CLASSICO_COMPLETO") ?? "", /salvo "calcule o volume" ditado: C x L x AP x 0,52, uma casa decimal, somado ao VT/);
});

console.log(`\n${total} verificações de "calcule o volume" passaram.`);
