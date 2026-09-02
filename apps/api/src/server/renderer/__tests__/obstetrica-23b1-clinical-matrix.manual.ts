import assert from "node:assert/strict";
import { adaptarObstetrica } from "../../../../../web/src/lib/catalog/obstetricaParaCatalogo";
import { obstetrica } from "../../../../../web/src/lib/deterministic";
import { renderizarSelecao } from "../catalog/alteracoes";

type Estado = Record<string, unknown>;
type Estilo = "CLASSICO_COMPLETO" | "OBJETIVO";

function inicial(): Estado {
  const estado: Estado = {};
  for (const secao of obstetrica.sections) {
    if (secao.module) estado[secao.id] = secao.module.initialState();
  }
  return estado;
}

function com(estado: Estado, secao: string, patch: Record<string, unknown>): Estado {
  return {
    ...estado,
    [secao]: { ...(estado[secao] as Record<string, unknown>), ...patch },
  };
}

function medido(): Estado {
  let estado = inicial();
  estado = com(estado, "ig", { bio_sem: "32", bio_dias: "2" });
  estado = com(estado, "feto", {
    situacao: "longitudinal",
    "situacao.longitudinal.apresentacao": "cefálica",
    dorso: "à esquerda",
    vitalidade: "normal",
    bcf: "142",
    movimentos: "normais",
    cordao_vasos: "nao_avaliado",
  });
  estado = com(estado, "biometria", {
    dbp: "82",
    cc: "295",
    ca: "285",
    cf: "62",
    peso: "1900",
  });
  return estado;
}

function render(estado: Estado, estilo: Estilo): string {
  const adaptado = adaptarObstetrica(estado);
  assert.deepEqual(adaptado.pendencias, []);
  const resultado = renderizarSelecao("OBSTETRICA", estilo, [], adaptado.dados);
  assert.equal(resultado.ok, true, `${estilo} deveria renderizar sem bloqueio`);
  if (!resultado.ok) throw new Error("renderização obstétrica bloqueada");
  return resultado.texto;
}

function nosDois(estado: Estado, validar: (laudo: string, estilo: Estilo) => void): void {
  for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"] as const) {
    validar(render(estado, estilo), estilo);
  }
}

nosDois(medido(), (laudo) => {
  assert.match(laudo, /Batimentos cardíacos (?:fetais \(BCF\): 142|presentes.*142)/i);
  assert.doesNotMatch(laudo, /cordão umbilical/i, "cordão não avaliado não pode ser inventado");
});

nosDois(com(medido(), "feto", {
  situacao: "transversa",
  "situacao.transversa.polo_cefalico": "à direita",
  dorso: "à esquerda",
}), (laudo) => {
  assert.match(laudo, /situação transversa, com polo cefálico à direita, e dorso à esquerda/i);
  assert.doesNotMatch(laudo, /apresentação (?:transversa|córmica)/i);
});

nosDois(com(medido(), "feto", { vitalidade: "ausente", bcf: "142" }), (laudo) => {
  assert.match(laudo, /Ausência de batimentos cardíacos fetais/i);
  assert.match(laudo, /Óbito fetal/i);
  assert.doesNotMatch(laudo, /Movimentos fetais ativos|movimentos fetais são ativos/i);
  assert.doesNotMatch(laudo, /frequência de 142/i, "BCF antigo não pode atravessar o estado sem vitalidade");
});

nosDois(com(medido(), "feto", { vitalidade: "bradicardia", bcf: "" }), (laudo) => {
  assert.match(laudo, /frequência reduzida/i);
  assert.match(laudo, /Bradicardia fetal/i);
  assert.doesNotMatch(laudo, /____/, "a ausência da frequência não pode bloquear nem criar lacuna");
});

nosDois(com(medido(), "feto", { vitalidade: "taquicardia", bcf: "182" }), (laudo) => {
  assert.match(laudo, /frequência de 182 bpm/i);
  assert.match(laudo, /Taquicardia fetal/i);
});

nosDois(com(medido(), "feto", { movimentos: "reduzidos" }), (laudo) => {
  assert.match(laudo, /Movimentos fetais reduzidos/i);
  assert.doesNotMatch(laudo, /Movimentos fetais ativos|movimentos fetais são ativos/i);
});

nosDois(com(medido(), "feto", { movimentos: "ausentes" }), (laudo) => {
  assert.match(laudo, /Não foram observados movimentos fetais durante o exame/i);
  assert.doesNotMatch(laudo, /Movimentos fetais ativos|movimentos fetais são ativos/i);
});

nosDois(com(medido(), "feto", { cordao_vasos: "tres" }), (laudo) => {
  assert.match(laudo, /cordão umbilical.*duas artérias e uma veia/i);
  assert.doesNotMatch(laudo, /Artéria umbilical única/i);
});

nosDois(com(medido(), "feto", { cordao_vasos: "dois" }), (laudo) => {
  assert.match(laudo, /cordão umbilical tem dois vasos/i);
  assert.match(laudo, /Artéria umbilical única/i);
});

nosDois(com(medido(), "placenta", {
  estado: "detalhar",
  "estado.detalhar.localizacao": "posterior",
  "estado.detalhar.ecotextura": "homogênea",
  relacao_orificio: "insercao_baixa",
  "relacao_orificio.insercao_baixa.distancia_mm": "12",
}), (laudo) => {
  assert.match(laudo, /posterior/i);
  assert.match(laudo, /12 mm do orifício interno/i);
  assert.match(laudo, /Placenta de inserção baixa/i);
  assert.doesNotMatch(laudo, /Placenta de aspecto normal/i);
});

for (const [relacao, conclusao] of [
  ["marginal", "Placenta prévia marginal"],
  ["previa", "Placenta prévia"],
] as const) {
  nosDois(com(medido(), "placenta", { relacao_orificio: relacao }), (laudo) => {
    assert.match(laudo, new RegExp(conclusao, "i"));
    assert.doesNotMatch(laudo, /Placenta de aspecto normal/i);
  });
}

nosDois(com(medido(), "placenta", {
  achado: "descolamento",
  "achado.descolamento.medidas": "",
}), (laudo) => {
  assert.match(laudo, /Imagem hipoecoica e heterogênea/i);
  assert.match(laudo, /Coleção retroplacentária/i);
  assert.doesNotMatch(laudo, /____/, "medidas opcionais não podem bloquear o laudo");
  assert.doesNotMatch(laudo, /Placenta de aspecto normal/i);
});

nosDois(com(medido(), "placenta", {
  achado: "descolamento",
  "achado.descolamento.medidas": "3,2 x 1,8 cm",
}), (laudo) => {
  assert.match(laudo, /medindo 3,2 x 1,8 cm/i);
});

nosDois(com(medido(), "placenta", { achado: "acretismo" }), (laudo) => {
  assert.match(laudo, /zona hipoecoica retroplacentária/i);
  assert.match(laudo, /espectro de acretismo placentário/i);
  assert.doesNotMatch(laudo, /Placenta de aspecto normal/i);
});

nosDois(com(medido(), "placenta", { achado: "lagos_venosos" }), (laudo) => {
  assert.match(laudo, /imagens anecoicas intraparenquimatosas/i);
  assert.match(laudo, /Lagos venosos placentários/i);
  assert.doesNotMatch(laudo, /Placenta de aspecto normal/i);
});

nosDois(com(medido(), "placenta", {
  estado: "detalhar",
  "estado.detalhar.localizacao": "anterior",
  relacao_orificio: "previa",
  achado: "acretismo",
}), (laudo) => {
  assert.match(laudo, /localização anterior/i);
  assert.match(laudo, /recobrindo amplamente o orifício interno/i);
  assert.match(laudo, /espectro de acretismo placentário/i);
});

console.log("Sprint 23B1 obstétrica — matriz clínica Clássico/Objetivo: OK");
