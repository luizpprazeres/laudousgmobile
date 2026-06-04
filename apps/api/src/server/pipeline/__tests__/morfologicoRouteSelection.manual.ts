/**
 * Teste manual do guard de roteamento morfológico+Doppler.
 * Rodar: npx tsx src/server/pipeline/__tests__/morfologicoRouteSelection.manual.ts
 *
 * Cobre os casos levantados pela review do dex1:
 *  - gatilho FORTE (exame nomeado) vs adjetivo solto (morfologia normal)
 *  - gatilho conservador (Doppler + ≥2 sinais morfológicos fortes)
 *  - não-interferência em categorias não-obstétricas
 */
import { resolveMorfologicoCategory } from "../morfologicoRouteSelection";

type Case = {
  name: string;
  detected: string;
  raw: string;
  expectCategory: string;
  expectOverridden: boolean;
};

const cases: Case[] = [
  // ── Gatilho FORTE: exame morfológico nomeado + Doppler ──
  {
    name: "ultrassom morfológico 2T com Doppler (detectado DOPPLER)",
    detected: "DOPPLER_OBSTETRICO",
    raw: "Ultrassom morfológico de segundo trimestre com Doppler. Feto único, DBP 52 mm, fêmur 35 mm. IP médio das uterinas 0,9.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },
  {
    name: "morfológico fetal com doppler (detectado DOPPLER)",
    detected: "DOPPLER_OBSTETRICO",
    raw: "Morfológico fetal com doppler colorido, gestação de 22 semanas.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },
  {
    name: "USG morfológica de 1 trimestre (detectado OBSTETRICA)",
    detected: "OBSTETRICA",
    raw: "USG morfológica de 1º trimestre, translucência nucal 1,2 mm.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },
  {
    name: "morfológico do 2º trimestre com doppler (regex 'do' + ordinal)",
    detected: "DOPPLER_OBSTETRICO",
    raw: "Morfológico do 2º trimestre com doppler, gestação de 24 semanas.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },
  {
    name: "morfológico do segundo trimestre (extenso, sem doppler)",
    detected: "OBSTETRICA",
    raw: "Morfológico do segundo trimestre, anatomia fetal completa.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },

  // ── Adjetivo solto: NÃO reclassificar ──
  {
    name: "doppler obstétrico puro, 'avaliação morfológica normal' (adjetivo)",
    detected: "DOPPLER_OBSTETRICO",
    raw: "Ultrassonografia obstétrica com Doppler. Avaliação morfológica normal. IP umbilical 0,9, ACM 1,8, IP médio uterinas 0,8.",
    expectCategory: "DOPPLER_OBSTETRICO",
    expectOverridden: false,
  },
  {
    name: "doppler puro, 'morfologia preservada' (adjetivo)",
    detected: "DOPPLER_OBSTETRICO",
    raw: "Obstétrico com doppler, morfologia fetal preservada, sem alterações.",
    expectCategory: "DOPPLER_OBSTETRICO",
    expectOverridden: false,
  },

  // ── Gatilho conservador: Doppler + ≥2 sinais morfológicos fortes (sem a palavra) ──
  {
    name: "doppler + cerebelo + ossos longos (sem dizer 'morfológico')",
    detected: "DOPPLER_OBSTETRICO",
    raw: "Avaliação anatômica fetal: cerebelo normal, cisterna magna preservada, úmero e tíbia medidos, com doppler das artérias uterinas.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },
  {
    name: "doppler + apenas 1 sinal forte (cerebelo) → NÃO reclassifica",
    detected: "DOPPLER_OBSTETRICO",
    raw: "Obstétrico com doppler. Cerebelo de aspecto normal. IP umbilical 1,0.",
    expectCategory: "DOPPLER_OBSTETRICO",
    expectOverridden: false,
  },

  // ── Sem Doppler: morfológico puro já roteia certo; guard não interfere ──
  {
    name: "morfológico puro já detectado como MORFOLOGICO",
    detected: "MORFOLOGICO",
    raw: "Ultrassom morfológico de segundo trimestre, anatomia fetal completa.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: false,
  },

  // ── Código não-canônico do structurer (família obstétrica) ──
  {
    name: "structurer inventou ULTRASSONOGRAFIA_OBSTETRICA p/ exame morfológico",
    detected: "ULTRASSONOGRAFIA_OBSTETRICA",
    raw: "Ultrassom morfológico de segundo trimestre com doppler, anatomia fetal completa.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },

  {
    name: "structurer inventou ULTRASSONOGRAFIA_FETAL (fora da família) p/ exame morfológico nomeado",
    detected: "ULTRASSONOGRAFIA_FETAL",
    raw: "Ultrassom morfológico de segundo trimestre com Doppler, anatomia fetal completa, cerebelo normal.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },

  // ── Categorias não-obstétricas: nunca interferir ──
  {
    name: "abdome total com a palavra 'morfológico' solta → intacto",
    detected: "ABDOMEN_TOTAL",
    raw: "Abdome total. Fígado com morfologia normal.",
    expectCategory: "ABDOMEN_TOTAL",
    expectOverridden: false,
  },
  {
    name: "código não-obstétrico não-canônico não é reclassificado",
    detected: "ULTRASSONOGRAFIA_TIREOIDE",
    raw: "Tireoide com morfologia normal, sem nódulos.",
    expectCategory: "ULTRASSONOGRAFIA_TIREOIDE",
    expectOverridden: false,
  },

  // ── Obstétrico SEM Doppler nomeando morfológico → reclassifica (explicit) ──
  {
    name: "obstétrica detectada mas é morfológico nomeado (sem doppler)",
    detected: "OBSTETRICA",
    raw: "Ultrassom morfológico fetal de segundo trimestre, biometria e anatomia.",
    expectCategory: "MORFOLOGICO",
    expectOverridden: true,
  },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const r = resolveMorfologicoCategory(c.detected, c.raw);
  const ok =
    r.category === c.expectCategory && r.overridden === c.expectOverridden;
  if (ok) {
    pass += 1;
    console.log(`✓ ${c.name}`);
  } else {
    fail += 1;
    console.error(
      `✗ ${c.name}\n   esperado: category=${c.expectCategory} overridden=${c.expectOverridden}\n   obtido:   category=${r.category} overridden=${r.overridden} reason=${r.reason}`,
    );
  }
}

console.log(`\n${pass}/${cases.length} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
