import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hasAnexialMention } from "../../pipeline/writer";
import { buildSystemMessage } from "../buildSystemMessage";
import {
  PELVE_ANEXIAL_BLOCK,
  PELVE_FEMININA_CONTRACT,
} from "../contracts/PELVE_FEMININA";

const baseArgs = {
  categoryCode: "PELVE_FEMININA",
  categoryLabel: "Pelve Feminina",
  writingStyleCode: "CLASSICO_COMPLETO" as const,
  ragBlocks: [],
};

const control = buildSystemMessage(baseArgs);
const withoutAnexial = buildSystemMessage({
  ...baseArgs,
  hasAnexial: hasAnexialMention(
    "Útero em anteversão. Ovários com dimensões normais.",
  ),
});
const withAnexial = buildSystemMessage({
  ...baseArgs,
  hasAnexial: hasAnexialMention(
    "Coleção na região anexial direita medindo 2,0 cm.",
  ),
});

assert.equal(
  withoutAnexial,
  control,
  "pelve sem menção anexial deve manter o system message byte-idêntico",
);
assert.equal(
  createHash("sha256").update(withoutAnexial).digest("hex"),
  createHash("sha256").update(control).digest("hex"),
);
assert.equal(
  createHash("sha256").update(withoutAnexial).digest("hex"),
  "54f26c9c63d466174160ca52bcd1b2ae01d039ff93d6190970474d69daae3f1b",
  "system message sem anexo divergiu do controle origin/main",
);
assert.equal(
  createHash("sha256").update(PELVE_FEMININA_CONTRACT).digest("hex"),
  "072d1dc04291dc2d27b6fcc8954b31239d24fb347cc58f379ca3f9d7a3a22ee8",
  "contrato base da pelve divergiu de origin/main",
);
assert.ok(!withoutAnexial.includes(PELVE_ANEXIAL_BLOCK));
assert.equal(withAnexial.split(PELVE_ANEXIAL_BLOCK).length - 1, 1);
assert.ok(withAnexial.includes("O-RADS 2"));
assert.ok(!PELVE_FEMININA_CONTRACT.includes(PELVE_ANEXIAL_BLOCK));

console.log("pelve anexial condicional: 8/8 PASS", {
  controlSha256: createHash("sha256").update(control).digest("hex"),
  withoutAnexialSha256: createHash("sha256")
    .update(withoutAnexial)
    .digest("hex"),
  withAnexialSha256: createHash("sha256").update(withAnexial).digest("hex"),
});
