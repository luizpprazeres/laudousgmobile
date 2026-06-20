/**
 * Golden do guard de TIPO de medida do líquido amniótico (MBV vs ILA).
 * Boletim 2026-06-19 (P0 #2 — falso oligoâmnio): MBV rotulado/classificado como ILA.
 * Rodar: npx tsx src/server/pipeline/__tests__/amnioticMeasureGuard.manual.ts
 */
import {
  enforceAmnioticMeasureType,
  detectAmnioticMeasure,
  classifyAmnioticMeasure,
} from "../amnioticFluidGuard";

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

// MBV 5,6 → normal (2–8). Caso b396da07.
const c1 = enforceAmnioticMeasureType(
  "Líquido amniótico de quantidade reduzida (ILA mede 5,6 cm).",
  "maior bolsão vertical mede 5,6 cm",
);
check("MBV 5,6 → normal + rótulo MBV", /quantidade normal \(maior bols[ãa]o vertical mede 5,6 cm\)/.test(c1), c1);

// MBV 1,5 → reduzida (oligo real). Não mascara.
const c2 = enforceAmnioticMeasureType(
  "Líquido amniótico de quantidade normal (ILA mede 1,5 cm).",
  "maior bolsão vertical 1,5 cm",
);
check("MBV 1,5 → reduzida (oligo real preservado)", /quantidade reduzida/.test(c2), c2);

// ILA 4 → reduzida (oligo real, ILA<5).
const c3 = enforceAmnioticMeasureType(
  "Líquido amniótico de quantidade normal (ILA mede 4 cm).",
  "ILA de 4 cm",
);
check("ILA 4 → reduzida", /quantidade reduzida \(ILA mede 4 cm\)/.test(c3), c3);

// Classe explícita do médico vence.
const c4 = enforceAmnioticMeasureType(
  "Líquido amniótico de quantidade reduzida (ILA mede 5,6 cm).",
  "líquido amniótico de quantidade normal, maior bolsão 5,6",
);
check("médico disse normal → vence", /quantidade normal/.test(c4), c4);

// Detector + classificador.
check("detecta MBV", detectAmnioticMeasure("maior bolsão 7,2 cm")?.type === "mbv");
check("detecta ILA", detectAmnioticMeasure("ILA 12 cm")?.type === "ila");
check("classifica MBV 8,5 → aumentada", classifyAmnioticMeasure({ type: "mbv", valueCm: 8.5 }) === "aumentada");

// review dex2: mm → cm.
const c5 = enforceAmnioticMeasureType(
  "Líquido amniótico de quantidade aumentada (ILA mede 56 cm).",
  "maior bolsão vertical 56 mm",
);
check("MBV 56 mm → 5,6 cm → normal", /quantidade normal \(maior bols[ãa]o vertical mede 5,6 cm\)/.test(c5), c5);
check("detecta mm e converte", detectAmnioticMeasure("MBV 56 mm")?.valueCm === 5.6);

// review dex2: MBV e ILA juntos → ambíguo → no-op.
check("MBV + ILA juntos → não detecta (no-op)", detectAmnioticMeasure("MBV 3 cm, ILA 4 cm") === null);
const c6 = enforceAmnioticMeasureType(
  "Líquido amniótico de quantidade reduzida (ILA mede 4 cm).",
  "MBV 3 cm, ILA 4 cm",
);
check("MBV+ILA juntos → output inalterado", c6 === "Líquido amniótico de quantidade reduzida (ILA mede 4 cm).", c6);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
