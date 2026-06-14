/**
 * Teste manual da ponte comandos → operações (DET-6).
 * Rodar: npx tsx src/server/pipeline/__tests__/commandOperations.manual.ts
 */
import {
  applyCommandOperations,
  conclusionCommandsToOperations,
} from "../commandOperations";

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

const CONC = `ULTRASSONOGRAFIA DO ABDOME TOTAL

CONCLUSÃO:
1) Fígado de dimensões normais.
2) Vesícula biliar sem cálculos.`;

// ── mapeamento: diretiva → add_conclusion_item ──
{
  const ops = conclusionCommandsToOperations(
    "Na conclusão, recomendar controle em 6 meses.",
  );
  check(
    "diretiva vira add_conclusion_item (sem position = final)",
    ops.length === 1 &&
      ops[0]?.op === "add_conclusion_item" &&
      ops[0].position === undefined,
    JSON.stringify(ops),
  );
}

// ── insertAt (0-based) → position (1-based) = insertAt + 1 ──
{
  const ops = conclusionCommandsToOperations(
    "acrescente após o item 1 a frase: controle anual",
  );
  check(
    "após item 1 → position 2",
    ops.length === 1 &&
      ops[0]?.op === "add_conclusion_item" &&
      ops[0].position === 2,
    JSON.stringify(ops),
  );
}

// ── aplicação completa: anexa ao final + renumera ──
{
  const out = applyCommandOperations(
    CONC,
    "Na conclusão, recomendar controle em 6 meses.",
  );
  check(
    "recomendação entra como item 3",
    /3\) Recomenda-se controle em 6 meses\./.test(out),
    out,
  );
}

// ── posicional aplicado ──
{
  const out = applyCommandOperations(
    CONC,
    "acrescente após o item 1 a frase: repetir ultrassom em 30 dias",
  );
  check(
    "posicional vira item 2 + renumera o resto",
    /2\) Repetir ultrassom em 30 dias\.\n3\) Vesícula biliar sem cálculos\./.test(
      out,
    ),
    out,
  );
}

// ── sem comando → laudo intacto ──
{
  const out = applyCommandOperations(CONC, "abdome normal, sem alterações.");
  check("sem diretiva → laudo intacto", out === CONC, out);
}

// ── não duplica diretiva já refletida (igualdade conservadora) ──
{
  const jaTem = `ULTRASSONOGRAFIA

CONCLUSÃO:
1) Fígado normal.
2) Recomenda-se controle em 6 meses.`;
  const out = applyCommandOperations(
    jaTem,
    "na conclusão recomendar controle em 6 meses",
  );
  check("não duplica item idêntico já presente", out === jaTem, out);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
