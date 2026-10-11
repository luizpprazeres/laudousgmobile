/**
 * W16C — IG de referência DITADA preenche o que a extração deixou vazio.
 *
 * Os casos positivos reproduzem o formato dos ditados reais da bancada da W16A
 * (sintéticos, sem dado de paciente). Nunca sobrescreve: quando o extraído contradiz o
 * ditado, só sai um aviso.
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/renderer/__tests__/ig-referencia-ditada.manual.ts
 */
import assert from "node:assert/strict";
import {
  dataGeracaoSaoPaulo,
  definirRelogioDeGeracao,
  parseIgDumCalculadora,
  parseIgReferenciaHoje,
  preencherIgReferenciaDitada,
} from "../ig";

let ok = 0;
let falhas = 0;
function check(nome: string, fn: () => void) {
  try {
    fn();
    ok++;
    console.log(`✓ ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`✗ ${nome}\n  ${err instanceof Error ? err.message : String(err)}`);
  }
}

const vazio = {
  primeira_us_data: null as string | null,
  primeira_us_ig_semanas: null as number | null,
  primeira_us_ig_dias: null as number | null,
  ig_referencia_hoje_semanas: null as number | null,
  ig_referencia_hoje_dias: null as number | null,
  referencia_fonte: null as "usg_precoce" | "dum" | null,
  dum: null as string | null,
};

// ---------------- leitor ----------------
check("frase completa com 1ª US: 'hoje com 30 semanas e 4 dias' → 30s4d, fonte ultrassonografia", () => {
  assert.deepEqual(
    parseIgReferenciaHoje("Primeira ultrassonografia realizada 14/04/2026, com 6 semanas e 4 dias, hoje com 30 semanas e 4 dias."),
    { semanas: 30, dias: 4, fonte: "usg_precoce" },
  );
});
check("só semanas: 'hoje com 15 semanas' → 15s0d", () => {
  assert.deepEqual(parseIgReferenciaHoje("primeiro, realizada 27/07/2026, com 8 semanas e 5 dias, hoje com 15 semanas, Biometria fetal"), {
    semanas: 15,
    dias: 0,
    fonte: null,
  });
});
check("variantes de fala: 'hoje está com', 'atualmente com 20s5d', 'hoje, dia 12/09/2026, com', 'hoje 12/09 com'", () => {
  assert.equal(parseIgReferenciaHoje("hoje está com 22 semanas e 3 dias")?.semanas, 22);
  assert.deepEqual(parseIgReferenciaHoje("atualmente com 20s5d")?.dias, 5);
  assert.equal(parseIgReferenciaHoje("hoje, dia 12/09/2026, com 28 semanas.")?.semanas, 28);
  assert.equal(parseIgReferenciaHoje("hoje 12/09 com 28 semanas e 1 dia.")?.dias, 1);
  assert.equal(parseIgReferenciaHoje("hoje com 31 semanas, e 2 dias")?.dias, 2);
});
check("DUM no contexto → fonte dum", () => {
  assert.equal(parseIgReferenciaHoje("DUM 10/01/2026, hoje com 20 semanas e 1 dia.")?.fonte, "dum");
  assert.equal(parseIgReferenciaHoje("Pela última menstruação, hoje com 20 semanas.")?.fonte, "dum");
});
check("negativos: IG na data da 1ª US, biometria, negação, ambíguo, fora da faixa", () => {
  assert.equal(parseIgReferenciaHoje("na primeira US com 8 semanas e 2 dias"), null);
  assert.equal(parseIgReferenciaHoje("ultrassonografia realizada em 14/04/2026 com 6 semanas"), null);
  assert.equal(parseIgReferenciaHoje("hoje com 28 semanas pela biometria."), null);
  assert.equal(parseIgReferenciaHoje("biometria compatível, hoje com 28 semanas."), null);
  assert.equal(parseIgReferenciaHoje("não sabe se hoje com 20 semanas."), null);
  assert.equal(parseIgReferenciaHoje("hoje ela não está com 20 semanas."), null);
  assert.equal(parseIgReferenciaHoje("hoje com 20 semanas. Corrigindo: hoje com 22 semanas."), null, "dois valores = ambíguo");
  assert.equal(parseIgReferenciaHoje("hoje com 2 semanas"), null);
  assert.equal(parseIgReferenciaHoje("IG pela biometria: 30s4d"), null);
  assert.equal(parseIgReferenciaHoje("hoje com 30 semanas e 4 dias. Hoje com 30 semanas e 4 dias.")?.semanas, 30, "o mesmo valor repetido vale");
});
check("calculadora DUM", () => {
  assert.deepEqual(parseIgDumCalculadora("IG pela DUM: 30s4d\nIG pela biometria: 30s4d"), { semanas: 30, dias: 4 });
  assert.equal(parseIgDumCalculadora("IG pela DUM: 30s4d\nIG pela DUM: 31s"), null);
});

// ---------------- preenchimento ----------------
check("preenche o vazio pela frase ditada (461296ff: a projeção dava 32s1d)", () => {
  const f = { ...vazio, primeira_us_data: "14/04/2026", primeira_us_ig_semanas: 6, primeira_us_ig_dias: 4 };
  const r = preencherIgReferenciaDitada(f, "Primeira ultrassonografia realizada 14/04/2026, com 6 semanas e 4 dias, hoje com 30 semanas e 4 dias.\nIG pela DUM: 30s4d");
  assert.equal(r.findings.ig_referencia_hoje_semanas, 30);
  assert.equal(r.findings.ig_referencia_hoje_dias, 4);
  assert.equal(r.findings.referencia_fonte, "usg_precoce");
  assert.equal(r.aviso, null);
});
check("preenche pela calculadora da 1ª US mesmo com a data da 1ª US extraída (8af4d1cb)", () => {
  const f = { ...vazio, primeira_us_data: "25/07/2026", primeira_us_ig_semanas: 10, primeira_us_ig_dias: 0 };
  const r = preencherIgReferenciaDitada(f, "IG pela ultrassonografia precoce: 19s4d\nIG pela biometria: 19s4d");
  assert.deepEqual([r.findings.ig_referencia_hoje_semanas, r.findings.ig_referencia_hoje_dias, r.findings.referencia_fonte], [19, 4, "usg_precoce"]);
});
check("calculadora da DUM só quando a referência é a DUM", () => {
  const r = preencherIgReferenciaDitada({ ...vazio, dum: "01/01/2026" }, "IG pela DUM: 30s4d");
  assert.deepEqual([r.findings.ig_referencia_hoje_semanas, r.findings.referencia_fonte], [30, "dum"]);
  const comUs = preencherIgReferenciaDitada({ ...vazio, primeira_us_data: "01/03/2026", primeira_us_ig_semanas: 8 }, "IG pela DUM: 30s4d");
  assert.equal(comUs.findings.ig_referencia_hoje_semanas, null, "1ª US presente: a linha da DUM não vira referência");
  const ambos = preencherIgReferenciaDitada(vazio, "IG pela DUM: 30s4d\nIG pela ultrassonografia precoce: 29s");
  assert.equal(ambos.findings.ig_referencia_hoje_semanas, 29, "sem dado da 1ª US mas com a linha dela: 1ª US vence DUM");
  const dumExplicita = preencherIgReferenciaDitada({ ...vazio, referencia_fonte: "dum" }, "IG pela DUM: 30s4d\nIG pela ultrassonografia precoce: 29s");
  assert.equal(dumExplicita.findings.ig_referencia_hoje_semanas, 30, "fonte explícita do médico manda");
});
check("nunca sobrescreve: extraído diferente do ditado → só aviso (89d87fca)", () => {
  const f = { ...vazio, ig_referencia_hoje_semanas: 15, ig_referencia_hoje_dias: 5, referencia_fonte: "usg_precoce" as const };
  const r = preencherIgReferenciaDitada(f, "realizada 27/07/2026, com 8 semanas e 5 dias, hoje com 15 semanas,");
  assert.equal(r.findings, f);
  assert.match(r.aviso ?? "", /IG de hoje ditada \(15 semanas\) difere da usada no laudo \(15 semanas e 5 dias\)/);
});
check("extraído igual ao ditado: nada muda, sem aviso", () => {
  const f = { ...vazio, ig_referencia_hoje_semanas: 30, ig_referencia_hoje_dias: 4 };
  const r = preencherIgReferenciaDitada(f, "hoje com 30 semanas e 4 dias");
  assert.equal(r.findings, f);
  assert.equal(r.aviso, null);
});
check("fonte explícita do extrator não é trocada pelo contexto", () => {
  const r = preencherIgReferenciaDitada({ ...vazio, referencia_fonte: "dum" }, "primeira ultrassonografia, hoje com 20 semanas");
  assert.equal(r.findings.referencia_fonte, "dum");
  assert.equal(r.findings.ig_referencia_hoje_semanas, 20);
});
check("sem nada ditado: o objeto volta intacto", () => {
  const r = preencherIgReferenciaDitada(vazio, "Feto único, cefálico. IG pela biometria: 22s1d.");
  assert.equal(r.findings, vazio);
  assert.equal(r.aviso, null);
});

// ---------------- relógio de geração (bancada) ----------------
check("relógio de geração: a bancada gera na data do caso; null volta ao relógio", () => {
  definirRelogioDeGeracao(() => new Date("2026-09-14T15:00:00Z"));
  assert.equal(dataGeracaoSaoPaulo(), "14/09/2026");
  definirRelogioDeGeracao(() => undefined);
  assert.equal(dataGeracaoSaoPaulo(), dataGeracaoSaoPaulo(new Date()));
  definirRelogioDeGeracao(null);
  assert.equal(dataGeracaoSaoPaulo(new Date("2026-01-02T12:00:00Z")), "02/01/2026");
});

console.log(`\nig-referencia-ditada: ${ok}/${ok + falhas}`);
process.exit(falhas ? 1 : 0);
