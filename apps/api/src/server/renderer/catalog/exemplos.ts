/**
 * OS VALORES DE EXEMPLO DA BIBLIOTECA — e o único lugar do sistema onde é certo
 * inventar medida.
 *
 * A Biblioteca mostra o modelo do laudo ao lado de um exemplo preenchido,
 * porque `Lobo direito medindo ____ x ____ x ____ cm (volume de ____ ml)` é
 * mais difícil de julgar do que a mesma frase com números. O médico precisa ver
 * como o texto DELE vai ler.
 *
 * ## Por que isto não contradiz a regra "um cenário não carrega número"
 *
 * A regra existe porque os números de um `AlteracaoSpec` chegavam ao LAUDO: o
 * médico clicava um achado, não digitava a medida, e o documento saía afirmando
 * um tamanho que ninguém mediu. Aqui é o contrário — estes valores existem
 * exclusivamente para a prévia da Biblioteca e **nunca** entram num laudo:
 *
 *   - não são `AlteracaoSpec` e não são selecionáveis;
 *   - não passam por `/render` nem por `renderizarSelecao`;
 *   - a tela os mostra numa coluna rotulada "Exemplo", ao lado do modelo.
 *
 * A primeira tentativa foi usar um laudo REAL do médico como exemplo. Falhou
 * por dois motivos que o Luiz apontou em 21/08: o laudo mais recente da
 * categoria podia ser de outro cenário (uma gestação de 7 semanas ao lado do
 * modelo de 32), e vinha no estilo em que foi escrito, não no estilo que a tela
 * está mostrando. Renderizar o exemplo resolve os dois de uma vez — mesmo
 * cenário, mesmo estilo, mesmo motor.
 *
 * ## Como escolher os valores
 *
 * Exame NORMAL, do meio da faixa. O exemplo não é caso clínico: se ele trouxer
 * um achado, o médico passa a discutir o achado em vez de ler a redação. Um
 * valor limítrofe também não serve — ele faria o renderer escrever a frase de
 * anormalidade, e o exemplo deixaria de ilustrar o modelo normal.
 */

/** As medidas de um exame normal, por categoria e cenário. */
type SementeDeExemplo = Record<string, unknown>;

/**
 * ⚠️ O FETO PRECISA VIR INTEIRO.
 *
 * `mesclarFundo` substitui ARRAY por inteiro — e `fetos` é array. Mandar só a
 * biometria apagaria os demais campos que o schema exige, e o Zod recusaria o
 * laudo em silêncio (o exemplo sumia, sem erro). Por isso a base completa está
 * aqui, e cada cenário a estende.
 */
const FETO_BASE = {
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: null, dbp_mm: null, cc_mm: null, ca_mm: null,
  cf_mm: null, ccn_mm: null, peso_g: null, peso_variacao_g: null, percentil: null,
  bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null,
  cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
};

/** Um feto de 32 semanas — biometria no percentil médio. */
const FETO_32_SEMANAS = {
  ...FETO_BASE,
  bcf_bpm: 142,
  dbp_mm: 82,
  cc_mm: 295,
  ca_mm: 285,
  cf_mm: 62,
  peso_g: 1900,
  percentil: 50,
};

/** Embrião de 7 semanas — o cenário de gestação inicial. */
const EMBRIAO_7_SEMANAS = {
  ...FETO_BASE,
  bcf_bpm: 152,
  ccn_mm: 11,
};

const POR_CATEGORIA: Record<string, Record<string, SementeDeExemplo>> = {
  OBSTETRICA: {
    /**
     * `ig_semanas`/`ig_dias` são a idade gestacional que o médico informa. Sem
     * eles a conclusão sai "Gestação em torno de ____ semanas" — e é justamente
     * a frase que o exemplo precisa ilustrar preenchida.
     */
    "Gestação padrão": { fetos: [FETO_32_SEMANAS], ig_semanas: 32, ig_dias: 2 },
    "Gestação inicial": {
      fetos: [EMBRIAO_7_SEMANAS],
      saco_gestacional_mm: 28,
      ig_semanas: 7,
      ig_dias: 1,
    },
    Gemelar: {
      fetos: [FETO_32_SEMANAS, { ...FETO_32_SEMANAS, peso_g: 1840, ca_mm: 281 }],
      ig_semanas: 32,
      ig_dias: 2,
    },
  },

  DOPPLER_OBSTETRICO: {
    /**
     * Os índices já vêm no seed da categoria (`modeloNormalRegistry`), senão o
     * bloco de dopplervelocimetria sai vazio. Aqui entra só a biometria.
     */
    "Modelo padrão": { fetos: [FETO_32_SEMANAS], ig_semanas: 32, ig_dias: 2 },
  },

  MORFOLOGICO: {
    "Primeiro trimestre": { bcf_bpm: 158, ccn_mm: 62, tn_mm: 1.4, ig_semanas: 12, ig_dias: 3 },
    /** 20 semanas: o morfológico clássico. Os campos são planos, não por feto. */
    "Segundo trimestre": {
      bcf_bpm: 148, dbp_mm: 51, cc_mm: 190, ca_mm: 168,
      cerebelo_mm: 21, cisterna_magna_mm: 5, binocular_mm: 32,
      femur_mm: 34, tibia_mm: 29, fibula_mm: 28,
      umero_mm: 32, radio_mm: 27, ulna_mm: 30,
      peso_g: 390, percentil: 50, ila_cm: 14,
      placenta_localizacao: "anterior", ig_semanas: 20, ig_dias: 4,
    },
    "Terceiro trimestre": {
      bcf_bpm: 142, dbp_mm: 82, cc_mm: 295, ca_mm: 285,
      cerebelo_mm: 42, cisterna_magna_mm: 6, binocular_mm: 52,
      femur_mm: 62, tibia_mm: 54, fibula_mm: 52,
      umero_mm: 55, radio_mm: 48, ulna_mm: 53,
      peso_g: 1900, percentil: 50, ila_cm: 12,
      placenta_localizacao: "posterior", ig_semanas: 32, ig_dias: 2,
    },
  },

  TIREOIDE: {
    /** Lobos de ~6 ml e istmo fino: glândula normal de adulto. */
    "Modelo padrão": {
      lobo_direito: { medidas_cm: [4.8, 1.6, 1.5], volume_ml: 6.0 },
      lobo_esquerdo: { medidas_cm: [4.6, 1.5, 1.4], volume_ml: 5.0 },
      istmo: { medidas_cm: [1.4, 0.3, 1.0], volume_ml: 0.4 },
    },
  },

  PELVE_FEMININA: {
    /** Útero de menacme, endométrio de fase proliferativa, ovários normais. */
    "Modelo padrão": {
      utero_medidas_cm: [7.8, 4.2, 4.8],
      endometrio_espessura_cm: 0.7,
      ovario_direito: { medidas_cm: [3.1, 2.0, 1.8] },
      ovario_esquerdo: { medidas_cm: [2.9, 1.9, 1.7] },
    },
  },

  VIAS_URINARIAS: {
    "Modelo padrão": {
      rim_direito: { medidas_cm: [10.4, 4.8, 4.4], espessura_parenquima_cm: 1.6 },
      rim_esquerdo: { medidas_cm: [10.8, 5.0, 4.6], espessura_parenquima_cm: 1.7 },
    },
  },

  PROSTATA_SUPRAPUBICA: {
    "Modelo padrão": { prostata_d1_cm: 4.0, prostata_d2_cm: 3.2, prostata_d3_cm: 3.0 },
  },
};

/**
 * A semente do exemplo de uma categoria e cenário, ou `{}`.
 *
 * Vazio é resposta legítima: seis das treze categorias não têm lacuna nenhuma
 * no modelo — o texto já se lê inteiro, e não há o que preencher.
 */
export function sementeDeExemplo(categoria: string, cenario: string): SementeDeExemplo {
  const daCategoria = POR_CATEGORIA[categoria];
  if (!daCategoria) return {};
  const semente = daCategoria[cenario] ?? daCategoria["Modelo padrão"];
  if (!semente) return {};
  /**
   * CÓPIA, sempre — nunca a constante.
   *
   * `FETO_32_SEMANAS` é o MESMO objeto em toda chamada, e `fetos` o mesmo
   * array. O merge que recebe esta semente é raso na primeira camada, então o
   * array atravessa por referência: bastaria um `push` ou uma atribuição
   * qualquer no caminho do render para a semente ficar contaminada — e a
   * contaminação sobrevive à requisição, porque o módulo vive enquanto o
   * processo viver. O médico seguinte veria o número do anterior.
   *
   * Nada no caminho de hoje muta a semente. É exatamente por isso que a cópia
   * tem de estar aqui: a garantia não pode depender de todo chamador futuro
   * continuar bem-comportado.
   */
  return structuredClone(semente);
}
