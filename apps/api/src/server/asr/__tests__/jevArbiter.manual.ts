import assert from "node:assert/strict";
import { arbitrate, detectCandidates } from "../jevArbiter";
import type { askJev } from "../../ai/jev";

const kinds = (t: string, cat = "MAMARIA") => detectCandidates(t, cat).map((c) => `${c.kind}:${c.original}`);

// ── detecção (sem rede) ──
assert.deepEqual(kinds("Mama à esquerda C e nódulos. 2 linfonodos axilares."), ["negacao:C e"]);
assert.deepEqual(kinds("Líquido amniótico normal, cioligoâmnio.", "OBSTETRICA"), ["negacao:cioligoâmnio"]);
assert.ok(kinds("cálculo de 1,2 cm. 6 sinais de colecistite.", "ABDOMEN_TOTAL").includes("negacao:6"));
assert.ok(kinds("pico sistólico de 6 e 20 cm/s", "DOPPLER_CAROTIDAS").includes("centena:6 e 20"));
assert.ok(kinds("sem sombra acústica, BERADS 4 a.").includes("escala:BERADS"));
assert.ok(kinds("cisto de Baker na fossa apoplítea", "MUSCULOESQUELETICO_V2").includes("grafia:apoplítea"));
// comando de ditado nunca vira candidata de grafia (o caso real "acrescente" → "ausente")
assert.ok(!kinds("Acrescente na conclusão cisto simples", "ABDOMEN_TOTAL").some((k) => /crescente|onclus/i.test(k)));
// texto correto não gera candidato de negação/centena/escala
assert.deepEqual(kinds("Mama esquerda sem nódulos. Sem sombra acústica. BI-RADS 2.").filter((k) => !k.startsWith("grafia")), []);
// lateralidade e negação nunca viram candidatas de grafia
assert.ok(!kinds("Rim direito e esquerdo sem alterações", "ABDOMEN_TOTAL").some((k) => /direito|esquerdo|sem/.test(k)));

// ── política (Jev simulada) ──
const fake = (escolhas: Record<string, [string, number]>): typeof askJev => async (_s, qs) => ({
  ms: 1, inputTokens: 10,
  answers: Object.fromEntries(Object.keys(qs).map((id, i) => {
    const e = Object.values(escolhas)[i] ?? ["manter", 1];
    return [id, { type: "choice" as const, choice: e[0], confidence: e[1] }];
  })),
});
(async () => {
  // lixo + confiança alta → troca sozinha
  let r = await arbitrate("Mama esquerda C e nódulos.", "MAMARIA", { mode: "auto", ask: fake({ a: ["o0", 0.84] }) });
  assert.equal(r.text, "Mama esquerda sem nódulos.");
  assert.equal(r.suggestions[0]!.automatic, true);
  // lixo + confiança média → só sugere
  r = await arbitrate("Mama esquerda C e nódulos.", "MAMARIA", { mode: "auto", ask: fake({ a: ["o0", 0.7] }) });
  assert.equal(r.text, "Mama esquerda C e nódulos.");
  assert.equal(r.suggestions[0]!.automatic, false);
  // número legítimo → nunca troca sozinho, mesmo com confiança 0,99
  r = await arbitrate("cálculo de 1,2 cm. 6 sinais de colecistite.", "ABDOMEN_TOTAL", { mode: "auto", ask: async (_s, qs) => ({ ms: 1, inputTokens: 1, answers: Object.fromEntries(Object.entries(qs).map(([id, q]) => [id, { type: "choice" as const, choice: q.instructions.includes("⟦6⟧") ? "o0" : "manter", confidence: 0.99 }])) }) });
  assert.ok(r.text.includes("6 sinais"));
  assert.ok(r.suggestions.some((s) => s.kind === "negacao" && s.replacement === "sem" && !s.automatic));
  // centena → só sugere
  r = await arbitrate("pico de 6 e 20 cm/s", "DOPPLER_CAROTIDAS", { mode: "auto", ask: async (_s, qs) => ({ ms: 1, inputTokens: 1, answers: Object.fromEntries(Object.keys(qs).map((id) => [id, { type: "choice" as const, choice: "o0", confidence: 0.95 }])) }) });
  assert.ok(r.text.includes("6 e 20"));
  assert.ok(r.suggestions.some((s) => s.kind === "centena" && s.replacement === "120"));
  // grafia que vira negação/lado: nunca automática, mesmo com confiança alta
  r = await arbitrate("lesão apoplítea", "MUSCULOESQUELETICO_V2", { mode: "auto", ask: async (_s, qs) => ({ ms: 1, inputTokens: 1, answers: Object.fromEntries(Object.keys(qs).map((id) => [id, { type: "choice" as const, choice: "o0", confidence: 0.99 }])) }) });
  assert.ok(r.suggestions.every((s) => s.replacement !== "ausente" || !s.automatic));
  // reparos de formato voltam como trocas automáticas no texto original
  r = await arbitrate("Útero medindo 37.4, por 31.4, por 25.3 centímetros, mais de 50 por 100 intramural.", "PELVE_FEMININA", { mode: "auto", ask: async () => null });
  assert.equal(r.text, "Útero medindo 37,4 x 31,4 x 25,3 cm, mais de 50% intramural.");
  assert.ok(r.suggestions.every((s) => s.kind !== "formato" || s.automatic));
  // lado virou número: só sugestão
  assert.ok(kinds("ovário direito medindo 2,4 x 1,7 cm, ovários 15 medindo 3,4 x 2,1 cm", "PELVE_FEMININA").includes("lado:ovários 15"));
  r = await arbitrate("ovário direito medindo 2,4 cm, ovários 15 medindo 3,4 cm", "PELVE_FEMININA", { mode: "auto", ask: async (_s, qs) => ({ ms: 1, inputTokens: 1, answers: Object.fromEntries(Object.keys(qs).map((id) => [id, { type: "choice" as const, choice: "o0", confidence: 0.99 }])) }) });
  assert.ok(r.text.includes("ovários 15"));
  assert.ok(r.suggestions.some((s) => s.kind === "lado" && s.replacement === "ovário esquerdo" && !s.automatic));
  // medida fundida → aviso sem troca, mesmo sem Jev
  r = await arbitrate("útero medindo 7.34 0,1 x 5,2", "PELVE_FEMININA", { mode: "suggest", ask: async () => null });
  assert.deepEqual(r.suggestions.map((s) => [s.kind, s.replacement]), [["medida", null]]);
  // Jev fora do ar → texto intacto
  r = await arbitrate("Mama esquerda C e nódulos.", "MAMARIA", { mode: "auto", ask: async () => null });
  assert.equal(r.text, "Mama esquerda C e nódulos.");
  // identificador no trecho → a pergunta nem sai
  let enviado = "";
  await arbitrate("Paciente: Fulana de Tal. Mama esquerda C e nódulos. CPF 123.456.789-00", "MAMARIA", { mode: "auto", ask: async (_s, qs) => { enviado = JSON.stringify(qs); return null; } });
  assert.ok(enviado.includes("⟦C e⟧"), "o trecho marcado continua na pergunta");
  assert.ok(!/Fulana|123\.456/.test(enviado), "nome e CPF não saem");
  console.log("jevArbiter: ok");
})();
