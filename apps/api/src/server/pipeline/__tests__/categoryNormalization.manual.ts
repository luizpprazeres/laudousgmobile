/**
 * Teste manual do normalizador de category_code.
 * Rodar: npx tsx src/server/pipeline/__tests__/categoryNormalization.manual.ts
 */
import { normalizeCategoryCode } from "../categoryNormalization";

const KNOWN = new Set([
  "ABDOMEN_SUPERIOR",
  "ABDOMEN_TOTAL",
  "ABDOMEN_TOTAL_DOPPLER",
  "DOPPLER_OBSTETRICO",
  "ESCROTAL",
  "GLANDULAS_SALIVARES",
  "MAMARIA",
  "MORFOLOGICO",
  "OBSTETRICA",
  "PAREDE_ABDOMINAL",
  "PELVE_FEMININA",
  "TIREOIDE",
  "VIAS_URINARIAS",
]);

type Case = {
  name: string;
  detected: string;
  raw: string;
  hint?: string;
  expect: string;
};

const cases: Case[] = [
  {
    name: "código válido passa intacto",
    detected: "OBSTETRICA",
    raw: "ultrassom obstétrico",
    expect: "OBSTETRICA",
  },
  {
    name: "ULTRASSONOGRAFIA_OBSTETRICA + doppler → DOPPLER_OBSTETRICO (substring+doppler)",
    detected: "ULTRASSONOGRAFIA_OBSTETRICA",
    raw: "obstétrico com doppler, IP umbilical 0,9",
    expect: "DOPPLER_OBSTETRICO",
  },
  {
    name: "ULTRASSONOGRAFIA_OBSTETRICA sem doppler → OBSTETRICA (substring)",
    detected: "ULTRASSONOGRAFIA_OBSTETRICA",
    raw: "ultrassom obstétrico simples, 24 semanas",
    expect: "OBSTETRICA",
  },
  {
    name: "ULTRASSONOGRAFIA_FETAL + doppler → DOPPLER_OBSTETRICO (família)",
    detected: "ULTRASSONOGRAFIA_FETAL",
    raw: "avaliação fetal com doppler",
    expect: "DOPPLER_OBSTETRICO",
  },
  {
    name: "ULTRASSONOGRAFIA_FETAL sem doppler → OBSTETRICA (família)",
    detected: "ULTRASSONOGRAFIA_FETAL",
    raw: "avaliação fetal, biometria",
    expect: "OBSTETRICA",
  },
  {
    name: "ECOGRAFIA_TIREOIDIANA → TIREOIDE (família)",
    detected: "ECOGRAFIA_TIREOIDIANA",
    raw: "tireoide com nódulo",
    expect: "TIREOIDE",
  },
  {
    name: "furo dex1: PAREDE_ABDOMINAL não é roubada por /abdom/ (específico antes)",
    detected: "ULTRASSONOGRAFIA_PAREDE_ABDOMINAL",
    raw: "parede abdominal, hérnia",
    expect: "PAREDE_ABDOMINAL",
  },
  {
    name: "furo dex1: parótida → GLANDULAS_SALIVARES (antes de CERVICAL)",
    detected: "ULTRASSONOGRAFIA_PAROTIDA",
    raw: "glândula parótida direita",
    expect: "GLANDULAS_SALIVARES",
  },
  {
    name: "furo dex1: adjetivo 'morfológica normal' no texto NÃO vira MORFOLOGICO (testa só o código)",
    detected: "ULTRASSONOGRAFIA_OBSTETRICA",
    raw: "ultrassonografia obstétrica, avaliação morfológica preservada",
    expect: "OBSTETRICA",
  },
  {
    name: "código exótico sem mapa, com hint válido → hint",
    detected: "EXAME_QUALQUER_XYZ",
    raw: "texto sem pistas de família",
    hint: "MAMARIA",
    expect: "MAMARIA",
  },
  {
    name: "código exótico sem mapa nem hint → devolve detectado (validator trata)",
    detected: "EXAME_QUALQUER_XYZ",
    raw: "texto sem pistas",
    expect: "EXAME_QUALQUER_XYZ",
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const r = normalizeCategoryCode(c.detected, KNOWN, c.raw, c.hint);
  if (r.category === c.expect) {
    pass += 1;
    console.log(`✓ ${c.name}`);
  } else {
    fail += 1;
    console.error(`✗ ${c.name}\n   esperado: ${c.expect}\n   obtido:   ${r.category}`);
  }
}
console.log(`\n${pass}/${cases.length} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
