import assert from "node:assert/strict";
import { adaptarAbdome } from "../../../../../web/src/lib/catalog/abdomeParaCatalogo";
import { adaptarAbdomeSuperior } from "../../../../../web/src/lib/catalog/abdomeSuperiorParaCatalogo";
import {
  AbdomenTotalFindingsSchema,
} from "../findingsSchemas/ABDOMEN_TOTAL";
import {
  renderAbdomenTotalClassico,
  renderAbdomenTotalObjetivo,
} from "../phrases/ABDOMEN_TOTAL";
import {
  AbdomenSuperiorFindingsSchema,
  renderAbdomenSuperior,
} from "../categories/ABDOMEN_SUPERIOR";

const estado = {
  figado: {
    dimensoes: "normal",
    ecotextura: "dhc",
    lesoes: [],
    porta: "normal",
    raros: [],
  },
};

const fraseCorpo =
  "Fígado de dimensões normais, com contornos bocelados e ecotextura difusamente heterogênea.";
const fraseConclusao =
  "Sinais ecográficos sugestivos de hepatopatia crônica difusa.";
const antigaGenerica =
  "Fígado com alterações ecográficas sugestivas de hepatopatia crônica";
const figadoNormal =
  "Fígado de dimensões normais, contornos regulares e ecotextura homogênea.";

const totalAdaptado = adaptarAbdome(estado);
const total = AbdomenTotalFindingsSchema.parse(totalAdaptado.dados);
assert.equal(total.orgaos.figado.achados[0]?.tipo, "hepatopatia_cronica");

const objetivo = renderAbdomenTotalObjetivo(total);
assert.ok(objetivo.includes(fraseCorpo));
assert.ok(objetivo.includes(fraseConclusao));
assert.ok(!objetivo.includes(antigaGenerica));
assert.ok(!objetivo.includes(figadoNormal));

const mascaraClassica = `ULTRASSONOGRAFIA DO ABDOME TOTAL

COMENTÁRIOS:
Exame realizado com transdutor convexo multifrequencial.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
{{orgao:figado|${figadoNormal}}}
{{orgao:veia_porta|Veia porta de calibre normal.}}

CONCLUSÃO:
{{conclusao}}`;

const classico = renderAbdomenTotalClassico(total, mascaraClassica);
assert.ok(classico.includes(fraseCorpo));
assert.ok(classico.includes(fraseConclusao));
assert.ok(!classico.includes(antigaGenerica));
assert.ok(!classico.includes(figadoNormal));
assert.equal(classico.match(/Fígado/g)?.length, 1);

const superiorAdaptado = adaptarAbdomeSuperior(estado);
const superior = AbdomenSuperiorFindingsSchema.parse(superiorAdaptado.dados);
for (const objetivoDoSuperior of [false, true]) {
  const laudo = renderAbdomenSuperior(superior, { objetivo: objetivoDoSuperior });
  assert.ok(laudo.includes(fraseCorpo));
  assert.ok(laudo.includes(fraseConclusao));
  assert.ok(!laudo.includes(antigaGenerica));
  assert.ok(!laudo.includes(figadoNormal));
}

console.log("Revisão clínica — hepatopatia crônica em abdome: OK");
