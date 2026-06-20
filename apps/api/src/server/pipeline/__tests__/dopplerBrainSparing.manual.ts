/**
 * Golden brain sparing (boletim 2026-06-19, risco clínico CRÍTICO): ACM
 * comprometida (centralização / percentil < 5) NUNCA pode ser afirmada normal.
 * Rodar: npx tsx src/server/pipeline/__tests__/dopplerBrainSparing.manual.ts
 */
import { extractDopplerData, buildDopplerConclusionItems } from "../dopplerOverlay";

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
const joined = (raw: string) => buildDopplerConclusionItems(extractDopplerData(raw)).join("\n");

// 1) ACM p4 + centralização + uterinas >P95 (caso e5194370).
const c1 = joined(
  "IP da artéria umbilical 0,9. IP da artéria cerebral média 1,0 percentil 4. Centralização fetal. Uterinas acima do percentil 95.",
);
check("1) NÃO afirma ACM normal", !/normais? nas artérias[^.]*cerebral m[ée]dia/i.test(c1) && !/normal nas artérias[^.]*cerebral m[ée]dia/i.test(c1), c1);
check("1) tem brain sparing", /brain sparing|redistribui/i.test(c1));
check("1) tem IP reduzido na ACM", /reduzido na artéria cerebral m[ée]dia/i.test(c1), c1);

// 2) ACM percentil 4 SEM a palavra centralização.
const c2 = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,1 percentil 4.");
check("2) p<5 sem centralização → ACM não-normal + reduzida", /reduzido na artéria cerebral m[ée]dia/i.test(c2) && !/normais.*cerebral/i.test(c2), c2);

// 3) ACM normal (percentil 50) → continua afirmando normalidade.
const c3 = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,8 percentil 50.");
check("3) ACM p50 → normal preservado", /normais nas artérias umbilical e cerebral m[ée]dia/i.test(c3), c3);

// 4) Centralização sem RCP/ACM medida → NÃO afirma perfil normal.
const c4 = joined("Centralização fetal.");
check("4) centralização → sem 'Perfil hemodinâmico fetal é normal'", !/Perfil hemodin[âa]mico fetal é normal/i.test(c4), c4);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
