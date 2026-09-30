import assert from "node:assert/strict";
import { estilosDoModeloNormal, modeloNormalDe } from "../catalog/modeloNormalRegistry";

const legado = modeloNormalDe("MUSCULOESQUELETICO");
const canonico = modeloNormalDe("MUSCULOESQUELETICO_V2");

assert.ok(legado, "o alias legado Web precisa continuar resolvendo");
assert.equal(canonico, legado, "V2 deve resolver o mesmo contrato clínico do alias legado");
assert.deepEqual(estilosDoModeloNormal("MUSCULOESQUELETICO_V2"), ["CLASSICO_COMPLETO", "OBJETIVO"]);

console.log("modelo normal MSK: aliases legado e V2 alinhados");
