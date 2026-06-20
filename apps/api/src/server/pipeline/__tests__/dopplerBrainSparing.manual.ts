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

// 5) RCP < 1 (review dex2): umbilical 1,2 + ACM 0,9 → RCP 0,75 → não afirma ACM normal.
const c5 = joined("IP da artéria umbilical 1,2. IP da artéria cerebral média 0,9.");
check("5) RCP<1 → não afirma ACM normal", !/normais nas artérias umbilical e cerebral m[ée]dia/i.test(c5), c5);

// 6) "menor que o percentil 5" textual (captura o número 5).
const c6 = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,8 menor que o percentil 5.");
check("6) 'menor que percentil 5' → ACM não-normal", !/normais nas artérias umbilical e cerebral m[ée]dia/i.test(c6), c6);

// 7) ACM P≤5 sem palavra centralização → NÃO afirma 'Não há centralização'.
const c7 = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,1 percentil 4.");
check("7) ACM P≤5 → sem 'Não há ... centralização'", !/Não há sinais de pr[ée]-centraliza/i.test(c7), c7);

// 8) ACM P≤5 sem RCP calculável (só ACM) → não afirma perfil normal.
const c8 = joined("IP da artéria cerebral média 1,1 percentil 4.");
check("8) ACM P≤5 sem RCP → sem perfil normal", !/Perfil hemodin[âa]mico fetal é normal/i.test(c8), c8);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
