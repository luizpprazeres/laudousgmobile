/**
 * Teste do fix de SEGURANÇA do Doppler: nunca afirmar normalidade de vaso não
 * medido + remover linhas de vaso em branco. Boletim 2026-06-17 (8c39aca6).
 * Rodar: tsx src/server/pipeline/__tests__/dopplerVesselSafety.manual.ts
 */
import {
  buildDopplerConclusionItems,
  removeBlankVesselLines,
  correctDopplerConclusion,
  type DopplerData,
} from "../dopplerOverlay";

let pass = 0, fail = 0;
const ck = (n: boolean, t: string, d?: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`); };

// ── cenário 8c39aca6: SÓ uterinas medidas (umbilical/ACM não medidas a 16s) ──
{
  const d: DopplerData = { ipUterinaDir: 1.64, ipUterinaEsq: 1.34, ipMedioUterinas: 1.49 };
  const items = buildDopplerConclusionItems(d);
  const ipFrase = items.find((i) => /pulsatilidade/i.test(i)) ?? "";
  ck(/uterinas/i.test(ipFrase) && !/umbilical|cerebral/i.test(ipFrase),
    "só uterinas medidas → conclusão NÃO afirma umbilical/ACM", ipFrase);
}

// ── todos medidos e normais → afirma os 3 ──
{
  const d: DopplerData = { ipUterinaDir: 0.8, ipUterinaEsq: 0.8, ipMedioUterinas: 0.8, ipUmbilical: 0.9, ipACM: 1.5 };
  const ipFrase = buildDopplerConclusionItems(d).find((i) => /pulsatilidade/i.test(i)) ?? "";
  ck(/uterinas/i.test(ipFrase) && /umbilical/i.test(ipFrase) && /cerebral/i.test(ipFrase),
    "todos medidos normais → afirma uterinas + umbilical + cerebral", ipFrase);
}

// ── só umbilical medida (singular correto) ──
{
  const d: DopplerData = { ipUmbilical: 0.9 };
  const ipFrase = buildDopplerConclusionItems(d).find((i) => /pulsatilidade/i.test(i)) ?? "";
  ck(ipFrase === "Índice de pulsatilidade normal na artéria umbilical.", "só umbilical → singular correto", ipFrase);
}

// ── remove linhas de vaso em branco do corpo ──
{
  const corpo = `DOPPLERVELOCIMETRIA:
Artéria umbilical: IP ____.
Artéria cerebral média: IP ____.
Artéria uterina direita: IP 1,64.
Artéria uterina esquerda: IP 1,34.`;
  const out = removeBlankVesselLines(corpo);
  ck(!out.includes("IP ____") && out.includes("IP 1,64"), "remove vasos em branco, mantém medidos", out);
}

// ── E2E: correctDopplerConclusion no laudo do 8c39aca6 ──
{
  const laudo = `DOPPLERVELOCIMETRIA:
Artéria umbilical: IP ____.
Artéria cerebral média: IP ____.
Artéria uterina direita: IP 1,64.
Artéria uterina esquerda: IP 1,34.
IP médio das artérias uterinas mede 1,49.

CONCLUSÃO:
1) Gestação em torno de 16 semanas e 4 dias.
2) Líquido amniótico de quantidade normal.
3) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.`;
  const d: DopplerData = { ipUterinaDir: 1.64, ipUterinaEsq: 1.34, ipMedioUterinas: 1.49 };
  const out = correctDopplerConclusion(laudo, d);
  ck(!out.includes("IP ____"), "E2E: corpo sem 'IP ____'");
  ck(!/normal[^.]*umbilical/i.test(out) && !/normal[^.]*cerebral/i.test(out),
    "E2E: conclusão NÃO afirma umbilical/ACM normais", out.split("CONCLUSÃO")[1]);
  ck(/uterinas/i.test(out), "E2E: mantém uterinas (medidas)");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
