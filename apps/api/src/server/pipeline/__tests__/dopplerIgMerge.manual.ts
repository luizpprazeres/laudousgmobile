/**
 * Golden do merge de IG duplicada (boletim 2026-06-19, f715875c).
 * Rodar: npx tsx src/server/pipeline/__tests__/dopplerIgMerge.manual.ts
 */
import { mergeIgConclusionItems } from "../dopplerOverlay";

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
const concl = (items: string[]) =>
  `CONCLUSÃO:\n${items.map((it, i) => `${i + 1}) ${it}`).join("\n")}`;
const itemsOf = (laudo: string) =>
  laudo
    .split("CONCLUSÃO:")[1]!
    .trim()
    .split("\n")
    .map((l) => l.replace(/^\d+\)\s*/, ""));

// f715875c: IG duplicada (biometria 33 + ref US precoce 31s1d, div 13 > 5).
const c1 = mergeIgConclusionItems(
  concl([
    "Gestação em torno de 33 semanas.",
    "Líquido amniótico em quantidade aumentada (ILA mede 27,1 cm).",
    "Gestação em torno de 31 semanas e 1 dia pela ultrassonografia precoce.",
    "Ausência de sinais de incisuras.",
  ]),
);
check(
  "f715875c: IG combinada num item só (div>5)",
  /Gestação em torno de 33 semanas pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 31 semanas e 1 dia\./.test(c1),
  c1,
);
check("f715875c: sobra só 1 item de IG", itemsOf(c1).filter((i) => /Gestação em torno/.test(i)).length === 1);
check("f715875c: preserva os demais itens (líquido, incisuras)", /Líquido amni/.test(c1) && /incisuras/.test(c1));

// Divergência ≤ 5 dias → só biometria.
const c2 = mergeIgConclusionItems(
  concl(["Gestação em torno de 20 semanas.", "Gestação em torno de 20 semanas e 3 dias pela ultrassonografia precoce."]),
);
check("div ≤5 → só biometria", itemsOf(c2).length === 1 && c2.includes("Gestação em torno de 20 semanas.") && !c2.includes("corrigida"), c2);

// DUM como fonte.
const c3 = mergeIgConclusionItems(
  concl(["Gestação em torno de 30 semanas.", "Gestação em torno de 25 semanas pela data da última menstruação."]),
);
check("fonte DUM", /corrigida pela data da última menstruação/.test(c3), c3);

// Único item de IG → inalterado.
const base = concl(["Gestação em torno de 28 semanas.", "Ausência de sinais de incisuras."]);
check("1 IG só → inalterado", mergeIgConclusionItems(base) === base);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
