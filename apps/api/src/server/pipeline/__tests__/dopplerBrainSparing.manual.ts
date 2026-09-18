/**
 * Golden brain sparing (boletim 2026-06-19, risco clínico CRÍTICO): ACM
 * comprometida NUNCA pode ser afirmada normal.
 *
 * DECISÃO DO MÉDICO (18/09/2026): o percentil da ACM, sozinho, deixou de alertar.
 * Com o perfil hemodinâmico (1/RCP) normal, uma ACM em percentil baixo entra como
 * normal — a centralização passa a ser julgada pelo perfil e pelo que for ditado
 * ("centralização", "ACM abaixo do percentil 5", "ACM alterada"). O que continua
 * valendo: RCP < 1, centralização ditada e ACM dita alterada comprometem a ACM, e
 * sem RCP calculável o laudo não afirma perfil normal.
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

const direto = extractDopplerData(
  "IG 30 semanas. IP médio das artérias uterinas 0,80. Ducto venoso IP 0,55.",
);
check("0) IP médio uterino direto recebe percentil", direto.percMedioUterinas !== undefined);
check("0) IP do ducto venoso é extraído e percentilizado", direto.ipDuctoVenoso === 0.55 && direto.percDuctoVenoso !== undefined);

// 1) ACM p4 + centralização + uterinas >P95 (caso e5194370).
const c1 = joined(
  "IP da artéria umbilical 0,9. IP da artéria cerebral média 1,0 percentil 4. Centralização fetal. Uterinas acima do percentil 95.",
);
check("1) NÃO afirma ACM normal", !/normais? nas artérias[^.]*cerebral m[ée]dia/i.test(c1) && !/normal nas artérias[^.]*cerebral m[ée]dia/i.test(c1), c1);
check("1) tem brain sparing", /brain sparing|redistribui/i.test(c1));
check("1) centralização ditada domina a conclusão", /brain sparing|redistribui/i.test(c1) && !/normal.*cerebral m[ée]dia/i.test(c1), c1);

// 2) ACM percentil 4 SEM a palavra centralização.
const c2 = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,1 percentil 4.");
// Perfil 0,82 (normal): pela decisão do médico a ACM entra como normal e não há alerta isolado.
check("2) p<5 com perfil normal → ACM normal, sem alerta isolado", /normais nas artérias umbilical e cerebral m[ée]dia/i.test(c2) && !/reduzido na artéria cerebral/i.test(c2), c2);

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

// 7) ACM P<5 com perfil normal → a frase de ausência de centralização entra (decisão de 18/09).
const c7 = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,1 percentil 4.");
check("7) ACM P<5 com perfil normal → afirma ausência de centralização", /Não há sinais de pr[ée]-centraliza/i.test(c7), c7);

// 7b) ACM DITADA abaixo do percentil 5 → continua comprometendo (não é o percentil calculado).
const c7b = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,1 abaixo do percentil 5.");
check("7b) ACM dita abaixo do percentil 5 → alerta preservado", /reduzido na artéria cerebral m[ée]dia/i.test(c7b) && !/Não há sinais de pr[ée]-centraliza/i.test(c7b), c7b);

// 8) ACM P<5 sem RCP calculável (só ACM) → não afirma perfil normal.
const c8 = joined("IP da artéria cerebral média 1,1 percentil 4.");
check("8) ACM P<5 sem RCP → sem perfil normal", !/Perfil hemodin[âa]mico fetal é normal/i.test(c8), c8);

// 9) p5 exato é o limite normal no calc.js Barcelona; não pode virar p4.
const c9 = joined("IP da artéria umbilical 0,9. IP da artéria cerebral média 1,1 percentil 5.");
check("9) ACM p5 exato → normal preservado", /normais nas artérias umbilical e cerebral m[ée]dia/i.test(c9), c9);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
