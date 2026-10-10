import assert from "node:assert/strict";
import { buildSystemMessage } from "../buildSystemMessage";
import {
  GLOBAL_RULES_BLOCK,
  WRITER_HARDENING_BLOCK,
} from "../global";

const baseArgs = {
  categoryCode: "ABDOMEN_TOTAL",
  categoryLabel: "Abdome Total",
  writingStyleCode: "CLASSICO_COMPLETO" as const,
  ragBlocks: [],
};

const absent = buildSystemMessage(baseArgs);
const explicitlyOff = buildSystemMessage({ ...baseArgs, hardening: false });
const enabled = buildSystemMessage({ ...baseArgs, hardening: true });

assert.equal(absent, explicitlyOff, "OFF explícito deve ser byte-idêntico ao ausente");
// O gate antigo fixava o SHA-256 do system inteiro do abdome (baseline de
// 12/08): qualquer mudança LEGÍTIMA de prompt o quebrava — já falhava em
// origin/main (09/10). O que ele protegia é estrutural: com a flag desligada o
// system é o de sempre, e ligada ela só acrescenta o bloco, sem tocar no resto.
assert.equal(
  enabled.replace(`\n\n${WRITER_HARDENING_BLOCK}`, ""),
  absent,
  "ON deve ser exatamente OFF + o bloco de reforço (nada mais muda)",
);
assert.ok(!absent.includes(WRITER_HARDENING_BLOCK));
assert.equal(enabled.split(WRITER_HARDENING_BLOCK).length - 1, 1);
assert.ok(
  enabled.indexOf(WRITER_HARDENING_BLOCK) >
    enabled.indexOf(GLOBAL_RULES_BLOCK),
  "reforço deve vir após as regras globais",
);

const livreOff = buildSystemMessage({
  ...baseArgs,
  categoryCode: "LIVRE",
});
const livreOn = buildSystemMessage({
  ...baseArgs,
  categoryCode: "LIVRE",
  hardening: true,
});
assert.ok(!livreOff.includes(WRITER_HARDENING_BLOCK));
assert.ok(livreOn.endsWith(WRITER_HARDENING_BLOCK));

console.log("writer hardening: 7/7 PASS");
