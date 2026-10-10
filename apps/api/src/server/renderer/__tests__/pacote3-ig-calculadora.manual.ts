/** IG de hoje ditada × linha da calculadora do app.
 * PACOTE3 (10/10): em e1f15cab/e5dfd891 a 1ª US ditada com data, projetada até o exame, e a calculadora
 * concordam (32s6d, 26s2d); o "hoje com" ditado (30s6d, 20s2d) é que diverge.
 * Decisão do Luiz (DECISOES-LUIZ-2026-10-10.md, IG): nesse caso SEGUE A CALCULADORA e o aviso no card fica.
 * Sem a confirmação da 1ª US datada, o ditado continua valendo, com aviso.
 * Rodar em apps/api: pnpm exec tsx src/server/renderer/__tests__/pacote3-ig-calculadora.manual.ts
 * Fixtures sintéticas; sem banco, rede ou LLM.
 */
import assert from "node:assert/strict";
import { computeRHoje, reconciliarIgDitadaXCalculadora } from "../ig";
import {
  MORFOLOGICO_JSON_SCHEMA,
  MorfologicoFindingsSchema,
  renderMorfologico,
  type MorfologicoFindings,
} from "../categories/MORFOLOGICO";

let n = 0;
const ok = (nome: string) => { console.log(`✓ ${nome}`); n++; };

type Campos = Parameters<typeof reconciliarIgDitadaXCalculadora>[0];
const campos = (over: Partial<Campos>): Campos => ({
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
  ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null, referencia_fonte: null, ...over,
});
const calc = (v: string) => `Biometria fetal:\nIG pela ultrassonografia precoce: ${v}\nIG pela biometria: 31s6d`;

// A projeção da data está certa (não é defeito de parse): dd/mm, ano e dias decorridos.
const proj = (data: string, s: number, d: number, exame: string) =>
  computeRHoje({ fonte: "usg_precoce", data, igNaDataSemanas: s, igNaDataDias: d, rHojeSemanas: null, rHojeDias: null }, exame);
assert.deepEqual(proj("30/03/2026", 8, 5, "15/09/2026"), { semanas: 32, dias: 6 }, "e1f15cab: = calculadora");
assert.deepEqual(proj("15/07/2026", 15, 2, "30/09/2026"), { semanas: 26, dias: 2 }, "e5dfd891: = calculadora");
ok("projeção da 1ª US com data bate com a calculadora nos dois casos");

// ── Decisão do Luiz: segue a calculadora ────────────────────────────────────
const e1 = campos({ primeira_us_data: "30/03/2026", primeira_us_ig_semanas: 8, primeira_us_ig_dias: 5, ig_referencia_hoje_semanas: 30, ig_referencia_hoje_dias: 6 });
const r1 = reconciliarIgDitadaXCalculadora(e1, calc("32s6d"), "15/09/2026");
assert.equal(r1.findings.ig_referencia_hoje_semanas, 32);
assert.equal(r1.findings.ig_referencia_hoje_dias, 6);
assert.ok(r1.aviso?.includes("30 semanas e 6 dias") && r1.aviso.includes("32 semanas e 6 dias") && r1.aviso.includes("segue a calculadora"), String(r1.aviso));
const e5 = campos({ primeira_us_data: "15/07/2026", primeira_us_ig_semanas: 15, primeira_us_ig_dias: 2, ig_referencia_hoje_semanas: 20, ig_referencia_hoje_dias: 2 });
const r5 = reconciliarIgDitadaXCalculadora(e5, calc("26s2d"), "30/09/2026");
assert.deepEqual([r5.findings.ig_referencia_hoje_semanas, r5.findings.ig_referencia_hoje_dias], [26, 2]);
assert.ok(r5.aviso?.includes("segue a calculadora"));
// data_exame ditada vence a data de geração na projeção.
const r1b = reconciliarIgDitadaXCalculadora({ ...e1, data_exame: "15/09/2026" }, calc("32s6d"), "10/10/2026");
assert.equal(r1b.findings.ig_referencia_hoje_semanas, 32, "data do exame ditada");
// Gerado 1 dia depois do exame: dentro da tolerância.
assert.equal(reconciliarIgDitadaXCalculadora(e1, calc("32s6d"), "16/09/2026").findings.ig_referencia_hoje_semanas, 32);
ok("'hoje com' ditado × 1ª US + calculadora concordantes: segue a calculadora, com aviso (e1f15cab, e5dfd891)");

// O laudo inteiro segue a calculadora (corpo e conclusão).
function morfo(over: Record<string, unknown>): MorfologicoFindings {
  const shape = MorfologicoFindingsSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
  const base: Record<string, unknown> = {};
  for (const k of MORFOLOGICO_JSON_SCHEMA.required) if (shape[k]?.safeParse(null).success) base[k] = null;
  return MorfologicoFindingsSchema.parse({ ...base, ...over });
}
const m = morfo({ trimestre: "3t", ig_semanas: 31, ig_dias: 6, data_exame: "15/09/2026", primeira_us_data: "30/03/2026", primeira_us_ig_semanas: 8, primeira_us_ig_dias: 5, ig_referencia_hoje_semanas: 30, ig_referencia_hoje_dias: 6 });
const antes = renderMorfologico(m, null, { igCorrection: true });
assert.ok(antes.includes("Hoje com 30 semanas e 6 dias"), "sem a decisão o lapso entra no laudo");
const depois = renderMorfologico(reconciliarIgDitadaXCalculadora(m, calc("32s6d")).findings, null, { igCorrection: true });
assert.ok(depois.includes("Primeira ultrassonografia realizada em 30/03/2026 com 8 semanas e 5 dias. Hoje com 32 semanas e 6 dias."), depois);
assert.ok(depois.includes("Gestação em torno de 32 semanas e 6 dias, corrigida pela ultrassonografia precoce."), depois);
assert.ok(!depois.includes("30 semanas e 6 dias"));
ok("laudo: corpo e conclusão com a IG da calculadora");

// ── Sem a confirmação da 1ª US: o ditado vale, com aviso ────────────────────
const semData = campos({ ig_referencia_hoje_semanas: 30, ig_referencia_hoje_dias: 6 });
const s1 = reconciliarIgDitadaXCalculadora(semData, calc("32s6d"), "15/09/2026");
assert.deepEqual(s1.findings, semData, "sem 1ª US datada: não decide");
assert.ok(s1.aviso?.includes("o laudo usa a ditada"));
const s2 = reconciliarIgDitadaXCalculadora(e1, calc("32s6d"), "10/10/2026");
assert.deepEqual(s2.findings, e1, "projeção discorda da calculadora (data de geração 25 dias depois): não decide");
assert.ok(s2.aviso?.includes("o laudo usa a ditada"));
const s3 = reconciliarIgDitadaXCalculadora({ ...e1, primeira_us_ig_semanas: 6 }, calc("32s6d"), "15/09/2026");
assert.deepEqual(s3.findings.ig_referencia_hoje_semanas, 30, "1ª US ditada discorda da calculadora: não decide");
ok("sem a confirmação da 1ª US datada: o ditado vale, com aviso");

// ── Fora do alvo: nada muda, nenhum aviso ───────────────────────────────────
const igual = { ...e1, ig_referencia_hoje_semanas: 32, ig_referencia_hoje_dias: 6 };
assert.deepEqual(reconciliarIgDitadaXCalculadora(igual, calc("32s6d"), "15/09/2026"), { findings: igual, aviso: null });
const perto = { ...e1, ig_referencia_hoje_semanas: 32, ig_referencia_hoje_dias: 3 };
assert.deepEqual(reconciliarIgDitadaXCalculadora(perto, calc("32s6d"), "15/09/2026"), { findings: perto, aviso: null }, "≤ 3 dias");
assert.ok(reconciliarIgDitadaXCalculadora({ ...e1, ig_referencia_hoje_semanas: 32, ig_referencia_hoje_dias: 2 }, calc("32s6d"), "15/09/2026").aviso, "4 dias já conta");
const semRef = { ...e1, ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null };
assert.deepEqual(reconciliarIgDitadaXCalculadora(semRef, calc("32s6d"), "15/09/2026"), { findings: semRef, aviso: null }, "sem 'hoje com' ditado");
assert.deepEqual(reconciliarIgDitadaXCalculadora(e1, "Primeira US 30/03/2026 com 8 semanas e 5 dias.", "15/09/2026"), { findings: e1, aviso: null }, "sem calculadora");
assert.deepEqual(reconciliarIgDitadaXCalculadora(e1, `${calc("32s6d")}\nIG pela ultrassonografia precoce: 30s6d`, "15/09/2026"), { findings: e1, aviso: null }, "calculadora ambígua");
ok("fora do alvo nada muda e nada é avisado");

console.log(`${n} blocos verificados`);
