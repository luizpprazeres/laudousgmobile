import assert from "node:assert/strict";
import {
  FIGO_CATEGORIES,
  FIGO_LOCALIZACOES,
  classificarMioma,
  figoNormalizada,
  figosDaLocalizacao,
  localizacaoDaFigo,
} from "../index";

// A tabela cobre 0–8 + a híbrida, e a família de cada categoria simples bate com o contrato do esquema.
assert.deepEqual(FIGO_LOCALIZACOES.map((l) => l.figo), ["0", "1", "2", "3", "4", "5", "6", "7", "8", "2-5"]);
for (const c of FIGO_CATEGORIES) {
  assert.equal(FIGO_LOCALIZACOES.find((l) => l.figo === String(c.figo))!.familia, c.family, `família FIGO ${c.figo}`);
}

// Categoria como o médico dita / o ASR escreve.
assert.equal(figoNormalizada("4"), "4");
assert.equal(figoNormalizada("FIGO 5"), "5");
assert.equal(figoNormalizada("categoria figo, 5"), "5");
assert.equal(figoNormalizada("2-5"), "2-5");
assert.equal(figoNormalizada("2 5"), "2-5");
assert.equal(figoNormalizada("2-7"), null, "híbrida fora da tabela não vira categoria");
assert.equal(figoNormalizada("9"), null);
assert.equal(figoNormalizada(""), null);

// Ida e volta: o texto de cada categoria leva de volta a ela.
for (const l of FIGO_LOCALIZACOES) assert.deepEqual(figosDaLocalizacao(l.texto), [l.figo], l.texto);

// Localização em texto livre (como o médico dita).
assert.deepEqual(figosDaLocalizacao("intramural"), ["4"]);
assert.deepEqual(figosDaLocalizacao("Subseroso, com mais de 50% intramural"), ["5"]);
assert.deepEqual(figosDaLocalizacao("subseroso com menos de 50 por cento intramural"), ["6"]);
assert.deepEqual(figosDaLocalizacao("subseroso com menos de 50% intramural"), ["6"]);
assert.deepEqual(figosDaLocalizacao("subseroso"), ["5", "6", "7"], "família genérica só restringe");
assert.deepEqual(figosDaLocalizacao("submucoso"), ["0", "1", "2"]);
assert.deepEqual(figosDaLocalizacao("intramural em contato com o endométrio"), ["3"]);
assert.deepEqual(figosDaLocalizacao("parede anterior"), []);

// Os quatro casos do pedido.
assert.deepEqual(classificarMioma("", "5"), { texto: "subseroso com mais de 50% intramural", plural: "subserosos com mais de 50% intramural", figo: "5", conflito: false }, "só a categoria");
assert.deepEqual(classificarMioma("intramural", ""), { texto: "intramural", plural: "intramurais", figo: "4", conflito: false }, "só a localização unívoca");
assert.equal(classificarMioma("subseroso", "").figo, null, "família genérica sem categoria: nada inferido");
assert.equal(classificarMioma("subseroso", "").texto, "subseroso");
assert.deepEqual(classificarMioma("subseroso", "6"), { texto: "subseroso com menos de 50% intramural", plural: "subserosos com menos de 50% intramural", figo: "6", conflito: false }, "as duas compatíveis: a tabela completa");
assert.deepEqual(classificarMioma("submucoso", "3"), { texto: "submucoso", plural: "submucoso", figo: "3", conflito: true }, "incompatíveis: preservadas e marcadas");
assert.deepEqual(classificarMioma("", ""), { texto: "", plural: "", figo: null, conflito: false }, "nenhuma: nada");
assert.equal(localizacaoDaFigo("2-5")!.familia, "hibrido");

console.log("figoLocalizacao: ok");
