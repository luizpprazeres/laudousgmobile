/**
 * Catálogo OBSTETRICA × CLASSICO_COMPLETO.
 *
 * Extração fiel das frases hoje literais em renderer/categories/OBSTETRICA.ts.
 * Nada aqui muda o texto gerado: a equivalência é verificada byte-a-byte pelo
 * harness em __tests__/catalog-equivalence.manual.ts.
 *
 * CONVENÇÃO. O que o médico pode reescrever vive em `frase`, com placeholders
 * nomeados; o dado do exame que a redação dele precisa conservar é declarado em
 * `placeholdersObrigatorios`. O que sobra em `montar` é o que NÃO EXISTE como
 * texto: frase montada de partes condicionais (a placenta descrita).
 *
 * ⚠️ Isto MUDOU em 16/08. Antes, achado patológico era `personalizavel: false`
 * em bloco — e a leitura por trás disso ("patologia não se mexe") travava a
 * Biblioteca: o médico via como o sistema descreve um óbito ou um acretismo e
 * não podia dizer como o laudo DELE os descreve. A proteção nunca foi proibir
 * a edição; é o conjunto de invariantes — o slot não sai (`removivel: false`),
 * o dado não some (`placeholdersObrigatorios`), a frase obrigatória fica
 * (`obrigatorio`). Dentro disso, a redação é do médico. 50 das 55 variantes
 * são editáveis hoje.
 */
import { calcDsm, calcPonderal, ehEmbriao, type ObstetricaFindings } from "../categories/OBSTETRICA";
import type { Catalog, SlotContext } from "./types";

type F = ObstetricaFindings;
type Ctx = SlotContext<F>;

// ---------------------------------------------------------------------------
// Motor: formatação, concordância e cálculo (espelha OBSTETRICA.ts)
// ---------------------------------------------------------------------------

function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}
function mm(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}
const gramas = mm;

function apresentacaoFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  const map: Record<string, string> = {
    cefálico: "cefálica", cefalico: "cefálica", pélvico: "pélvica",
    pelvico: "pélvica", córmico: "córmica", cormico: "córmica", transverso: "transversa",
  };
  return map[t] ?? s.trim();
}
function grauFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().replace(/^grau\s*/i, "");
  const romano: Record<string, string> = { "0": "0", "1": "I", "2": "II", "3": "III" };
  return `grau ${romano[t] ?? t}`;
}
function grannumParen(grau: string | null, grannum: boolean): string {
  if (!grannum) return "";
  const g = grauFmt(grau);
  return g ? ` (${g} de Grannum et al.)` : "";
}
function placentaEco(f: F, grannum: boolean): string | null {
  if (f.placenta_ecotextura) return f.placenta_ecotextura;
  if (!grannum || !f.placenta_grau) return null;
  const g = f.placenta_grau.trim().replace(/^grau\s*/i, "");
  return g === "0" ? "homogênea" : "heterogênea, de acordo com a fase da gestação";
}
export function rotuloFeto(f: F, i: number): string {
  return f.fetos[i]?.rotulo ?? String.fromCharCode(65 + i);
}

/**
 * Fim da PRIMEIRA sentença — o ponto final seguido de espaço + maiúscula, ou o
 * ponto final do texto. É onde entra a atribuição ao feto.
 */
const FIM_PRIMEIRA_SENTENCA = /\.(?=\s+[A-ZÁÂÃÉÊÍÓÔÕÚÜÇ]|\s*$)/;

/**
 * Atribui um item de conclusão ao feto que o gerou — "(feto B)".
 *
 * A marca entra no fim da primeira SENTENÇA, não no fim do item. Várias
 * conclusões de achado terminam com a conduta ("Convém, a critério clínico,
 * realizar neurossonografia fetal…"), e "(feto B)" depois dela atribuiria a
 * RECOMENDAÇÃO ao feto, não o achado:
 *
 *   errado → "Aumento da cisterna magna. … acompanhar a evolução (feto B)."
 *   certo  → "Aumento da cisterna magna (feto B). … acompanhar a evolução."
 *
 * O parêntese é a mesma forma que o corpo já usa na linha do maior bolsão
 * vertical do gemelar ("4,2 cm (feto A) e 3,8 cm (feto B)").
 */
export function atribuirAoFeto(texto: string, rotulo: string): string {
  const marca = ` (feto ${rotulo})`;
  const i = texto.search(FIM_PRIMEIRA_SENTENCA);
  return i === -1 ? `${texto}${marca}` : `${texto.slice(0, i)}${marca}${texto.slice(i)}`;
}

/**
 * A placenta é escrita pelo MOTOR quando há qualquer dado descrito — e sempre
 * no gemelar, onde a frase depende da contagem ("Duas placentas", "Placenta
 * única"). Só o caso "feto único, nada descrito" usa a frase do catálogo.
 */
function placentaAlterada(f: F, grannum: boolean): boolean {
  if (f.numero_fetos >= 2) return true;
  return Boolean(f.placenta_localizacao) || Boolean(placentaEco(f, grannum)) || Boolean(grauFmt(f.placenta_grau));
}
/**
 * Corpo da placenta quando há RELAÇÃO com o orifício interno do colo.
 *
 * Ordem fixada pelos laudos reais do Luiz (14/08):
 *   localização → ecotextura → cláusula de extensão
 *
 * A cláusula não é um trecho intercambiável: a redação difere estruturalmente
 * entre os três casos ("estendendo-se ao segmento" × "estendendo-se
 * inferiormente E margeando" × "estendendo-se ao segmento E recobrindo
 * amplamente"). Por isso são três variantes, não um placeholder.
 *
 * A 2ª frase (distância ao orifício) é OPCIONAL por decisão clínica: só é
 * ditada quando está muito clara, ou quando houve transvaginal complementar.
 */
function placentaRelacaoTexto(f: F, grannum: boolean): string {
  const paren = grannumParen(f.placenta_grau, grannum);
  const eco = placentaEco(f, grannum);
  const grauTxt = grauFmt(f.placenta_grau);

  let frase = "Placenta";
  if (f.placenta_localizacao) frase += ` de localização ${f.placenta_localizacao}`;
  if (!grannum && grauTxt) frase += `, ${grauTxt}`;
  if (eco) frase += `, com ecotextura ${eco}`;
  frase += paren;
  frase += `, ${CLAUSULA_RELACAO[f.placenta_relacao_orificio ?? "insercao_baixa"]}.`;

  if (f.placenta_relacao_orificio === "insercao_baixa" && f.placenta_distancia_orificio_mm != null) {
    frase +=
      ` Sua borda inferior dista cerca de ${ptBr(f.placenta_distancia_orificio_mm)} mm` +
      " do orifício interno do colo uterino, sem recobri-lo.";
  }
  return `\n${frase}`;
}

const CLAUSULA_RELACAO: Record<NonNullable<F["placenta_relacao_orificio"]>, string> = {
  insercao_baixa: "estendendo-se ao segmento uterino inferior",
  marginal:
    "estendendo-se inferiormente e margeando o orifício interno do colo uterino," +
    " sem evidência de recobrimento",
  previa:
    "estendendo-se ao segmento uterino inferior e recobrindo amplamente" +
    " o orifício interno do colo uterino",
};

function placentaTexto(f: F, grannum: boolean): string {
  const paren = grannumParen(f.placenta_grau, grannum);
  const eco = placentaEco(f, grannum);
  const grauTxt = grauFmt(f.placenta_grau);
  if (f.numero_fetos >= 2) {
    const qtd = f.placenta_quantidade ?? f.numero_fetos;
    const base = qtd >= 2 ? (qtd === 2 ? "Duas" : qtd === 3 ? "Três" : String(qtd)) + " placentas" : "Placenta única";
    const loc = f.placenta_localizacao ? `, ${f.placenta_localizacao}` : "";
    const grau = !grannum && grauTxt ? `, ${grauTxt}` : "";
    const ecoTxt = eco ? `, com ecotextura ${eco}` : "";
    return `\n${base}${loc}${grau}${ecoTxt}${paren}.`;
  }
  let frase = "Placenta";
  if (f.placenta_localizacao) frase += ` de localização ${f.placenta_localizacao}`;
  if (!grannum && grauTxt) frase += `, ${grauTxt}`;
  if (eco) frase += `, com ecotextura ${eco}`;
  frase += paren;
  return `\n${frase}.`;
}

type LiquidoKind = "mbv_unico" | "mbv_gemelar" | "ila" | "alterado" | "normal";
function liquidoKind(f: F): LiquidoKind {
  const tipo = f.liquido_tipo ?? "normal";
  if (tipo === "mbv" && f.liquido_mbv_por_feto_cm && f.liquido_mbv_por_feto_cm.length > 0) {
    return f.numero_fetos < 2 ? "mbv_unico" : "mbv_gemelar";
  }
  if (tipo === "ila" && f.liquido_ila_cm != null) return "ila";
  if (tipo === "alterado" && f.liquido_classe) return "alterado";
  return "normal";
}
function mbvUnicoTxt(f: F): string {
  const v = f.liquido_mbv_por_feto_cm?.[0];
  return v !== undefined ? `${ptBr(v)} cm` : "____ cm";
}
function mbvGemelarTxt(f: F): string {
  return (f.liquido_mbv_por_feto_cm ?? [])
    .map((v, i) => `${ptBr(v)} cm (feto ${rotuloFeto(f, i)})`)
    .join(" e ");
}


/** Alterações de vitalidade — valem no feto único E no gemelar (por feto). */
/**
 * Alterações de vitalidade — TEXTO, não código.
 *
 * Eram `montar()` com `personalizavel: false`, e por isso a Biblioteca as
 * mostrava fechadas: o médico via que o sistema escreve "Óbito fetal." e não
 * podia dizer como o laudo DELE descreve um óbito. Como frase com placeholder,
 * a redação passa a ser dele e o dado continua sendo do exame — que é como o
 * resto do catálogo sempre funcionou.
 */
const BCF_ALTERADO: Catalog<F>["slots"][number]["variantes"] = [
  /**
   * Vitalidade ausente — a frase do corpo depende do TRIMESTRE e a palavra
   * embrião/feto depende da IG (10 sem). Dois cortes diferentes.
   */
  { id: "ausente_inicial", quando: (c) => ftDe(c)?.bcf_alteracao === "ausente" && inicial(c),
    frase: "\nBatimentos cardíacos fetais não visualizados pelo modo B ou pelo modo Doppler.",
    conclusao: "{embriao_ou_feto} sem vitalidade.",
    // O substantivo vem da IG, não da redação: sem ele, um laudo de 8 semanas
    // sairia falando em "feto" porque foi assim que a frase foi escrita.
    placeholdersObrigatorios: ["embriao_ou_feto"],
    exemplo: { gestacao_inicial: true, ig_semanas: 8, fetos: [{ bcf_alteracao: "ausente", bcf_bpm: null }] } },
  { id: "ausente", quando: (c) => ftDe(c)?.bcf_alteracao === "ausente",
    frase: "\nAusência de batimentos cardíacos fetais.",
    conclusao: "Óbito fetal.",
    exemplo: { gestacao_inicial: false, ig_semanas: 32, fetos: [{ bcf_alteracao: "ausente", bcf_bpm: null }] } },
  { id: "bradicardia", quando: (c) => ftDe(c)?.bcf_alteracao === "bradicardia",
    frase: "\nBatimentos cardíacos presentes, com frequência de {bcf} bpm.",
    conclusao: "Bradicardia fetal.",
    placeholdersObrigatorios: ["bcf"],
    exemplo: { fetos: [{ bcf_alteracao: "bradicardia", bcf_bpm: 98 }] } },
  { id: "taquicardia", quando: (c) => ftDe(c)?.bcf_alteracao === "taquicardia",
    frase: "\nBatimentos cardíacos presentes, com frequência de {bcf} bpm.",
    conclusao: "Taquicardia fetal.",
    placeholdersObrigatorios: ["bcf"],
    exemplo: { fetos: [{ bcf_alteracao: "taquicardia", bcf_bpm: 182 }] } },
];

/**
 * Achados de crânio/SNC — redação clínica do Dr. Luiz (16/08).
 * Ver docs/catalogo-patologias-obstetrica-spec-2026-08-16.md §3.
 *
 * Todas `personalizavel: false` (crítica C3): são achados patológicos, e frase
 * personalizada de normalidade jamais pode mascarar patologia.
 */
const NEURO = "Convém, a critério clínico, realizar neurossonografia fetal, com objetivo de acompanhar a evolução.";
const md = (c: Ctx) => { const v = ftDe(c)?.cranio_medida_mm; return v != null ? ptBr(v) : "____"; };
const lat = (c: Ctx) => ftDe(c)?.cranio_lateralidade ?? "____";

const CRANIO_VARIANTES: Catalog<F>["slots"][number]["variantes"] = [
  { id: "ventriculomegalia", quando: (c) => ftDe(c)?.cranio_achado === "ventriculomegalia",
    frase: "\nVentriculomegalia, com átrio ventricular medindo {cranio_medida} mm.",
    placeholdersObrigatorios: ["cranio_medida"],
    exemplo: { fetos: [{ cranio_achado: "ventriculomegalia", cranio_medida_mm: 11 }] } },

  { id: "cisto_plexo_coroide", quando: (c) => ftDe(c)?.cranio_achado === "cisto_plexo_coroide",
    frase: "\nImagem anecoica, de contornos regulares, medindo {cranio_medida} mm, situada no plexo coroide {cranio_lateralidade}.",
    conclusao: "Cisto de plexo coroide {cranio_lateralidade}.",
    // O LADO é dado do exame, não redação: uma frase sem ele diria que há um
    // cisto sem dizer em qual plexo.
    placeholdersObrigatorios: ["cranio_medida", "cranio_lateralidade"],
    exemplo: { fetos: [{ cranio_achado: "cisto_plexo_coroide", cranio_medida_mm: 5, cranio_lateralidade: "à esquerda" }] } },

  { id: "megacisterna_magna", quando: (c) => ftDe(c)?.cranio_achado === "megacisterna_magna",
    frase: "\nCisterna magna aumentada, medindo {cranio_medida} mm, com hemisférios cerebelares e vermis apresentando morfologia preservada.",
    conclusao: `Aumento da cisterna magna. O diagnóstico mais provável é megacisterna magna. ${NEURO}`,
    placeholdersObrigatorios: ["cranio_medida"],
    exemplo: { fetos: [{ cranio_achado: "megacisterna_magna", cranio_medida_mm: 12 }] } },

  { id: "cisto_bolsa_blake", quando: (c) => ftDe(c)?.cranio_achado === "cisto_bolsa_blake",
    frase: "\nImagem anecoica na fossa posterior, em continuidade com o quarto ventrículo, associada a discreta rotação superior do vermis, que apresenta dimensões e morfologia preservadas.",
    conclusao: `Achados sugestivos de cisto da bolsa de Blake. ${NEURO}`,
    exemplo: { fetos: [{ cranio_achado: "cisto_bolsa_blake" }] } },

  { id: "dandy_walker", quando: (c) => ftDe(c)?.cranio_achado === "dandy_walker",
    frase: "\nAumento da fossa posterior, associado a comunicação do quarto ventrículo com a cisterna magna, rotação superior e alteração morfológica do vermis cerebelar.",
    conclusao: `Achados ultrassonográficos que levantam a possibilidade de malformação da fossa posterior. O diagnóstico mais provável é malformação de Dandy-Walker. ${NEURO}`,
    exemplo: { fetos: [{ cranio_achado: "dandy_walker" }] } },

  { id: "cavum_nao_visualizado", quando: (c) => ftDe(c)?.cranio_achado === "cavum_nao_visualizado",
    frase: "\nNão foi visualizado o cavum do septo pelúcido nos planos ultrassonográficos obtidos.",
    conclusao: `Não visualização do cavum do septo pelúcido. ${NEURO}`,
    exemplo: { fetos: [{ cranio_achado: "cavum_nao_visualizado" }] } },
];

// ---------------------------------------------------------------------------
// Variáveis expostas ao catálogo
// ---------------------------------------------------------------------------

export const VARIAVEIS_OBSTETRICA = [
  "dsm", "sg_medidas", "apresentacao", "dorso_sufixo", "polo_sufixo",
  "bcf", "dbp", "cc", "ca", "cf", "ccn", "peso", "peso_extras",
  "rotulo", "qtd_fetos_label", "fetos_descricao",
  "peso_medio", "divergencia_g", "divergencia_pct",
  "ila", "mbv", "mbv_gemelar", "liquido_classe", "liquido_classe_cap",
  "achados_adicionais", "cordao_vasos_txt",
  // Dados dos achados patológicos — o que torna essas frases editáveis sem
  // que a redação do médico possa descartar a medida ou o lado.
  "cranio_medida", "cranio_lateralidade", "placenta_achado_medidas", "embriao_ou_feto",
] as const;

export function varsObstetrica(ctx: Ctx): Record<string, string> {
  const f = ctx.findings;
  const ft = f.fetos[ctx.fetoIndex];
  const pond = calcPonderal(f.fetos);

  const extras: string[] = [];
  if (ft?.peso_variacao_g != null) extras.push(`+- ${gramas(ft.peso_variacao_g)} gramas`);
  if (ft?.percentil != null) extras.push(`percentil ${ptBr(ft.percentil)}`);

  const qtd = f.numero_fetos;
  const descricoes = f.fetos.map((x, i) => {
    const rot = x.rotulo ?? String.fromCharCode(65 + i);
    const pos = x.posicao_relativa ? `o feto ${x.posicao_relativa} (feto ${rot})` : `o feto ${rot}`;
    const ap = apresentacaoFmt(x.apresentacao);
    return `${pos}${ap ? `, em apresentação ${ap}` : ""}${x.dorso ? ` com dorso ${x.dorso}` : ""}${x.polo_cefalico ? ` com polo cefálico ${x.polo_cefalico}` : ""}`;
  });

  const classe = f.liquido_classe ?? "";
  return {
    dsm: mm(calcDsm(f)),
    sg_medidas: (f.saco_gestacional_medidas_mm ?? []).map((n) => ptBr(n)).join(" x "),
    apresentacao: apresentacaoFmt(ft?.apresentacao ?? null) ?? (f.gestacao_inicial ? "transversa" : "cefálica"),
    dorso_sufixo: ft?.dorso ? `, com dorso ${ft.dorso}` : "",
    polo_sufixo: ft?.polo_cefalico ? `, com polo cefálico ${ft.polo_cefalico}` : "",
    bcf: ft?.bcf_bpm != null ? ptBr(ft.bcf_bpm) : "____",
    dbp: mm(ft?.dbp_mm ?? null),
    cc: mm(ft?.cc_mm ?? null),
    ca: mm(ft?.ca_mm ?? null),
    cf: mm(ft?.cf_mm ?? null),
    ccn: mm(ft?.ccn_mm ?? null),
    peso: gramas(ft?.peso_g ?? null),
    peso_extras: extras.length > 0 ? ` (${extras.join(", ")})` : "",
    rotulo: rotuloFeto(f, ctx.fetoIndex),
    qtd_fetos_label: qtd === 2 ? "Dois fetos" : qtd === 3 ? "Três fetos" : `${qtd} fetos`,
    fetos_descricao: descricoes.join(", e "),
    peso_medio: gramas(pond.pesoMedio),
    divergencia_g: gramas(pond.divergenciaG),
    divergencia_pct: ptBr(pond.divergenciaPct ?? 0),
    ila: f.liquido_ila_cm !== null ? ptBr(f.liquido_ila_cm) : "____",
    mbv: mbvUnicoTxt(f),
    mbv_gemelar: mbvGemelarTxt(f),
    liquido_classe: classe,
    liquido_classe_cap: classe ? `${classe.charAt(0).toUpperCase()}${classe.slice(1)}` : "",
    achados_adicionais: f.achados_adicionais?.trim() ?? "",
    /**
     * A contagem de vasos vem do ACHADO, não do texto.
     *
     * Estava cravada na frase ("…com duas artérias e uma veia."), e a frase é
     * editável — nada impedia a personalização de reescrevê-la sem os vasos, ou
     * pior, com o número errado. Como placeholder obrigatório, o dado sobrevive
     * a qualquer redação que o médico escolha.
     */
    cordao_vasos_txt: ft?.cordao_vasos === "dois" ? "uma artéria e uma veia" : "duas artérias e uma veia",
    /**
     * Dados dos achados — os mesmos que as frases patológicas interpolavam em
     * código. Como variáveis, a redação passa a ser do médico e o dado
     * continua sendo do exame.
     */
    cranio_medida: ft?.cranio_medida_mm != null ? ptBr(ft.cranio_medida_mm) : "____",
    cranio_lateralidade: ft?.cranio_lateralidade ?? "____",
    placenta_achado_medidas: f.placenta_achado_medidas ?? "____",
    /** O corte de 10 semanas — ver `ehEmbriao`. */
    embriao_ou_feto: ehEmbriao(f) ? "Embrião" : "Feto",
  };
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/** O feto em contexto — no gemelar cada repetição traz o seu `fetoIndex`. */
const ftDe = (c: Ctx) => c.findings.fetos[c.fetoIndex];
const inicial = (c: Ctx) => c.findings.gestacao_inicial;
/** "Embrião" só abaixo de 10 semanas — eixo independente de `inicial`. */
const embriao = (c: Ctx) => ehEmbriao(c.findings);
const padrao = (c: Ctx) => !c.findings.gestacao_inicial;

export const OBSTETRICA_CLASSICO: Catalog<F> = {
  id: "OBSTETRICA/CLASSICO_COMPLETO",
  categoria: "OBSTETRICA",
  estilo: "CLASSICO_COMPLETO",
  /**
   * v2 (2026-08-16) — 33 → 53 variantes.
   *
   * Slots novos: `placenta_achado`, `cranio_achado`, `cordao_umbilical`.
   * Variantes novas em `bcf`, `bcf_gemelar` e `movimentos_fetais`.
   * `feto` ganhou `inicial_embriao` × `inicial_feto` (corte de 10 semanas).
   *
   * O bump faz personalizações gravadas contra a v1 aparecerem como
   * `baseDesatualizado` — que é o comportamento certo: a estrutura mudou, e o
   * médico precisa saber antes de publicar por cima.
   */
  versao: 2,
  variaveis: VARIAVEIS_OBSTETRICA,

  /**
   * Como cada dado se chama para o médico.
   *
   * A tela mostrava o nome da variável, e nome de variável é de programador:
   * `{apresentacao}{dorso_sufixo}{polo_sufixo}` aparecia como
   * "apresentacaodorso sufixopolo sufixo" — três pedaços colados, sem acento,
   * com o `_` virando espaço. O Luiz abriu a Biblioteca e leu isso.
   *
   * Os "sufixo" são trechos CONDICIONAIS (só saem quando ditados), e o rótulo
   * precisa dizer isso — senão o médico acha que sumiu um dado do laudo dele.
   */
  rotulosVariaveis: {
    apresentacao: "apresentação",
    dorso_sufixo: "dorso, se ditado",
    polo_sufixo: "polo cefálico, se ditado",
    bcf: "BCF",
    dbp: "DBP", cc: "CC", ca: "CA", cf: "CF", ccn: "CCN",
    peso: "peso", peso_extras: "variação e percentil, se ditados",
    dsm: "DSM", sg_medidas: "medidas do saco",
    rotulo: "letra do feto", qtd_fetos_label: "quantidade de fetos",
    fetos_descricao: "descrição dos fetos",
    peso_medio: "peso médio", divergencia_g: "divergência em gramas",
    divergencia_pct: "divergência em %",
    ila: "ILA", mbv: "maior bolsão", mbv_gemelar: "maior bolsão por feto",
    liquido_classe: "classe do líquido", liquido_classe_cap: "classe do líquido",
    achados_adicionais: "achados ditados",
    cordao_vasos_txt: "vasos do cordão",
    cranio_medida: "medida", cranio_lateralidade: "lado",
    placenta_achado_medidas: "medidas do achado",
    embriao_ou_feto: "embrião ou feto",
  },

  titulo: (c) =>
    c.gemelar ? "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR" : "ULTRASSONOGRAFIA OBSTÉTRICA",

  cabecalhos: { corpo: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", conclusao: "CONCLUSÃO:" },

  preambulo:
    "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.",

  numerarConclusao: (i, total) => (total === 1 ? "" : `${i + 1}) `),

  /**
   * Gemelar: o achado é de UM feto, e a conclusão precisa dizer qual.
   *
   * Só vale para segmentos com `instance` — ou seja, os slots repetidos por
   * feto (vitalidade, crânio, cordão). Itens do exame (líquido, ponderal, IG)
   * não têm instância e saem sem marca, como hoje.
   */
  atribuirConclusao: atribuirAoFeto,

  // No corpo o ponderal vem antes de placenta/líquido; na conclusão, depois.
  ordemConclusao: () => ["liquido_amniotico", "ponderal"],

  ordem: (c) => {
    if (c.gemelar) {
      return [
        "fetos_resumo",
        {
          repetirPorFeto: c.findings.gestacao_inicial
            ? ["feto_header", "bcf_gemelar", "ccn", "cranio_achado", "cordao_umbilical", "peso_fetal"]
            : ["feto_header", "bcf_gemelar", "movimentos_achado", "cranio_achado", "cordao_umbilical", "dbp", "cc", "ca", "cf", "peso_fetal"],
        },
        "ponderal",
        "placenta",
        "placenta_achado",
        "liquido_amniotico",
        "achados_adicionais",
      ];
    }
    if (c.findings.gestacao_inicial) {
      return [
        "saco_gestacional", "feto", "bcf", "cranio_achado", "ccn",
        "vesicula_vitelina", "cordao_umbilical", "liquido_amniotico", "ovarios", "achados_adicionais",
      ];
    }
    return [
      "feto", "bcf", "movimentos_fetais", "movimentos_achado",
      "anatomia_header", "anatomia_cranio", "cranio_achado", "anatomia_visceras",
      "biometria_header", "dbp", "cc", "ca", "cf", "peso_fetal",
      "placenta", "placenta_achado", "cordao_umbilical", "liquido_amniotico", "achados_adicionais",
    ];
  },

  slots: [
    {
      id: "saco_gestacional",
      placeholdersObrigatorios: ["dsm"],
      variantes: [{ id: "normal", frase: "Saco gestacional de forma normal, com diâmetro médio de {dsm} mm." }],
    },
    {
      id: "feto",
      variantes: [
        /**
         * DOIS eixos, não um (bug 16/08 — ver OBSTETRICA.ts `ehEmbriao`):
         *   `inicial` (≤13s6d) escolhe a FORMA  — "em situação" × "em apresentação"
         *   `embriao` (<10 sem) escolhe a PALAVRA — "Embrião" × "Feto"
         * Entre 10s0d e 13s6d é gestação inicial COM feto.
         */
        { id: "inicial_embriao", quando: (c) => inicial(c) && embriao(c),
          frase: "Embrião único, em situação {apresentacao}{dorso_sufixo}{polo_sufixo}." },
        { id: "inicial_feto", quando: inicial,
          frase: "Feto único, em situação {apresentacao}{dorso_sufixo}{polo_sufixo}." },
        { id: "padrao", frase: "Feto único, em apresentação {apresentacao}{dorso_sufixo}{polo_sufixo}." },
      ],
    },
    {
      id: "fetos_resumo",
      variantes: [{ id: "gemelar", frase: "{qtd_fetos_label}: {fetos_descricao}." }],
    },
    {
      id: "feto_header",
      variantes: [{ id: "gemelar", frase: "\nFeto {rotulo}:" }],
    },
    {
      id: "bcf",
      /** Carrega achado alterado — ver Slot.removivel (C3). */
      removivel: false,
      obrigatorio: true,
      placeholdersObrigatorios: ["bcf"],
      variantes: [
        ...BCF_ALTERADO,
        { id: "inicial", quando: inicial, frase: "Batimentos cardíacos ritmados (BCF = {bcf} bpm)." },
        { id: "padrao", frase: "Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = {bcf} bpm)." },
      ],
    },
    {
      id: "bcf_gemelar",
      /** Carrega achado alterado — ver Slot.removivel (C3). */
      removivel: false,
      obrigatorio: true,
      placeholdersObrigatorios: ["bcf"],
      // As alterações de vitalidade valem por feto — Luiz 16/08: "acontece de
      // um feto ter óbito e o outro não".
      variantes: [...BCF_ALTERADO, { id: "gemelar", frase: "Batimentos cardíacos presentes (BCF = {bcf} bpm)." }],
    },
    {
      id: "movimentos_fetais",
      /** Carrega achado alterado — ver Slot.removivel (C3). */
      removivel: false,
      /**
       * Feto sem vitalidade não tem movimento — nem "ativos" (contradição
       * direta com o óbito), nem "reduzidos". O slot inteiro sai.
       */
      incluirSe: (c) => ftDe(c)?.bcf_alteracao !== "ausente",
      /**
       * Política de ausência AFIRMATIVA (Luiz 16/08): não dito ⇒ "ativos".
       * É o OPOSTO da placenta, e está certo — movimentos são observados
       * durante todo o exame; silêncio significa presença.
       */
      variantes: [
        { id: "normal", frase: "Os movimentos fetais são ativos." },
      ],
    },
    {
      /**
       * ACHADO de movimentos — slot próprio e condicional, mesmo padrão de
       * `placenta_achado` e `cranio_achado`. Como slot condicional pode entrar
       * na ordem GEMELAR por feto; a frase de normalidade, que é incondicional,
       * entraria em todo laudo gemelar (a equivalência pegou).
       */
      id: "movimentos_achado",
      removivel: false,
      incluirSe: (c) => ftDe(c)?.movimentos_fetais != null && ftDe(c)?.bcf_alteracao !== "ausente",
      variantes: [
        { id: "ausentes", quando: (c) => ftDe(c)?.movimentos_fetais === "ausentes",
          frase: "\nNão foram observados movimentos fetais durante o exame.",
          exemplo: { fetos: [{ movimentos_fetais: "ausentes" }] } },
        { id: "reduzidos", quando: (c) => ftDe(c)?.movimentos_fetais === "reduzidos",
          frase: "\nMovimentos fetais reduzidos.",
          exemplo: { fetos: [{ movimentos_fetais: "reduzidos" }] } },
      ],
    },
    { id: "anatomia_header", variantes: [{ id: "normal", frase: "\nAs considerações sobre a anatomia fetal são as seguintes:" }] },
    {
      id: "anatomia_cranio",
      // Mesma regra da placenta: com achado de crânio, a frase de normalidade
      // some — o achado a substitui.
      variantes: [{ id: "normal", quando: (c) => ftDe(c)?.cranio_achado == null,
        frase: "As estruturas cranianas e da coluna vertebral são normais." }],
    },
    {
      /**
       * ACHADO de crânio — slot PRÓPRIO e condicional, não variante da frase de
       * normalidade. Mesmo motivo da `placenta_achado`: são eixos diferentes, e
       * como slot condicional pode entrar também na ordem GEMELAR, por feto,
       * sem alterar o laudo de quem não tem achado.
       */
      id: "cranio_achado",
      /** Carrega achado alterado — ver Slot.removivel (C3). */
      removivel: false,
      incluirSe: (c) => ftDe(c)?.cranio_achado != null,
      variantes: CRANIO_VARIANTES,
    },
    { id: "anatomia_visceras", variantes: [{ id: "normal", frase: "O estômago e a bexiga foram bem identificados e com ecotextura homogênea." }] },
    { id: "biometria_header", variantes: [{ id: "normal", frase: "\nA biometria fetal é a seguinte:" }] },
    { id: "dbp", obrigatorio: true, placeholdersObrigatorios: ["dbp"], variantes: [{ id: "normal", frase: "Diâmetro biparietal (DBP) de {dbp} mm." }] },
    { id: "cc", obrigatorio: true, placeholdersObrigatorios: ["cc"], variantes: [{ id: "normal", frase: "Circunferência da cabeça (CC) de {cc} mm." }] },
    { id: "ca", obrigatorio: true, placeholdersObrigatorios: ["ca"], variantes: [{ id: "normal", frase: "Circunferência abdominal (CA) de {ca} mm." }] },
    { id: "cf", obrigatorio: true, placeholdersObrigatorios: ["cf"], variantes: [{ id: "normal", frase: "Comprimento do fêmur (CF) de {cf} mm." }] },
    { id: "ccn", placeholdersObrigatorios: ["ccn"], variantes: [{ id: "normal", frase: "Comprimento crânio-nádegas (CCN) de {ccn} mm." }] },
    { id: "peso_fetal", obrigatorio: true, placeholdersObrigatorios: ["peso"], variantes: [{ id: "normal", frase: "Peso aproximado de {peso} gramas{peso_extras}." }] },
    {
      id: "ponderal",
      incluirSe: (c) => calcPonderal(c.findings.fetos).pesoMedio !== null,
      variantes: [
        {
          id: "gemelar",
          frase: "\nPeso fetal médio de {peso_medio} gramas. Divergência ponderal de {divergencia_g} gramas ({divergencia_pct}%).",
          montarConclusao: (c) => {
            const p = calcPonderal(c.findings.fetos);
            if (p.divergenciaG === null) return "";
            return (p.divergenciaPct ?? 0) >= 20
              ? `Divergência ponderal significativa entre os fetos (${ptBr(p.divergenciaPct ?? 0)}%).`
              : "Fetos com pesos concordantes, sem divergência ponderal significativa.";
          },
        },
      ],
    },
    {
      id: "placenta",
      /** Carrega achado alterado — ver Slot.removivel (C3). */
      removivel: false,
      variantes: [
        /**
         * RELAÇÃO COM O ORIFÍCIO INTERNO — eixo independente da topografia.
         *
         * Vêm ANTES de `descrita` de propósito: `pickVariant` pega a primeira
         * condição verdadeira, e `placentaAlterada()` também seria true aqui.
         * Os predicados exigem `placenta_relacao_orificio`, então não há
         * sobreposição entre eles nem ambiguidade de ordem com o resto.
         *
         * `personalizavel: false` pela crítica C3: são achados PATOLÓGICOS, e
         * frase personalizada jamais pode mascarar patologia. Quem escreve é o
         * motor. O que o médico personaliza é a placenta normal (`descrita`).
         *
         * Spec clínica: docs/plano-biblioteca-implementacao-2026-08-12.md §A.5.3
         */
        {
          id: "insercao_baixa",
          quando: (c) => c.findings.placenta_relacao_orificio === "insercao_baixa",
          montar: (c) => placentaRelacaoTexto(c.findings, c.flags.grannum),
          montarConclusao: () => "Placenta de inserção baixa.",
          personalizavel: false,
          exemplo: {
            placenta_localizacao: "posterior",
            placenta_ecotextura: "homogênea",
            placenta_relacao_orificio: "insercao_baixa",
            placenta_distancia_orificio_mm: 12,
          },
        },
        {
          id: "marginal",
          quando: (c) => c.findings.placenta_relacao_orificio === "marginal",
          montar: (c) => placentaRelacaoTexto(c.findings, c.flags.grannum),
          // Forma tradicional é o padrão (decisão Luiz 14/08). A descritiva
          // ("Placenta de localização baixa, cuja borda inferior alcança o
          // orifício interno do colo uterino, sem recobri-lo.") entra como
          // variante escolhível na Biblioteca — depende dos pré-requisitos §A.3.
          montarConclusao: () => "Placenta prévia marginal.",
          personalizavel: false,
          exemplo: {
            placenta_localizacao: "anterior",
            placenta_ecotextura: "homogênea",
            placenta_relacao_orificio: "marginal",
          },
        },
        {
          id: "previa",
          quando: (c) => c.findings.placenta_relacao_orificio === "previa",
          montar: (c) => placentaRelacaoTexto(c.findings, c.flags.grannum),
          montarConclusao: () => "Placenta prévia.",
          personalizavel: false,
          exemplo: {
            placenta_localizacao: "anterior",
            placenta_ecotextura: "homogênea",
            placenta_relacao_orificio: "previa",
          },
        },
        // Estado ALTERADO: escrito pelo motor, nunca personalizável (crítica C3).
        {
          id: "descrita",
          quando: (c) => placentaAlterada(c.findings, c.flags.grannum),
          montar: (c) => placentaTexto(c.findings, c.flags.grannum),
          personalizavel: false,
          exemplo: { placenta_localizacao: "anterior", placenta_ecotextura: "homogênea" },
        },
        /**
         * Sem `quando` esta era o fallback incondicional — e com achado agudo
         * sem descrição o laudo saía "Placenta de aspecto normal." SEGUIDO da
         * descrição do acretismo (revisão Codex 16/08). Com o predicado, e sem
         * nenhuma variante casando, o slot de descrição é OMITIDO — que é o
         * certo: quem descreve a placenta ali é o achado.
         */
        /**
         * `padrao: true` porque o predicado acima tirou dela o papel de
         * fallback — e sem a marca a Biblioteca perdia a única frase de
         * placenta que o médico PODE reescrever. Ver SlotVariant.padrao.
         */
        { id: "normal", quando: (c) => c.findings.placenta_achado == null, padrao: true,
          frase: "\nPlacenta de aspecto normal." },
      ],
    },
    {
      /**
       * ACHADO AGUDO — slot PRÓPRIO, não variante de `placenta`.
       *
       * BUG (revisão Codex 16/08): estavam como variantes do mesmo slot que a
       * descrição e a relação com o orifício. Como `pickVariant` pega a
       * primeira condição verdadeira, ditar "acretismo + prévia + anterior"
       * fazia sumir a relação E a topografia — só o acretismo saía.
       *
       * São TRÊS eixos independentes da placenta:
       *   topografia + ecotextura  → frase de descrição   (slot `placenta`)
       *   relação com o orifício   → cláusula na mesma frase
       *   achado agudo             → frase PRÓPRIA, adicional  (este slot)
       *
       * Clinicamente é frase à parte mesmo: a redação do Luiz para os três
       * agudos é uma sentença completa, que não substitui a descrição.
       */
      id: "placenta_achado",
      /** Carrega achado alterado — ver Slot.removivel (C3). */
      removivel: false,
      /** `!= null` cobre campo AUSENTE — ver a nota em `cordao_umbilical`. */
      incluirSe: (c) => c.findings.placenta_achado != null,
      variantes: [
        { id: "descolamento", quando: (c) => c.findings.placenta_achado === "descolamento",
          frase: "\nImagem hipoecoica e heterogênea, medindo {placenta_achado_medidas}, situada entre a placenta e o miométrio, sem vascularização.",
          conclusao: "Coleção retroplacentária, que tem como diagnóstico mais provável descolamento placentário.",
          placeholdersObrigatorios: ["placenta_achado_medidas"],
          exemplo: { placenta_achado: "descolamento", placenta_achado_medidas: "3,2 x 1,8 cm" } },
        { id: "acretismo", quando: (c) => c.findings.placenta_achado === "acretismo",
          frase: "\nPlacenta apresentando perda focal da zona hipoecoica retroplacentária e acentuado adelgaçamento do miométrio subjacente. Ademais, imagens anecoicas intraplacentárias, irregulares, algumas apresentando fluxo turbulento ao estudo Doppler, associadas a aumento da vascularização na interface uterovesical.",
          conclusao: "Achados ultrassonográficos que aumentam a suspeição para espectro de acretismo placentário (PAS). Convém, a critério clínico, avaliação dirigida em serviço de alto risco e controle ultrassonográfico.",
          exemplo: { placenta_achado: "acretismo" } },
        { id: "lagos_venosos", quando: (c) => c.findings.placenta_achado === "lagos_venosos",
          frase: "\nPlacenta apresentando imagens anecoicas intraparenquimatosas, bem delimitadas, de contornos regulares, algumas demonstrando fluxo de baixa velocidade ao estudo Doppler.",
          conclusao: "Lagos venosos placentários.",
          exemplo: { placenta_achado: "lagos_venosos" } },
      ],
    },
    {
      id: "liquido_amniotico",
      variantes: [
        {
          id: "mbv_unico",
          quando: (c) => liquidoKind(c.findings) === "mbv_unico",
          frase: "Maior bolsão vertical de {mbv}.",
          conclusao: "Líquido amniótico em quantidade normal (maior bolsão vertical de {mbv}).",
        },
        {
          id: "mbv_gemelar",
          quando: (c) => liquidoKind(c.findings) === "mbv_gemelar",
          frase: "Maior bolsão vertical de {mbv_gemelar}.",
          conclusao: "Líquido amniótico em quantidade normal para ambos os fetos (maior bolsão vertical de {mbv_gemelar}).",
          // A lista por feto é montada pelo motor, mas chega como UM dado: a
          // redação é do médico desde que ela não seja descartada.
          placeholdersObrigatorios: ["mbv_gemelar"],
        },
        {
          id: "ila",
          quando: (c) => liquidoKind(c.findings) === "ila",
          frase: "Índice de líquido amniótico (ILA) de {ila} cm.",
          conclusao: "Líquido amniótico em quantidade normal (ILA de {ila} cm).",
        },
        {
          id: "alterado",
          quando: (c) => liquidoKind(c.findings) === "alterado",
          frase: "Líquido amniótico em quantidade alterada ({liquido_classe}).",
          conclusao: "{liquido_classe_cap}.",
          placeholdersObrigatorios: ["liquido_classe"],
          // `exemplo` é o que faz esta variante aparecer na lista de ACHADOS —
          // ela vive num slot incondicional, então sem isto sumia (Codex 19/08).
          exemplo: { liquido_tipo: "alterado", liquido_classe: "oligoâmnio" },
        },
        {
          id: "normal",
          frase: "Líquido amniótico de quantidade normal pela análise subjetiva.",
          conclusao: "Líquido amniótico em quantidade normal.",
        },
      ],
    },
    {
      id: "cordao_umbilical",
      /** Carrega achado alterado — ver Slot.removivel (C3). */
      removivel: false,
      /**
       * A contagem de vasos é o dado do slot — nenhuma redação pode descartá-la.
       * Vale só para a variante editável (`normal`); a de artéria única é
       * `personalizavel: false` e sequer chega à validação.
       */
      placeholdersObrigatorios: ["cordao_vasos_txt"],
      /**
       * SÓ entra quando o médico disse algo sobre o cordão.
       *
       * Sem isto, todo laudo obstétrico ganharia a frase de normalidade do
       * cordão — mudança de comportamento em 100% dos laudos, que a
       * equivalência pegou na hora. Afirmar "três vasos" sem ter avaliado é o
       * mesmo defeito da técnica/via.
       *
       * `!= null` e não `!== null`: o campo pode vir AUSENTE, não nulo.
       * `undefined !== null` é `true`, e com isso o slot voltava a entrar em
       * todo laudo — foi o que a equivalência contra laudos REAIS pegou (0/12,
       * todos com "O cordão umbilical tem aspecto normal" enxertado). A
       * equivalência sintética não viu porque o feto-base dela crava
       * `cordao_vasos: null` explicitamente; o `structured_output` de campo
       * simplesmente não traz a chave.
       */
      incluirSe: (c) => ftDe(c)?.cordao_vasos != null,
      variantes: [
        { id: "arteria_unica", quando: (c) => ftDe(c)?.cordao_vasos === "dois",
          frase: "\nO cordão umbilical tem dois vasos, sendo uma artéria e uma veia.",
          conclusao: "Artéria umbilical única.",
          exemplo: { fetos: [{ cordao_vasos: "dois" }] } },
        /**
         * Normal NÃO vai à conclusão (Luiz 16/08).
         *
         * Continua EDITÁVEL de propósito: é frase de normalidade, e a crítica C3
         * só proíbe personalizar ACHADO ALTERADO. E como o slot é condicional,
         * ela só sai quando o médico avaliou o cordão — não é normalidade
         * presumida do silêncio.
         */
        { id: "normal", frase: "\nO cordão umbilical tem aspecto normal, com {cordao_vasos_txt}.",
          exemplo: { fetos: [{ cordao_vasos: "tres" }] } },
      ],
    },
    { id: "vesicula_vitelina", variantes: [{ id: "normal", frase: "Vesícula vitelina de forma e dimensões normais." }] },
    { id: "ovarios", variantes: [{ id: "normal", frase: "Ovários de aspecto normal." }] },
    {
      id: "achados_adicionais",
      incluirSe: (c) => Boolean(c.findings.achados_adicionais?.trim()),
      variantes: [{ id: "livre", frase: "\n{achados_adicionais}", personalizavel: false }],
    },
  ],
};

/**
 * Quando o item de líquido entra na conclusão.
 *
 * Assimetria real do renderer, preservada aqui: no FETO ÚNICO a gestação
 * inicial omite o item (só sai a IG); no GEMELAR ele entra sempre, inclusive
 * no inicial (OBSTETRICA.ts:604-605 não tem o guard que existe em :648).
 * É regra do motor, não do texto — por isso vive aqui e não no catálogo.
 */
export function conclusaoLiquidoAplicavel(f: F): boolean {
  return f.numero_fetos >= 2 || !f.gestacao_inicial;
}
