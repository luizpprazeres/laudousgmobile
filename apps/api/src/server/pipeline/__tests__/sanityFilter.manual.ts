import assert from "node:assert/strict";
import { filterAiSanity, sentencesFrom, padraoFalso } from "../sanityFilter";

const frases = [
  ...sentencesFrom("Exame realizado inicialmente com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta e paciente em decúbito dorsal.\nOvário direito de dimensões normais, apresentando imagens anecoicas.", true),
  ...sentencesFrom('3. ESTEATOSE HEPÁTICA ACENTUADA No corpo: "Fígado de dimensões normais, apresentando aumento difuso da ecogenicidade parenquimatosa e importante atenuação sonora."', false),
];
const issue = (type: string, detail: string, trecho: string | null = null, severity = "warning") => ({ type, severity, detail, trecho_laudo: trecho }) as any;
const run = (issues: any[], opts: { ditado?: string; categoria?: string; jev?: (id: string) => [string, number] } = {}) =>
  filterAiSanity({
    ai: { verdict: "warning", issues, summary: "" } as any, finalText: "", rawInput: opts.ditado ?? "", categoria: opts.categoria ?? "PELVE_FEMININA", frases,
    ask: async (_s, qs) => ({ ms: 1, inputTokens: 1, answers: Object.fromEntries(Object.keys(qs).map((id) => { const [c, conf] = opts.jev?.(id) ?? ["manter", 0]; return [id, { type: "choice" as const, choice: c, confidence: conf }]; })) }),
  });

(async () => {
  // técnica do modelo chamada de inventada → sai sem Jev
  let r = await run([issue("achado_inventado", "Detalhes técnicos não constam no ditado.", "Exame realizado inicialmente com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta")]);
  assert.equal(r.result.issues.length, 0);
  // frase normal do modelo → sai
  r = await run([issue("achado_inventado", "Imagens anecoicas não ditadas.", "Ovário direito de dimensões normais, apresentando imagens anecoicas.")]);
  assert.equal(r.result.issues.length, 0);
  // variante de achado: sai só se a Jev disser que o ditado justifica
  const est = issue("achado_inventado", "Atenuação não ditada.", "apresentando aumento difuso da ecogenicidade parenquimatosa e importante atenuação sonora");
  r = await run([est], { ditado: "esteatose acentuada", jev: () => ["sim", 0.74] });
  assert.equal(r.result.issues.length, 0);
  r = await run([est], { ditado: "esteatose leve", jev: () => ["nao", 0.98] });
  assert.equal(r.result.issues.length, 1);
  r = await run([est], { ditado: "esteatose acentuada", jev: () => ["sim", 0.6] }); // confiança baixa: fica
  assert.equal(r.result.issues.length, 1);
  // aviso que se desmente → sai; com "porém" → fica
  r = await run([issue("medida_divergente", "CF no ditado 7,22 cm e no laudo 72,2 mm, o que está correto, sem divergência.")]);
  assert.equal(r.result.issues.length, 0);
  r = await run([issue("medida_divergente", "O fêmur está correto, porém o úmero diverge: 31 no ditado e 33 no laudo.")]);
  assert.equal(r.result.issues.length, 1);
  // padrões conferidos
  assert.equal(padraoFalso(issue("medida_divergente", "O ditado informa saco gestacional medindo 26,7 x 57,8 x 41,8, laudo diâmetro médio de 42,1 mm."), "OBSTETRICA"), "media_saco");
  assert.equal(padraoFalso(issue("medida_divergente", "O ditado informa saco gestacional medindo 26,7 x 57,8 x 41,8, laudo diâmetro médio de 48,0 mm."), "OBSTETRICA"), null);
  assert.equal(padraoFalso(issue("medida_divergente", "Foco ecogênico: ditado 0,2 cm, laudo 2 mm."), "OBSTETRICA"), "cm_mm");
  assert.equal(padraoFalso(issue("medida_divergente", "IP no ditado é 1.55, no laudo final é 1.6."), "OBSTETRICA"), null); // arredondamento indevido fica
  assert.equal(padraoFalso(issue("lateralidade_divergente", "Fêmur ditado sem lateralidade, laudo traz direito e esquerdo."), "MORFOLOGICO"), "ossos_de");
  assert.equal(padraoFalso(issue("lateralidade_divergente", "Fêmur ditado sem lateralidade, laudo traz direito e esquerdo."), "ABDOMEN_TOTAL"), null);
  // NUNCA: omissão, lado, medida real, data, comando, conclusão — mesmo com a Jev dizendo "falso"
  r = await run([
    issue("achado_omitido", "Volume do ovário omitido.", "Ovário esquerdo"),
    issue("lateralidade_divergente", "Ditado esquerdo, laudo direito.", "rim direito"),
    issue("comando_ignorado", "Comando não aplicado."),
  ], { jev: () => ["falso", 1] });
  assert.equal(r.result.issues.length, 3);
  // inventado comum: a Jev decide com corte 0,7
  r = await run([issue("achado_inventado", "Cisto não ditado.", "cisto simples de 2 cm")], { jev: () => ["falso", 0.69] });
  assert.equal(r.result.issues.length, 1);
  r = await run([issue("achado_inventado", "Cisto não ditado.", "cisto simples de 2 cm")], { jev: () => ["falso", 0.9] });
  assert.equal(r.result.issues.length, 0);
  // sem Jev (fora do ar) → nada além das regras sai
  r = await filterAiSanity({ ai: { verdict: "warning", issues: [issue("achado_inventado", "Cisto não ditado.", "cisto simples de 2 cm")], summary: "" } as any, finalText: "", rawInput: "", categoria: "PELVE_FEMININA", frases, ask: async () => null });
  assert.equal(r.result.issues.length, 1);
  console.log("sanityFilter: ok");
})();
