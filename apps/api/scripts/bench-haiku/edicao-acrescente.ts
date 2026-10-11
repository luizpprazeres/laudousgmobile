/**
 * BANCADA W17 — edição incremental (/api/edit) com "acrescente <achado>".
 *
 * Defeito relatado pelo Luiz (10/10, laudo de abdome em produção): o ajuste
 * "Acrescente no corpo: Aorta abdominal com placas calcificadas parietais."
 * entrou como linha NOVA embaixo de "Aorta abdominal de calibre e contornos
 * normais." e a conclusão seguiu "sem evidência de alterações ecográficas".
 *
 * Roda `editReport` de PRODUÇÃO pela ASSINATURA (`claude -p`, cliAnthropicClient);
 * a chave da API é bloqueada no processo. Laudos sintéticos (modelo da casa).
 * Inclui os casos de SUBSTITUIÇÃO do golden antigo como controle de regressão.
 *
 * Rodar (da raiz):
 *   node_modules/.bin/tsx --tsconfig apps/api/tsconfig.json apps/api/scripts/bench-haiku/edicao-acrescente.ts [filtro]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cliAnthropicClient } from "./cliAnthropicClient";

process.env.ANTHROPIC_API_KEY = "sk-ant-bench-blocked-no-real-anthropic-calls";
process.env.OPENAI_API_KEY = "sk-bench-blocked-no-real-openai-calls";

const REPO = resolve(__dirname, "../../../..");

type Target = "body" | "conclusion" | "both";
type Case = {
  name: string;
  category: string;
  baseText: string;
  instruction: string;
  target: Target;
  /** Tem que aparecer no laudo editado. */
  expected: RegExp[];
  /** NÃO pode sobreviver no laudo editado. */
  notExpected: RegExp[];
  /** Linhas que têm que continuar idênticas (órgãos não citados). */
  untouched: string[];
};

const ABDOME_COMENTARIOS =
  "Exame realizado com transdutor de 4.0 MHz, inicialmente do abdome superior com paciente em jejum e posteriormente com a bexiga repleta do abdome inferior. Foram realizados múltiplos cortes, abrangendo todo o abdome, em decúbito dorsal como também em ortostase. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

const RIM_D =
  "Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.";
const RIM_E =
  "Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.";
const FIGADO = "Fígado de dimensões normais, contornos regulares e ecotextura homogênea.";
const AORTA = "Aorta abdominal de calibre e contornos normais.";

/** Modelo da casa de abdome total normal (o mesmo do laudo de produção de 10/10). */
const ABDOME_NORMAL = [
  "ULTRASSONOGRAFIA DO ABDOME TOTAL",
  "",
  "COMENTÁRIOS:",
  ABDOME_COMENTARIOS,
  "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  FIGADO,
  "Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.",
  "Veia porta de calibre normal.",
  "Vesícula biliar de topografia usual e de parede fina, sem cálculo.",
  "Canal hepático e canal colédoco de calibre normal.",
  "Baço de dimensões normais e ecotextura sólida e homogênea.",
  "Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam dimensões normais.",
  RIM_D,
  RIM_E,
  "Veia cava inferior de calibre e contornos normais.",
  AORTA,
  "Bexiga de forma, contorno e ecotextura normais.",
  "",
  "CONCLUSÃO:",
  "Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.",
].join("\n");

/** Variante com a frase dos rins que NEGA cisto e uma conclusão por órgão. */
const RINS_NEGA = "Rins tópicos, de forma, contornos e dimensões normais, com boa diferenciação corticomedular, sem imagens de cálculos ou cistos.";
const ABDOME_ESTEATOSE = [
  "ULTRASSONOGRAFIA DO ABDOME TOTAL",
  "",
  "COMENTÁRIOS:",
  ABDOME_COMENTARIOS,
  "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "Fígado de dimensões normais, contornos regulares e ecogenicidade difusamente aumentada.",
  "Vesícula biliar de topografia usual e de parede fina, sem cálculo.",
  "Baço de dimensões normais e ecotextura sólida e homogênea.",
  RINS_NEGA,
  AORTA,
  "Bexiga de forma, contorno e ecotextura normais.",
  "",
  "CONCLUSÃO:",
  "1) Esteatose hepática.",
  "2) Rins sem alterações ecográficas.",
].join("\n");

const UTERO = "Útero em anteversoflexão, de forma, contornos e dimensões normais, com miométrio de ecotextura homogênea.";
const PELVE_NORMAL = [
  "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL",
  "",
  "ACHADOS:",
  UTERO,
  "Endométrio centrado, homogêneo, medindo 6 mm de espessura.",
  "Ovário direito de forma, contornos e dimensões normais.",
  "Ovário esquerdo de forma, contornos e dimensões normais.",
  "Ausência de líquido livre no fundo de saco posterior.",
  "",
  "IMPRESSÃO:",
  "Exame dentro dos limites da normalidade.",
].join("\n");

const OBST_BASE = [
  "ULTRASSONOGRAFIA OBSTÉTRICA",
  "",
  "COMENTÁRIOS:",
  "Exame realizado com transdutor de 4.0 MHz.",
  "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "Feto único, em apresentação cefálica.",
  "Placenta de localização anterior, grau II.",
  "Líquido amniótico em quantidade normal.",
  "",
  "CONCLUSÃO:",
  "1. Gestação tópica, única, em torno de 30 semanas.",
  "2. Líquido amniótico em quantidade normal.",
].join("\n");

const CASES: Case[] = [
  {
    name: "A1 abdome normal + cisto simples no rim direito",
    category: "ABDOMEN_TOTAL",
    baseText: ABDOME_NORMAL,
    instruction: "acrescente um cisto simples de 2,0 cm no rim direito",
    target: "body",
    expected: [/cisto simples/i, /^Rim direito\b.*$/m, /CONCLUSÃO:\n(?:1\) )?Cisto simples[^\n]*rim direito/i],
    notExpected: [/sem evidência de alterações ecográficas/i, /dentro dos limites da normalidade\./i, new RegExp(`^${esc(RIM_D)}$`, "m")],
    untouched: [RIM_E, FIGADO, AORTA],
  },
  {
    name: "A2 abdome normal + placas na aorta (caso de produção 10/10)",
    category: "ABDOMEN_TOTAL",
    baseText: ABDOME_NORMAL,
    instruction: "Acrescente no corpo: Aorta abdominal com placas calcificadas parietais.",
    target: "body",
    expected: [/placas calcificadas parietais/i],
    notExpected: [/sem evidência de alterações ecográficas/i, new RegExp(`^${esc(AORTA)}$`, "m")],
    untouched: [RIM_D, RIM_E, FIGADO],
  },
  {
    name: "A3 abdome com esteatose + cisto no rim direito (rins negam cisto)",
    category: "ABDOMEN_TOTAL",
    baseText: ABDOME_ESTEATOSE,
    instruction: "acrescenta cisto simples de 2 cm no terço médio do rim direito",
    target: "body",
    expected: [/cisto simples/i, /1\) Esteatose hepática\./, /rim esquerdo|rins?/i],
    notExpected: [/sem imagens de cálculos ou cistos\./i, /Rins sem alterações/i],
    untouched: [AORTA, "Vesícula biliar de topografia usual e de parede fina, sem cálculo."],
  },
  {
    name: "P1 pelve normal + mioma intramural",
    category: "PELVE_FEMININA",
    baseText: PELVE_NORMAL,
    instruction: "adicione um mioma intramural de 2,1 cm na parede anterior",
    target: "body",
    expected: [/mioma|nódulo/i, /IMPRESSÃO:\n(?:1\) )?[^\n]*(mioma|nódulo)/i],
    notExpected: [/dentro dos limites da normalidade/i, /miométrio de ecotextura homogênea\./i],
    untouched: ["Ovário direito de forma, contornos e dimensões normais.", "Endométrio centrado, homogêneo, medindo 6 mm de espessura."],
  },
  {
    name: "O1 obstétrico + circular de cordão (conclusão já tem itens)",
    category: "OBSTETRICA",
    baseText: OBST_BASE,
    instruction: "acrescente circular de cordão simples na região cervical",
    target: "body",
    expected: [/circular/i, /1\. Gestação tópica, única, em torno de 30 semanas\./],
    notExpected: [],
    untouched: ["Placenta de localização anterior, grau II.", "Líquido amniótico em quantidade normal."],
  },
  // ── Controles (golden antigo: substituição/roteamento) ──
  {
    name: "C1 substituição — ILA→MBV (a antiga some)",
    category: "OBSTETRICA",
    baseText: OBST_BASE.replace("Líquido amniótico em quantidade normal.", "O índice do líquido amniótico mede 10,4 cm."),
    instruction: "troca a frase do líquido para maior bolsão vertical mede 5 cm",
    target: "body",
    expected: [/Maior bolsão vertical[^\n]*mede 5/i, /2\. Líquido amniótico em quantidade normal\./],
    notExpected: [/índice do líquido amni[oó]tico/i],
    untouched: ["Placenta de localização anterior, grau II."],
  },
  {
    name: "C2 muda a frase do líquido (corpo), conclusão intacta",
    category: "OBSTETRICA",
    baseText: OBST_BASE,
    instruction: "muda a frase do líquido, ILA 10,4",
    target: "body",
    expected: [/O índice do líquido amniótico mede 10,4 cm\./, /2\. Líquido amniótico em quantidade normal\./],
    notExpected: [],
    untouched: ["Placenta de localização anterior, grau II."],
  },
  {
    name: "C3 adiciona na CONCLUSÃO (alvo conclusão)",
    category: "PELVE_FEMININA",
    baseText: [
      "ULTRASSONOGRAFIA PÉLVICA",
      "",
      "ACHADOS:",
      "Útero em anteversoflexão, de dimensões normais.",
      "Ovários de aspecto habitual.",
      "",
      "CONCLUSÃO:",
      "1. Exame pélvico sem alterações significativas.",
    ].join("\n"),
    instruction: "adicione: achados compatíveis com adenomiose",
    target: "conclusion",
    expected: [/adenomiose/i],
    notExpected: [],
    untouched: ["Útero em anteversoflexão, de dimensões normais."],
  },
];

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const { editReport } = await import("../../src/server/pipeline/editReport");
  const filter = process.argv[2];
  const client = cliAnthropicClient("medium");
  const outDir = join(REPO, "tmp-review/haiku-migration/w17-edicao-acrescente");
  mkdirSync(outDir, { recursive: true });
  const rows: Array<Record<string, unknown>> = [];
  let ok = 0;
  let total = 0;
  for (const c of CASES.filter((x) => !filter || x.name.includes(filter))) {
    total += 1;
    const t0 = Date.now();
    const r = await editReport({
      baseText: c.baseText,
      instruction: c.instruction,
      category: c.category,
      target: c.target,
      anthropicClient: client,
    });
    const text = r.editedText;
    const falhas: string[] = [];
    if (!r.accepted) falhas.push(`rejeitado: ${r.reason}`);
    for (const re of c.expected) if (!re.test(text)) falhas.push(`faltou ${re}`);
    for (const re of c.notExpected) if (re.test(text)) falhas.push(`sobrou ${re}`);
    for (const l of c.untouched) if (!text.split("\n").includes(l)) falhas.push(`mexeu em: ${l.slice(0, 50)}…`);
    if (falhas.length === 0) ok += 1;
    console.log(`\n=== ${c.name} (${((Date.now() - t0) / 1000).toFixed(1)}s) ${falhas.length ? "✗" : "✓"}`);
    for (const f of falhas) console.log(`   - ${f}`);
    for (const l of r.changedLines) console.log(`   [${l.section}] - ${l.before ?? "∅"}\n   [${l.section}] + ${l.after ?? "∅"}`);
    rows.push({ name: c.name, accepted: r.accepted, reason: r.reason, falhas, changedLines: r.changedLines, editedText: text });
  }
  const file = join(outDir, `resultado-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(rows, null, 2));
  console.log(`\n${ok}/${total} casos ok — ${file}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
