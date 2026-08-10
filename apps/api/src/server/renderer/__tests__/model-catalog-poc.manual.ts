/**
 * PoC — MODELO COMO DADO (projeto docs/projeto-modelos/).
 *
 * v2 — incorpora a revisão adversarial do Codex 1 (2026-08-10). Duas críticas
 * procedentes contra a v1, ambas verificadas no código e agora endereçadas:
 *
 *  C1. "slot.id desaparece assim que o renderer devolve string. Para os guards
 *      operarem por slot, o produto intermediário precisa ser um documento
 *      estruturado até o último passo; um catálogo de frases sozinho não cria
 *      isso. Sem essa camada, vocês acabam parseando texto novamente e recriam
 *      o problema com outro nome."
 *      → v1 montava `aspectos.join("\n")` e perdia a origem. v2 produz um
 *        ReportDoc (segmentos com slotId/instance/kind/origin) e serializa
 *        como ÚLTIMO passo. §[H4] prova um guard operando por slot, sem regex.
 *
 *  C2. "slot.id sozinho não basta para gemelar, variantes patológicas e
 *      mudanças de versão. Além disso, o slot 'obrigatório' ainda pode ser
 *      substituído por texto vazio ou perder o placeholder da medida; portanto
 *      ele protege a presença da linha, não o conteúdo clínico."
 *      → v1 só barrava remove_slot. v2 adiciona chave composta (slotId +
 *        instance) e invariante de CONTEÚDO: placeholders obrigatórios e texto
 *        não-vazio. §[H3].
 *
 * O que este PoC NÃO propõe: mover a LÓGICA (cálculos de DSM/IG/ponderal,
 * formatação numérica, concordância gramatical). Essa continua em código.
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
// 1. Catálogo — conteúdo que hoje é literal dentro de OBSTETRICA.ts
// ---------------------------------------------------------------------------

type Slot = {
  id: string;
  frase: string;
  /** Invariante de PRESENÇA: nenhuma personalização remove. */
  obrigatorio?: boolean;
  /**
   * Invariante de CONTEÚDO (crítica C2): placeholders que a frase precisa
   * conservar mesmo depois de reescrita pelo usuário. Sem isto, trocar
   * "DBP de {dbp} mm." por "DBP normal." mantém a linha e perde a medida.
   */
  placeholdersObrigatorios?: string[];
  /** Repete uma vez por feto no gemelar (chave composta slotId+instance). */
  porFeto?: boolean;
  /**
   * Crítica C3 do Codex: placenta e líquido NÃO são variações de redação, são
   * ESTADOS CLÍNICOS. Um slot editável chamado "placenta" permitiria que uma
   * frase personalizada de normalidade substituísse uma saída patológica.
   * Slots marcados aqui só aceitam personalização do estado NORMAL; quando o
   * achado é patológico, quem escreve é o motor e a personalização não se aplica.
   */
  estadoClinico?: boolean;
};

type Catalog = {
  versao: number;
  titulo: string;
  comentarios: string;
  header_aspectos: string;
  header_conclusao: string;
  slots: Slot[];
  ordem_padrao: string[];
  ordem_inicial: string[];
};

const BASE_CATALOG: Catalog = {
  versao: 1,
  titulo: "ULTRASSONOGRAFIA OBSTÉTRICA",
  comentarios:
    "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.",
  header_aspectos: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  header_conclusao: "CONCLUSÃO:",
  slots: [
    {
      id: "saco_gestacional",
      frase: "Saco gestacional de forma normal, com diâmetro médio de {dsm} mm.",
      placeholdersObrigatorios: ["dsm"],
    },
    { id: "feto_inicial", frase: "Embrião único, em situação {apresentacao}." },
    { id: "feto_padrao", frase: "Feto único, em apresentação {apresentacao}." },
    {
      id: "bcf_inicial",
      frase: "Batimentos cardíacos ritmados (BCF = {bcf} bpm).",
      obrigatorio: true,
      placeholdersObrigatorios: ["bcf"],
      porFeto: true,
    },
    {
      id: "bcf_padrao",
      frase:
        "Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = {bcf} bpm).",
      obrigatorio: true,
      placeholdersObrigatorios: ["bcf"],
      porFeto: true,
    },
    { id: "movimentos_fetais", frase: "Os movimentos fetais são ativos." },
    { id: "anatomia_header", frase: "\nAs considerações sobre a anatomia fetal são as seguintes:" },
    { id: "anatomia_cranio", frase: "As estruturas cranianas e da coluna vertebral são normais." },
    {
      id: "anatomia_visceras",
      frase: "O estômago e a bexiga foram bem identificados e com ecotextura homogênea.",
    },
    { id: "biometria_header", frase: "\nA biometria fetal é a seguinte:" },
    { id: "dbp", frase: "Diâmetro biparietal (DBP) de {dbp} mm.", obrigatorio: true, placeholdersObrigatorios: ["dbp"], porFeto: true },
    { id: "cc", frase: "Circunferência da cabeça (CC) de {cc} mm.", obrigatorio: true, placeholdersObrigatorios: ["cc"], porFeto: true },
    { id: "ca", frase: "Circunferência abdominal (CA) de {ca} mm.", obrigatorio: true, placeholdersObrigatorios: ["ca"], porFeto: true },
    { id: "cf", frase: "Comprimento do fêmur (CF) de {cf} mm.", obrigatorio: true, placeholdersObrigatorios: ["cf"], porFeto: true },
    { id: "ccn", frase: "Comprimento crânio-nádegas (CCN) de {ccn} mm.", placeholdersObrigatorios: ["ccn"], porFeto: true },
    { id: "peso_fetal", frase: "Peso aproximado de {peso} gramas.", obrigatorio: true, placeholdersObrigatorios: ["peso"], porFeto: true },
    { id: "placenta", frase: "\nPlacenta de aspecto normal.", estadoClinico: true },
    { id: "liquido_amniotico", frase: "Líquido amniótico de quantidade normal pela análise subjetiva.", estadoClinico: true },
    { id: "vesicula_vitelina", frase: "Vesícula vitelina de forma e dimensões normais." },
    { id: "ovarios", frase: "Ovários de aspecto normal." },
    { id: "concl_liquido", frase: "Líquido amniótico em quantidade normal." },
  ],
  ordem_padrao: [
    "feto_padrao", "bcf_padrao", "movimentos_fetais",
    "anatomia_header", "anatomia_cranio", "anatomia_visceras",
    "biometria_header", "dbp", "cc", "ca", "cf", "peso_fetal",
    "placenta", "liquido_amniotico",
  ],
  ordem_inicial: [
    "saco_gestacional", "feto_inicial", "bcf_inicial", "ccn",
    "vesicula_vitelina", "liquido_amniotico", "ovarios",
  ],
};

// ---------------------------------------------------------------------------
// 2. Documento estruturado (crítica C1) — a string vem só no fim
// ---------------------------------------------------------------------------

type SegmentKind = "corpo" | "conclusao";
type Segment = {
  slotId: string;
  /** Chave composta: "A"/"B" no gemelar; undefined no feto único. */
  instance?: string;
  kind: SegmentKind;
  text: string;
  /** Rastreabilidade para o Lab: de que camada veio este trecho. */
  origin: "base" | "custom" | "computed";
};
type ReportDoc = { titulo: string; dum: string | null; segments: Segment[] };

/** Chave estável de um segmento — é ela que os guards endereçam. */
function keyOf(s: Pick<Segment, "slotId" | "instance">): string {
  return s.instance ? `${s.slotId}#${s.instance}` : s.slotId;
}

// ---------------------------------------------------------------------------
// 3. Motor — permanece em código
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
    cefálico: "cefálica", cefalico: "cefálica", pélvico: "pélvica",
    pelvico: "pélvica", córmico: "córmica", cormico: "córmica", transverso: "transversa",
  };
  return map[t] ?? s.trim();
}

function varsForFeto(f: ObstetricaFindings, idx: number): Record<string, string> {
  const ft = f.fetos[idx];
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
    // As 3 medidas JÁ são extraídas (saco_gestacional_medidas_mm) e hoje o
    // renderer as descarta — só o DSM médio chega ao texto (OBSTETRICA.ts:622).
    sg_medidas: (f.saco_gestacional_medidas_mm ?? []).map((n) => ptBr(n)).join(" x "),
  };
}

/** Vocabulário de placeholders que o motor sabe preencher nesta categoria. */
const VARS_CONHECIDAS = [
  "dsm", "apresentacao", "bcf", "dbp", "cc", "ca", "cf", "ccn", "peso", "sg_medidas",
] as const;

function placeholdersDe(frase: string): string[] {
  return [...frase.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string);
}

/**
 * Crítica C12 do Codex: na v1 o interpolate "falhava aberto" — um placeholder
 * desconhecido vazava literalmente para o laudo. Agora ele é estrito, e a
 * validação (validateOps) rejeita a operação antes de chegar aqui.
 */
function interpolate(frase: string, vars: Record<string, string>): string {
  return frase.replace(/\{(\w+)\}/g, (_m, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`placeholder desconhecido no catálogo: {${k}}`);
    return v;
  });
}

/**
 * Estado clínico de um slot: "normal" (o catálogo escreve, personalizável) ou
 * "alterado" (o MOTOR escreve, personalização não se aplica). Crítica C3.
 */
function estadoDe(slotId: string, f: ObstetricaFindings): "normal" | "alterado" {
  if (slotId === "placenta") {
    return f.placenta_localizacao || f.placenta_ecotextura || f.placenta_grau ? "alterado" : "normal";
  }
  if (slotId === "liquido_amniotico") {
    return f.liquido_tipo && f.liquido_tipo !== "normal" ? "alterado" : "normal";
  }
  return "normal";
}

/** Frase escrita pelo motor quando o achado é patológico (espelha o renderer). */
function fraseDoMotor(slotId: string, f: ObstetricaFindings): string {
  if (slotId === "placenta") {
    let s = "\nPlacenta";
    if (f.placenta_localizacao) s += ` de localização ${f.placenta_localizacao}`;
    if (f.placenta_grau) s += `, grau ${f.placenta_grau}`;
    if (f.placenta_ecotextura) s += `, com ecotextura ${f.placenta_ecotextura}`;
    return `${s}.`;
  }
  if (slotId === "liquido_amniotico" && f.liquido_tipo === "alterado" && f.liquido_classe) {
    return `Líquido amniótico em quantidade alterada (${f.liquido_classe}).`;
  }
  if (slotId === "liquido_amniotico" && f.liquido_tipo === "ila" && f.liquido_ila_cm !== null) {
    return `Índice de líquido amniótico (ILA) de ${ptBr(f.liquido_ila_cm)} cm.`;
  }
  return "";
}

function igFor(f: ObstetricaFindings) {
  return computeIg(
    buildIgInput(
      {
        biometriaSemanas: f.ig_semanas, biometriaDias: f.ig_dias,
        dataExame: null, dum: null, primeiraUsData: null,
        primeiraUsIgSemanas: null, primeiraUsIgDias: null,
        igRefHojeSemanas: null, igRefHojeDias: null,
        referenciaFonte: null, corrigirComando: null,
      },
      { leadAncora: "Gestação em torno de ", leadBase: "Gestação em torno de " },
    ),
  );
}

/** Constrói o DOCUMENTO. Nenhuma concatenação de laudo acontece aqui. */
function buildDoc(f: ObstetricaFindings, cat: Catalog, customIds = new Set<string>()): ReportDoc {
  const byId = new Map(cat.slots.map((s) => [s.id, s]));
  const ordem = f.gestacao_inicial ? cat.ordem_inicial : cat.ordem_padrao;
  const gemelar = f.numero_fetos >= 2;
  const segments: Segment[] = [];

  for (const id of ordem) {
    const slot = byId.get(id);
    if (!slot) continue;
    const origin = customIds.has(id) ? "custom" : "base";
    if (gemelar && slot.porFeto) {
      // Chave composta (crítica C2): um segmento por feto, endereçável.
      f.fetos.forEach((ft, i) => {
        const inst = ft.rotulo ?? String.fromCharCode(65 + i);
        segments.push({
          slotId: id, instance: inst, kind: "corpo",
          text: interpolate(slot.frase, varsForFeto(f, i)), origin,
        });
      });
    } else if (slot.estadoClinico && estadoDe(id, f) === "alterado") {
      // C3: achado patológico → quem escreve é o MOTOR. A personalização do
      // usuário vale só para o estado normal e não pode mascarar patologia.
      segments.push({ slotId: id, kind: "corpo", text: fraseDoMotor(id, f), origin: "computed" });
    } else {
      segments.push({ slotId: id, kind: "corpo", text: interpolate(slot.frase, varsForFeto(f, 0)), origin });
    }
  }

  const ig = igFor(f);
  segments.push({ slotId: "concl_ig", kind: "conclusao", text: ig.conclusaoClassico, origin: "computed" });
  if (!f.gestacao_inicial) {
    const cl = byId.get("concl_liquido");
    if (cl) {
      segments.push({
        slotId: "concl_liquido", kind: "conclusao",
        text: interpolate(cl.frase, varsForFeto(f, 0)),
        origin: customIds.has("concl_liquido") ? "custom" : "base",
      });
    }
  }

  return { titulo: cat.titulo, dum: f.dum, segments };
}

/** Serialização: ÚLTIMO passo. Só aqui o documento vira string. */
function serialize(doc: ReportDoc, cat: Catalog): string {
  const corpo = doc.segments.filter((s) => s.kind === "corpo").map((s) => s.text);
  const concl = doc.segments.filter((s) => s.kind === "conclusao").map((s) => s.text);
  const dumLinha = doc.dum ? `\nDUM: ${doc.dum}.\n` : "";
  const conclTxt =
    concl.length === 1 ? (concl[0] ?? "") : concl.map((it, i) => `${i + 1}) ${it}`).join("\n");
  return [
    doc.titulo, dumLinha, "", cat.comentarios, "", cat.header_aspectos,
    corpo.join("\n"), "", cat.header_conclusao, conclTxt,
  ].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// 4. Validação de operações — invariantes de PRESENÇA e de CONTEÚDO
// ---------------------------------------------------------------------------

type Operation =
  | { op: "remove_slot"; slot: string }
  | { op: "replace_phrase"; slot: string; value: string };

function validateOps(cat: Catalog, ops: Operation[]): string[] {
  const byId = new Map(cat.slots.map((s) => [s.id, s]));
  const erros: string[] = [];
  for (const o of ops) {
    const slot = byId.get(o.slot);
    if (!slot) {
      erros.push(`slot inexistente no modelo-base v${cat.versao}: ${o.slot}`);
      continue;
    }
    if (o.op === "remove_slot") {
      if (slot.obrigatorio) erros.push(`slot obrigatório não pode ser removido: ${o.slot}`);
      continue;
    }
    // replace_phrase — invariante de CONTEÚDO (crítica C2)
    if (o.value.trim() === "") {
      erros.push(`frase vazia esvazia o slot na prática: ${o.slot}`);
      continue;
    }
    for (const ph of slot.placeholdersObrigatorios ?? []) {
      if (!o.value.includes(`{${ph}}`)) {
        erros.push(`a frase de "${o.slot}" precisa conservar o dado {${ph}}`);
      }
    }
    // C12: placeholder que o motor não sabe preencher não pode ser aceito.
    for (const ph of placeholdersDe(o.value)) {
      if (!(VARS_CONHECIDAS as readonly string[]).includes(ph)) {
        erros.push(`placeholder desconhecido em "${o.slot}": {${ph}}`);
      }
    }
    // C4/lint: personalização não pode injetar cabeçalho de seção.
    if (/^\s*(CONCLUS[ÃA]O|IMPRESS[ÃA]O|ACHADOS|TÉCNICA|COMENTÁRIOS)\s*:/im.test(o.value)) {
      erros.push(`a frase de "${o.slot}" não pode conter cabeçalho de seção`);
    }
  }
  return erros;
}

function applyOps(cat: Catalog, ops: Operation[]): { cat: Catalog; customIds: Set<string> } {
  const removed = new Set(ops.filter((o) => o.op === "remove_slot").map((o) => o.slot));
  const replaced = new Map(
    ops.filter((o): o is Extract<Operation, { op: "replace_phrase" }> => o.op === "replace_phrase")
      .map((o) => [o.slot, o.value]),
  );
  const next: Catalog = {
    ...cat,
    slots: cat.slots.map((s) => (replaced.has(s.id) ? { ...s, frase: replaced.get(s.id)! } : s)),
    ordem_padrao: cat.ordem_padrao.filter((id) => !removed.has(id)),
    ordem_inicial: cat.ordem_inicial.filter((id) => !removed.has(id)),
  };
  return { cat: next, customIds: new Set([...removed, ...replaced.keys()]) };
}

// ---------------------------------------------------------------------------
// 5. Fixtures
// ---------------------------------------------------------------------------

function findings(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
    fetos: [{
      rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
      polo_cefalico: null, bcf_bpm: 142, dbp_mm: 85, cc_mm: 310, ca_mm: 295,
      cf_mm: 62, ccn_mm: null, peso_g: 2450, peso_variacao_g: null, percentil: null,
    }],
    ig_semanas: 32, ig_dias: 4, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null,
    saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
    placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null,
    liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
    liquido_classe: null, achados_adicionais: null, itens_conclusao_livres: [],
    ...over,
  };
}

const CASO_PADRAO = findings();
const CASO_INICIAL = findings({
  gestacao_inicial: true, ig_semanas: 8, ig_dias: 2,
  saco_gestacional_medidas_mm: [20.3, 10.4, 15.4],
  fetos: [{ ...findings().fetos[0]!, bcf_bpm: 158, ccn_mm: 16.4, peso_g: null, dbp_mm: null, cc_mm: null, ca_mm: null, cf_mm: null }],
});
const CASO_GEMELAR = findings({
  numero_fetos: 2,
  fetos: [
    { ...findings().fetos[0]!, rotulo: "A", bcf_bpm: 140, peso_g: 2100 },
    { ...findings().fetos[0]!, rotulo: "B", bcf_bpm: 148, peso_g: 2380, dbp_mm: 83 },
  ],
});

function diff(a: string, b: string): string {
  const la = a.split("\n"), lb = b.split("\n");
  const out: string[] = [];
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) out.push(`    L${i + 1}\n      renderer: ${JSON.stringify(la[i])}\n      catálogo: ${JSON.stringify(lb[i])}`);
  }
  return out.slice(0, 8).join("\n");
}
const render = (f: ObstetricaFindings, cat = BASE_CATALOG, ids = new Set<string>()) =>
  serialize(buildDoc(f, cat, ids), cat);

// ---------------------------------------------------------------------------

console.log("\n[H1] Catálogo + documento estruturado reproduzem o renderer byte-a-byte\n");

const rPadrao = renderObstetricaClassico(CASO_PADRAO);
check("feto único, gestação padrão", rPadrao === render(CASO_PADRAO), diff(rPadrao, render(CASO_PADRAO)));
const rInicial = renderObstetricaClassico(CASO_INICIAL);
check("feto único, gestação inicial", rInicial === render(CASO_INICIAL), diff(rInicial, render(CASO_INICIAL)));

console.log("\n[H2] Personalização = operação sobre o catálogo\n");

const opsTres: Operation[] = [{
  op: "replace_phrase", slot: "saco_gestacional",
  value: "Saco gestacional de forma normal, medindo {sg_medidas} mm, com diâmetro médio de {dsm} mm.",
}];
check("operação válida passa na validação", validateOps(BASE_CATALOG, opsTres).length === 0);
const t = applyOps(BASE_CATALOG, opsTres);
const outTres = render(CASO_INICIAL, t.cat, t.customIds);
check(
  "3 medidas do saco gestacional aparecem (dado já extraído, hoje descartado)",
  outTres.includes("medindo 20,3 x 10,4 x 15,4 mm, com diâmetro médio de 15,4 mm"),
);
check(
  "o resto do laudo permanece idêntico ao base",
  outTres.replace(/Saco gestacional[^\n]*\n/, "") === render(CASO_INICIAL).replace(/Saco gestacional[^\n]*\n/, ""),
);

const opsFrase: Operation[] = [{ op: "replace_phrase", slot: "movimentos_fetais", value: "Movimentação fetal presente e ativa." }];
const fr = applyOps(BASE_CATALOG, opsFrase);
const outFrase = render(CASO_PADRAO, fr.cat, fr.customIds);
check(
  "frase substituída aparece; a original some",
  outFrase.includes("Movimentação fetal presente e ativa.") && !outFrase.includes("Os movimentos fetais são ativos."),
);

console.log("\n[H3] Invariantes: presença E conteúdo (crítica C2 do Codex)\n");

check("remover slot obrigatório (dbp) é rejeitado",
  validateOps(BASE_CATALOG, [{ op: "remove_slot", slot: "dbp" }]).length === 1);
check("remover slot opcional (movimentos_fetais) é permitido",
  validateOps(BASE_CATALOG, [{ op: "remove_slot", slot: "movimentos_fetais" }]).length === 0);
check("slot inexistente é rejeitado (detecta conflito de versão do base)",
  validateOps(BASE_CATALOG, [{ op: "replace_phrase", slot: "slot_que_sumiu", value: "x" }]).length === 1);
// As três abaixo FALHAVAM na v1 — eram o furo apontado pelo Codex.
check("esvaziar a frase de um slot obrigatório é rejeitado",
  validateOps(BASE_CATALOG, [{ op: "replace_phrase", slot: "dbp", value: "   " }]).length === 1);
check("reescrever DBP perdendo a medida {dbp} é rejeitado",
  validateOps(BASE_CATALOG, [{ op: "replace_phrase", slot: "dbp", value: "Diâmetro biparietal normal." }]).length === 1);
check("reescrever DBP conservando {dbp} é permitido",
  validateOps(BASE_CATALOG, [{ op: "replace_phrase", slot: "dbp", value: "DBP: {dbp} mm." }]).length === 0);

console.log("\n[H4] Guards podem operar por SLOT, não por regex (crítica C1 do Codex)\n");

/**
 * Versão estrutural do pesoFetalGuard. O guard atual
 * (pipeline/pesoFetalGuard.ts) chama parseConclusion, que procura
 * /^CONCLUS[ÃA]O:/im — e por isso vira no-op silencioso no estilo OBJETIVO,
 * onde o cabeçalho é "IMPRESSÃO:". Aqui não há cabeçalho nenhum a procurar.
 */
function ensurePesoFetalConclusaoEstrutural(doc: ReportDoc, frase: string): ReportDoc {
  const jaTem = doc.segments.some((s) => s.kind === "conclusao" && s.slotId === "concl_peso_fetal");
  if (jaTem) return doc;
  return { ...doc, segments: [...doc.segments, { slotId: "concl_peso_fetal", kind: "conclusao", text: frase, origin: "computed" }] };
}

const FRASE_PIG = "O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.).";
const docBase = buildDoc(CASO_PADRAO, BASE_CATALOG);
const docComPig = ensurePesoFetalConclusaoEstrutural(docBase, FRASE_PIG);
check("guard insere o item de peso fetal na conclusão",
  serialize(docComPig, BASE_CATALOG).includes(FRASE_PIG));
check("guard é idempotente (não duplica em segunda passagem)",
  serialize(ensurePesoFetalConclusaoEstrutural(docComPig, FRASE_PIG), BASE_CATALOG).split(FRASE_PIG).length - 1 === 1);

// O mesmo guard, no catálogo de estilo objetivo (cabeçalho IMPRESSÃO:).
const CAT_OBJETIVO: Catalog = { ...BASE_CATALOG, header_conclusao: "IMPRESSÃO:", header_aspectos: "ACHADOS:" };
const docObj = ensurePesoFetalConclusaoEstrutural(buildDoc(CASO_PADRAO, CAT_OBJETIVO), FRASE_PIG);
const outObj = serialize(docObj, CAT_OBJETIVO);
check("MESMO guard funciona com cabeçalho IMPRESSÃO: (hoje viraria no-op)",
  outObj.includes("IMPRESSÃO:") && outObj.includes(FRASE_PIG));
check("personalizar o texto de um slot NÃO cega o guard (endereça por slot)",
  serialize(ensurePesoFetalConclusaoEstrutural(buildDoc(CASO_PADRAO, fr.cat, fr.customIds), FRASE_PIG), fr.cat).includes(FRASE_PIG));

console.log("\n[H5] Chave composta para gemelar (crítica C2 do Codex)\n");

const docGem = buildDoc(CASO_GEMELAR, BASE_CATALOG);
const chavesDbp = docGem.segments.filter((s) => s.slotId === "dbp").map(keyOf);
check("gemelar produz um segmento de DBP por feto, endereçável",
  chavesDbp.length === 2 && chavesDbp[0] === "dbp#A" && chavesDbp[1] === "dbp#B",
  `    chaves: ${JSON.stringify(chavesDbp)}`);
check("as instâncias carregam valores distintos",
  docGem.segments.find((s) => keyOf(s) === "dbp#B")?.text.includes("83") === true);
check("feto único não ganha instância (chave permanece simples)",
  buildDoc(CASO_PADRAO, BASE_CATALOG).segments.filter((s) => s.slotId === "dbp").map(keyOf)[0] === "dbp");

console.log("\n[H6] Rastreabilidade de origem para o Lab\n");
const docCustom = buildDoc(CASO_PADRAO, fr.cat, fr.customIds);
check("segmento personalizado é marcado como 'custom'",
  docCustom.segments.find((s) => s.slotId === "movimentos_fetais")?.origin === "custom");
check("segmento não tocado permanece 'base'",
  docCustom.segments.find((s) => s.slotId === "dbp")?.origin === "base");
check("item calculado pelo motor é 'computed'",
  docCustom.segments.find((s) => s.slotId === "concl_ig")?.origin === "computed");

console.log("\n[H7] Estados clínicos não são personalizáveis (crítica C3 do Codex)\n");

const opsPlacenta: Operation[] = [{ op: "replace_phrase", slot: "placenta", value: "\nPlacenta sem alterações." }];
const pl = applyOps(BASE_CATALOG, opsPlacenta);
check("personalizar a placenta NORMAL é permitido e aparece",
  render(CASO_PADRAO, pl.cat, pl.customIds).includes("Placenta sem alterações."));

const CASO_PLACENTA_PREVIA = findings({ placenta_localizacao: "prévia centro-total" });
const outPrevia = render(CASO_PLACENTA_PREVIA, pl.cat, pl.customIds);
check("com placenta PRÉVIA, a personalização de normalidade NÃO mascara o achado",
  !outPrevia.includes("Placenta sem alterações.") && outPrevia.includes("prévia centro-total"),
  `    linha: ${outPrevia.split("\n").find((l) => l.includes("Placenta"))}`);
check("o segmento patológico é marcado 'computed' (motor), não 'custom'",
  buildDoc(CASO_PLACENTA_PREVIA, pl.cat, pl.customIds).segments.find((s) => s.slotId === "placenta")?.origin === "computed");

const CASO_OLIGO = findings({ liquido_tipo: "alterado", liquido_classe: "oligoâmnio" });
const opsLiq: Operation[] = [{ op: "replace_phrase", slot: "liquido_amniotico", value: "Líquido amniótico normal." }];
const lq = applyOps(BASE_CATALOG, opsLiq);
check("com oligoâmnio, a personalização de normalidade NÃO mascara o achado",
  render(CASO_OLIGO, lq.cat, lq.customIds).includes("oligoâmnio"));

console.log("\n[H8] Personalização não injeta lixo no laudo (crítica C12 do Codex)\n");

check("placeholder desconhecido é rejeitado na validação",
  validateOps(BASE_CATALOG, [{ op: "replace_phrase", slot: "movimentos_fetais", value: "Movimentos {inexistente}." }]).length === 1);
check("injetar cabeçalho de seção é rejeitado",
  validateOps(BASE_CATALOG, [{ op: "replace_phrase", slot: "movimentos_fetais", value: "CONCLUSÃO: texto" }]).length === 1);
check("nenhum placeholder vaza literalmente para o laudo final",
  !/\{\w+\}/.test(render(CASO_PADRAO)) && !/\{\w+\}/.test(render(CASO_INICIAL)));

console.log(`\n${pass} passaram, ${fail} falharam\n`);
console.log("LACUNAS CONHECIDAS (documentadas em docs/projeto-modelos/):");
console.log("  - paridade byte-a-byte do GEMELAR não está provada (peso médio e divergência");
console.log("    ponderal seguem no motor; aqui só a chave composta foi demonstrada)");
console.log("  - variações de líquido (ILA/MBV/alterado) e de placenta (localização/grau/ecotextura)");
console.log("  - flags igCorrection / flexivel / grannum");
console.log("  - migração dos 16 guards reais para a forma estrutural (só pesoFetal foi demonstrado)");
if (fail > 0) process.exit(1);
