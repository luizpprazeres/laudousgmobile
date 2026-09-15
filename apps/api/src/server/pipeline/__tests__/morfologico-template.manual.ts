import assert from "node:assert/strict";
import type { RagBlockForPrompt } from "@laudousg/shared";
import { prepareMorfologicoBlocks } from "../../prompts/morfologicoTemplate";

const template: RagBlockForPrompt = {
  id: "11111111-1111-4111-8111-111111111111", kind: "modelo", priority: 1, title: "2t",
  content: "ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE\n\nCOMENTÁRIOS:\nTécnica original.\n\nCONCLUSÃO:\nMorfologia fetal.",
};
const blocks = [template, { ...template, kind: "regra" as const }];
for (const text of ["Morfológico sem Doppler.", "Sem cervicometria transvaginal.", "Não realizar cervicometria transvaginal.", "Cervicometria transvaginal não realizada."]) {
  assert.deepEqual(prepareMorfologicoBlocks(blocks, text), blocks);
}
const prepared = prepareMorfologicoBlocks(blocks, "Morfológico com cervicometria transvaginal. Colo 3,2 cm.");
assert.match(prepared[0]!.content, /SEGUNDO TRIMESTRE COM CERVICOMETRIA TRANSVAGINAL/);
assert.match(prepared[0]!.content, /COMENTÁRIOS:\nFoi realizada adicionalmente cervicometria/);
assert.equal(prepared[1], blocks[1]);
assert.doesNotMatch(template.content, /COM CERVICOMETRIA/);
assert.deepEqual(prepareMorfologicoBlocks(prepared, "Cervicometria transvaginal."), prepared);
assert.deepEqual(prepareMorfologicoBlocks(blocks, "Com cervicometria transvaginal. Não incluir cervicometria transvaginal."), blocks);
const dated = { ...template, kind: "regra" as const, title: "morfologico-regra-dum-primeiraUSG-opcional", content: "CASO ANTIGO: incluir data DD/MM/AAAA" };
assert.doesNotMatch(prepareMorfologicoBlocks([dated], "Primeira USG com 7 semanas")[0]!.content, /CASO ANTIGO|DD\/MM\/AAAA/);
const positioned = { ...template, content: "Feto único, em apresentação __________________, com dorso __________________." };
assert.equal(prepareMorfologicoBlocks([positioned], "Morfológico 22 semanas")[0]!.content, "Feto único.");
assert.match(prepareMorfologicoBlocks([positioned], "Apresentação cefálica e dorso esquerdo")[0]!.content, /apresentação _+, com dorso _+/);
console.log("morfologico template: 13 assertions passed");
