/**
 * Teste manual do aplicador de operações determinístico (DET-6).
 * Rodar: npx tsx src/server/pipeline/__tests__/operations.manual.ts
 */
import { applyOperations } from "../operations";
import type { ReportOperation } from "@laudousg/shared";

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

const LAUDO = `ULTRASSONOGRAFIA DA TIREOIDE

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Lobo direito de dimensões normais.
Lobo esquerdo de dimensões normais.

CONCLUSÃO:
1) Tireoide de volume normal.
2) Ausência de nódulos.`;

// ── replace_phrase ──
{
  const ops: ReportOperation[] = [
    { op: "replace_phrase", from: "dimensões normais", to: "dimensões aumentadas" },
  ];
  const { laudo, results } = applyOperations(LAUDO, ops);
  check(
    "replace_phrase troca TODAS as ocorrências",
    (laudo.match(/dimensões aumentadas/g) ?? []).length === 2 &&
      !laudo.includes("dimensões normais"),
    laudo,
  );
  check("replace_phrase reporta applied=true", results[0]?.applied === true);
}
{
  const ops: ReportOperation[] = [
    { op: "replace_phrase", from: "inexistente", to: "x" },
  ];
  const { laudo, results } = applyOperations(LAUDO, ops);
  check(
    "replace_phrase no-op quando frase ausente",
    laudo === LAUDO && results[0]?.applied === false &&
      results[0]?.reason === "frase_nao_encontrada",
  );
}

// ── add_conclusion_item ──
{
  const ops: ReportOperation[] = [
    { op: "add_conclusion_item", text: "recomenda-se controle em 6 meses" },
  ];
  const { laudo, results } = applyOperations(LAUDO, ops);
  check(
    "add_conclusion_item anexa ao final + capitaliza/ponto",
    /3\) Recomenda-se controle em 6 meses\./.test(laudo),
    laudo,
  );
  check("add_conclusion_item applied=true", results[0]?.applied === true);
}
{
  const ops: ReportOperation[] = [
    { op: "add_conclusion_item", text: "Achado prioritário no topo", position: 1 },
  ];
  const { laudo } = applyOperations(LAUDO, ops);
  check(
    "add_conclusion_item position=1 vai pro topo + renumera",
    /1\) Achado prioritário no topo\.\n2\) Tireoide de volume normal\.\n3\) Ausência de nódulos\./.test(
      laudo,
    ),
    laudo,
  );
}
{
  const ops: ReportOperation[] = [
    { op: "add_conclusion_item", text: "Tireoide de volume normal" },
  ];
  const { laudo, results } = applyOperations(LAUDO, ops);
  check(
    "add_conclusion_item NÃO duplica item equivalente",
    laudo === LAUDO && results[0]?.applied === false &&
      results[0]?.reason === "ja_presente",
  );
}
{
  const semConc = "ULTRASSONOGRAFIA\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nNormal.";
  const ops: ReportOperation[] = [{ op: "add_conclusion_item", text: "X" }];
  const { results } = applyOperations(semConc, ops);
  check(
    "add_conclusion_item sem CONCLUSÃO → applied=false",
    results[0]?.applied === false && results[0]?.reason === "sem_conclusao",
  );
}

// ── remove_conclusion_item ──
{
  const ops: ReportOperation[] = [
    { op: "remove_conclusion_item", match: "nódulos" },
  ];
  const { laudo, results } = applyOperations(LAUDO, ops);
  check(
    "remove_conclusion_item remove + renumera",
    /CONCLUSÃO:\n1\) Tireoide de volume normal\.$/.test(laudo) &&
      !/nódulos/.test(laudo),
    laudo,
  );
  check("remove_conclusion_item applied=true", results[0]?.applied === true);
}
{
  const ops: ReportOperation[] = [
    { op: "remove_conclusion_item", match: "carcinoma" },
  ];
  const { laudo, results } = applyOperations(LAUDO, ops);
  check(
    "remove_conclusion_item não encontrado → no-op",
    laudo === LAUDO && results[0]?.applied === false &&
      results[0]?.reason === "nao_encontrado",
  );
}

// ── insert_before / insert_after ──
{
  const ops: ReportOperation[] = [
    { op: "insert_after", anchor: "ULTRASSONOGRAFIA DA TIREOIDE", text: "Indicação clínica: rastreio." },
  ];
  const { laudo } = applyOperations(LAUDO, ops);
  check(
    "insert_after insere linha depois da âncora",
    /ULTRASSONOGRAFIA DA TIREOIDE\nIndicação clínica: rastreio\./.test(laudo),
    laudo,
  );
}
{
  const ops: ReportOperation[] = [
    { op: "insert_before", anchor: "CONCLUSÃO:", text: "OBSERVAÇÃO: exame complementar." },
  ];
  const { laudo } = applyOperations(LAUDO, ops);
  check(
    "insert_before insere linha antes da âncora",
    /OBSERVAÇÃO: exame complementar\.\nCONCLUSÃO:/.test(laudo),
    laudo,
  );
}
{
  const ops: ReportOperation[] = [
    { op: "insert_after", anchor: "XYZ inexistente", text: "y" },
  ];
  const { laudo, results } = applyOperations(LAUDO, ops);
  check(
    "insert âncora ausente → no-op",
    laudo === LAUDO && results[0]?.applied === false &&
      results[0]?.reason === "ancora_nao_encontrada",
  );
}

// ── composição em ordem ──
{
  const ops: ReportOperation[] = [
    { op: "replace_phrase", from: "Ausência de nódulos", to: "Presença de nódulo no lobo direito" },
    { op: "add_conclusion_item", text: "sugere-se PAAF" },
  ];
  const { laudo } = applyOperations(LAUDO, ops);
  check(
    "composição: replace + add aplicados em sequência",
    /2\) Presença de nódulo no lobo direito\./.test(laudo) &&
      /3\) Sugere-se PAAF\./.test(laudo),
    laudo,
  );
}

// ── determinismo ──
{
  const ops: ReportOperation[] = [
    { op: "add_conclusion_item", text: "controle anual" },
    { op: "replace_phrase", from: "normal", to: "habitual" },
  ];
  const a = applyOperations(LAUDO, ops).laudo;
  const b = applyOperations(LAUDO, ops).laudo;
  check("determinismo: mesma entrada → mesma saída", a === b);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
