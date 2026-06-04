/**
 * Teste manual do guard de DSM.
 * Rodar: npx tsx src/server/pipeline/__tests__/dsmGuard.manual.ts
 */
import { applyDsmPolicy, requestedDsmCalc } from "../dsmGuard";

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
};

// ── Detecção de pedido ──
check("pede: 'calcule o DSM'", requestedDsmCalc("saco gestacional medindo 2,5 por 3,1 por 4,2, calcule o DSM"));
check("pede: 'calcule o diâmetro médio do saco gestacional'", requestedDsmCalc("calcule o diâmetro médio do saco gestacional"));
check("NÃO pede: saco normal", !requestedDsmCalc("saco gestacional de forma normal"));

const LAUDO = "Saco gestacional de forma normal, com diâmetro médio de ____ mm.";

// ── Cálculo: DSM = média, reportado em mm ──
// (2,5+3,1+4,2)/3 = 3,267 cm → ×10 = 32,7 mm
const semUnidade = applyDsmPolicy(LAUDO, "saco gestacional medindo 2,5 por 3,1 por 4,2, calcule o DSM");
check("sem unidade (cm pela heurística) → 32,7 mm", /di[âa]metro médio de 32,7 mm/.test(semUnidade), semUnidade);

const cm = applyDsmPolicy(LAUDO, "saco gestacional medindo 2,5 por 3,1 por 4,2 cm, calcule o DSM");
check("cm explícito → 32,7 mm", /di[âa]metro médio de 32,7 mm/.test(cm), cm);

const mm = applyDsmPolicy(LAUDO, "saco gestacional medindo 25 por 31 por 42 mm, calcule o DSM");
check("mm explícito → 32,7 mm (sem converter)", /di[âa]metro médio de 32,7 mm/.test(mm), mm);

const comX = applyDsmPolicy(LAUDO, "saco gestacional medindo 2,5 x 3,1 x 4,2 cm. calcule o diâmetro médio do saco");
check("com 'x' como separador → 32,7 mm", /di[âa]metro médio de 32,7 mm/.test(comX), comX);

// ── Padrão nunca calcular: zera o DSM auto-calculado pelo LLM ──
const autoCalc = "Saco gestacional de forma normal, com diâmetro médio de 3,3 mm.";
check(
  "padrão: zera DSM auto-calculado → ____",
  applyDsmPolicy(autoCalc, "saco gestacional medindo 2,5 por 3,1 por 4,2 cm") ===
    "Saco gestacional de forma normal, com diâmetro médio de ____ mm.",
  applyDsmPolicy(autoCalc, "saco gestacional medindo 2,5 por 3,1 por 4,2 cm"),
);
check("slot já ____ e não pede → continua ____", applyDsmPolicy(LAUDO, "saco gestacional medindo 2,5 por 3,1 por 4,2") === LAUDO);

// ── No-op quando não acha as 3 medidas ──
check("pede mas sem medidas → no-op", applyDsmPolicy(LAUDO, "calcule o DSM") === LAUDO);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
