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
    name: "abdome: substring + Doppler afirmado → ABDOMEN_TOTAL_DOPPLER",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "abdome total com Doppler, veia porta 1,1 cm",
    expect: "ABDOMEN_TOTAL_DOPPLER",
  },
  {
    name: "abdome: substring + Doppler colorido afirmado → ABDOMEN_TOTAL_DOPPLER",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "Doppler colorido da veia porta: fluxo hepatopetal",
    expect: "ABDOMEN_TOTAL_DOPPLER",
  },
  {
    name: "abdome: achado negado ao Doppler ainda é Doppler → ABDOMEN_TOTAL_DOPPLER",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "fígado sem alterações ao Doppler",
    expect: "ABDOMEN_TOTAL_DOPPLER",
  },
  {
    name: "abdome: “sem Doppler” não promove (substring)",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "abdome total sem Doppler, fígado normal",
    expect: "ABDOMEN_TOTAL",
  },
  {
    name: "abdome: “sem estudo Doppler” não promove",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "abdome total, sem estudo Doppler",
    expect: "ABDOMEN_TOTAL",
  },
  {
    name: "abdome: “não foi realizado Doppler” não promove",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "Não foi realizado Doppler. Fígado normal.",
    expect: "ABDOMEN_TOTAL",
  },
  {
    name: "abdome: “Doppler não realizado” não promove",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "Abdome total. Doppler colorido não realizado.",
    expect: "ABDOMEN_TOTAL",
  },
  {
    name: "abdome: negada + afirmada → ABDOMEN_TOTAL_DOPPLER",
    detected: "ULTRASSONOGRAFIA_ABDOMEN_TOTAL",
    raw: "Inicialmente sem Doppler. Depois Doppler da veia porta: fluxo hepatopetal.",
    expect: "ABDOMEN_TOTAL_DOPPLER",
  },
  {
    name: "abdome família + Doppler afirmado → ABDOMEN_TOTAL_DOPPLER",
    detected: "US_ABDOMINAL_COMPLETA",
    raw: "abdômen total com Doppler",
    expect: "ABDOMEN_TOTAL_DOPPLER",
  },
  {
    name: "abdome família + “sem Doppler” → ABDOMEN_TOTAL",
    detected: "US_ABDOMINAL_COMPLETA",
    raw: "abdômen total sem Doppler",
    expect: "ABDOMEN_TOTAL",
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
