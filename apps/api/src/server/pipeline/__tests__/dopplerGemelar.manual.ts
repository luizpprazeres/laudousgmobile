/**
 * Golden do flag de gemelaridade alucinada (boletim 2026-06-19, c53bbc1f).
 * Rodar: npx tsx src/server/pipeline/__tests__/dopplerGemelar.manual.ts
 */
import { flagGemelarHallucination } from "../dopplerOverlay";

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

const rawSingle = "DBP 7.45 cm, CC 26.39 cm, CA 24.79 cm, CF 5.46 cm, peso 1317 g, IG pela biometria 28s4d";
const rawTwin = "gestação gemelar dicoriônica e diamniótica, feto A e feto B";
const outGemelar = "ULTRASSONOGRAFIA OBSTÉTRICA\n\nDois fetos: o feto à direita...";

const r1 = flagGemelarHallucination(outGemelar, rawSingle);
check("c53bbc1f: 'Dois fetos' sem ditar → flag junto à frase", /\[REVISAR — gemelaridade[^\]]*\]\s*Dois fetos/.test(r1), r1.slice(0, 90));

check("twin real ditado → NÃO flag", !flagGemelarHallucination(outGemelar, rawTwin).includes("[REVISAR — gemelar"));

check("feto único + raw single → inalterado", flagGemelarHallucination("Feto único, em apresentação cefálica.", rawSingle) === "Feto único, em apresentação cefálica.");

check("idempotente (não duplica flag)", (() => { const a = flagGemelarHallucination(outGemelar, rawSingle); return flagGemelarHallucination(a, rawSingle) === a; })());

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
