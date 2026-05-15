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

console.log("deterministicSanity.manual ok", {
  okIssues: ok.issues.length,
  badIssues: bad.issues.map((issue) => issue.type),
});
