import { z } from "zod";

/**
 * DET-5 — Renderer de OBSTETRICA (feto único + gemelar).
 *
 * O LLM extrai dados tipados; o laudo é montado por construção (estrutura,
 * cabeçalhos, ordem e numeração garantidos). Cálculos aritméticos
 * determinísticos (peso médio, divergência ponderal gemelar) são feitos em
 * código — o que o writer LLM não fazia.
 *
 * Variante "inicial" (≤13s6d) usa o modelo de saco gestacional/CCN; "padrão"
 * (>14s) usa biometria DBP/CC/CA/CF. Gemelar (≥2 fetos) individualiza por feto.
 */

// ---------------------------------------------------------------------------
// Schema de achados
// ---------------------------------------------------------------------------

const FetoSchema = z.object({
  rotulo: z.string().nullable(), // "A", "B"... null se único
  posicao_relativa: z.string().nullable(), // "à direita", "à esquerda" (gemelar)
  apresentacao: z.string().nullable(), // cefálica, pélvica, córmica/transversa
  dorso: z.string().nullable(), // "à direita", "à esquerda", "anterior"...
  polo_cefalico: z.string().nullable(), // só em situação transversa
  bcf_bpm: z.number().nullable(),
  // Biometria em mm (a extração converte cm→mm).
  dbp_mm: z.number().nullable(),
  cc_mm: z.number().nullable(),
  ca_mm: z.number().nullable(),
  cf_mm: z.number().nullable(),
  ccn_mm: z.number().nullable(), // gestação inicial
  peso_g: z.number().nullable(),
  peso_variacao_g: z.number().nullable(),
  percentil: z.number().nullable(),
});

export const ObstetricaFindingsSchema = z.object({
  numero_fetos: z.number().int().min(1),
  corionicidade: z.string().nullable(), // "dicoriônica e diamniótica" etc (gemelar)
  gestacao_inicial: z.boolean(), // true = ≤13s6d (saco gestacional/CCN)
  fetos: z.array(FetoSchema).min(1),
  ig_semanas: z.number().nullable(),
  ig_dias: z.number().nullable(),
  dum: z.string().nullable(), // DD/MM/AAAA
  saco_gestacional_mm: z.number().nullable(), // DSM ditado direto ("DSM de 15,3")
  // As 3 medidas do saco gestacional, quando ditadas ("saco medindo A x B x C"
  // ou "calcule o DSM pelas medidas A x B x C") — o código calcula a média.
  saco_gestacional_medidas_mm: z.array(z.number()).nullable(),
  placenta_quantidade: z.number().nullable(),
  placenta_localizacao: z.string().nullable(),
  placenta_ecotextura: z.string().nullable(),
  placenta_grau: z.string().nullable(),
  liquido_tipo: z.enum(["normal", "ila", "mbv", "alterado"]).nullable(),
  liquido_ila_cm: z.number().nullable(),
  liquido_mbv_por_feto_cm: z.array(z.number()).nullable(),
  liquido_classe: z.string().nullable(), // "oligoâmnio", "polidrâmnio"...
  achados_adicionais: z.string().nullable(),
});

export type ObstetricaFindings = z.infer<typeof ObstetricaFindingsSchema>;

// JSON Schema strict para OpenAI (todos required, nullable via union).
const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const FETO_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "rotulo",
    "posicao_relativa",
    "apresentacao",
    "dorso",
    "polo_cefalico",
    "bcf_bpm",
    "dbp_mm",
    "cc_mm",
    "ca_mm",
    "cf_mm",
    "ccn_mm",
    "peso_g",
    "peso_variacao_g",
    "percentil",
  ],
  properties: {
    rotulo: str,
    posicao_relativa: str,
    apresentacao: str,
    dorso: str,
    polo_cefalico: str,
    bcf_bpm: num,
    dbp_mm: num,
    cc_mm: num,
    ca_mm: num,
    cf_mm: num,
    ccn_mm: num,
    peso_g: num,
    peso_variacao_g: num,
    percentil: num,
  },
} as const;

export const OBSTETRICA_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "numero_fetos",
    "corionicidade",
    "gestacao_inicial",
    "fetos",
    "ig_semanas",
    "ig_dias",
    "dum",
    "saco_gestacional_mm",
    "saco_gestacional_medidas_mm",
    "placenta_quantidade",
    "placenta_localizacao",
    "placenta_ecotextura",
    "placenta_grau",
    "liquido_tipo",
    "liquido_ila_cm",
    "liquido_mbv_por_feto_cm",
    "liquido_classe",
    "achados_adicionais",
  ],
  properties: {
    numero_fetos: { type: "integer" },
    corionicidade: str,
    gestacao_inicial: { type: "boolean" },
    fetos: { type: "array", items: FETO_JSON },
    ig_semanas: num,
    ig_dias: num,
    dum: str,
    saco_gestacional_mm: num,
    saco_gestacional_medidas_mm: { type: ["array", "null"], items: { type: "number" } },
    placenta_quantidade: num,
    placenta_localizacao: str,
    placenta_ecotextura: str,
    placenta_grau: str,
    liquido_tipo: { type: ["string", "null"], enum: ["normal", "ila", "mbv", "alterado", null] },
    liquido_ila_cm: num,
    liquido_mbv_por_feto_cm: { type: ["array", "null"], items: { type: "number" } },
    liquido_classe: str,
    achados_adicionais: str,
  },
} as const;

export const OBSTETRICA_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA OBSTÉTRICA.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada.

REGRAS:
1. numero_fetos: 1 = único; 2+ = gemelar/múltipla.
2. gestacao_inicial: true SOMENTE se for gestação inicial (≤ 13 semanas e 6 dias,
   ou houver saco gestacional/CCN/vesícula vitelina sem biometria DBP/CC/CA/CF).
3. fetos[]: um objeto por feto. Para gemelar, rotulo "A","B"... e posicao_relativa
   ("à direita"/"à esquerda") conforme ditado.
4. BIOMETRIA — NÃO ASSUMA UNIDADE. Extraia o número EXATAMENTE como ditado:
   - PRESERVE a casa decimal (vírgula → ponto): "2,4" → 2.4; "4,1" → 4.1.
     NUNCA remova a vírgula decimal (jamais 24 para "2,4", nem 41 para "4,1").
   - Só converta cm→mm (×10) quando a unidade "cm" for EXPLICITAMENTE dita no
     ditado (ex.: "BPD 5,2 cm" → dbp_mm 52). SEM unidade explícita, use o número
     como foi dito (ex.: "CCN 2,4" → ccn_mm 2.4; "DBP 85" → dbp_mm 85). Assuma
     que o médico falou a unidade certa; não "corrija".
   - DBP→dbp_mm, HC/CC→cc_mm, AC/CA→ca_mm, FL/CF→cf_mm, CCN→ccn_mm. Valor não
     ditado → null (NUNCA inventar).
4b. SACO GESTACIONAL / DSM (gestação inicial) — o CÓDIGO calcula a média, você só
    extrai:
    - "saco gestacional medindo A x B x C" OU "calcule o DSM pelas medidas A x B x C"
      → saco_gestacional_medidas_mm = [A, B, C] (as 3 medidas); saco_gestacional_mm = null.
    - "DSM de X" / "diâmetro médio do saco gestacional de X" → saco_gestacional_mm = X;
      saco_gestacional_medidas_mm = null.
    - Mesma regra de unidade/decimal da BIOMETRIA (não assuma unidade; preserve a
      casa decimal). Nada ditado → ambos null.
5. peso_g em gramas; percentil e peso_variacao_g só se ditados.
6. ig_semanas/ig_dias: idade gestacional ditada.
7. dum: data da última menstruação como DD/MM/AAAA (converta extenso → numérico).
8. corionicidade (gemelar): texto ditado ("dicoriônica e diamniótica",
   "monocoriônica e diamniótica"...). null se único.
9. placenta: quantidade (gemelar pode ter 2+), localização, ecotextura, grau.
10. líquido: liquido_tipo "normal" (subjetivo normal), "ila" (com ILA em cm),
    "mbv" (maior bolsão; FETO ÚNICO usa liquido_mbv_por_feto_cm com 1 valor;
    gemelar usa um valor por feto na ordem dos fetos), "alterado" (com
    liquido_classe = oligoâmnio/polidrâmnio). PRESERVE a casa decimal do ILA/MBV
    em cm ("4,1 cm" → 4.1; NUNCA 41).
11. apresentacao/dorso/polo_cefalico só quando ditados (senão null — o renderer
    usa defaults clínicos).
12. achados_adicionais: SOMENTE malformações ou ALTERAÇÕES patológicas reais,
    nas palavras do médico. NUNCA coloque aqui frases de NORMALIDADE redundantes
    ("sem descolamentos", "vesícula vitelínica presente", "saco gestacional
    tópico/regular", "líquido normal") — essas já estão no modelo padrão. null
    se o exame for normal.`;

// ---------------------------------------------------------------------------
// Formatação e cálculos determinísticos
// ---------------------------------------------------------------------------

function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}

/** Concordância: "apresentação" é feminino → cefálica/pélvica/córmica/transversa. */
function apresentacaoFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  const map: Record<string, string> = {
    cefálico: "cefálica",
    cefalico: "cefálica",
    pélvico: "pélvica",
    pelvico: "pélvica",
    córmico: "córmica",
    cormico: "córmica",
    transverso: "transversa",
  };
  return map[t] ?? s.trim();
}

/** Grau de placenta (Grannum) → romano: 0→0, 1→I, 2→II, 3→III. */
function grauFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().replace(/^grau\s*/i, "");
  const romano: Record<string, string> = { "0": "0", "1": "I", "2": "II", "3": "III" };
  return `grau ${romano[t] ?? t}`;
}
function mm(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}
function gramas(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}

/** IG: "X semanas e Y dias" (omite "e Y dias" quando dias é 0 ou null). */
function formatIg(semanas: number | null, dias: number | null): string {
  if (semanas === null) return "____ semanas";
  if (dias === null || dias === 0) return `${ptBr(semanas)} semanas`;
  return `${ptBr(semanas)} semanas e ${ptBr(dias)} dias`;
}

export type PonderalCalc = {
  pesoMedio: number | null;
  divergenciaG: number | null;
  divergenciaPct: number | null;
};

/** Peso médio e divergência ponderal entre fetos — determinístico. */
export function calcPonderal(fetos: ObstetricaFindings["fetos"]): PonderalCalc {
  const pesos = fetos.map((f) => f.peso_g).filter((p): p is number => p !== null);
  if (pesos.length < 2) return { pesoMedio: null, divergenciaG: null, divergenciaPct: null };
  const maior = Math.max(...pesos);
  const menor = Math.min(...pesos);
  const pesoMedio = Math.round(pesos.reduce((a, b) => a + b, 0) / pesos.length);
  const divergenciaG = maior - menor;
  const divergenciaPct = Math.round((divergenciaG / maior) * 1000) / 10; // 1 casa
  return { pesoMedio, divergenciaG, divergenciaPct };
}

/**
 * DSM (diâmetro médio do saco gestacional) = (a+b+c)/3, 1 casa decimal.
 * O DSM ditado direto ("DSM de 15,3") vence; senão calcula da média das medidas
 * ditadas ("saco medindo 20,3 x 10,4 x 15,4"). null = nenhum dado (placeholder).
 */
export function calcDsm(f: ObstetricaFindings): number | null {
  if (f.saco_gestacional_mm !== null) return f.saco_gestacional_mm;
  const m = (f.saco_gestacional_medidas_mm ?? []).filter((n) => Number.isFinite(n));
  if (m.length === 0) return null;
  return Math.round((m.reduce((a, b) => a + b, 0) / m.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

function fetoApresentacaoFrase(f: ObstetricaFindings["fetos"][number], inicial: boolean): string {
  const subst = inicial ? "Embrião" : "Feto";
  const apres = apresentacaoFmt(f.apresentacao) ?? (inicial ? "transversa" : "cefálica");
  const conector = inicial ? "em situação" : "em apresentação";
  let frase = `${subst} único, ${conector} ${apres}`;
  if (f.dorso) frase += `, com dorso ${f.dorso}`;
  if (f.polo_cefalico) frase += `, com polo cefálico ${f.polo_cefalico}`;
  return `${frase}.`;
}

function biometriaLinhas(f: ObstetricaFindings["fetos"][number]): string[] {
  const linhas = [
    `Diâmetro biparietal (DBP) de ${mm(f.dbp_mm)} mm.`,
    `Circunferência da cabeça (CC) de ${mm(f.cc_mm)} mm.`,
    `Circunferência abdominal (CA) de ${mm(f.ca_mm)} mm.`,
    `Comprimento do fêmur (CF) de ${mm(f.cf_mm)} mm.`,
  ];
  return linhas;
}

function pesoLinha(f: ObstetricaFindings["fetos"][number]): string {
  const extras: string[] = [];
  if (f.peso_variacao_g !== null) extras.push(`+- ${gramas(f.peso_variacao_g)} gramas`);
  if (f.percentil !== null) extras.push(`percentil ${ptBr(f.percentil)}`);
  const sufixo = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `Peso aproximado de ${gramas(f.peso_g)} gramas${sufixo}.`;
}

function placentaFrase(f: ObstetricaFindings): string | null {
  const qtd = f.placenta_quantidade ?? f.numero_fetos;
  const grauTxt = grauFmt(f.placenta_grau);
  if (f.numero_fetos >= 2) {
    const base =
      qtd >= 2 ? `${qtd === 2 ? "Duas" : qtd === 3 ? "Três" : qtd} placentas` : "Placenta única";
    const loc = f.placenta_localizacao ? `, ${f.placenta_localizacao}` : "";
    const grau = grauTxt ? `, ${grauTxt}` : "";
    const eco = f.placenta_ecotextura ? `, com ecotextura ${f.placenta_ecotextura}` : "";
    return `${base}${loc}${grau}${eco}.`;
  }
  if (!f.placenta_localizacao && !f.placenta_ecotextura && !grauTxt)
    return "Placenta de aspecto normal.";
  let frase = "Placenta";
  if (f.placenta_localizacao) frase += ` de localização ${f.placenta_localizacao}`;
  if (grauTxt) frase += `, ${grauTxt}`;
  if (f.placenta_ecotextura) frase += `, com ecotextura ${f.placenta_ecotextura}`;
  return `${frase}.`;
}

/** Linha de líquido amniótico no corpo + item de conclusão. */
function liquido(f: ObstetricaFindings): { corpo: string; conclusao: string } {
  const tipo = f.liquido_tipo ?? "normal";
  if (tipo === "mbv" && f.liquido_mbv_por_feto_cm && f.liquido_mbv_por_feto_cm.length > 0) {
    // Feto único: NUNCA rotular "(feto A)" nem "ambos os fetos" (P5 — sem
    // alucinação gemelar). Só o gemelar (≥2 fetos) individualiza por feto.
    if (f.numero_fetos < 2) {
      const v = f.liquido_mbv_por_feto_cm[0];
      const mbvTxt = v !== undefined ? `${ptBr(v)} cm` : "____ cm";
      return {
        corpo: `Maior bolsão vertical de ${mbvTxt}.`,
        conclusao: `Líquido amniótico em quantidade normal (maior bolsão vertical de ${mbvTxt}).`,
      };
    }
    const labels = f.liquido_mbv_por_feto_cm
      .map((v, i) => `${ptBr(v)} cm (feto ${rotuloFeto(f, i)})`)
      .join(" e ");
    return {
      corpo: `Maior bolsão vertical de ${labels}.`,
      conclusao: `Líquido amniótico em quantidade normal para ambos os fetos (maior bolsão vertical de ${labels}).`,
    };
  }
  if (tipo === "ila" && f.liquido_ila_cm !== null) {
    return {
      corpo: `Índice de líquido amniótico (ILA) de ${ptBr(f.liquido_ila_cm)} cm.`,
      conclusao: `Líquido amniótico em quantidade normal (ILA de ${ptBr(f.liquido_ila_cm)} cm).`,
    };
  }
  if (tipo === "alterado" && f.liquido_classe) {
    return {
      corpo: `Líquido amniótico em quantidade alterada (${f.liquido_classe}).`,
      conclusao: `${f.liquido_classe.charAt(0).toUpperCase()}${f.liquido_classe.slice(1)}.`,
    };
  }
  return {
    corpo: "Líquido amniótico de quantidade normal pela análise subjetiva.",
    conclusao: "Líquido amniótico em quantidade normal.",
  };
}

function rotuloFeto(f: ObstetricaFindings, i: number): string {
  return f.fetos[i]?.rotulo ?? String.fromCharCode(65 + i);
}

const EMPTY_FETO: ObstetricaFindings["fetos"][number] = {
  rotulo: null,
  posicao_relativa: null,
  apresentacao: null,
  dorso: null,
  polo_cefalico: null,
  bcf_bpm: null,
  dbp_mm: null,
  cc_mm: null,
  ca_mm: null,
  cf_mm: null,
  ccn_mm: null,
  peso_g: null,
  peso_variacao_g: null,
  percentil: null,
};

function numberConclusao(itens: string[]): string {
  if (itens.length === 1) return itens[0] ?? "";
  return itens.map((it, i) => `${i + 1}) ${it}`).join("\n");
}

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior; objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO (Sprint 2),
 * reusando a MESMA extração e os MESMOS cálculos determinísticos.
 */
export function renderObstetrica(
  f: ObstetricaFindings,
  _prefs?: unknown,
  opts?: { objetivo?: boolean },
): string {
  if (opts?.objetivo) return renderObstetricaObjetivo(f);
  return renderObstetricaClassico(f);
}

/** Monta o laudo obstétrico (estrutura por construção). */
export function renderObstetricaClassico(f: ObstetricaFindings): string {
  const gemelar = f.numero_fetos >= 2;
  const titulo = gemelar ? "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR" : "ULTRASSONOGRAFIA OBSTÉTRICA";

  const aspectos: string[] = [];
  const conclusao: string[] = [];

  if (gemelar) {
    // Primeira frase personalizada com quantidade + individualização.
    const qtdLabel = f.numero_fetos === 2 ? "Dois fetos" : f.numero_fetos === 3 ? "Três fetos" : `${f.numero_fetos} fetos`;
    const descricoes = f.fetos.map((ft, i) => {
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      const pos = ft.posicao_relativa ? `o feto ${ft.posicao_relativa} (feto ${rot})` : `o feto ${rot}`;
      const apresFmt = apresentacaoFmt(ft.apresentacao);
      const apres = apresFmt ? `, em apresentação ${apresFmt}` : "";
      const dorso = ft.dorso ? ` com dorso ${ft.dorso}` : "";
      const polo = ft.polo_cefalico ? ` com polo cefálico ${ft.polo_cefalico}` : "";
      return `${pos}${apres}${dorso}${polo}`;
    });
    aspectos.push(`${qtdLabel}: ${descricoes.join(", e ")}.`);
    // Por feto: BCF + biometria + peso.
    for (let i = 0; i < f.fetos.length; i++) {
      const ft = f.fetos[i];
      if (!ft) continue;
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      aspectos.push(`\nFeto ${rot}:`);
      aspectos.push(`Batimentos cardíacos presentes (BCF = ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm).`);
      if (!f.gestacao_inicial) aspectos.push(...biometriaLinhas(ft));
      else aspectos.push(`Comprimento crânio-nádegas (CCN) de ${mm(ft.ccn_mm)} mm.`);
      aspectos.push(pesoLinha(ft));
    }
    // Peso médio + divergência (cálculo determinístico).
    const pond = calcPonderal(f.fetos);
    if (pond.pesoMedio !== null) {
      aspectos.push(
        `\nPeso fetal médio de ${gramas(pond.pesoMedio)} gramas. Divergência ponderal de ${gramas(pond.divergenciaG)} gramas (${ptBr(pond.divergenciaPct ?? 0)}%).`,
      );
    }
    const plc = placentaFrase(f);
    if (plc) aspectos.push(`\n${plc}`);
    const liq = liquido(f);
    aspectos.push(liq.corpo);

    // Conclusão gemelar.
    const corion = f.corionicidade ? `${f.corionicidade} ` : "";
    conclusao.push(
      `Gestação gemelar ${corion}em torno de ${formatIg(f.ig_semanas, f.ig_dias)}.`,
    );
    conclusao.push(liq.conclusao);
    if (pond.divergenciaG !== null) {
      const significativa = (pond.divergenciaPct ?? 0) >= 20;
      conclusao.push(
        significativa
          ? `Divergência ponderal significativa entre os fetos (${ptBr(pond.divergenciaPct ?? 0)}%).`
          : `Fetos com pesos concordantes, sem divergência ponderal significativa.`,
      );
    }
  } else {
    // Feto único.
    const ft = f.fetos[0] ?? EMPTY_FETO;
    aspectos.push(fetoApresentacaoFrase(ft, f.gestacao_inicial));
    if (f.gestacao_inicial) {
      // P1 — no obstétrico inicial a linha do saco gestacional é OBRIGATÓRIA;
      // nunca some. DSM calculado das 3 medidas (ou ditado direto); sem dado →
      // placeholder "____".
      aspectos.unshift(`Saco gestacional de forma normal, com diâmetro médio de ${mm(calcDsm(f))} mm.`);
    }
    aspectos.push(
      f.gestacao_inicial
        ? `Batimentos cardíacos ritmados (BCF = ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm).`
        : `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm).`,
    );
    if (!f.gestacao_inicial) {
      aspectos.push("Os movimentos fetais são ativos.");
      aspectos.push("\nAs considerações sobre a anatomia fetal são as seguintes:");
      aspectos.push("As estruturas cranianas e da coluna vertebral são normais.");
      aspectos.push("O estômago e a bexiga foram bem identificados e com ecotextura homogênea.");
      aspectos.push("\nA biometria fetal é a seguinte:");
      aspectos.push(...biometriaLinhas(ft));
      aspectos.push(pesoLinha(ft));
      const plc = placentaFrase(f);
      if (plc) aspectos.push(`\n${plc}`);
    } else {
      aspectos.push(`Comprimento crânio-nádegas (CCN) de ${mm(ft.ccn_mm)} mm.`);
      aspectos.push("Vesícula vitelina de forma e dimensões normais.");
    }
    const liq = liquido(f);
    aspectos.push(liq.corpo);
    if (f.gestacao_inicial) aspectos.push("Ovários de aspecto normal.");

    conclusao.push(`Gestação em torno de ${formatIg(f.ig_semanas, f.ig_dias)}.`);
    if (!f.gestacao_inicial) conclusao.push(liq.conclusao);
  }

  // Achados adicionais (texto do médico) — inserido literal antes da conclusão,
  // sem LLM e sem invenção. Vai para o corpo; o médico revisa a conclusão.
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }

  // Linha opcional de DUM (logo após o título).
  const dumLinha = f.dum ? `\nDUM: ${f.dum}.\n` : "";

  const corpo = [
    titulo,
    dumLinha,
    COMENTARIOS,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    numberConclusao(conclusao),
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO (Sprint 2)
// ===========================================================================
//
// Mais enxuto que o clássico (sem COMENTÁRIOS/OS SEGUINTES ASPECTOS). 1 casa
// decimal em TODAS as medidas. Reusa 100% a extração e os cálculos
// determinísticos (calcPonderal, calcDsm, liquido). Feto único NUNCA recebe
// "(feto A)"/"ambos os fetos" (P5). Percentil é só reproduzido (nunca cruzado
// com a IG).

const TECNICA_OBJ =
  "Exame realizado com transdutor convexo multifrequencial.";

/** 1 casa decimal SEMPRE (P3) — vírgula decimal. */
function ptBr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
/** Medida em mm com 1 casa decimal; placeholder se null. */
function mm1(v: number | null): string {
  return v === null ? "____" : ptBr1(v);
}
/** Peso em gramas: inteiro (gramas não levam casa decimal). */
function g0(v: number | null): string {
  return v === null ? "____" : String(Math.round(v));
}

/** Biometria objetiva (1 casa decimal) — só as 4 medidas padrão. */
function biometriaLinhasObj(f: ObstetricaFindings["fetos"][number]): string[] {
  return [
    `Diâmetro biparietal (DBP): ${mm1(f.dbp_mm)} mm.`,
    `Circunferência cefálica (CC): ${mm1(f.cc_mm)} mm.`,
    `Circunferência abdominal (CA): ${mm1(f.ca_mm)} mm.`,
    `Comprimento femoral (CF): ${mm1(f.cf_mm)} mm.`,
  ];
}

/** Linha de peso objetiva: peso + (variação, percentil) só se ditados. */
function pesoLinhaObj(f: ObstetricaFindings["fetos"][number]): string {
  const extras: string[] = [];
  if (f.peso_variacao_g !== null) extras.push(`+- ${g0(f.peso_variacao_g)} g`);
  if (f.percentil !== null) extras.push(`percentil ${ptBr(f.percentil)}`);
  const sufixo = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `Peso fetal estimado: ${g0(f.peso_g)} g${sufixo}.`;
}

/** Placenta objetiva (frase enxuta). null = não descrita. */
function placentaFraseObj(f: ObstetricaFindings): string | null {
  const g = grauFmt(f.placenta_grau);
  const grauTxt = g ? `${g} de Grannum et al.` : null;
  if (f.numero_fetos >= 2) {
    const qtd = f.placenta_quantidade ?? f.numero_fetos;
    const base =
      qtd >= 2
        ? `${qtd === 2 ? "Duas" : qtd === 3 ? "Três" : qtd} placentas`
        : "Placenta única";
    const loc = f.placenta_localizacao ? `, ${f.placenta_localizacao}` : "";
    const grau = grauTxt ? `, ${grauTxt}` : "";
    return `${base}${loc}${grau}.`;
  }
  if (!f.placenta_localizacao && !grauTxt) return "Placenta de aspecto normal.";
  let frase = "Placenta";
  if (f.placenta_localizacao) frase += ` de localização ${f.placenta_localizacao}`;
  if (grauTxt) frase += `, ${grauTxt}`;
  return `${frase}.`;
}

/** Render objetivo do laudo obstétrico. */
export function renderObstetricaObjetivo(f: ObstetricaFindings): string {
  const gemelar = f.numero_fetos >= 2;
  const titulo = gemelar
    ? "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR"
    : "ULTRASSONOGRAFIA OBSTÉTRICA";

  const achados: string[] = [];
  const impressao: string[] = [];

  if (gemelar) {
    const qtdLabel =
      f.numero_fetos === 2
        ? "Dois fetos"
        : f.numero_fetos === 3
          ? "Três fetos"
          : `${f.numero_fetos} fetos`;
    const descricoes = f.fetos.map((ft, i) => {
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      const pos = ft.posicao_relativa
        ? `feto ${ft.posicao_relativa} (feto ${rot})`
        : `feto ${rot}`;
      const apresFmt = apresentacaoFmt(ft.apresentacao);
      const apres = apresFmt ? `, em apresentação ${apresFmt}` : "";
      const dorso = ft.dorso ? `, com dorso ${ft.dorso}` : "";
      return `${pos}${apres}${dorso}`;
    });
    achados.push(`${qtdLabel}: ${descricoes.join("; ")}.`);
    for (let i = 0; i < f.fetos.length; i++) {
      const ft = f.fetos[i];
      if (!ft) continue;
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      achados.push(`\nFeto ${rot}:`);
      achados.push(
        `Batimentos cardíacos fetais (BCF): ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm.`,
      );
      if (f.gestacao_inicial) {
        achados.push(`Comprimento crânio-nádegas (CCN): ${mm1(ft.ccn_mm)} mm.`);
      } else {
        achados.push(...biometriaLinhasObj(ft));
      }
      achados.push(pesoLinhaObj(ft));
    }
    const pond = calcPonderal(f.fetos);
    if (pond.pesoMedio !== null) {
      achados.push(
        `\nPeso fetal médio: ${g0(pond.pesoMedio)} g. Divergência ponderal: ${g0(pond.divergenciaG)} g (${ptBr1(pond.divergenciaPct ?? 0)}%).`,
      );
    }
    const plc = placentaFraseObj(f);
    if (plc) achados.push(plc);
    const liq = liquido(f);
    achados.push(liq.corpo);

    const corion = f.corionicidade ? `${f.corionicidade} ` : "";
    impressao.push(
      `Gestação gemelar ${corion}em torno de ${formatIg(f.ig_semanas, f.ig_dias)}.`,
    );
    impressao.push(liq.conclusao);
    if (pond.divergenciaG !== null) {
      const significativa = (pond.divergenciaPct ?? 0) >= 20;
      impressao.push(
        significativa
          ? `Divergência ponderal significativa entre os fetos (${ptBr1(pond.divergenciaPct ?? 0)}%).`
          : "Fetos com pesos concordantes, sem divergência ponderal significativa.",
      );
    }
  } else {
    const ft = f.fetos[0] ?? EMPTY_FETO;
    if (f.gestacao_inicial) {
      // Saco gestacional obrigatório no inicial (P1) — DSM determinístico.
      achados.push(
        `Saco gestacional de forma normal, diâmetro médio (DSM): ${mm1(calcDsm(f))} mm.`,
      );
      const apres = apresentacaoFmt(ft.apresentacao) ?? "transversa";
      let fetoFrase = `Embrião único, em situação ${apres}`;
      if (ft.dorso) fetoFrase += `, com dorso ${ft.dorso}`;
      achados.push(`${fetoFrase}.`);
      achados.push(
        `Batimentos cardíacos fetais (BCF): ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm.`,
      );
      achados.push(`Comprimento crânio-nádegas (CCN): ${mm1(ft.ccn_mm)} mm.`);
      achados.push("Vesícula vitelina de forma e dimensões normais.");
      const liq = liquido(f);
      achados.push(liq.corpo);
      achados.push("Ovários de aspecto normal.");

      impressao.push(`Gestação em torno de ${formatIg(f.ig_semanas, f.ig_dias)}.`);
    } else {
      const apres = apresentacaoFmt(ft.apresentacao) ?? "cefálica";
      let fetoFrase = `Feto único, em apresentação ${apres}`;
      if (ft.dorso) fetoFrase += `, com dorso ${ft.dorso}`;
      achados.push(`${fetoFrase}.`);
      achados.push(
        `Batimentos cardíacos fetais (BCF): ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm. Movimentos fetais ativos.`,
      );
      achados.push("\nBiometria fetal:");
      achados.push(...biometriaLinhasObj(ft));
      achados.push(pesoLinhaObj(ft));
      const plc = placentaFraseObj(f);
      if (plc) achados.push(plc);
      const liq = liquido(f);
      achados.push(liq.corpo);

      impressao.push(`Gestação em torno de ${formatIg(f.ig_semanas, f.ig_dias)}.`);
      impressao.push(liq.conclusao);
    }
  }

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push(`\n${f.achados_adicionais.trim()}`);
  }

  const dumLinha = f.dum ? `\nDUM: ${f.dum}.` : "";

  const impressaoTxt =
    impressao.length === 1
      ? impressao[0] ?? ""
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  const corpo = [
    titulo,
    dumLinha,
    "",
    "TÉCNICA:",
    TECNICA_OBJ,
    "",
    "ACHADOS:",
    achados.join("\n"),
    "",
    "IMPRESSÃO:",
    impressaoTxt,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}
