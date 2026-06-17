/**
 * Teste manual do módulo determinístico de IG (regra Dr. Domingos).
 * Rodar: npx tsx src/server/renderer/__tests__/ig.manual.ts
 *
 * Cobre os 3 casos clínicos + as bordas levantadas no review adversarial dex2:
 * off-by-one no threshold (diff === 5), data inválida (rollover), data futura,
 * precedência 1ªUS/DUM, biometria ausente, fonte do percentil, byte-stability.
 */
import {
  computeIg,
  computeRHoje,
  buildIgInput,
  parseDataStrict,
  formatIgSemanasDias,
  IG_DIVERGENCE_THRESHOLD_DAYS,
  type IgComputeInput,
  type IgRawFields,
  type IgReferencia,
} from "../ig";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

const LEAD = "Gestação em torno de ";
function base(over: Partial<IgComputeInput> = {}): IgComputeInput {
  return {
    biometriaSemanas: null,
    biometriaDias: null,
    referencia: null,
    dataExame: null,
    corrigir: true,
    leadAncora: LEAD,
    leadBase: LEAD,
    ...over,
  };
}
function usg(over: Partial<IgReferencia> = {}): IgReferencia {
  return {
    fonte: "usg_precoce",
    data: null,
    igNaDataSemanas: null,
    igNaDataDias: null,
    rHojeSemanas: null,
    rHojeDias: null,
    ...over,
  };
}

// ── formatação ──
check("formatIg omite dias quando 0", formatIgSemanasDias(20, 0) === "20 semanas");
check("formatIg com dias", formatIgSemanasDias(20, 3) === "20 semanas e 3 dias");
check("formatIg placeholder", formatIgSemanasDias(null, null) === "____ semanas");

// ── parseDataStrict (bomba #2: rollover) ──
check("parseDataStrict aceita DD/MM/AAAA", parseDataStrict("12/01/2026") !== null);
check("parseDataStrict aceita ISO", parseDataStrict("2026-01-12") !== null);
check("parseDataStrict REJEITA 31/02 (rollover)", parseDataStrict("31/02/2026") === null);
check("parseDataStrict REJEITA 32/01", parseDataStrict("32/01/2026") === null);
check("parseDataStrict REJEITA 00/00", parseDataStrict("00/00/2026") === null);
check("parseDataStrict null em lixo", parseDataStrict("abc") === null);

// ── computeRHoje (aritmética de datas) ──
{
  // 12/01/2026 (8s2d) → 15/03/2026: +62 dias → 58+62=120d = 17s1d
  const r = computeRHoje(
    usg({ data: "12/01/2026", igNaDataSemanas: 8, igNaDataDias: 2 }),
    "15/03/2026",
  );
  check("computeRHoje USG corrige p/ hoje (17s1d)", r?.semanas === 17 && r?.dias === 1, JSON.stringify(r));
}
{
  // R_hoje ditado direto vence (sem datas)
  const r = computeRHoje(usg({ rHojeSemanas: 20, rHojeDias: 3 }), null);
  check("computeRHoje direto vence", r?.semanas === 20 && r?.dias === 3);
}
{
  // data futura → null
  const r = computeRHoje(
    usg({ data: "15/03/2026", igNaDataSemanas: 8, igNaDataDias: 2 }),
    "12/01/2026",
  );
  check("computeRHoje data futura → null", r === null);
}
{
  // data inválida → null (não calcula com rollover)
  const r = computeRHoje(
    usg({ data: "31/02/2026", igNaDataSemanas: 8, igNaDataDias: 2 }),
    "15/03/2026",
  );
  check("computeRHoje data inválida → null", r === null);
}
{
  // DUM: 01/01/2026 → 15/03/2026 = 73 dias = 10s3d
  const r = computeRHoje({ fonte: "dum", data: "01/01/2026", igNaDataSemanas: null, igNaDataDias: null, rHojeSemanas: null, rHojeDias: null }, "15/03/2026");
  check("computeRHoje DUM (10s3d)", r?.semanas === 10 && r?.dias === 3, JSON.stringify(r));
}

// ── 1. sem referência → âncora pura ──
{
  const r = computeIg(base({ biometriaSemanas: 20, biometriaDias: 3 }));
  check("sem_referencia: caso", r.caso === "sem_referencia");
  check("sem_referencia: conclusão", r.conclusaoClassico === "Gestação em torno de 20 semanas e 3 dias.");
  check("sem_referencia: objetivo 1 item", r.conclusaoObjetivo.length === 1);
  check("sem_referencia: percentil usa biometria", r.igParaPercentil?.source === "biometria");
}

// ── 2. concordante (diff 0) ──
{
  const r = computeIg(base({
    biometriaSemanas: 20, biometriaDias: 3,
    referencia: usg({ rHojeSemanas: 20, rHojeDias: 3 }),
  }));
  check("concordante: caso", r.caso === "concordante", JSON.stringify(r));
  check("concordante: só biometria", r.conclusaoClassico === "Gestação em torno de 20 semanas e 3 dias.");
  check("concordante: divergenciaDias 0", r.divergenciaDias === 0);
  check("concordante: percentil usa referencia", r.igParaPercentil?.source === "referencia");
}

// ── 3. divergência leve (diff = threshold = 5) — OFF-BY-ONE (dex2) ──
{
  // biometria 20s3d (143d) vs R_hoje 19s5d (138d) → diff 5 → leve, NÃO corrige
  const r = computeIg(base({
    biometriaSemanas: 20, biometriaDias: 3, corrigir: true,
    referencia: usg({ rHojeSemanas: 19, rHojeDias: 5 }),
  }));
  check("diff===5: é divergente_leve (≤threshold)", r.caso === "divergente_leve", `caso=${r.caso} diff=${r.divergenciaDias} thr=${IG_DIVERGENCE_THRESHOLD_DAYS}`);
  check("diff===5: NÃO corrige (só biometria)", r.conclusaoClassico === "Gestação em torno de 20 semanas e 3 dias.");
}

// ── 4. divergência relevante (diff 6) + corrigir=true ──
{
  // biometria 19s4d (137d) vs R_hoje 20s3d (143d) → diff 6 → corrige
  const r = computeIg(base({
    biometriaSemanas: 19, biometriaDias: 4, corrigir: true,
    referencia: usg({ data: "12/01/2026", igNaDataSemanas: 8, igNaDataDias: 2, rHojeSemanas: 20, rHojeDias: 3 }),
  }));
  check("diff>thr: caso divergente", r.caso === "divergente", `caso=${r.caso} diff=${r.divergenciaDias}`);
  check(
    "diff>thr: clássico = frase Domingos",
    r.conclusaoClassico === "Gestação em torno de 19 semanas e 4 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 20 semanas e 3 dias.",
    r.conclusaoClassico,
  );
  check("diff>thr: objetivo 2 itens", r.conclusaoObjetivo.length === 2);
  check(
    "diff>thr: objetivo item 1",
    r.conclusaoObjetivo[0] === "Gestação em torno de 19 semanas e 4 dias pela biometria atual.",
    r.conclusaoObjetivo[0],
  );
  check(
    "diff>thr: objetivo item 2",
    r.conclusaoObjetivo[1] === "Gestação em torno de 20 semanas e 3 dias corrigido pela ultrassonografia precoce.",
    r.conclusaoObjetivo[1],
  );
}

// ── 5. divergência relevante + corrigir=false → âncora pura ──
{
  const r = computeIg(base({
    biometriaSemanas: 19, biometriaDias: 4, corrigir: false,
    referencia: usg({ rHojeSemanas: 20, rHojeDias: 3 }),
  }));
  check("corrigir=false: caso divergente_sem_correcao", r.caso === "divergente_sem_correcao");
  check("corrigir=false: só biometria", r.conclusaoClassico === "Gestação em torno de 19 semanas e 4 dias.");
}

// ── 6. DUM como fonte ──
{
  const r = computeIg(base({
    biometriaSemanas: 19, biometriaDias: 4, corrigir: true,
    referencia: { fonte: "dum", data: "01/01/2026", igNaDataSemanas: null, igNaDataDias: null, rHojeSemanas: 20, rHojeDias: 3 },
  }));
  check("DUM: fonteLabel", r.fonteLabel === "data da última menstruação");
  check(
    "DUM: clássico cita DUM",
    r.conclusaoClassico.includes("devendo ser corrigida pela data da última menstruação"),
    r.conclusaoClassico,
  );
}

// ── 7. frase-prosa da referência (USG) ──
{
  const r = computeIg(base({
    biometriaSemanas: 17, biometriaDias: 1,
    referencia: usg({ data: "12/01/2026", igNaDataSemanas: 8, igNaDataDias: 2 }),
    dataExame: "15/03/2026",
  }));
  check(
    "frase-prosa USG",
    // Plural sempre ("1 dias"): espelha o formatIg dos renderers (byte-stability).
    r.fraseReferencia === "Primeira ultrassonografia realizada 12/01/2026 com 8 semanas e 2 dias. Hoje com 17 semanas e 1 dias.",
    r.fraseReferencia ?? "null",
  );
}

// ── 8. biometria ausente + referência → placeholder (dex1+dex2 CRÍTICO) ──
{
  const r = computeIg(base({
    biometriaSemanas: null, biometriaDias: null,
    referencia: usg({ rHojeSemanas: 20, rHojeDias: 3 }),
  }));
  check("sem_biometria: caso", r.caso === "sem_biometria");
  check("sem_biometria: placeholder na conclusão", r.conclusaoClassico === "Gestação em torno de ____ semanas.");
  check("sem_biometria: NUNCA referência como âncora", !r.conclusaoClassico.includes("20 semanas"));
  check("sem_biometria: percentil = referencia (informativo)", r.igParaPercentil?.source === "referencia");
}

// ── 9. byte-stability: mesmo input → mesmo resultado ──
{
  const inp = base({
    biometriaSemanas: 19, biometriaDias: 4, corrigir: true,
    referencia: usg({ data: "12/01/2026", igNaDataSemanas: 8, igNaDataDias: 2 }),
    dataExame: "15/03/2026",
  });
  const a = JSON.stringify(computeIg(inp));
  const b = JSON.stringify(computeIg(inp));
  check("byte-stability: idempotente", a === b);
}

// ── 10. gemelar: lead com corionicidade ──
{
  const r = computeIg(base({
    biometriaSemanas: 20, biometriaDias: 3,
    leadAncora: "Gestação gemelar dicoriônica e diamniótica em torno de ",
  }));
  check(
    "gemelar: lead preservado",
    r.conclusaoClassico === "Gestação gemelar dicoriônica e diamniótica em torno de 20 semanas e 3 dias.",
  );
}

// ── 11. buildIgInput: fonte explícita desambigua R_hoje direto + DUM (dex1 ALTO) ──
function rawBase(over: Partial<IgRawFields> = {}): IgRawFields {
  return {
    biometriaSemanas: 19, biometriaDias: 4,
    dataExame: null, dum: null,
    primeiraUsData: null, primeiraUsIgSemanas: null, primeiraUsIgDias: null,
    igRefHojeSemanas: null, igRefHojeDias: null,
    referenciaFonte: null, corrigirComando: null, ...over,
  };
}
const LEADS = { leadAncora: "Gestação em torno de ", leadBase: "Gestação em torno de " };
{
  // "DUM 01/01, mas pela primeira US hoje está com 20s3d" → fonte = usg_precoce
  const inp = buildIgInput(
    rawBase({ dum: "01/01/2026", igRefHojeSemanas: 20, igRefHojeDias: 3, referenciaFonte: "usg_precoce" }),
    LEADS,
  );
  const r = computeIg(inp);
  check(
    "fonte explícita usg vence DUM coexistente",
    r.conclusaoClassico.includes("corrigida pela ultrassonografia precoce") &&
      !r.conclusaoClassico.includes("última menstruação"),
    r.conclusaoClassico,
  );
}
{
  // Sem fonte explícita, só DUM → DUM (heurística)
  const r = computeIg(buildIgInput(rawBase({ dum: "01/01/2026", igRefHojeSemanas: 20, igRefHojeDias: 3 }), LEADS));
  check("heurística: só DUM → fonte DUM", r.conclusaoClassico.includes("última menstruação"), r.conclusaoClassico);
}
{
  // US data presente vence DUM (heurística US > DUM)
  const r = computeIg(buildIgInput(
    rawBase({ dum: "01/01/2026", primeiraUsData: "12/01/2026", primeiraUsIgSemanas: 8, primeiraUsIgDias: 2, igRefHojeSemanas: 20, igRefHojeDias: 3 }),
    LEADS,
  ));
  check("heurística: US data vence DUM", r.conclusaoClassico.includes("ultrassonografia precoce"), r.conclusaoClassico);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
