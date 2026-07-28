import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildSystemMessage } from "../buildSystemMessage";
import { resolveConditionalPromptBlocks } from "../conditionalBlocks";
import {
  ABDOMEN_POLIPO_BLOCK,
  ABDOMEN_TOTAL_CONTRACT,
} from "../contracts/ABDOMEN_TOTAL";
import {
  TIREOIDE_CONTRACT,
  TIREOIDE_HASHIMOTO_BLOCK,
} from "../contracts/TIREOIDE";

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

function build(
  categoryCode: "TIREOIDE" | "ABDOMEN_TOTAL",
  categoryLabel: string,
  rawInput?: string,
): string {
  return buildSystemMessage({
    categoryCode,
    categoryLabel,
    writingStyleCode: "CLASSICO_COMPLETO",
    ragBlocks: [],
    hardening: false,
    conditionalBlocks: rawInput
      ? resolveConditionalPromptBlocks(categoryCode, rawInput)
      : undefined,
  });
}

const tireoideControl = build("TIREOIDE", "Tireoide");
const tireoideNormal = build(
  "TIREOIDE",
  "Tireoide",
  "Tireoide com volume normal e ecotextura homogênea.",
);
const tireoideHashimoto = build(
  "TIREOIDE",
  "Tireoide",
  "Coloque as frases de Hashimoto.",
);

assert.equal(tireoideNormal, tireoideControl);
assert.equal(
  sha256(tireoideNormal),
  "26686a4f24c6064863d1ea806fb20e73fae6b838a5d6bb7fa349ec22c2d91a9f",
  "tireoide normal divergiu do controle pré-95760f4",
);
assert.ok(!tireoideNormal.includes(TIREOIDE_HASHIMOTO_BLOCK));
assert.equal(
  tireoideHashimoto.split(TIREOIDE_HASHIMOTO_BLOCK).length - 1,
  1,
);
assert.ok(!TIREOIDE_CONTRACT.includes(TIREOIDE_HASHIMOTO_BLOCK));

const abdomenControl = build("ABDOMEN_TOTAL", "Abdome Total");
const abdomenNormal = build(
  "ABDOMEN_TOTAL",
  "Abdome Total",
  "Fígado, vesícula biliar, pâncreas, baço e rins sem alterações.",
);
const abdomenPolipo = build(
  "ABDOMEN_TOTAL",
  "Abdome Total",
  "Pólipo imóvel na vesícula biliar, sem sombra acústica.",
);

assert.equal(abdomenNormal, abdomenControl);
assert.equal(
  sha256(abdomenNormal),
  "055798dde090f6f214805230c13fc501a01b5729a11b9744e8e7f7a2570cda61",
  "abdome normal divergiu do controle pré-95760f4",
);
assert.ok(!abdomenNormal.includes(ABDOMEN_POLIPO_BLOCK));
assert.equal(abdomenPolipo.split(ABDOMEN_POLIPO_BLOCK).length - 1, 1);
assert.ok(!ABDOMEN_TOTAL_CONTRACT.includes(ABDOMEN_POLIPO_BLOCK));

console.log("blocos canônicos condicionais: 10/10 PASS", {
  tireoide: {
    controlSha256: sha256(tireoideControl),
    withoutHashimotoSha256: sha256(tireoideNormal),
    withHashimotoSha256: sha256(tireoideHashimoto),
  },
  abdomen: {
    controlSha256: sha256(abdomenControl),
    withoutPolipoSha256: sha256(abdomenNormal),
    withPolipoSha256: sha256(abdomenPolipo),
  },
});
