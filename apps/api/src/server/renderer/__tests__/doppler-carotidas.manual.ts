import assert from "node:assert/strict";
import {
  DopplerCarotidasFindingsSchema,
  indiceResistividade,
  renderDopplerCarotidas,
} from "../categories/DOPPLER_CAROTIDAS";

const emptySide = {
  emi_mm: null,
  comum: { vps_cms: null, vdf_cms: null },
  interna: { vps_cms: null, vdf_cms: null },
  externa: { vps_cms: null, vdf_cms: null },
  vertebral: { vps_cms: null, direcao: "anterogrado" as const },
  placas: [],
};

const normal = DopplerCarotidasFindingsSchema.parse({
  direita: emptySide,
  esquerda: emptySide,
  classificacao_explicita: "normal",
  lado_classificacao: null,
  conclusao_livre: null,
  achados_adicionais: null,
});

const classic = renderDopplerCarotidas(normal);
assert.match(classic, /COMENTÁRIOS:/);
assert.match(classic, /LADO DIREITO[\s\S]+LADO ESQUERDO/);
assert.match(classic, /fluxo anterógrado/);
assert.doesNotMatch(classic, /____|NaN|undefined/);

const changed = DopplerCarotidasFindingsSchema.parse({
  ...normal,
  direita: {
    ...emptySide,
    emi_mm: 0.8,
    interna: { vps_cms: 120, vdf_cms: 30 },
    externa: { vps_cms: 90, vdf_cms: 18 },
    placas: [{
      localizacao: "bulbo carotídeo direito",
      composicao: "mista",
      superficie: "regular",
      espessura_mm: 2.1,
      estenose_percentual: null,
      descricao_raw: null,
    }],
  },
  classificacao_explicita: "ateromatose_sem_estenose_significativa",
  lado_classificacao: "direita",
});
const objective = renderDopplerCarotidas(changed, { objetivo: true });
assert.match(objective, /TÉCNICA:/);
assert.match(objective, /ACHADOS:/);
assert.match(objective, /IMPRESSÃO:/);
assert.match(objective, /IR de 0,75/);
assert.match(objective, /Carótida externa direita: PSV de 90 cm\/s, VDF de 18 cm\/s, IR de 0,8/);
assert.match(objective, /Ateromatose carotídea à direita/);
assert.doesNotMatch(objective, /____|NaN|undefined/);

assert.equal(indiceResistividade(100, 20), 0.8);
assert.equal(indiceResistividade(20, 30), null);
assert.throws(() => DopplerCarotidasFindingsSchema.parse({ ...normal, direita: { ...emptySide, placas: [{ localizacao: null, composicao: null, superficie: null, espessura_mm: null, estenose_percentual: 120, descricao_raw: null }] } }));

console.log("doppler-carotidas: 14 verificações aprovadas");
