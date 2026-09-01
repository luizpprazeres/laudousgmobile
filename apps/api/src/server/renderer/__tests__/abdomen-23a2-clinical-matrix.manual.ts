import assert from "node:assert/strict";
import { adaptarAbdome, type EstadoDoAbdome } from "../../../../../web/src/lib/catalog/abdomeParaCatalogo";
import { AbdomenTotalFindingsSchema } from "../findingsSchemas/ABDOMEN_TOTAL";
import {
  CONCLUSAO_TODOS_NORMAIS,
  renderAbdomenTotalClassico,
  renderAbdomenTotalObjetivo,
} from "../phrases/ABDOMEN_TOTAL";

const base: EstadoDoAbdome = {
  figado: { dimensoes: "normal", ecotextura: "homogenea", lesoes: [], porta: "normal", raros: [] },
  vesicula: { estado: "normal", conteudo: ["anecoico"], paredes: "finas", raros: [] },
  vias_biliares: { intra: "normais", coledoco: "normal", conteudo: [] },
  pancreas: { visualizacao: "adequada", ecotextura: "normal", wirsung: "normal", lesoes: [] },
  baco: { dimensoes: "normal", ecotextura: "homogenea", lesoes: [] },
  rim_direito: {
    dimensoes: "normal", diferenciacao: "preservada", litiase: [], dilatacao: "ausente", cistos: [], lesoes: [], raros: [],
    medidas: "", espessura: "", "litiase.calculo.dimensao": "", "litiase.calculo.polo": "sup",
    "cistos.simples.dimensao": "", "lesoes.angiomiolipoma.dimensao": "", "lesoes.angiomiolipoma.polo": "sup",
    "lesoes.cisto_complexo.dimensao": "", "lesoes.cisto_complexo.polo": "sup",
  },
  rim_esquerdo: {
    dimensoes: "normal", diferenciacao: "preservada", litiase: [], dilatacao: "ausente", cistos: [], lesoes: [], raros: [],
    medidas: "", espessura: "", "litiase.calculo.dimensao": "", "litiase.calculo.polo": "sup",
    "cistos.simples.dimensao": "", "lesoes.angiomiolipoma.dimensao": "", "lesoes.angiomiolipoma.polo": "sup",
    "lesoes.cisto_complexo.dimensao": "", "lesoes.cisto_complexo.polo": "sup",
  },
  veia_cava: { calibre: "normal", conteudo: [], "calibre.dilatada.diametro": "", "conteudo.trombo.local": "" },
  aorta: { calibre: "normal", paredes: "regulares", "calibre.ectasia.diametro": "", "calibre.aneurisma.diametro": "" },
  bexiga: { replecao: "adequada", parede: "normal", conteudo: [], volume_pre: "", espessura_parede: "", residuo: "" },
};

const mascaraClassica = `ULTRASSONOGRAFIA DO ABDOME TOTAL

COMENTÁRIOS:
Exame realizado com transdutor convexo multifrequencial.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
{{orgao:figado|Fígado sem alterações.}}
{{orgao:veia_porta|Veia porta de calibre normal.}}
{{orgao:vias_biliares|Vias biliares de calibre normal.}}
{{orgao:vesicula|Vesícula biliar sem alterações.}}
{{orgao:pancreas|Pâncreas sem alterações.}}
{{orgao:baco|Baço sem alterações.}}
{{orgao:rim_direito|Rim direito sem alterações.}}
{{orgao:rim_esquerdo|Rim esquerdo sem alterações.}}
{{orgao:veia_cava|Veia cava inferior de calibre normal.}}
{{orgao:aorta|Aorta abdominal de calibre normal.}}
{{orgao:bexiga|Bexiga sem alterações.}}
{{extra_abdominais}}

CONCLUSÃO:
{{conclusao}}`;

type Patch = Partial<Record<keyof typeof base, Record<string, unknown>>>;

function laudos(patch: Patch): string[] {
  const estado: EstadoDoAbdome = {};
  for (const [id, valor] of Object.entries(base)) {
    estado[id] = { ...(valor as Record<string, unknown>), ...(patch[id as keyof typeof base] ?? {}) };
  }
  const adaptado = adaptarAbdome(estado);
  assert.deepEqual(adaptado.pendencias, []);
  const dados = AbdomenTotalFindingsSchema.parse(adaptado.dados);
  return [renderAbdomenTotalObjetivo(dados), renderAbdomenTotalClassico(dados, mascaraClassica)];
}

for (const laudo of laudos({})) {
  assert.ok(!laudo.includes("____"));
  assert.ok(laudo.includes("sem alterações"));
}

type Caso = { nome: string; patch: Patch; inclui: string[]; conclusaoAlterada?: boolean };
const casos: Caso[] = [
  { nome: "medidas renais", patch: { rim_direito: { medidas: "10,2 x 4,8 x 5,1", espessura: "1,6" } }, inclui: ["Medidas do rim direito: 10,2 x 4,8 x 5,1 cm.", "Espessura do parênquima renal: 1,6 cm."], conclusaoAlterada: false },
  { nome: "rim reduzido", patch: { rim_direito: { dimensoes: "reduzido" } }, inclui: ["dimensões reduzidas", "Rim direito de dimensões reduzidas."] },
  { nome: "diferenciação reduzida", patch: { rim_esquerdo: { diferenciacao: "reduzida" } }, inclui: ["redução da diferenciação corticomedular", "Redução da diferenciação corticomedular do rim esquerdo."] },
  { nome: "litíase renal em mm", patch: { rim_direito: { litiase: ["calculo"], "litiase.calculo.dimensao": "5 mm", "litiase.calculo.polo": "inf" } }, inclui: ["medindo 0,5 cm", "polo inferior", "Litíase renal direita."] },
  { nome: "hidronefrose leve", patch: { rim_direito: { dilatacao: "leve" } }, inclui: ["grau leve", "Hidronefrose de grau leve à direita."] },
  { nome: "hidronefrose moderada", patch: { rim_direito: { dilatacao: "moderada" } }, inclui: ["grau moderado", "Hidronefrose de grau moderado à direita."] },
  { nome: "hidronefrose acentuada", patch: { rim_esquerdo: { dilatacao: "acentuada" } }, inclui: ["grau acentuado", "Hidronefrose de grau acentuado à esquerda."] },
  { nome: "cisto renal simples", patch: { rim_direito: { cistos: ["simples"], "cistos.simples.dimensao": "20 x 18 x 16 mm" } }, inclui: ["medindo 2 x 1,8 x 1,6 cm", "Cisto simples no rim direito."] },
  { nome: "cistos renais múltiplos", patch: { rim_esquerdo: { cistos: ["multiplos"] } }, inclui: ["múltiplas imagens anecoicas homogêneas", "Cistos simples no rim esquerdo."] },
  { nome: "angiomiolipoma", patch: { rim_direito: { lesoes: ["angiomiolipoma"], "lesoes.angiomiolipoma.dimensao": "12 mm", "lesoes.angiomiolipoma.polo": "medio" } }, inclui: ["medindo 1,2 cm", "terço médio", "sugestiva de angiomiolipoma"] },
  { nome: "imagem cística complexa", patch: { rim_esquerdo: { lesoes: ["cisto_complexo"], "lesoes.cisto_complexo.dimensao": "18 x 16 mm", "lesoes.cisto_complexo.polo": "sup" } }, inclui: ["imagem cística complexa, medindo 1,8 x 1,6 cm", "método contrastado"] },
  { nome: "nefrocalcinose", patch: { rim_direito: { raros: ["nefrocalcinose"] } }, inclui: ["pirâmides medulares", "Nefrocalcinose no rim direito."] },
  { nome: "repleção vesical insuficiente", patch: { bexiga: { replecao: "insuficiente" } }, inclui: ["repleção insuficiente no momento do exame", "Bexiga com repleção insuficiente para adequada avaliação."] },
  { nome: "parede vesical espessada", patch: { bexiga: { parede: "espessada", espessura_parede: "4" } }, inclui: ["paredes espessadas, medindo 4 mm", "Espessamento da parede vesical."] },
  { nome: "parede vesical trabeculada", patch: { bexiga: { parede: "trabeculada" } }, inclui: ["paredes trabeculadas", "Trabeculação da parede vesical."] },
  { nome: "medida da parede vesical normal", patch: { bexiga: { espessura_parede: "3" } }, inclui: ["Espessura da parede vesical de 3 mm."], conclusaoAlterada: false },
  { nome: "debris vesicais", patch: { bexiga: { conteudo: ["debris"] } }, inclui: ["ecos em suspensão", "Debris no interior da bexiga."] },
  { nome: "cálculo vesical", patch: { bexiga: { conteudo: ["calculo"] } }, inclui: ["sombra acústica posterior no interior da bexiga", "Cálculo vesical."] },
  { nome: "sonda vesical", patch: { bexiga: { conteudo: ["sonda"] } }, inclui: ["Balão de sonda vesical em seu interior."], conclusaoAlterada: false },
  { nome: "divertículo vesical", patch: { bexiga: { conteudo: ["diverticulo"] } }, inclui: ["Imagem sacular comunicante com a luz vesical", "Divertículo vesical."] },
  { nome: "volume pré-miccional", patch: { bexiga: { volume_pre: "250" } }, inclui: ["Volume pré-miccional de 250 mL."], conclusaoAlterada: false },
  { nome: "resíduo pós-miccional", patch: { bexiga: { residuo: "35" } }, inclui: ["Resíduo pós-miccional de 35 mL."] },
  { nome: "ectasia da aorta", patch: { aorta: { calibre: "ectasia", "calibre.ectasia.diametro": "2,6" } }, inclui: ["Aorta abdominal ectasiada, medindo até 2,6 cm.", "Ectasia da aorta abdominal, medindo até 2,6 cm."] },
  { nome: "aneurisma da aorta sem medida", patch: { aorta: { calibre: "aneurisma" } }, inclui: ["Aorta abdominal com dilatação aneurismática.", "Dilatação aneurismática da aorta abdominal."] },
  { nome: "ateromatose da aorta", patch: { aorta: { paredes: "ateromatose" } }, inclui: ["imagens hiperecoicas aderidas às suas paredes", "Placas de ateromas na aorta abdominal."] },
  { nome: "veia cava dilatada", patch: { veia_cava: { calibre: "dilatada", "calibre.dilatada.diametro": "2,5" } }, inclui: ["Veia cava inferior de calibre aumentado, medindo 2,5 cm.", "Veia cava inferior de calibre aumentado."] },
  { nome: "trombo na veia cava", patch: { veia_cava: { conteudo: ["trombo"], "conteudo.trombo.local": "segmento infra-hepático" } }, inclui: ["compatível com trombo", "Material trombótico na veia cava inferior, no segmento infra-hepático."] },
];

for (const caso of casos) {
  for (const laudo of laudos(caso.patch)) {
    for (const trecho of caso.inclui) assert.ok(laudo.includes(trecho), `${caso.nome}: trecho ausente: ${trecho}\n${laudo}`);
    assert.ok(!laudo.includes("____"), `${caso.nome}: gerou lacuna vazia`);
    if (caso.conclusaoAlterada !== false) assert.ok(!laudo.includes(CONCLUSAO_TODOS_NORMAIS), `${caso.nome}: manteve conclusão normal incompatível`);
  }
}

for (const laudo of laudos({
  rim_direito: { dimensoes: "reduzido", diferenciacao: "reduzida", dilatacao: "moderada", cistos: ["simples"], "cistos.simples.dimensao": "15 mm" },
  bexiga: { parede: "trabeculada", conteudo: ["debris", "diverticulo"] },
  aorta: { calibre: "aneurisma", "calibre.aneurisma.diametro": "4,2", paredes: "ateromatose" },
})) {
  assert.ok(laudo.includes("dimensões reduzidas"));
  assert.ok(laudo.includes("Hidronefrose de grau moderado à direita."));
  assert.ok(laudo.includes("Cisto simples no rim direito."));
  assert.ok(laudo.includes("Trabeculação da parede vesical."));
  assert.ok(laudo.includes("Divertículo vesical."));
  assert.ok(laudo.includes("Dilatação aneurismática da aorta abdominal, medindo até 4,2 cm."));
  assert.ok(laudo.includes("Placas de ateromas na aorta abdominal."));
  assert.ok(!laudo.includes("____"));
}

for (const laudo of laudos({ bexiga: { replecao: "insuficiente", parede: "espessada", volume_pre: "250", residuo: "35" } })) {
  assert.ok(laudo.includes("repleção insuficiente"));
  assert.ok(!laudo.includes("Volume pré-miccional"));
  assert.ok(!laudo.includes("Resíduo pós-miccional"));
  assert.ok(!laudo.includes("paredes espessadas"));
}

console.log(`Sprint 23A2 — matriz clínica: ${casos.length} opções + combinações OK`);
