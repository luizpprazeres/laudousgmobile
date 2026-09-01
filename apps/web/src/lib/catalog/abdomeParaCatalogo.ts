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
 * ## 2. O schema de transporte é FECHADO, e menor que a tela
 *
 * O canônico conhece nove tipos (esteatose, cisto simples, litíase…). A tela
 * oferece conceitos que ele não enumera: hemangioma, nódulo, pólipo,
 * lipomatose e lama biliar. Esses atravessam o schema como `tipo: "outro"`,
 * preservando o termo e a descrição, e são reclassificados de forma
 * determinística pelo renderer antes da redação.
 *
 * ⚠️ E aí mora a armadilha que quase me pegou: `renderOrgan` empurra `outro`
 * para `freeSlotFindings` apenas quando não há correspondência segura. No
 * caminho da web não há LLM: opções conhecidas precisam ser consumidas pelo
 * renderer, enquanto um texto realmente livre continua preservado verbatim.
 */

type EstadoDaSecao = Record<string, unknown>;
export type EstadoDoAbdome = Record<string, EstadoDaSecao | unknown>;

export type Pendencia = { onde: string; valor: string; motivo: string; bloqueia?: boolean };

/** Todos os órgãos do abdome total estão expostos; a veia porta vive no card do fígado. */
const DA_TELA = [
  "figado", "vesicula", "vias_biliares", "pancreas", "baco", "rim_direito", "rim_esquerdo",
  "veia_cava", "aorta", "bexiga",
] as const;
const SO_DO_CANONICO = ["veia_porta"] as const;

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
function medidasCm(s: EstadoDaSecao, k: string, unidadePadrao: "mm" | "cm" = "mm"): number[] | null {
  const raw = texto(s, k);
  if (!raw) return null;
  const valores = raw.match(/\d+(?:[.,]\d+)?/g)?.map((item) => Number.parseFloat(item.replace(",", "."))) ?? [];
  const validos = valores.filter((item) => Number.isFinite(item) && item > 0);
  if (validos.length === 0) return null;
  const digitadoEmMm = /\bmm\b/i.test(raw) || (!/\bcm\b/i.test(raw) && unidadePadrao === "mm");
  return validos.map((item) => digitadoEmMm ? item / 10 : item);
}

function medidasDeCampos(
  s: EstadoDaSecao,
  campos: Array<{ chave: string; unidade: "mm" | "cm" }>,
): number[] | null {
  const valores = campos.flatMap(({ chave, unidade }) => medidasCm(s, chave, unidade) ?? []);
  return valores.length > 0 ? valores : null;
}

function numeroPositivo(s: EstadoDaSecao, k: string): number | null {
  const raw = texto(s, k).replace(",", ".");
  const valor = Number.parseFloat(raw.match(/\d+(?:\.\d+)?/)?.[0] ?? "");
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

const numeroPtBr = (valor: number): string => String(valor).replace(".", ",");

function descricaoDeMedidas(
  s: EstadoDaSecao,
  campos: Array<{ chave: string; unidade: "mm" | "cm"; rotulo: string }>,
): string | null {
  const partes = campos.flatMap(({ chave, unidade, rotulo }) => {
    const valor = medidasCm(s, chave, unidade)?.[0];
    return valor === undefined ? [] : [`${rotulo} ${numeroPtBr(valor)} cm`];
  });
  return partes.length > 0 ? partes.join(" e ") : null;
}

/** O que a tela chama × o que o canônico entende. `null` = vira `outro`. */
const ESTEATOSE: Record<string, string | null> = {
  esteatose_leve: "leve",
  esteatose_moderada: "moderado",
  esteatose_acentuada: "acentuado",
};

function achadosDoFigado(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (texto(s, "dimensoes") === "aumentado") {
    out.push(achado({
      medidas_cm: medidasDeCampos(s, [
        { chave: "dimensoes.aumentado.lobo_d", unidade: "cm" },
        { chave: "dimensoes.aumentado.lobo_e", unidade: "cm" },
      ]),
      localizacao: descricaoDeMedidas(s, [
        { chave: "dimensoes.aumentado.lobo_d", unidade: "cm", rotulo: "lobo direito com diâmetro longitudinal de" },
        { chave: "dimensoes.aumentado.lobo_e", unidade: "cm", rotulo: "lobo esquerdo com diâmetro longitudinal de" },
      ]),
      descricao_livre: "Hepatomegalia",
      termo_do_medico: "hepatomegalia",
    }));
  }
  const eco = texto(s, "ecotextura");
  const grau = ESTEATOSE[eco];
  if (grau) out.push(achado({ tipo: "esteatose", grau, termo_do_medico: "esteatose" }));
  else if (eco === "dhc") {
    out.push(achado({
      tipo: "hepatopatia_cronica",
      termo_do_medico: "hepatopatia crônica",
    }));
  }
  if (marcado(s, "lesoes", "cisto")) out.push(achado({
    tipo: "cisto_simples",
    medidas_cm: medidasCm(s, "lesoes.cisto.dimensao"),
    localizacao: texto(s, "lesoes.cisto.local") === "lobo_e" ? "lobo esquerdo" : "lobo direito",
    termo_do_medico: "cisto hepático",
  }));
  if (marcado(s, "lesoes", "hemangioma")) {
    out.push(achado({
      medidas_cm: medidasCm(s, "lesoes.hemangioma.dimensao"),
      localizacao: texto(s, "lesoes.hemangioma.local") === "lobo_e" ? "lobo esquerdo" : "lobo direito",
      descricao_livre: "Imagem nodular hiperecogênica, homogênea e de contornos bem definidos, sugestiva de hemangioma",
      termo_do_medico: "hemangioma hepático",
    }));
  }
  if (marcado(s, "lesoes", "nodulo")) {
    out.push(achado({
      medidas_cm: medidasCm(s, "lesoes.nodulo.dimensao"),
      localizacao: texto(s, "lesoes.nodulo.local") === "lobo_e" ? "lobo esquerdo" : "lobo direito",
      descricao_livre: "Imagem nodular hepática sólida a esclarecer",
      termo_do_medico: "nódulo hepático",
    }));
  }
  if (marcado(s, "raros", "calcificacao")) {
    out.push(achado({ descricao_livre: "Foco calcificado residual no parênquima hepático", termo_do_medico: "calcificação hepática residual" }));
  }
  if (marcado(s, "raros", "cistos_multiplos")) {
    out.push(achado({ tipo: "cisto_simples", quantidade: "multiplas", termo_do_medico: "cistos hepáticos múltiplos" }));
  }
  if (marcado(s, "raros", "derrame")) {
    out.push(achado({ descricao_livre: "Lâmina líquida peri-hepática", termo_do_medico: "líquido peri-hepático" }));
  }
  return out;
}

function achadosDaVesicula(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  const estado = texto(s, "estado");
  if (estado === "contraida") out.push(achado({ descricao_livre: "Vesícula biliar contraída", termo_do_medico: "vesícula contraída" }));
  if (estado === "distendida") out.push(achado({ descricao_livre: "Vesícula biliar distendida", termo_do_medico: "vesícula distendida" }));
  if (marcado(s, "conteudo", "colelitiase")) {
    const q = texto(s, "conteudo.colelitiase.quantidade");
    out.push(achado({
      tipo: "litiase",
      quantidade: q === "multiplos" || q === "repleta" ? "multiplas" : "unica",
      medidas_cm: medidasCm(s, "conteudo.colelitiase.dimensao"),
      mobilidade: texto(s, "conteudo.colelitiase.mobilidade") === "impactado" ? "imovel" : "movel",
      termo_do_medico: q === "repleta" ? "vesícula repleta de cálculos" : "cálculo vesicular",
    }));
  }
  if (marcado(s, "conteudo", "lama")) {
    out.push(achado({ descricao_livre: "Conteúdo ecogênico móvel, sem sombra acústica, compatível com lama biliar", termo_do_medico: "lama biliar" }));
  }
  if (marcado(s, "conteudo", "polipos")) {
    out.push(achado({ descricao_livre: "Imagem polipoide aderida à parede, sem mobilidade ou sombra acústica", termo_do_medico: "pólipo vesicular" }));
  }
  const par = texto(s, "paredes");
  if (par === "espessada_aguda" || par === "espessada_cronica") {
    out.push(achado({
      tipo: "parede_espessada",
      termo_do_medico: par === "espessada_aguda" ? "parede espessada com suspeita de processo inflamatório agudo" : "parede espessada de aspecto crônico",
    }));
  }
  const raros = Array.isArray(s.raros) ? s.raros as string[] : [];
  const rarosMap: Record<string, [string, string]> = {
    adenomiomatose: ["Espessamento parietal focal com imagens císticas intramurais e artefatos em cauda de cometa", "adenomiomatose"],
    colesterolose: ["Focos ecogênicos parietais aderidos, sem sombra acústica", "colesterolose"],
    porcelana: ["Parede vesicular difusamente calcificada com sombra acústica posterior", "vesícula em porcelana"],
    polipo_adenomatoso: ["Imagem polipoide séssil maior que 10 mm aderida à parede", "pólipo vesicular maior que 10 mm"],
    colecistite_alitiasica: ["Distensão e espessamento parietal sem cálculos identificáveis", "suspeita de colecistite alitiásica"],
    colecistostomia: ["Dreno de colecistostomia em posição", "colecistostomia"],
  };
  for (const raro of raros) {
    const item = rarosMap[raro];
    if (item) out.push(achado({ descricao_livre: item[0], termo_do_medico: item[1] }));
  }
  return out;
}

function achadosDasViasBiliares(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (texto(s, "intra") === "dilatadas") {
    out.push(achado({ descricao_livre: "Vias biliares intra-hepáticas dilatadas", termo_do_medico: "dilatação das vias biliares intra-hepáticas" }));
  }
  if (texto(s, "coledoco") === "dilatado") {
    out.push(achado({
      medidas_cm: medidasCm(s, "coledoco.dilatado.calibre"),
      descricao_livre: "Canal colédoco de calibre aumentado",
      termo_do_medico: "colédoco dilatado",
    }));
  }
  if (marcado(s, "conteudo", "coledocolitiase")) {
    out.push(achado({
      medidas_cm: medidasCm(s, "conteudo.coledocolitiase.dimensao"),
      descricao_livre: "Imagem hiperecogênica com sombra acústica no interior do colédoco",
      termo_do_medico: "coledocolitíase",
    }));
  }
  return out;
}

function achadosDoPancreas(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (texto(s, "visualizacao") === "prejudicada") {
    out.push(achado({ descricao_livre: "Avaliação pancreática parcialmente prejudicada pela interposição gasosa", termo_do_medico: "visualização pancreática prejudicada" }));
  }
  const eco = texto(s, "ecotextura");
  if (eco === "heterogenea") out.push(achado({ descricao_livre: "Pâncreas de ecotextura heterogênea", termo_do_medico: "ecotextura pancreática heterogênea" }));
  if (eco === "lipomatose") out.push(achado({ descricao_livre: "Aumento difuso da ecogenicidade pancreática", termo_do_medico: "lipomatose pancreática" }));
  if (texto(s, "wirsung") === "dilatado") out.push(achado({ descricao_livre: "Ducto pancreático principal ectasiado", termo_do_medico: "Wirsung dilatado" }));
  if (marcado(s, "lesoes", "cisto")) out.push(achado({
    medidas_cm: medidasCm(s, "lesoes.cisto.dimensao"),
    descricao_livre: "Imagem cística pancreática",
    termo_do_medico: "cisto pancreático",
  }));
  if (marcado(s, "lesoes", "nodulo")) out.push(achado({
    medidas_cm: medidasCm(s, "lesoes.nodulo.dimensao"),
    descricao_livre: "Imagem nodular sólida pancreática a esclarecer",
    termo_do_medico: "nódulo pancreático",
  }));
  return out;
}

function achadosDoBaco(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (texto(s, "dimensoes") === "aumentado") out.push(achado({
    medidas_cm: medidasDeCampos(s, [
      { chave: "dimensoes.aumentado.eixo", unidade: "cm" },
      { chave: "dimensoes.aumentado.eixo_menor", unidade: "cm" },
    ]),
    localizacao: descricaoDeMedidas(s, [
      { chave: "dimensoes.aumentado.eixo", unidade: "cm", rotulo: "maior eixo medindo" },
      { chave: "dimensoes.aumentado.eixo_menor", unidade: "cm", rotulo: "menor eixo medindo" },
    ]),
    descricao_livre: "Baço de dimensões aumentadas",
    termo_do_medico: "esplenomegalia",
  }));
  if (texto(s, "ecotextura") === "heterogenea") out.push(achado({ descricao_livre: "Baço de ecotextura heterogênea", termo_do_medico: "ecotextura esplênica heterogênea" }));
  if (marcado(s, "lesoes", "cisto")) out.push(achado({
    medidas_cm: medidasCm(s, "lesoes.cisto.dimensao"),
    descricao_livre: "Imagem cística esplênica simples",
    termo_do_medico: "cisto esplênico",
  }));
  if (marcado(s, "lesoes", "calcificacao")) out.push(achado({ descricao_livre: "Foco calcificado esplênico residual", termo_do_medico: "calcificação esplênica" }));
  if (marcado(s, "lesoes", "acessorio")) out.push(achado({ descricao_livre: "Imagem nodular homogênea junto ao hilo esplênico", termo_do_medico: "baço acessório" }));
  return out;
}

function achadosDoRim(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  const local: Record<string, string> = { sup: "polo superior", medio: "terço médio", inf: "polo inferior" };
  const medidasRim = medidasCm(s, "medidas", "cm");
  const espessura = medidasCm(s, "espessura", "cm")?.[0];
  if (medidasRim || espessura !== undefined) {
    const partes = [
      medidasRim ? `medidas ${medidasRim.map(numeroPtBr).join(" x ")} cm` : "",
      espessura !== undefined ? `espessura do parênquima ${numeroPtBr(espessura)} cm` : "",
    ].filter(Boolean);
    out.push(achado({
      medidas_cm: medidasRim,
      localizacao: espessura !== undefined ? numeroPtBr(espessura) : null,
      descricao_livre: `Documentação renal: ${partes.join("; ")}`,
      termo_do_medico: "medidas renais",
    }));
  }
  if (texto(s, "dimensoes") === "reduzido") {
    out.push(achado({ descricao_livre: "Rim de dimensões reduzidas", termo_do_medico: "dimensões renais reduzidas" }));
  }
  if (marcado(s, "litiase", "calculo")) {
    out.push(achado({
      tipo: "litiase",
      medidas_cm: medidasCm(s, "litiase.calculo.dimensao"),
      localizacao: local[texto(s, "litiase.calculo.polo")] || null,
      termo_do_medico: "cálculo",
    }));
  }
  if (marcado(s, "cistos", "simples")) out.push(achado({ tipo: "cisto_simples", medidas_cm: medidasCm(s, "cistos.simples.dimensao"), termo_do_medico: "cisto" }));
  if (marcado(s, "cistos", "multiplos")) out.push(achado({ tipo: "cisto_simples", quantidade: "multiplas", termo_do_medico: "cistos" }));
  const dil = texto(s, "dilatacao");
  if (dil && dil !== "ausente") {
    out.push(achado({ grau: dil === "moderada" ? "moderado" : dil === "acentuada" ? "acentuado" : "leve", descricao_livre: `Dilatação pielocalicial de grau ${dil}`, termo_do_medico: `hidronefrose ${dil}` }));
  }
  if (texto(s, "diferenciacao") === "reduzida") {
    out.push(achado({ descricao_livre: "Diferenciação córtico-medular reduzida", termo_do_medico: "diferenciação reduzida" }));
  }
  if (marcado(s, "lesoes", "angiomiolipoma") || marcado(s, "raros", "angiomiolipoma")) {
    out.push(achado({
      medidas_cm: medidasCm(s, "lesoes.angiomiolipoma.dimensao"),
      localizacao: local[texto(s, "lesoes.angiomiolipoma.polo")] || null,
      descricao_livre: "Imagem nodular hiperecogênica e homogênea, sugestiva de angiomiolipoma",
      termo_do_medico: "angiomiolipoma renal",
    }));
  }
  if (marcado(s, "lesoes", "cisto_complexo") || marcado(s, "raros", "cisto_complexo")) {
    out.push(achado({
      tipo: "imagem_cistica_complexa",
      medidas_cm: medidasCm(s, "lesoes.cisto_complexo.dimensao"),
      localizacao: local[texto(s, "lesoes.cisto_complexo.polo")] || null,
      descricao_livre: "aspecto complexo",
      termo_do_medico: "imagem cística complexa renal",
    }));
  }
  if (marcado(s, "raros", "nefrocalcinose")) {
    out.push(achado({ descricao_livre: "Calcificações nas pirâmides medulares", termo_do_medico: "nefrocalcinose" }));
  }
  return out;
}

function achadosDaAorta(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  const calibre = texto(s, "calibre");
  if (calibre === "ectasia" || calibre === "aneurisma") {
    out.push(achado({
      medidas_cm: medidasCm(s, `calibre.${calibre}.diametro`, "cm"),
      descricao_livre: calibre === "aneurisma" ? "Dilatação aneurismática da aorta abdominal" : "Ectasia da aorta abdominal",
      termo_do_medico: calibre === "aneurisma" ? "aneurisma da aorta abdominal" : "aorta ectasiada",
    }));
  }
  if (texto(s, "paredes") === "ateromatose") {
    out.push(achado({ tipo: "ateromatose", termo_do_medico: "ateromatose da aorta abdominal" }));
  }
  return out;
}

function achadosDaVeiaCava(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (texto(s, "calibre") === "dilatada") {
    out.push(achado({
      medidas_cm: medidasCm(s, "calibre.dilatada.diametro", "cm"),
      descricao_livre: "Veia cava inferior de calibre aumentado",
      termo_do_medico: "veia cava inferior dilatada",
    }));
  }
  if (marcado(s, "conteudo", "trombo")) {
    out.push(achado({
      localizacao: texto(s, "conteudo.trombo.local") || null,
      descricao_livre: "Material ecogênico no interior da veia cava inferior, compatível com trombo",
      termo_do_medico: "trombo na veia cava inferior",
    }));
  }
  return out;
}

function achadosDaBexiga(s: EstadoDaSecao): Achado[] {
  const out: Achado[] = [];
  if (texto(s, "replecao") === "insuficiente") {
    out.push(achado({ descricao_livre: "Bexiga com repleção insuficiente para adequada avaliação", termo_do_medico: "repleção vesical insuficiente" }));
    return out;
  }
  const parede = texto(s, "parede");
  if (parede === "espessada" || parede === "trabeculada") {
    out.push(achado({
      medidas_cm: medidasCm(s, "espessura_parede"),
      descricao_livre: parede === "espessada" ? "Parede vesical espessada" : "Parede vesical trabeculada",
      termo_do_medico: parede === "espessada" ? "espessamento da parede vesical" : "trabeculação da parede vesical",
    }));
  } else if (medidasCm(s, "espessura_parede")) {
    out.push(achado({
      medidas_cm: medidasCm(s, "espessura_parede"),
      descricao_livre: "Medida da espessura da parede vesical",
      termo_do_medico: "espessura da parede vesical",
    }));
  }
  for (const item of Array.isArray(s.conteudo) ? s.conteudo as string[] : []) {
    const termos: Record<string, [string, string]> = {
      debris: ["Ecos em suspensão no conteúdo vesical", "debris vesicais"],
      calculo: ["Imagem hiperecogênica móvel com sombra acústica no interior da bexiga", "cálculo vesical"],
      sonda: ["Balão de sonda vesical em seu interior", "sonda vesical"],
      diverticulo: ["Imagem sacular comunicante com a luz vesical", "divertículo vesical"],
    };
    const termo = termos[item];
    if (termo) out.push(achado({ descricao_livre: termo[0], termo_do_medico: termo[1] }));
  }
  const volume = numeroPositivo(s, "volume_pre");
  if (volume !== null) out.push(achado({ tipo: "volume_pre_miccional", valor_ml: volume, termo_do_medico: "volume pré-miccional" }));
  const residuo = numeroPositivo(s, "residuo");
  if (residuo !== null) out.push(achado({ valor_ml: residuo, descricao_livre: "Resíduo pós-miccional", termo_do_medico: "resíduo pós-miccional" }));
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
    vias_biliares: achadosDasViasBiliares(secao(estado, "vias_biliares")),
    pancreas: achadosDoPancreas(secao(estado, "pancreas")),
    baco: achadosDoBaco(secao(estado, "baco")),
    rim_direito: achadosDoRim(secao(estado, "rim_direito")),
    rim_esquerdo: achadosDoRim(secao(estado, "rim_esquerdo")),
    veia_cava: achadosDaVeiaCava(secao(estado, "veia_cava")),
    aorta: achadosDaAorta(secao(estado, "aorta")),
    bexiga: achadosDaBexiga(secao(estado, "bexiga")),
  };

  /**
   * VEIA PORTA é seção do canônico e CAMPO do fígado na tela — a única
   * travessia que muda de lugar. Sem isto, "porta dilatada" sumiria.
   */
  const portaDilatada = texto(secao(estado, "figado"), "porta") === "dilatada";

  const orgaos: Record<string, unknown> = {};
  for (const k of DA_TELA) {
    const a = porOrgao[k] ?? [];
    const status = k === "vesicula" && texto(secao(estado, "vesicula"), "estado") === "ausente"
      ? "ausente_cirurgico"
      : a.length > 0 ? "alterado" : "normal";
    orgaos[k] = { status, achados: status === "ausente_cirurgico" ? [] : a };
  }
  for (const k of SO_DO_CANONICO) orgaos[k] = { status: "normal", achados: [] };
  if (portaDilatada) {
    orgaos.veia_porta = {
      status: "alterado",
      achados: [achado({
        medidas_cm: medidasCm(secao(estado, "figado"), "porta.dilatada.calibre"),
        descricao_livre: "Veia porta de calibre aumentado",
        termo_do_medico: "porta dilatada",
      })],
    };
  }

  return {
    dados: { orgaos, achados_extra_abdominais: [], observacoes_do_medico: "" },
    alteracoes: [],
    pendencias,
  };
}
