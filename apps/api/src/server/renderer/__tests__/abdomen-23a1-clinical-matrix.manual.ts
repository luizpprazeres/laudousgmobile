import assert from "node:assert/strict";
import { adaptarAbdome, type EstadoDoAbdome } from "../../../../../web/src/lib/catalog/abdomeParaCatalogo";
import { AbdomenTotalFindingsSchema } from "../findingsSchemas/ABDOMEN_TOTAL";
import {
  CONCLUSAO_TODOS_NORMAIS,
  renderAbdomenTotalClassico,
  renderAbdomenTotalObjetivo,
} from "../phrases/ABDOMEN_TOTAL";

const base: EstadoDoAbdome = {
  figado: {
    dimensoes: "normal",
    ecotextura: "homogenea",
    lesoes: [],
    porta: "normal",
    raros: [],
    "lesoes.cisto.dimensao": "",
    "lesoes.cisto.local": "lobo_d",
    "lesoes.hemangioma.dimensao": "",
    "lesoes.hemangioma.local": "lobo_d",
    "lesoes.nodulo.dimensao": "",
    "lesoes.nodulo.local": "lobo_d",
    "dimensoes.aumentado.lobo_d": "",
    "dimensoes.aumentado.lobo_e": "",
    "porta.dilatada.calibre": "",
  },
  vesicula: {
    estado: "normal",
    conteudo: ["anecoico"],
    paredes: "finas",
    raros: [],
    "conteudo.colelitiase.quantidade": "unico",
    "conteudo.colelitiase.dimensao": "",
    "conteudo.colelitiase.mobilidade": "movel",
  },
  vias_biliares: {
    intra: "normais",
    coledoco: "normal",
    conteudo: [],
    "coledoco.dilatado.calibre": "",
    "conteudo.coledocolitiase.dimensao": "",
  },
  pancreas: {
    visualizacao: "adequada",
    ecotextura: "normal",
    wirsung: "normal",
    lesoes: [],
    "lesoes.cisto.dimensao": "",
    "lesoes.nodulo.dimensao": "",
  },
  baco: {
    dimensoes: "normal",
    ecotextura: "homogenea",
    lesoes: [],
    "dimensoes.aumentado.eixo": "",
    "dimensoes.aumentado.eixo_menor": "",
    "lesoes.cisto.dimensao": "",
  },
  rim_direito: {},
  rim_esquerdo: {},
};

const mascaraClassica = `ULTRASSONOGRAFIA DO ABDOME TOTAL

COMENTÁRIOS:
Exame realizado com transdutor convexo multifrequencial.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
{{orgao:figado|Fígado de dimensões normais, contornos regulares e ecotextura homogênea.}}
{{orgao:veia_porta|Veia porta de calibre normal.}}
{{orgao:vias_biliares|Vias biliares intra e extra-hepáticas de calibre normal.}}
{{orgao:vesicula|Vesícula biliar de topografia usual e parede fina, sem cálculos.}}
{{orgao:pancreas|Pâncreas de ecotextura habitual e dimensões normais.}}
{{orgao:baco|Baço de dimensões normais e ecotextura homogênea.}}
{{orgao:rim_direito|Rim direito sem alterações.}}
{{orgao:rim_esquerdo|Rim esquerdo sem alterações.}}
{{orgao:veia_cava|Veia cava inferior de calibre normal.}}
{{orgao:aorta|Aorta abdominal de calibre normal.}}
{{orgao:bexiga|Bexiga sem alterações.}}
{{extra_abdominais}}

CONCLUSÃO:
{{conclusao}}`;

type Patch = Partial<Record<keyof typeof base, Record<string, unknown>>>;

function estadoCom(patch: Patch): EstadoDoAbdome {
  const estado: EstadoDoAbdome = {};
  for (const [orgao, valor] of Object.entries(base)) {
    estado[orgao] = { ...(valor as Record<string, unknown>), ...(patch[orgao as keyof typeof base] ?? {}) };
  }
  return estado;
}

function laudos(patch: Patch): string[] {
  const adaptado = adaptarAbdome(estadoCom(patch));
  assert.deepEqual(adaptado.pendencias, []);
  const dados = AbdomenTotalFindingsSchema.parse(adaptado.dados);
  return [
    renderAbdomenTotalObjetivo(dados),
    renderAbdomenTotalClassico(dados, mascaraClassica),
  ];
}

const normal = laudos({});
for (const laudo of normal) {
  assert.ok(laudo.includes("sem alterações"));
  assert.ok(!laudo.includes("____"));
}

type Caso = {
  nome: string;
  patch: Patch;
  inclui: string[];
  conclusaoAlterada?: boolean;
};

const casos: Caso[] = [
  { nome: "hepatomegalia", patch: { figado: { dimensoes: "aumentado", "dimensoes.aumentado.lobo_d": "15", "dimensoes.aumentado.lobo_e": "10 cm" } }, inclui: ["lobo direito com diâmetro longitudinal de 15 cm", "lobo esquerdo com diâmetro longitudinal de 10 cm", "Hepatomegalia."] },
  { nome: "hepatomegalia só com medida do lobo esquerdo", patch: { figado: { dimensoes: "aumentado", "dimensoes.aumentado.lobo_e": "11" } }, inclui: ["lobo esquerdo com diâmetro longitudinal de 11 cm", "Hepatomegalia."] },
  { nome: "hemangioma em mm", patch: { figado: { lesoes: ["hemangioma"], "lesoes.hemangioma.dimensao": "20", "lesoes.hemangioma.local": "lobo_e" } }, inclui: ["medindo 2 cm", "lobo esquerdo", "sugestiva de hemangioma"] },
  { nome: "nódulo hepático", patch: { figado: { lesoes: ["nodulo"], "lesoes.nodulo.dimensao": "18 mm" } }, inclui: ["Imagem nodular sólida, medindo 1,8 cm", "Nódulo hepático a esclarecer"] },
  { nome: "calcificação hepática", patch: { figado: { raros: ["calcificacao"] } }, inclui: ["calcificação residual", "Calcificação hepática residual."] },
  { nome: "cistos hepáticos múltiplos", patch: { figado: { raros: ["cistos_multiplos"] } }, inclui: ["Cistos hepáticos simples."] },
  { nome: "líquido peri-hepático", patch: { figado: { raros: ["derrame"] } }, inclui: ["lâmina líquida peri-hepática", "Líquido livre peri-hepático."] },
  { nome: "veia porta dilatada", patch: { figado: { porta: "dilatada", "porta.dilatada.calibre": "14 mm" } }, inclui: ["Veia porta pérvia, de calibre aumentado, medindo 1,4 cm", "Veia porta de calibre aumentado."] },
  { nome: "vesícula contraída", patch: { vesicula: { estado: "contraida" } }, inclui: ["Vesícula biliar contraída", "avaliação do conteúdo parcialmente prejudicada"] },
  { nome: "vesícula distendida", patch: { vesicula: { estado: "distendida" } }, inclui: ["Vesícula biliar distendida", "Distensão da vesícula biliar."] },
  { nome: "colecistectomia", patch: { vesicula: { estado: "ausente" } }, inclui: ["Ausência da imagem da vesícula biliar"], conclusaoAlterada: false },
  { nome: "colelitíase em mm", patch: { vesicula: { conteudo: ["colelitiase"], "conteudo.colelitiase.dimensao": "12", "conteudo.colelitiase.quantidade": "unico" } }, inclui: ["1,2 centímetros", "Litíase da vesícula biliar."] },
  { nome: "lama biliar", patch: { vesicula: { conteudo: ["lama"] } }, inclui: ["compatível com lama biliar", "Lama biliar."] },
  { nome: "pólipo vesicular", patch: { vesicula: { conteudo: ["polipos"] } }, inclui: ["Imagem polipoide aderida", "Pólipo da vesícula biliar."] },
  { nome: "parede espessada aguda", patch: { vesicula: { paredes: "espessada_aguda" } }, inclui: ["parede espessada", "demais critérios clínicos e laboratoriais"] },
  { nome: "adenomiomatose", patch: { vesicula: { raros: ["adenomiomatose"] } }, inclui: ["artefatos em cauda de cometa", "Adenomiomatose da vesícula biliar."] },
  { nome: "colesterolose", patch: { vesicula: { raros: ["colesterolose"] } }, inclui: ["colesterolose", "Colesterolose da vesícula biliar."] },
  { nome: "vesícula em porcelana", patch: { vesicula: { raros: ["porcelana"] } }, inclui: ["Parede difusamente calcificada", "Vesícula em porcelana."] },
  { nome: "pólipo maior que 10 mm", patch: { vesicula: { raros: ["polipo_adenomatoso"] } }, inclui: ["maior que 10 mm", "Convém avaliação especializada"] },
  { nome: "colecistite alitiásica", patch: { vesicula: { raros: ["colecistite_alitiasica"] } }, inclui: ["sem cálculos identificáveis", "contexto clínico apropriado"] },
  { nome: "colecistostomia", patch: { vesicula: { raros: ["colecistostomia"] } }, inclui: ["Dreno de colecistostomia em posição", "Colecistostomia em posição."] },
  { nome: "vias intra-hepáticas dilatadas", patch: { vias_biliares: { intra: "dilatadas" } }, inclui: ["Vias biliares intra-hepáticas dilatadas", "Dilatação das vias biliares intra-hepáticas."] },
  { nome: "colédoco dilatado em mm", patch: { vias_biliares: { coledoco: "dilatado", "coledoco.dilatado.calibre": "9" } }, inclui: ["medindo 0,9 cm", "Dilatação do canal colédoco."] },
  { nome: "coledocolitíase em mm", patch: { vias_biliares: { conteudo: ["coledocolitiase"], "conteudo.coledocolitiase.dimensao": "6 mm" } }, inclui: ["medindo 0,6 cm", "Coledocolitíase."] },
  { nome: "pâncreas parcialmente visível", patch: { pancreas: { visualizacao: "prejudicada" } }, inclui: ["avaliação parcialmente prejudicada", "porções visibilizadas"] },
  { nome: "pâncreas heterogêneo", patch: { pancreas: { ecotextura: "heterogenea" } }, inclui: ["ecotextura heterogênea", "achado inespecífico"] },
  { nome: "lipomatose pancreática", patch: { pancreas: { ecotextura: "lipomatose" } }, inclui: ["aumento difuso da ecogenicidade", "Lipomatose pancreática."] },
  { nome: "Wirsung dilatado", patch: { pancreas: { wirsung: "dilatado" } }, inclui: ["Ducto pancreático principal ectasiado", "Dilatação do ducto pancreático principal"] },
  { nome: "cisto pancreático em mm", patch: { pancreas: { lesoes: ["cisto"], "lesoes.cisto.dimensao": "20" } }, inclui: ["Imagem cística pancreática, medindo 2 cm", "Cisto pancreático."] },
  { nome: "nódulo pancreático em mm", patch: { pancreas: { lesoes: ["nodulo"], "lesoes.nodulo.dimensao": "25 mm" } }, inclui: ["Imagem nodular sólida pancreática, medindo 2,5 cm", "Nódulo pancreático a esclarecer"] },
  { nome: "esplenomegalia em cm", patch: { baco: { dimensoes: "aumentado", "dimensoes.aumentado.eixo": "13", "dimensoes.aumentado.eixo_menor": "6 cm" } }, inclui: ["maior eixo medindo 13 cm", "menor eixo medindo 6 cm", "Esplenomegalia."] },
  { nome: "esplenomegalia só com menor eixo", patch: { baco: { dimensoes: "aumentado", "dimensoes.aumentado.eixo_menor": "6,5" } }, inclui: ["menor eixo medindo 6,5 cm", "Esplenomegalia."] },
  { nome: "baço heterogêneo", patch: { baco: { ecotextura: "heterogenea" } }, inclui: ["ecotextura heterogênea", "achado inespecífico"] },
  { nome: "cisto esplênico em mm", patch: { baco: { lesoes: ["cisto"], "lesoes.cisto.dimensao": "20" } }, inclui: ["medindo 2 cm", "Cisto esplênico simples."] },
  { nome: "calcificação esplênica", patch: { baco: { lesoes: ["calcificacao"] } }, inclui: ["calcificação residual", "Calcificação esplênica residual."] },
  { nome: "baço acessório", patch: { baco: { lesoes: ["acessorio"] } }, inclui: ["junto ao hilo esplênico", "Baço acessório."] },
];

for (const caso of casos) {
  for (const laudo of laudos(caso.patch)) {
    for (const trecho of caso.inclui) {
      assert.ok(laudo.includes(trecho), `${caso.nome}: trecho ausente: ${trecho}\n${laudo}`);
    }
    assert.ok(!laudo.includes("____"), `${caso.nome}: gerou lacuna não preenchida`);
    if (caso.conclusaoAlterada !== false) {
      assert.ok(!laudo.includes(CONCLUSAO_TODOS_NORMAIS), `${caso.nome}: manteve conclusão normal incompatível`);
    }
  }
}

for (const laudo of laudos({
  figado: {
    dimensoes: "aumentado",
    ecotextura: "dhc",
    lesoes: ["hemangioma"],
    "lesoes.hemangioma.dimensao": "20 mm",
  },
  baco: { dimensoes: "aumentado", "dimensoes.aumentado.eixo": "14 cm" },
})) {
  assert.ok(laudo.includes("dimensões aumentadas"));
  assert.ok(laudo.includes("contornos bocelados"));
  assert.ok(laudo.includes("medindo 2 cm"));
  assert.ok(laudo.includes("maior eixo medindo 14 cm"));
  assert.ok(laudo.includes("Hepatomegalia."));
  assert.ok(laudo.includes("Esplenomegalia."));
}

for (const laudo of laudos({
  vias_biliares: {
    intra: "dilatadas",
    coledoco: "dilatado",
    conteudo: ["coledocolitiase"],
    "coledoco.dilatado.calibre": "10 mm",
    "conteudo.coledocolitiase.dimensao": "7 mm",
  },
})) {
  assert.ok(laudo.includes("Vias biliares intra-hepáticas dilatadas"));
  assert.ok(laudo.includes("Canal colédoco de calibre aumentado, medindo 1 cm"));
  assert.ok(laudo.includes("medindo 0,7 cm"));
  assert.ok(laudo.includes("Coledocolitíase."));
}

console.log(`Sprint 23A1 — matriz clínica de abdome superior: ${casos.length} opções + combinações OK`);
