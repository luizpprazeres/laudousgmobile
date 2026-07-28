import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildSystemMessage } from "../buildSystemMessage";
import {
  TIREOIDE_CONTRACT,
  TIREOIDE_HASHIMOTO_BLOCK,
} from "../contracts/TIREOIDE";
import {
  ABDOMEN_TOTAL_CONTRACT,
  ABDOMEN_POLIPO_BLOCK,
} from "../contracts/ABDOMEN_TOTAL";
import {
  hasHashimotoMention,
  hasPolipoMention,
} from "../../pipeline/writer";

const sha256 = (t: string): string =>
  createHash("sha256").update(t).digest("hex");

function buildTireoide(hasHashimoto?: boolean): string {
  return buildSystemMessage({
    categoryCode: "TIREOIDE",
    categoryLabel: "Tireoide",
    writingStyleCode: "CLASSICO_COMPLETO",
    ragBlocks: [],
    hasHashimoto,
  });
}
function buildAbdomen(hasPolipo?: boolean): string {
  return buildSystemMessage({
    categoryCode: "ABDOMEN_TOTAL",
    categoryLabel: "Abdome Total",
    writingStyleCode: "CLASSICO_COMPLETO",
    ragBlocks: [],
    hasPolipo,
  });
}

// DE-RISK: o texto canônico NÃO pode mais estar embutido always-on no contrato.
assert.ok(
  !TIREOIDE_CONTRACT.includes(TIREOIDE_HASHIMOTO_BLOCK),
  "TIREOIDE_CONTRACT ainda contém o bloco Hashimoto (de-risk falhou)",
);
assert.ok(
  !TIREOIDE_CONTRACT.includes("TIREOIDITE DE HASHIMOTO"),
  "TIREOIDE_CONTRACT ainda menciona Hashimoto always-on",
);
assert.ok(
  !ABDOMEN_TOTAL_CONTRACT.includes(ABDOMEN_POLIPO_BLOCK),
  "ABDOMEN_TOTAL_CONTRACT ainda contém o bloco pólipo (de-risk falhou)",
);
assert.ok(
  !ABDOMEN_TOTAL_CONTRACT.includes("PÓLIPOS DA VESÍCULA BILIAR"),
  "ABDOMEN_TOTAL_CONTRACT ainda menciona pólipo always-on",
);

// NÃO-ALVO byte-idêntico ao controle (sem o bloco).
const tControl = buildTireoide();
const tNormal = buildTireoide(false);
assert.equal(tNormal, tControl, "tireoide normal divergiu do controle");
assert.ok(!tNormal.includes(TIREOIDE_HASHIMOTO_BLOCK));

const aControl = buildAbdomen();
const aNormal = buildAbdomen(false);
assert.equal(aNormal, aControl, "abdome normal divergiu do controle");
assert.ok(!aNormal.includes(ABDOMEN_POLIPO_BLOCK));

// ALVO: injeta o bloco exatamente 1x.
const tHash = buildTireoide(true);
assert.equal(tHash.split(TIREOIDE_HASHIMOTO_BLOCK).length - 1, 1);
const aPol = buildAbdomen(true);
assert.equal(aPol.split(ABDOMEN_POLIPO_BLOCK).length - 1, 1);

// Gatilhos.
for (const y of [
  "coloque as frases de Hashimoto",
  "paciente com tireoidite de Hashimoto",
]) {
  assert.ok(hasHashimotoMention(y), `deveria disparar hashimoto: "${y}"`);
}
assert.ok(!hasHashimotoMention("tireoide de volume normal"));
for (const y of ["pode colocar pólipos", "polipo na vesícula"]) {
  assert.ok(hasPolipoMention(y), `deveria disparar pólipo: "${y}"`);
}
assert.ok(!hasPolipoMention("fígado e vesícula sem alterações"));

console.log("de-risk hashimoto/pólipo condicional: 14/14 PASS", {
  tireoideControlSha256: sha256(tControl),
  tireoideNormalSha256: sha256(tNormal),
  tireoideHashimotoSha256: sha256(tHash),
  abdomenControlSha256: sha256(aControl),
  abdomenNormalSha256: sha256(aNormal),
  abdomenPolipoSha256: sha256(aPol),
});
