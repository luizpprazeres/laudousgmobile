/**
 * Teste do sanity de medidas. POSITIVOS (sinaliza absurdo do boletim) +
 * NEGATIVOS (não sinaliza valor normal nem placeholder).
 * Rodar: tsx src/server/pipeline/__tests__/measureSanity.manual.ts
 */
import { flagImplausibleMeasures as F } from "../measureSanity";

let pass = 0, fail = 0;
const has = (s: string) => /REVISAR/.test(s);
const ck = (n: boolean, t: string, d?: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`); };

// ── POSITIVOS — absurdos reais do boletim ──
ck(has(F("Comprimento crânio-nádegas (CCN) de 0,1 mm.")), "CCN 0,1mm sinalizado");
ck(has(F("Volume pré-miccional de 1019 mL.")), "vesical 1019ml sinalizado");
ck(has(F("Cisto medindo 0,3 x 0,2 x 0,0 cm.")), "dimensão 0,0 sinalizada");
ck(has(F("Comprimento do fêmur (CF) de 0,3 mm.")), "CF 0,3mm sinalizado");
ck(has(F("Após a micção, observa-se resíduo vesical estimado em 900 ml.")), "resíduo 900ml sinalizado");

// ── NEGATIVOS — valores normais NÃO podem ser sinalizados ──
const ok = [
  "Comprimento crânio-nádegas (CCN) de 60 mm.",
  "Diâmetro biparietal (DBP) de 48 mm.",
  "Circunferência da cabeça (CC) de 170 mm.",
  "Circunferência abdominal (CA) de 150 mm.",
  "Comprimento do fêmur (CF) de 28 mm.",
  "Volume pré-miccional de 280 mL.",
  "Resíduo pós-miccional desprezível.",
  "Útero medindo 6,8 x 3,6 x 3,9 cm.",
  "Diâmetro biparietal (DBP) de ____ mm.", // placeholder
  "Comprimento do fêmur (CF) de ____ mm.",
];
for (const l of ok) ck(!has(F(l)), `NEGATIVO sem flag: ${l.slice(0, 42)}…`);

// ── placeholder preservado + idempotência ──
ck(F("(CF) de ____ mm.").includes("____") && !has(F("(CF) de ____ mm.")), "placeholder ____ não sinalizado");
{
  const once = F("(CCN) de 0,1 mm.");
  ck(F(once) === once, "idempotente (não re-sinaliza)");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
