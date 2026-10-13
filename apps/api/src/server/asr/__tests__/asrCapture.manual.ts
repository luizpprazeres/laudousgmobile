import assert from "node:assert/strict";
import { buildAsrCapture, diffWords } from "../asrCapture";

assert.deepEqual(diffWords("Mama esquerda C e nódulos. 2 linfonodos", "Mama esquerda sem nódulos. 2 linfonodos"), [{ antes: "C e", depois: "sem" }]);
assert.deepEqual(diffWords("sem sinais de colecistite.", "Sem sinais de colecistite"), []); // caixa/pontuação não contam
assert.deepEqual(diffWords("medindo 10.2. Por 4.5", "medindo 10.2 x 4.5"), [{ antes: "Por", depois: "x" }]);
assert.deepEqual(diffWords("rim normal", "rim normal. Acrescente cisto simples"), [{ antes: "", depois: "Acrescente cisto simples" }]);
const c = buildAsrCapture({ provedor: "deepgram", modelo: "nova-3", texto: "100 sinais de colecistite", palavras: [{ w: "100", c: 0.41, s: 1.2 }, { w: "sinais", c: 0.99 }] }, "sem sinais de colecistite");
assert.equal(c.editado, true);
assert.equal(c.baixa_confianca, 1);
assert.deepEqual(c.correcoes, [{ antes: "100", depois: "sem" }]);
assert.deepEqual(c.palavras, [["100", 0.41, 1.2], ["sinais", 0.99, null]]);
console.log("asrCapture: ok");
