import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
assert.equal(
  createHash("sha256").update(absent).digest("hex"),
  "055798dde090f6f214805230c13fc501a01b5729a11b9744e8e7f7a2570cda61",
  "system message OFF divergiu do baseline anterior ao patch",
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
