/**
 * PoC — MODELO COMO DADO (projeto docs/projeto-modelos/).
 *
 * Hipótese a testar: as frases do renderer determinístico podem sair do código
 * para um CATÁLOGO DE FRASES versionável, sem alterar o texto gerado — e uma
 * personalização do usuário vira uma troca de entrada nesse catálogo.
 *
 * O que este PoC NÃO propõe: mover a LÓGICA (cálculos de DSM/IG/ponderal,
 * formatação numérica, concordância gramatical, ramificação gemelar/inicial).
 * Essa continua em código. Só as STRINGS e a ORDEM saem para dado.
 *
 * Escopo: OBSTETRICA, estilo clássico, feto único (variantes padrão e inicial),
 * flags desligadas. Gemelar é lacuna conhecida e está documentado no final.
 *
 * Rodar: pnpm exec tsx apps/api/src/server/renderer/__tests__/model-catalog-poc.manual.ts
 */
import {
  renderObstetricaClassico,
  calcDsm,
  type ObstetricaFindings,
} from "../categories/OBSTETRICA";
import { buildIgInput, computeIg } from "../ig";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`);
    if (detail) console.log(detail);
  }
}

// ---------------------------------------------------------------------------
// 1. O catálogo — o que hoje são literais espalhados por OBSTETRICA.ts
// ---------------------------------------------------------------------------

type Slot = {
  id: string;
  /** Frase com placeholders nomeados {campo}. Substitui o `____` posicional. */
  frase: string;
  /** Invariante clínica: nenhuma personalização pode remover. */
  obrigatorio?: boolean;
};

type Catalog = {
  titulo: string;
  comentarios: string;
  header_aspectos: string;
  header_conclusao: string;
  slots: Slot[];
  /** Ordem dos slots do corpo, por variante. */
  ordem_padrao: string[];
  ordem_inicial: string[];
};

const BASE_CATALOG: Catalog = {
  titulo: "ULTRASSONOGRAFIA OBSTÉTRICA",
  comentarios:
    "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.",
  header_aspectos: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  header_conclusao: "CONCLUSÃO:",
  slots: [
    { id: "saco_gestacional", frase: "Saco gestacional de forma normal, com diâmetro médio de {dsm} mm." },
    { id: "feto_inicial", frase: "Embrião único, em situação {apresentacao}." },
    { id: "feto_padrao", frase: "Feto único, em apresentação {apresentacao}." },
    { id: "bcf_inicial", frase: "Batimentos cardíacos ritmados (BCF = {bcf} bpm).", obrigatorio: true },
    {
      id: "bcf_padrao",
      frase:
        "Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = {bcf} bpm).",
      obrigatorio: true,
    },
    { id: "movimentos_fetais", frase: "Os movimentos fetais são ativos." },
    { id: "anatomia_header", frase: "\nAs considerações sobre a anatomia fetal são as seguintes:" },
    { id: "anatomia_cranio", frase: "As estruturas cranianas e da coluna vertebral são normais." },
    {
      id: "anatomia_visceras",
      frase: "O estômago e a bexiga foram bem identificados e com ecotextura homogênea.",
    },
    { id: "biometria_header", frase: "\nA biometria fetal é a seguinte:" },
    { id: "dbp", frase: "Diâmetro biparietal (DBP) de {dbp} mm.", obrigatorio: true },
    { id: "cc", frase: "Circunferência da cabeça (CC) de {cc} mm.", obrigatorio: true },
    { id: "ca", frase: "Circunferência abdominal (CA) de {ca} mm.", obrigatorio: true },
    { id: "cf", frase: "Comprimento do fêmur (CF) de {cf} mm.", obrigatorio: true },
    { id: "ccn", frase: "Comprimento crânio-nádegas (CCN) de {ccn} mm." },
    { id: "peso_fetal", frase: "Peso aproximado de {peso} gramas.", obrigatorio: true },
    { id: "placenta", frase: "\nPlacenta de aspecto normal." },
    { id: "liquido_amniotico", frase: "Líquido amniótico de quantidade normal pela análise subjetiva." },
    { id: "vesicula_vitelina", frase: "Vesícula vitelina de forma e dimensões normais." },
    { id: "ovarios", frase: "Ovários de aspecto normal." },
    { id: "concl_liquido", frase: "Líquido amniótico em quantidade normal." },
  ],
  ordem_padrao: [
    "feto_padrao",
    "bcf_padrao",
    "movimentos_fetais",
    "anatomia_header",
    "anatomia_cranio",
    "anatomia_visceras",
    "biometria_header",
    "dbp",
    "cc",
    "ca",
    "cf",
    "peso_fetal",
    "placenta",
    "liquido_amniotico",
  ],
  ordem_inicial: [
    "saco_gestacional",
    "feto_inicial",
    "bcf_inicial",
    "ccn",
    "vesicula_vitelina",
    "liquido_amniotico",
    "ovarios",
  ],
};

// ---------------------------------------------------------------------------
// 2. O motor — permanece em código (cálculo, formatação, concordância)
// ---------------------------------------------------------------------------

function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}
function mm(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}
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

/** Variáveis que o motor expõe ao catálogo. */
function buildVars(f: ObstetricaFindings): Record<string, string> {
  const ft = f.fetos[0];
  return {
    dsm: mm(calcDsm(f)),
    apresentacao:
      apresentacaoFmt(ft?.apresentacao ?? null) ?? (f.gestacao_inicial ? "transversa" : "cefálica"),
    bcf: ft?.bcf_bpm != null ? ptBr(ft.bcf_bpm) : "____",
    dbp: mm(ft?.dbp_mm ?? null),
    cc: mm(ft?.cc_mm ?? null),
    ca: mm(ft?.ca_mm ?? null),
    cf: mm(ft?.cf_mm ?? null),
    ccn: mm(ft?.ccn_mm ?? null),
    peso: ft?.peso_g != null ? ptBr(ft.peso_g) : "____",
    // Extensão para a personalização nº 5 do briefing: as 3 medidas já são
    // extraídas pelo schema (saco_gestacional_medidas_mm) e hoje o renderer as
    // DESCARTA — só o DSM médio chega ao texto.
    sg_medidas: (f.saco_gestacional_medidas_mm ?? []).map((n) => ptBr(n)).join(" x "),
  };
}

function interpolate(frase: string, vars: Record<string, string>): string {
  return frase.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? `{${k}}`);
}

function renderFromCatalog(f: ObstetricaFindings, cat: Catalog): string {
  const vars = buildVars(f);
  const byId = new Map(cat.slots.map((s) => [s.id, s]));
  const ordem = f.gestacao_inicial ? cat.ordem_inicial : cat.ordem_padrao;

  const aspectos = ordem
    .map((id) => byId.get(id))
    .filter((s): s is Slot => s !== undefined)
    .map((s) => interpolate(s.frase, vars));

  const ig = computeIg(
    buildIgInput(
      {
        biometriaSemanas: f.ig_semanas,
        biometriaDias: f.ig_dias,
        dataExame: null,
        dum: null,
        primeiraUsData: null,
        primeiraUsIgSemanas: null,
        primeiraUsIgDias: null,
        igRefHojeSemanas: null,
        igRefHojeDias: null,
        referenciaFonte: null,
        corrigirComando: null,
      },
      { leadAncora: "Gestação em torno de ", leadBase: "Gestação em torno de " },
    ),
  );

  const conclusao: string[] = [ig.conclusaoClassico];
  if (!f.gestacao_inicial) {
    const cl = byId.get("concl_liquido");
    if (cl) conclusao.push(interpolate(cl.frase, vars));
  }

  const dumLinha = f.dum ? `\nDUM: ${f.dum}.\n` : "";
  const conclusaoTxt =
    conclusao.length === 1
      ? (conclusao[0] ?? "")
      : conclusao.map((it, i) => `${i + 1}) ${it}`).join("\n");

  return [
    cat.titulo,
    dumLinha,
    "",
    cat.comentarios,
    "",
    cat.header_aspectos,
    aspectos.join("\n"),
    "",
    cat.header_conclusao,
    conclusaoTxt,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// 3. Fixtures
// ---------------------------------------------------------------------------

function findings(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1,
    corionicidade: null,
    gestacao_inicial: false,
    fetos: [
      {
        rotulo: null,
        posicao_relativa: null,
        apresentacao: null,
        dorso: null,
        polo_cefalico: null,
        bcf_bpm: 142,
        dbp_mm: 85,
        cc_mm: 310,
        ca_mm: 295,
        cf_mm: 62,
        ccn_mm: null,
        peso_g: 2450,
        peso_variacao_g: null,
        percentil: null,
      },
    ],
    ig_semanas: 32,
    ig_dias: 4,
    dum: null,
    data_exame: null,
    primeira_us_data: null,
    primeira_us_ig_semanas: null,
    primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null,
    ig_referencia_hoje_dias: null,
    referencia_fonte: null,
    corrigir_ig: null,
    saco_gestacional_mm: null,
    saco_gestacional_medidas_mm: null,
    placenta_quantidade: null,
    placenta_localizacao: null,
    placenta_ecotextura: null,
    placenta_grau: null,
    liquido_tipo: null,
    liquido_ila_cm: null,
    liquido_mbv_por_feto_cm: null,
    liquido_classe: null,
    achados_adicionais: null,
    itens_conclusao_livres: [],
    ...over,
  };
}

const CASO_PADRAO = findings();
const CASO_INICIAL = findings({
  gestacao_inicial: true,
  ig_semanas: 8,
  ig_dias: 2,
  saco_gestacional_medidas_mm: [20.3, 10.4, 15.4],
  fetos: [{ ...findings().fetos[0]!, bcf_bpm: 158, ccn_mm: 16.4, peso_g: null, dbp_mm: null, cc_mm: null, ca_mm: null, cf_mm: null }],
});

function diff(a: string, b: string): string {
  const la = a.split("\n");
  const lb = b.split("\n");
  const out: string[] = [];
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) out.push(`    L${i + 1}\n      renderer: ${JSON.stringify(la[i])}\n      catálogo: ${JSON.stringify(lb[i])}`);
  }
  return out.slice(0, 8).join("\n");
}

// ---------------------------------------------------------------------------
// 4. Testes
// ---------------------------------------------------------------------------

console.log("\n[H1] Catálogo default reproduz o renderer byte-a-byte\n");

const rPadrao = renderObstetricaClassico(CASO_PADRAO);
const cPadrao = renderFromCatalog(CASO_PADRAO, BASE_CATALOG);
check("feto único, gestação padrão", rPadrao === cPadrao, diff(rPadrao, cPadrao));

const rInicial = renderObstetricaClassico(CASO_INICIAL);
const cInicial = renderFromCatalog(CASO_INICIAL, BASE_CATALOG);
check("feto único, gestação inicial", rInicial === cInicial, diff(rInicial, cInicial));

console.log("\n[H2] Personalização = troca de entrada no catálogo\n");

// Exemplo 5 do briefing: mostrar as 3 medidas do saco gestacional além do DSM.
const catTresMedidas: Catalog = {
  ...BASE_CATALOG,
  slots: BASE_CATALOG.slots.map((s) =>
    s.id === "saco_gestacional"
      ? { ...s, frase: "Saco gestacional de forma normal, medindo {sg_medidas} mm, com diâmetro médio de {dsm} mm." }
      : s,
  ),
};
const outTres = renderFromCatalog(CASO_INICIAL, catTresMedidas);
check(
  "3 medidas do saco gestacional aparecem no texto",
  outTres.includes("medindo 20,3 x 10,4 x 15,4 mm, com diâmetro médio de 15,4 mm"),
  `    obtido: ${outTres.split("\n").find((l) => l.includes("Saco gestacional"))}`,
);
check(
  "o resto do laudo permanece idêntico ao base",
  outTres.replace(/Saco gestacional[^\n]*\n/, "") === cInicial.replace(/Saco gestacional[^\n]*\n/, ""),
);

// Exemplo 2 do briefing: substituir uma frase por redação preferida.
const catFrase: Catalog = {
  ...BASE_CATALOG,
  slots: BASE_CATALOG.slots.map((s) =>
    s.id === "movimentos_fetais" ? { ...s, frase: "Movimentação fetal presente e ativa." } : s,
  ),
};
const outFrase = renderFromCatalog(CASO_PADRAO, catFrase);
check(
  "frase substituída aparece; a original some",
  outFrase.includes("Movimentação fetal presente e ativa.") &&
    !outFrase.includes("Os movimentos fetais são ativos."),
);

// Exemplo 1 do briefing: 4º item fixo na conclusão.
const outConcl = renderFromCatalog(CASO_PADRAO, BASE_CATALOG).replace(
  /(CONCLUSÃO:\n)([\s\S]*)$/,
  (_m, h: string, body: string) => `${h}${body}\n3) Recomenda-se controle ecográfico em 4 semanas.`,
);
check("item extra na conclusão é posicionável", outConcl.trimEnd().endsWith("3) Recomenda-se controle ecográfico em 4 semanas."));

console.log("\n[H3] Invariante clínica é protegida por dado, não por convenção\n");

type Operation = { op: "remove_slot" | "replace_phrase"; slot: string; value?: string };
function validateOps(cat: Catalog, ops: Operation[]): string[] {
  const byId = new Map(cat.slots.map((s) => [s.id, s]));
  const erros: string[] = [];
  for (const o of ops) {
    const slot = byId.get(o.slot);
    if (!slot) {
      erros.push(`slot desconhecido: ${o.slot}`);
      continue;
    }
    if (o.op === "remove_slot" && slot.obrigatorio) {
      erros.push(`slot obrigatório não pode ser removido: ${o.slot}`);
    }
  }
  return erros;
}

check(
  "remover slot obrigatório (dbp) é rejeitado",
  validateOps(BASE_CATALOG, [{ op: "remove_slot", slot: "dbp" }]).length === 1,
);
check(
  "remover slot opcional (movimentos_fetais) é permitido",
  validateOps(BASE_CATALOG, [{ op: "remove_slot", slot: "movimentos_fetais" }]).length === 0,
);
check(
  "operação sobre slot inexistente é rejeitada (detecta conflito de versão)",
  validateOps(BASE_CATALOG, [{ op: "replace_phrase", slot: "slot_que_sumiu", value: "x" }]).length === 1,
);

// ---------------------------------------------------------------------------

console.log(`\n${pass} passaram, ${fail} falharam\n`);
console.log("LACUNAS CONHECIDAS (fora do escopo deste PoC, documentadas em docs/projeto-modelos/):");
console.log("  - gemelar: 'Dois fetos:', peso médio e divergência ponderal não estão no catálogo");
console.log("  - variações de líquido (ILA / MBV / alterado) e de placenta (localização/grau/ecotextura)");
console.log("  - flags igCorrection / flexivel / grannum");
console.log("  - estilo OBJETIVO (segundo catálogo)");
if (fail > 0) process.exit(1);
