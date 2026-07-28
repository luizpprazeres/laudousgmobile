import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeDumFormat,
  dedupeConclusionItems,
} from "../dumFormatGuard";

const P =
  "/private/tmp/claude-501/-Users-luizprazeres-laudousgmobile-def/83768434-1e5b-4631-8bc5-978481f2a0fd/scratchpad/laudos-100.json";
const arr: Array<{
  report_id: string;
  category_code: string;
  generated_output: string;
}> = JSON.parse(readFileSync(P, "utf8"));

const OBST = new Set(["OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO"]);

// Pipeline real: só família obstétrica; normalizeDumFormat depois dedupe.
function pipe(g: string): string {
  return dedupeConclusionItems(normalizeDumFormat(g));
}

const changed: string[] = [];
for (const r of arr) {
  if (!OBST.has(r.category_code)) continue;
  const g = r.generated_output ?? "";
  // idempotência do dedupe isolado
  const d1 = dedupeConclusionItems(g);
  assert.equal(dedupeConclusionItems(d1), d1, `dedupe não idempotente em ${r.report_id}`);
  const out = pipe(g);
  assert.equal(pipe(out), out, `pipeline não idempotente em ${r.report_id}`);
  if (dedupeConclusionItems(g) !== g) changed.push(r.report_id);
}
console.log(`obst com item de conclusão duplicado (dedupe isolado): ${changed.length}`);
console.log(changed.map((s) => s.slice(0, 8)).join(", "));

// Casos-alvo: líquido duplicado sai (contagem de ocorrências cai p/ 1).
for (const id of ["e9e44aec", "19e3816b"]) {
  const r = arr.find((x) => x.report_id.startsWith(id))!;
  const out = pipe(r.generated_output);
  const liq = (out.match(/L[íi]quido amni[óo]tico em quantidade aumentada \([^)]*\)\./gi) ?? [])
    .length;
  assert.ok(liq <= 1, `${id}: líquido ainda duplicado na conclusão (${liq}x)`);
}

// Não-alvo: laudos obst SEM duplicata ficam byte-idênticos ao dedupe.
for (const r of arr) {
  if (!OBST.has(r.category_code)) continue;
  if (changed.includes(r.report_id)) continue;
  assert.equal(
    dedupeConclusionItems(r.generated_output),
    r.generated_output,
    `dedupe alterou laudo sem duplicata: ${r.report_id}`,
  );
}

console.log("dedupeConclusionItems: TODOS OS ASSERTS PASS");
