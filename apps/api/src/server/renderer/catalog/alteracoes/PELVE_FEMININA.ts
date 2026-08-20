import type { AlteracaoSpec } from "../alteracoes";

/**
 * As alterações da PELVE FEMININA — a categoria de maior uso sem nenhuma
 * (336 laudos em 90 dias).
 *
 * Aqui não há uma classificação calculada como o TI-RADS ou o BI-RADS: o que a
 * pelve tem é VARIEDADE — mioma com categoria FIGO, achados por ovário e por
 * lado, acessórios que não são nem útero nem ovário. Serve de terceira prova
 * do desenho por outro motivo: se ele só soubesse lidar com "um achado dentro
 * de um array", quebraria numa categoria em que o achado mora em três lugares
 * diferentes.
 *
 * Como nas outras, aqui só existe o CENÁRIO. `renderPelveFeminina` continua
 * sendo o único autor da frase, da conclusão e da numeração.
 */

/**
 * O ovário normal — IGUAL ao do modelo derivado, medidas inclusive.
 *
 * Elas ficam nulas de propósito. Um cenário deve diferir do normal SÓ naquilo
 * de que ele trata: aqui, o achado dentro do ovário — não o tamanho dele.
 *
 * Na primeira versão eu cravei [3,0 × 2,0 × 1,8], que dá 5,7 ml. O limiar do
 * renderer é 6 ml (PELVE_FEMININA.ts:423), então cada cenário de ovário saía
 * com um "volume reduzido" que ninguém pediu — um achado clínico inventado por
 * um número que eu escolhi para ilustrar.
 */
const OVARIO_NORMAL = {
  visualizado: true,
  medidas_cm: null,
  volume_ml: null,
  alterado: false,
  atrofico: false,
  achados: [],
};

function ovarioCom(lado: "direito" | "esquerdo", achado: Record<string, unknown>) {
  return {
    ...OVARIO_NORMAL,
    alterado: true,
    achados: [{ lado, tipo: null, medidas_cm: null, descricao: null, ...achado }],
  };
}

export const ALTERACOES_PELVE: AlteracaoSpec[] = [
  // ── Útero ────────────────────────────────────────────────────────────────
  {
    id: "mioma_intramural",
    nome: "Mioma intramural",
    kind: "alteracao",
    descricao: "Nódulo único na parede do útero.",
    grupo: "miometrio",
    seed: {
      miomas: [
        {
          classificacao: "intramural",
          medidas_cm: null,
          parede: null,
          relacao: null,
          figo: null,
        },
      ],
    },
  },
  {
    id: "mioma_submucoso_figo",
    nome: "Mioma submucoso (com FIGO)",
    kind: "alteracao",
    descricao: "Nódulo que deforma a cavidade — o renderer classifica pela FIGO ditada.",
    grupo: "miometrio",
    seed: {
      miomas: [
        {
          classificacao: "submucoso",
          medidas_cm: null,
          parede: null,
          relacao: null,
          figo: "2",
        },
      ],
    },
  },
  {
    id: "utero_miomatoso",
    nome: "Útero miomatoso",
    kind: "alteracao",
    descricao: "Múltiplos nódulos, sem individualizar cada um.",
    grupo: "miometrio",
    seed: { utero_miomatoso: true },
  },
  {
    id: "adenomiose",
    nome: "Adenomiose",
    kind: "alteracao",
    descricao: "Miométrio heterogêneo, com as alterações típicas.",
    grupo: "miometrio_difuso",
    seed: {
      adenomiose: true,
      miometrio_descricao:
        "Miométrio de ecotextura heterogênea, com estrias hiperecogênicas e cistos miometriais.",
    },
  },

  // ── Endométrio ───────────────────────────────────────────────────────────
  {
    id: "polipo_endometrial",
    nome: "Pólipo endometrial",
    kind: "alteracao",
    descricao: "Imagem ecogênica na cavidade.",
    grupo: "endometrio",
    /**
     * `endometrio_achado` e `endometrio_conclusao` são VERBATIM do médico — o
     * renderer usa cada um como frase inteira, um no corpo e outro na conclusão.
     * Fragmento sai solto no meio do laudo, como já aconteceu com os linfonodos
     * cervicais da tireoide.
     */
    seed: {
      endometrio_achado:
        "Imagem ecogênica no interior da cavidade endometrial, de contornos regulares.",
      endometrio_conclusao: "Imagem endometrial a esclarecer, sugestiva de pólipo.",
    },
  },
  {
    id: "endometrio_espessado",
    nome: "Endométrio espessado",
    kind: "alteracao",
    descricao: "Espessura acima do esperado para a fase.",
    grupo: "endometrio",
    seed: {
      /**
       * Sem número: o Codex conferiu que o laudo sai byte a byte igual com 1,6
       * e com `null` — era medida fictícia invisível ao gate dinâmico, que só
       * acusa o que é IMPRESSO. Um cenário não carrega dado de exame nem quando
       * ninguém percebe.
       */
      endometrio_espessura_cm: null,
      endometrio_achado: "Endométrio espessado, de ecotextura heterogênea.",
      endometrio_conclusao: "Espessamento endometrial.",
    },
  },

  // ── Ovários ──────────────────────────────────────────────────────────────
  {
    id: "cisto_simples_direito",
    nome: "Cisto simples no ovário direito",
    kind: "alteracao",
    descricao: "Imagem anecoica, de paredes finas.",
    grupo: "ovario_direito",
    seed: {
      ovario_direito: ovarioCom("direito", { tipo: "cisto_simples", medidas_cm: null }),
    },
  },
  {
    id: "endometrioma_direito",
    nome: "Endometrioma no ovário direito",
    kind: "alteracao",
    descricao: 'Conteúdo em "vidro fosco", sem vascularização.',
    grupo: "ovario_direito",
    seed: {
      ovario_direito: ovarioCom("direito", { tipo: "endometrioma", medidas_cm: null }),
    },
  },
  {
    id: "cisto_esquerdo",
    nome: "Cisto no ovário esquerdo",
    kind: "alteracao",
    descricao: "Combina com achados do ovário direito — são lados independentes.",
    grupo: "ovario_esquerdo",
    seed: {
      ovario_esquerdo: ovarioCom("esquerdo", { tipo: "cisto_simples", medidas_cm: null }),
    },
  },

  // ── Acessórios ───────────────────────────────────────────────────────────
  {
    id: "diu_bem_posicionado",
    nome: "DIU bem posicionado",
    kind: "alteracao",
    descricao: "Dispositivo tópico, na posição esperada.",
    grupo: "diu",
    seed: { diu: "bem_posicionado" },
  },
  {
    id: "diu_deslocado",
    nome: "DIU deslocado",
    kind: "alteracao",
    descricao: "Dispositivo fora da posição esperada.",
    grupo: "diu",
    seed: { diu: "deslocado" },
  },
  {
    id: "cistos_naboth",
    nome: "Cistos de Naboth",
    kind: "alteracao",
    descricao: "Achado cervical habitual, sem significado patológico.",
    grupo: "colo",
    seed: { cistos_naboth: true },
  },
  {
    id: "istmocele",
    nome: "Istmocele",
    kind: "alteracao",
    descricao: "Defeito na cicatriz de cesárea.",
    grupo: "istmo",
    seed: {
      istmocele: true,
      istmocele_tipo: "simples",
      istmocele_descricao: "Falha de continuidade na cicatriz de histerotomia.",
    },
  },
  {
    id: "liquido_livre",
    nome: "Líquido livre",
    kind: "alteracao",
    descricao: "Pequena quantidade no fundo de saco.",
    grupo: "liquido",
    seed: {
      liquido_livre: true,
      liquido_livre_descricao: "Pequena quantidade de líquido livre no fundo de saco posterior.",
    },
  },
];
