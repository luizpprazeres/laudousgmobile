import type { StructuredFindings } from "@laudousg/shared";
import { runDeterministicSanity } from "../deterministicSanity";

const baseFindings: StructuredFindings = {
  schema_version: "v1",
  categoria_detectada: "ABDOMEN_TOTAL",
  tipo_exame: "Ultrassonografia do abdome total",
  achados: {
    figado: {
      cisto: "cisto simples medindo 1,2 cm",
    },
  },
  comandos_do_medico: [
    {
      tipo: "incluir_recomendacao",
      texto: "recomendar controle em 6 meses",
    },
  ],
  trechos_confusos: [],
  nivel_de_confianca: "alta",
  datas_referidas: ["05/05/2026"],
  lateralidades_mencionadas: ["direito"],
};

const ok = runDeterministicSanity({
  findings: baseFindings,
  finalText:
    "Fígado com cisto simples no lobo direito medindo 1,2 cm. Exame comparado a 05/05/2026. Recomenda-se controle em 6 meses.",
});

if (ok.hardBlocked) {
  throw new Error(`case ok deveria passar: ${JSON.stringify(ok.issues)}`);
}

const bad = runDeterministicSanity({
  findings: baseFindings,
  finalText:
    "Fígado com cisto simples medindo 2,0 cm. Exame comparado a 04/05/2026. {LINHA_LIQUIDO_AMNIOTICO}",
});

if (!bad.hardBlocked) {
  throw new Error("case bad deveria hard-block por medida/data/placeholder/comando");
}

// ─── RADS divergente (bug clínico real reportado) ─────────────────
const mamaFindings: StructuredFindings = {
  schema_version: "v1",
  categoria_detectada: "MAMARIA",
  tipo_exame: "Ultrassonografia das mamas",
  achados: {
    mama_direita: {
      nodulo: { tipo: "anecoico", medidas_cm: ["0,8", "0,7", "1,0"] },
    },
  },
  comandos_do_medico: [
    {
      tipo: "adicionar_conclusao_final",
      texto: "na conclusao, cisto simples de mama direita, BI-RADS 2",
    },
  ],
  trechos_confusos: [],
  nivel_de_confianca: "alta",
  datas_referidas: [],
  lateralidades_mencionadas: ["direito"],
};

// Caso 1: laudo gerou BI-RADS 1 (errado — médico ditou 2). DEVE bloquear.
const badRads = runDeterministicSanity({
  findings: mamaFindings,
  finalText:
    "Mama direita: nódulo anecoico 0,8 x 0,7 x 1,0 cm. CONCLUSÃO: cisto simples de mama direita, BI-RADS 1.",
});
if (!badRads.hardBlocked) {
  throw new Error("RADS divergente: deveria hard-block BI-RADS 1 vs ditado 2");
}
const hasRadsIssue = badRads.issues.some(
  (i) => i.type === "rads_divergente" && i.severity === "critical",
);
if (!hasRadsIssue) {
  throw new Error(`esperava rads_divergente critical, recebi: ${JSON.stringify(badRads.issues)}`);
}

// Caso 2: laudo gerou BI-RADS 2 (correto). NÃO bloqueia por RADS.
const okRads = runDeterministicSanity({
  findings: mamaFindings,
  finalText:
    "Mama direita: nódulo anecoico 0,8 x 0,7 x 1,0 cm. CONCLUSÃO: cisto simples de mama direita, BI-RADS 2.",
});
const okHasRadsIssue = okRads.issues.some((i) => i.type === "rads_divergente");
if (okHasRadsIssue) {
  throw new Error(`não esperava rads_divergente quando match: ${JSON.stringify(okRads.issues)}`);
}

// Caso 3: laudo inventou BI-RADS sem médico ditar. DEVE bloquear.
const invented = runDeterministicSanity({
  findings: {
    ...mamaFindings,
    comandos_do_medico: [], // médico não disse nada de RADS
  },
  finalText:
    "Mama direita: nódulo anecoico. CONCLUSÃO: nódulo benigno, BI-RADS 1.",
});
if (!invented.hardBlocked) {
  throw new Error("RADS inventado: deveria hard-block — médico não ditou BI-RADS");
}

// Caso 4: sub-letra (BI-RADS 4A) e categorias variadas.
const subLetter = runDeterministicSanity({
  findings: {
    ...mamaFindings,
    comandos_do_medico: [
      { tipo: "adicionar_conclusao_final", texto: "BI-RADS 4A na conclusão" },
    ],
  },
  finalText: "...CONCLUSÃO: nódulo suspeito, BI-RADS 4B.",
});
if (!subLetter.hardBlocked) {
  throw new Error("RADS sub-letra: 4A ditado, 4B gerado → deveria bloquear");
}

// Caso 5: TI-RADS + Domingos em tireoide.
const tireoide = runDeterministicSanity({
  findings: {
    ...mamaFindings,
    categoria_detectada: "TIREOIDE",
    achados: { tireoide: { nodulo: "0,9 cm hipoecoico" } },
    comandos_do_medico: [
      { tipo: "adicionar_conclusao_final", texto: "TI-RADS 3, Domingos 4" },
    ],
  },
  finalText:
    "Tireoide com nódulo 0,9 cm. CONCLUSÃO: nódulo TI-RADS 2, Domingos 3.",
});
if (!tireoide.hardBlocked) {
  throw new Error("TI-RADS+Domingos: ambos divergentes → deveria bloquear");
}

// Caso 6: FIGO romano (ginecologia oncológica)
const figo = runDeterministicSanity({
  findings: {
    ...mamaFindings,
    categoria_detectada: "PELVE_FEMININA",
    achados: { utero: "lesão suspeita" },
    comandos_do_medico: [
      { tipo: "adicionar_conclusao_final", texto: "compatível com FIGO IIIB" },
    ],
  },
  finalText: "Útero com lesão. CONCLUSÃO: estadio FIGO II.",
});
if (!figo.hardBlocked) {
  throw new Error("FIGO IIIB vs II: deveria bloquear");
}

const categoryCases: Array<{
  name: string;
  category: StructuredFindings["categoria_detectada"];
  finalText: string;
  expectedCode: string;
}> = [
  {
    name: "OBSTETRICA peso incompatível com IG",
    category: "OBSTETRICA",
    finalText:
      "ULTRASSONOGRAFIA OBSTÉTRICA. IG de 20 semanas. Peso fetal de 4000 g. BCF = 140 bpm. ILA de 12 cm.",
    expectedCode: "WEIGHT_IG_MISMATCH",
  },
  {
    name: "DOPPLER_OBSTETRICO IP umbilical extremo",
    category: "DOPPLER_OBSTETRICO",
    finalText:
      "ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER. IP da artéria umbilical de 3,4. IP ACM de 1,4. Dopplervelocimetria normal.",
    expectedCode: "IP_UMB_EXTREME_HIGH",
  },
  {
    name: "TIREOIDE TI-RADS alto sem conduta",
    category: "TIREOIDE",
    finalText:
      "ULTRASSONOGRAFIA DA TIREOIDE. Nódulo sólido medindo 18 mm, TI-RADS 4. Conclusão: nódulo tireoidiano.",
    expectedCode: "TIRADS_ALTO_SEM_CONDUTA",
  },
  {
    name: "MAMARIA BI-RADS baixo com descritor suspeito",
    category: "MAMARIA",
    finalText:
      "ULTRASSONOGRAFIA MAMÁRIA. Nódulo hipoecogênico com margens irregulares e sombra acústica. BI-RADS 2.",
    expectedCode: "BIRADS_LOW_WITH_SUSPECTS",
  },
  {
    name: "ABDOMEN_TOTAL VBP dilatada sem causa",
    category: "ABDOMEN_TOTAL",
    finalText:
      "ULTRASSONOGRAFIA DO ABDOME TOTAL. Via biliar principal de 12 mm. Fígado de 14 cm. Baço de 10 cm.",
    expectedCode: "VBP_DILATADA_SEM_CAUSA",
  },
  {
    name: "PELVE_FEMININA endométrio pós-menopausa alto",
    category: "PELVE_FEMININA",
    finalText:
      "ULTRASSONOGRAFIA PÉLVICA. Paciente na pós-menopausa. Endométrio de 9 mm. Ovários sem alterações.",
    expectedCode: "ENDOMETRIO_POSMENOP_ALTO",
  },
];

for (const item of categoryCases) {
  const result = runDeterministicSanity({
    findings: {
      ...baseFindings,
      categoria_detectada: item.category,
      achados: {},
      comandos_do_medico: [],
      datas_referidas: [],
      lateralidades_mencionadas: [],
    },
    finalText: item.finalText,
  });
  const matched = result.issues.some(
    (issue) =>
      issue.type === "categoria_especifica" &&
      issue.campo_achado === item.expectedCode,
  );
  if (!matched) {
    throw new Error(`${item.name}: esperava ${item.expectedCode}, recebi ${JSON.stringify(result.issues)}`);
  }
}

console.log("deterministicSanity.manual ok", {
  okIssues: ok.issues.length,
  badIssues: bad.issues.map((issue) => issue.type),
  rads: {
    badBlocked: badRads.hardBlocked,
    okPassed: !okHasRadsIssue,
    inventedBlocked: invented.hardBlocked,
    subLetterBlocked: subLetter.hardBlocked,
    tireoideBlocked: tireoide.hardBlocked,
    figoBlocked: figo.hardBlocked,
  },
  categorySpecific: categoryCases.map((item) => item.expectedCode),
});
