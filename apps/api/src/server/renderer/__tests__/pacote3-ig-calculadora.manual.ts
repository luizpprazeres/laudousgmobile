/** PACOTE3 (10/10): "hoje com X" ditado × linha da calculadora do app.
 * e1f15cab/e5dfd891: a 1ª US ditada com data, projetada até o exame, e a calculadora concordam
 * (32s6d, 26s2d); o "hoje com" ditado (30s6d, 20s2d) é que diverge e vence pela regra
 * "ditado direto vence" (computeRHoje). A precedência é decisão do Luiz e não muda: o código
 * só avisa no card de pendências.
 * Rodar em apps/api: pnpm exec tsx src/server/renderer/__tests__/pacote3-ig-calculadora.manual.ts
 * Fixtures sintéticas; sem banco, rede ou LLM.
 */
import assert from "node:assert/strict";
import { avisoIgDitadaXCalculadora, computeRHoje } from "../ig";

let n = 0;
const ok = (nome: string) => { console.log(`✓ ${nome}`); n++; };
const ref = (s: number | null, d: number | null) => ({ ig_referencia_hoje_semanas: s, ig_referencia_hoje_dias: d });

// A projeção da data está certa (não é defeito de parse): dd/mm, ano e dias decorridos.
const proj = (data: string, s: number, d: number, exame: string) =>
  computeRHoje({ fonte: "usg_precoce", data, igNaDataSemanas: s, igNaDataDias: d, rHojeSemanas: null, rHojeDias: null }, exame);
assert.deepEqual(proj("30/03/2026", 8, 5, "15/09/2026"), { semanas: 32, dias: 6 }, "e1f15cab: = calculadora");
assert.deepEqual(proj("15/07/2026", 15, 2, "30/09/2026"), { semanas: 26, dias: 2 }, "e5dfd891: = calculadora");
ok("projeção da 1ª US com data bate com a calculadora nos dois casos");

// O "hoje com" ditado vence a projeção (regra mantida).
assert.deepEqual(
  computeRHoje({ fonte: "usg_precoce", data: "15/07/2026", igNaDataSemanas: 15, igNaDataDias: 2, rHojeSemanas: 20, rHojeDias: 2 }, "30/09/2026"),
  { semanas: 20, dias: 2 },
);
ok("precedência inalterada: 'hoje com' ditado vence (decisão do Luiz)");

const calc = (v: string) => `Biometria fetal:\nIG pela ultrassonografia precoce: ${v}\nIG pela biometria: 24s5d`;
const a1 = avisoIgDitadaXCalculadora(ref(30, 6), calc("32s6d"));
assert.ok(a1 && a1.includes("30 semanas e 6 dias") && a1.includes("32 semanas e 6 dias"), String(a1));
const a2 = avisoIgDitadaXCalculadora(ref(20, 2), calc("26s2d"));
assert.ok(a2 && a2.includes("20 semanas e 2 dias") && a2.includes("26 semanas e 2 dias"), String(a2));
ok("divergência ditada × calculadora vira aviso (e1f15cab 14 dias, e5dfd891 42 dias)");

assert.equal(avisoIgDitadaXCalculadora(ref(32, 6), calc("32s6d")), null, "iguais");
assert.equal(avisoIgDitadaXCalculadora(ref(32, 3), calc("32s6d")), null, "até 3 dias: arredondamento de fala");
assert.ok(avisoIgDitadaXCalculadora(ref(32, 2), calc("32s6d")), "4 dias já avisa");
assert.equal(avisoIgDitadaXCalculadora(ref(null, null), calc("32s6d")), null, "sem 'hoje com' ditado");
assert.equal(avisoIgDitadaXCalculadora(ref(30, 6), "Primeira US 30/03/2026 com 8 semanas e 5 dias."), null, "sem linha da calculadora");
assert.equal(avisoIgDitadaXCalculadora(ref(30, 6), `${calc("32s6d")}\nIG pela ultrassonografia precoce: 30s6d`), null, "calculadora ambígua");
ok("fora do alvo nada é avisado");

console.log(`${n} blocos verificados`);
