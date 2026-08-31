import assert from "node:assert/strict";
import { achadoNormalDe } from "../catalog/modeloNormal";
import {
  ObstetricaFindingsSchema,
  renderObstetrica,
} from "../categories/OBSTETRICA";
import {
  MorfologicoFindingsSchema,
  renderMorfologico,
} from "../categories/MORFOLOGICO";

const obstBase = ObstetricaFindingsSchema.parse({
  ...(achadoNormalDe(ObstetricaFindingsSchema) as Record<string, unknown>),
  numero_fetos: 1,
  gestacao_inicial: false,
  itens_conclusao_livres: [],
  observacoes_corpo_livres: [],
  fetos: [{
    rotulo: null, posicao_relativa: null, apresentacao: null, dorso: "à esquerda",
    polo_cefalico: "à direita", bcf_bpm: 145, dbp_mm: 70, cc_mm: 250,
    ca_mm: 230, cf_mm: 50, ccn_mm: null, peso_g: 1200,
    peso_variacao_g: null, percentil: null,
  }],
});

for (const objetivo of [false, true]) {
  const laudo = renderObstetrica(obstBase, null, { objetivo });
  assert.match(laudo, /Feto único, em situação transversa, com polo cefálico à direita, e dorso à esquerda\./);
  assert.doesNotMatch(laudo, /apresentação transversa|apresentação córmica/i);
}

const morfoBase = MorfologicoFindingsSchema.parse({
  ...(achadoNormalDe(MorfologicoFindingsSchema) as Record<string, unknown>),
  trimestre: "2t",
  apresentacao: null,
  dorso: "à esquerda",
  polo_cefalico: "à direita",
  itens_conclusao_livres: [],
});

for (const objetivo of [false, true]) {
  const laudo = renderMorfologico(morfoBase, null, { objetivo });
  assert.match(laudo, /Feto único, em situação transversa, com polo cefálico à direita, e dorso à esquerda\./);
  assert.doesNotMatch(laudo, /apresentação transversa|apresentação córmica/i);
}

console.log("situacao-fetal: 8 verificações aprovadas");
