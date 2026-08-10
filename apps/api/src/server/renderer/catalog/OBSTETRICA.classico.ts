/**
 * Catálogo OBSTETRICA × CLASSICO_COMPLETO.
 *
 * Extração fiel das frases hoje literais em renderer/categories/OBSTETRICA.ts.
 * Nada aqui muda o texto gerado: a equivalência é verificada byte-a-byte pelo
 * harness em __tests__/catalog-equivalence.manual.ts.
 *
 * Convenção: o que é editável pelo usuário vive em `frase` (com placeholders
 * nomeados). O que o motor decide vive em `montar` ou em variante marcada
 * `personalizavel: false` — estados clínicos alterados nunca são reescritos.
 */
import { calcDsm, calcPonderal, type ObstetricaFindings } from "../categories/OBSTETRICA";
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
 * A placenta é escrita pelo MOTOR quando há qualquer dado descrito — e sempre
 * no gemelar, onde a frase depende da contagem ("Duas placentas", "Placenta
 * única"). Só o caso "feto único, nada descrito" usa a frase do catálogo.
 */
function placentaAlterada(f: F, grannum: boolean): boolean {
  if (f.numero_fetos >= 2) return true;
  return Boolean(f.placenta_localizacao) || Boolean(placentaEco(f, grannum)) || Boolean(grauFmt(f.placenta_grau));
}
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
  if (tipo === "ila" && f.liquido_ila_cm !== null) return "ila";
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

// ---------------------------------------------------------------------------
// Variáveis expostas ao catálogo
// ---------------------------------------------------------------------------

export const VARIAVEIS_OBSTETRICA = [
  "dsm", "sg_medidas", "apresentacao", "dorso_sufixo", "polo_sufixo",
  "bcf", "dbp", "cc", "ca", "cf", "ccn", "peso", "peso_extras",
  "rotulo", "qtd_fetos_label", "fetos_descricao",
  "peso_medio", "divergencia_g", "divergencia_pct",
  "ila", "mbv", "mbv_gemelar", "liquido_classe", "liquido_classe_cap",
  "achados_adicionais",
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
  };
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

const inicial = (c: Ctx) => c.findings.gestacao_inicial;
const padrao = (c: Ctx) => !c.findings.gestacao_inicial;

export const OBSTETRICA_CLASSICO: Catalog<F> = {
  id: "OBSTETRICA/CLASSICO_COMPLETO",
  categoria: "OBSTETRICA",
  estilo: "CLASSICO_COMPLETO",
  versao: 1,
  variaveis: VARIAVEIS_OBSTETRICA,

  titulo: (c) =>
    c.gemelar ? "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR" : "ULTRASSONOGRAFIA OBSTÉTRICA",

  cabecalhos: { corpo: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", conclusao: "CONCLUSÃO:" },

  preambulo:
    "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.",

  numerarConclusao: (i, total) => (total === 1 ? "" : `${i + 1}) `),

  // No corpo o ponderal vem antes de placenta/líquido; na conclusão, depois.
  ordemConclusao: () => ["liquido_amniotico", "ponderal"],

  ordem: (c) => {
    if (c.gemelar) {
      return [
        "fetos_resumo",
        {
          repetirPorFeto: c.findings.gestacao_inicial
            ? ["feto_header", "bcf_gemelar", "ccn", "peso_fetal"]
            : ["feto_header", "bcf_gemelar", "dbp", "cc", "ca", "cf", "peso_fetal"],
        },
        "ponderal",
        "placenta",
        "liquido_amniotico",
        "achados_adicionais",
      ];
    }
    if (c.findings.gestacao_inicial) {
      return [
        "saco_gestacional", "feto", "bcf", "ccn",
        "vesicula_vitelina", "liquido_amniotico", "ovarios", "achados_adicionais",
      ];
    }
    return [
      "feto", "bcf", "movimentos_fetais",
      "anatomia_header", "anatomia_cranio", "anatomia_visceras",
      "biometria_header", "dbp", "cc", "ca", "cf", "peso_fetal",
      "placenta", "liquido_amniotico", "achados_adicionais",
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
        { id: "inicial", quando: inicial, frase: "Embrião único, em situação {apresentacao}{dorso_sufixo}{polo_sufixo}." },
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
      obrigatorio: true,
      placeholdersObrigatorios: ["bcf"],
      variantes: [
        { id: "inicial", quando: inicial, frase: "Batimentos cardíacos ritmados (BCF = {bcf} bpm)." },
        { id: "padrao", frase: "Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = {bcf} bpm)." },
      ],
    },
    {
      id: "bcf_gemelar",
      obrigatorio: true,
      placeholdersObrigatorios: ["bcf"],
      variantes: [{ id: "gemelar", frase: "Batimentos cardíacos presentes (BCF = {bcf} bpm)." }],
    },
    { id: "movimentos_fetais", variantes: [{ id: "normal", frase: "Os movimentos fetais são ativos." }] },
    { id: "anatomia_header", variantes: [{ id: "normal", frase: "\nAs considerações sobre a anatomia fetal são as seguintes:" }] },
    { id: "anatomia_cranio", variantes: [{ id: "normal", frase: "As estruturas cranianas e da coluna vertebral são normais." }] },
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
      variantes: [
        // Estado ALTERADO: escrito pelo motor, nunca personalizável (crítica C3).
        {
          id: "descrita",
          quando: (c) => placentaAlterada(c.findings, c.flags.grannum),
          montar: (c) => placentaTexto(c.findings, c.flags.grannum),
          personalizavel: false,
        },
        { id: "normal", frase: "\nPlacenta de aspecto normal." },
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
          personalizavel: false, // lista montada por feto
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
          personalizavel: false, // estado clínico alterado
        },
        {
          id: "normal",
          frase: "Líquido amniótico de quantidade normal pela análise subjetiva.",
          conclusao: "Líquido amniótico em quantidade normal.",
        },
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
