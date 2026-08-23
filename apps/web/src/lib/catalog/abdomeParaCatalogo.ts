/**
 * ABDOME TOTAL — do estado da TELA para o contrato do RENDERER canônico.
 *
 * A sexta categoria da troca de motor, e a de maior volume de todas: 847
 * laudos em 90 dias. Também a mais diferente das cinco anteriores, por dois
 * motivos que vale ter escritos.
 *
 * ## 1. A máscara mora no banco
 *
 * O abdome é a única categoria cujo layout do laudo não está no código: vem de
 * `report_template_variants.template_body`, com slots `{{orgao:figado|…}}`, e o
 * renderer PREENCHE a máscara em vez de montar o texto. Por isso o caminho do
 * catálogo ganhou um `ContextoDeRender` — sem a máscara não há laudo, e o
 * renderer devolve `null`.
 *
 * ## 2. O catálogo de achados é FECHADO, e menor que a tela
 *
 * O canônico conhece nove tipos (esteatose, cisto simples, litíase…). A tela
 * oferece conceitos que ele não tem: hemangioma, nódulo, pólipo, lipomatose,
 * lama biliar, hepatopatia crônica. Esses viram `tipo: "outro"` com o texto do
 * médico em `descricao_livre`.
 *
 * ⚠️ E aí mora a armadilha que quase me pegou: `renderOrgan` empurra `outro`
 * para `freeSlotFindings`, esperando que o LLM os transforme em prosa. No
 * caminho da web não há LLM, e ignorá-los faria o achado sumir do laudo sem
 * erro nenhum. `renderAbdomenTotalClassico` emite o verbatim — sem polir, que
 * é o certo: na web o médico digita, e o que ele digitou já é a frase.
 */

type EstadoDaSecao = Record<string, unknown>;
export type EstadoDoAbdome = Record<string, EstadoDaSecao | unknown>;

export type Pendencia = { onde: string; valor: string; motivo: string; bloqueia?: boolean };

/** A tela cobre sete; o canônico conhece onze. Os quatro extras vão normais. */
const DA_TELA = [
  "figado", "vesicula", "vias_biliares", "pancreas", "baco", "rim_direito", "rim_esquerdo",
] as const;
const SO_DO_CANONICO = ["veia_porta", "veia_cava", "aorta", "bexiga"] as const;

type Achado = {
  tipo: string;
  grau: string | null;
  quantidade: string | null;
  lateralidade: string | null;
  mobilidade: string | null;
  localizacao: string | null;
  medidas_cm: number[] | null;
  valor_ml: number | null;
  termo_do_medico: string;
  descricao_livre: string | null;
};

/** Um achado com tudo nulo — o schema é estrito e exige todas as chaves. */
const achado = (over: Partial<Achado>): Achado => ({
  tipo: "outro", grau: null, quantidade: null, lateralidade: null, mobilidade: null,
  localizacao: null, medidas_cm: null, valor_ml: null, termo_do_medico: "",
  descricao_livre: null, ...over,
});

function secao(estado: EstadoDoAbdome, id: string): EstadoDaSecao {
  const s = estado?.[id];
  return s && typeof s === "object" ? (s as EstadoDaSecao) : {};
}
const texto = (s: EstadoDaSecao, k: string) => (typeof s[k] === "string" ? (s[k] as string).trim() : "");
const marcado = (s: EstadoDaSecao, k: string, v: string) => Array.isArray(s[k]) && (s[k] as string[]).includes(v);
function medida(s: EstadoDaSecao, k: string): number[] | null {
  const n = Number.parseFloat(texto(s, k).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? [n] : null;
}

/** O que a tela chama × o que o canônico entende. `null` = vira `outro`. */
const ESTEATOSE: Record<string, string | null> = {
  esteatose_leve: "leve",
  esteatose_moderada: "moderado",
  esteatose_acentuada: "acentuado",
};

function achadosDoFigado(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  const eco = texto(s, "ecotextura");
  const grau = ESTEATOSE[eco];
  if (grau) out.push(achado({ tipo: "esteatose", grau, termo_do_medico: "esteatose" }));
  else if (eco === "dhc") {
    /** Hepatopatia crônica não é tipo do canônico — verbatim. */
    out.push(achado({
      descricao_livre: "Fígado com alterações ecográficas sugestivas de hepatopatia crônica",
      termo_do_medico: "hepatopatia crônica",
    }));
  }
  if (marcado(s, "lesoes", "cisto")) out.push(achado({ tipo: "cisto_simples", termo_do_medico: "cisto" }));
  if (marcado(s, "lesoes", "hemangioma")) {
    out.push(achado({ descricao_livre: "Imagem hiperecoica de contornos regulares, compatível com hemangioma", termo_do_medico: "hemangioma" }));
  }
  if (marcado(s, "lesoes", "nodulo")) {
    out.push(achado({ descricao_livre: "Imagem nodular hepática", termo_do_medico: "nódulo" }));
  }
  return out;
}

function achadosDaVesicula(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (marcado(s, "conteudo", "colelitiase")) {
    const q = texto(s, "conteudo.colelitiase.quantidade");
    out.push(achado({
      tipo: "litiase",
      quantidade: q === "multiplos" ? "multiplas" : q === "unico" ? "unica" : null,
      medidas_cm: medida(s, "conteudo.colelitiase.dimensao"),
      mobilidade: texto(s, "conteudo.colelitiase.mobilidade") === "impactado" ? "imovel" : "movel",
      termo_do_medico: "cálculo",
    }));
  }
  if (marcado(s, "conteudo", "lama")) {
    out.push(achado({ descricao_livre: "Conteúdo ecogênico de permeio, compatível com lama biliar", termo_do_medico: "lama biliar" }));
  }
  if (marcado(s, "conteudo", "polipos")) {
    out.push(achado({ descricao_livre: "Imagem polipoide aderida à parede", termo_do_medico: "pólipo" }));
  }
  const par = texto(s, "paredes");
  if (par === "espessada_aguda" || par === "espessada_cronica") {
    out.push(achado({ tipo: "parede_espessada", termo_do_medico: par === "espessada_aguda" ? "parede espessada" : "parede espessada crônica" }));
  }
  return out;
}

function achadosDoRim(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (marcado(s, "litiase", "calculo")) {
    out.push(achado({
      tipo: "litiase",
      medidas_cm: medida(s, "litiase.calculo.dimensao"),
      localizacao: texto(s, "litiase.calculo.polo") || null,
      termo_do_medico: "cálculo",
    }));
  }
  if (marcado(s, "cistos", "simples")) out.push(achado({ tipo: "cisto_simples", medidas_cm: medida(s, "cistos.simples.dimensao"), termo_do_medico: "cisto" }));
  if (marcado(s, "cistos", "multiplos")) out.push(achado({ tipo: "cisto_simples", quantidade: "multiplas", termo_do_medico: "cistos" }));
  const dil = texto(s, "dilatacao");
  if (dil && dil !== "ausente") {
    out.push(achado({ descricao_livre: `Dilatação pielocalicial de grau ${dil}`, termo_do_medico: `dilatação ${dil}` }));
  }
  if (texto(s, "diferenciacao") === "reduzida") {
    out.push(achado({ descricao_livre: "Diferenciação córtico-medular reduzida", termo_do_medico: "diferenciação reduzida" }));
  }
  return out;
}

function achadosSimples(s: EstadoDaSecao, mapa: { chave: string; valor: string; frase: string; termo: string }[]): Achado[] {
  const out: Achado[] = [];
  for (const m of mapa) {
    if (texto(s, m.chave) === m.valor) out.push(achado({ descricao_livre: m.frase, termo_do_medico: m.termo }));
  }
  return out;
}

export type Adaptacao = {
  dados: Record<string, unknown>;
  alteracoes: string[];
  pendencias: Pendencia[];
};

export function adaptarAbdome(estado: EstadoDoAbdome): Adaptacao {
  const pendencias: Pendencia[] = [];

  const porOrgao: Record<string, Achado[]> = {
    figado: achadosDoFigado(secao(estado, "figado")),
    vesicula: achadosDaVesicula(secao(estado, "vesicula")),
    vias_biliares: achadosSimples(secao(estado, "vias_biliares"), [
      { chave: "coledoco", valor: "dilatado", frase: "Canal colédoco de calibre aumentado", termo: "colédoco dilatado" },
      { chave: "dimensao", valor: "dilatadas", frase: "Vias biliares intra-hepáticas dilatadas", termo: "vias dilatadas" },
    ]),
    pancreas: achadosSimples(secao(estado, "pancreas"), [
      { chave: "ecotextura", valor: "heterogenea", frase: "Pâncreas de ecotextura heterogênea", termo: "ecotextura heterogênea" },
      { chave: "ecotextura", valor: "lipomatose", frase: "Pâncreas com aumento difuso da ecogenicidade, compatível com lipomatose", termo: "lipomatose" },
      { chave: "wirsung", valor: "dilatado", frase: "Ducto de Wirsung de calibre aumentado", termo: "Wirsung dilatado" },
    ]),
    baco: achadosSimples(secao(estado, "baco"), [
      { chave: "dimensao", valor: "aumentado", frase: "Baço de dimensões aumentadas", termo: "esplenomegalia" },
      { chave: "ecotextura", valor: "heterogenea", frase: "Baço de ecotextura heterogênea", termo: "ecotextura heterogênea" },
    ]),
    rim_direito: achadosDoRim(secao(estado, "rim_direito")),
    rim_esquerdo: achadosDoRim(secao(estado, "rim_esquerdo")),
  };

  /**
   * VEIA PORTA é seção do canônico e CAMPO do fígado na tela — a única
   * travessia que muda de lugar. Sem isto, "porta dilatada" sumiria.
   */
  const portaDilatada = texto(secao(estado, "figado"), "porta") === "dilatada";

  const orgaos: Record<string, unknown> = {};
  for (const k of DA_TELA) {
    const a = porOrgao[k] ?? [];
    orgaos[k] = { status: a.length > 0 ? "alterado" : "normal", achados: a };
  }
  for (const k of SO_DO_CANONICO) orgaos[k] = { status: "normal", achados: [] };
  if (portaDilatada) {
    orgaos.veia_porta = {
      status: "alterado",
      achados: [achado({ descricao_livre: "Veia porta de calibre aumentado", termo_do_medico: "porta dilatada" })],
    };
  }

  return {
    dados: { orgaos, achados_extra_abdominais: [], observacoes_do_medico: "" },
    alteracoes: [],
    pendencias,
  };
}
