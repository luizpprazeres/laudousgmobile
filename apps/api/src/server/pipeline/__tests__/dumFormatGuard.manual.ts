import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeDumFormat } from "../dumFormatGuard";

const P =
  "/private/tmp/claude-501/-Users-luizprazeres-laudousgmobile-def/83768434-1e5b-4631-8bc5-978481f2a0fd/scratchpad/laudos-100.json";
const raw = JSON.parse(readFileSync(P, "utf8"));
const arr: Array<{
  report_id: string;
  category_code: string;
  generated_output: string;
}> = Array.isArray(raw) ? raw : raw.laudos ?? raw.rows ?? [];

// --- 1. Idempotência + byte-identidade nos laudos SEM assinatura de defeito ---
const changed: string[] = [];
for (const r of arr) {
  const g = r.generated_output ?? "";
  const once = normalizeDumFormat(g);
  const twice = normalizeDumFormat(once);
  assert.equal(twice, once, `NÃO idempotente em ${r.report_id}`);
  if (once !== g) changed.push(r.report_id);
}
console.log(`laudos alterados: ${changed.length}/${arr.length}`);
console.log(changed.join(", "));

// --- 2. Nenhum efeito colateral fora das 4 assinaturas de defeito ---
// Todo laudo alterado DEVE conter pelo menos uma assinatura conhecida.
const SIGNATURES = [
  /Primeira ultrassonografia realizada\s+\d{2}\/\d{2}\/\d{4}\s+com\s+/i,
  /Data da [uú]ltima menstrua[çc][ãa]o correspondente a\s+.+?\s+na data do exame\./i,
  /\b1 dias\b/,
  /Gesta[çc][ãa]o em torno de\s+_+\s*semanas/i,
];
for (const id of changed) {
  const g = arr.find((r) => r.report_id === id)!.generated_output;
  assert.ok(
    SIGNATURES.some((re) => re.test(g)),
    `${id} mudou mas não tem assinatura de defeito conhecida (efeito colateral!)`,
  );
}

// --- 3. Correções pontuais nos casos reais ---
function gen(id: string): string {
  const r = arr.find((x) => x.report_id.startsWith(id));
  if (!r) return "";
  return normalizeDumFormat(r.generated_output);
}

// c0c85ac5: "Primeira ultrassonografia realizada 20/01/2026 com..." → canônica
const c0 = gen("c0c85ac5");
if (c0) {
  assert.ok(!/Primeira ultrassonografia realizada/i.test(c0), "c0: frase drift persiste");
  assert.ok(/Primeira USG:\s*20\/01\/2026,\s*com/i.test(c0), "c0: canônica ausente");
}

// 4d8d3cb5 / f541e337: linha fabricada de DUM → idade gestacional
for (const id of ["4d8d3cb5", "f541e337"]) {
  const t = gen(id);
  if (t) {
    assert.ok(
      !/Data da [uú]ltima menstrua[çc][ãa]o correspondente a/i.test(t),
      `${id}: linha fabricada de DUM persiste`,
    );
    assert.ok(/Idade gestacional de\s+37 semanas e 2 dias\./i.test(t), `${id}: IG ausente`);
  }
}

// e9e44aec / 19e3816b: placeholder de gestação removido da conclusão
for (const id of ["e9e44aec", "19e3816b"]) {
  const t = gen(id);
  if (t) {
    assert.ok(
      !/\d+\)\s*Gesta[çc][ãa]o em torno de\s+_+\s*semanas/i.test(t),
      `${id}: item placeholder de gestação persiste`,
    );
  }
}

console.log("dumFormatGuard: TODOS OS ASSERTS PASS");
