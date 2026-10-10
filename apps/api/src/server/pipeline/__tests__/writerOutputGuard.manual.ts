/**
 * Guard de saída comum aos writers (pipeline/writerOutputGuard.ts): markdown e
 * comentário do modelo saem; texto clínico, observação do modelo curado e
 * rodapés de referência ficam. Formatos reais da bancada do W4 (Haiku 5.5).
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/pipeline/__tests__/writerOutputGuard.manual.ts
 */
import assert from "node:assert/strict";
import { normalizeMskWriterFormat } from "../mskWriterFormat";
import { cleanWriterOutput, WRITER_OUTPUT_RULE } from "../writerOutputGuard";

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}\n  ${err instanceof Error ? err.message : String(err)}`);
  }
}

const LAUDO = `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL

COMENTÁRIOS:
Exame realizado por via transvaginal.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Útero em anteversão, medindo 7,1 x 4,0 x 4,6 cm (volume de 68,4 cm³).
Ovários tópicos, de dimensões normais.

CONCLUSÃO:
1) Útero de volume normal.
2) Ovários sem alterações.`;

const PELVE_HAIKU = `**ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL**

**COMENTÁRIOS:**
Exame realizado por via transvaginal.

**OS SEGUINTES ASPECTOS FORAM OBSERVADOS:**
Útero em anteversão, medindo 7,1 x 4,0 x 4,6 cm (volume de 68,4 cm³).
Ovários tópicos, de dimensões normais.

**CONCLUSÃO:**
1) Útero de volume normal.
2) Ovários sem alterações.

---

**Pontos para conferir antes de assinar:**
- **Volume uterino:** como o ditado não qualificou o volume de 68,4 cm³, usei "normal". Corrija se for "aumentado".

- **Endométrio:** o ditado não trouxe medida, então usei a frase de normalidade.`;

check("pelve do Haiku: markdown e bloco 'Pontos para conferir' saem; o laudo fica igual ao esperado", () => {
  const r = cleanWriterOutput(PELVE_HAIKU);
  assert.equal(r.text, LAUDO);
  assert.equal(r.removed.length, 1);
  assert.equal(normalizeMskWriterFormat(r.text), LAUDO, "e o normalizador do MSK não reintroduz nada");
});
check("'Obs. para revisão' e 'Observações: Interpretei…' de uma linha saem", () => {
  const t = `${LAUDO}\n\nObs. para revisão: o ditado não informou se o volume é normal. Confirme e eu ajusto.\n\nObservações: Interpretei "antevese" como anteversão.`;
  assert.equal(cleanWriterOutput(t).text, LAUDO);
});
check("'Observação antes do laudo' (antes do título) sai", () => {
  const t = `**Observação antes do laudo:** "Estacional" foi corrigido para "Gestacional". O ditado não informa a via do exame.\n\n${LAUDO}`;
  assert.equal(cleanWriterOutput(t).text, LAUDO);
});
check("observação clínica do modelo curado e rodapés de referência ficam", () => {
  const prostata = `${LAUDO}\n\nObservação: a avaliação por via transabdominal possui limitações de resolução para lesões focais. Em caso de suspeita, complementar com via transretal.`;
  assert.equal(cleanWriterOutput(prostata).text, prostata);
  const birads = `${LAUDO}\n\nBreast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).`;
  assert.equal(cleanWriterOutput(birads).text, birads);
  const domingos = `${LAUDO}\n\n*ESCORE DE NÓDULO TIREOIDEANO - Domingos Correia da Rocha - 2003\nACR - American College of Radiology*`;
  assert.equal(cleanWriterOutput(domingos).text, domingos, "asterisco simples do rodapé fica");
});
check("[REVISAR: …] das auditorias e placeholders ficam", () => {
  const t = `${LAUDO}\n\n[REVISAR: medida do ovário direito não encontrada no laudo]`;
  assert.equal(cleanWriterOutput(t).text, t);
  const p = LAUDO.replace("7,1 x 4,0 x 4,6", "____ x ____ x ____");
  assert.equal(cleanWriterOutput(p).text, p);
});
check("títulos # e crases saem", () => {
  assert.equal(cleanWriterOutput("# ULTRASSONOGRAFIA DE TIREOIDE\n\nTireoide de `volume` normal.").text, "ULTRASSONOGRAFIA DE TIREOIDE\n\nTireoide de volume normal.");
});
check("idempotente e sem efeito em laudo limpo", () => {
  assert.equal(cleanWriterOutput(LAUDO).text, LAUDO);
  const once = cleanWriterOutput(PELVE_HAIKU).text;
  assert.equal(cleanWriterOutput(once).text, once);
});
// ── Narração antes do título (rebancada final, abdome ead3b7f4) ─────────────
const ABDOME = `ULTRASSONOGRAFIA DO ABDOME TOTAL

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fígado com dimensões normais.

CONCLUSÃO:
Ultrassonografia do abdome total sem alterações.`;
check("narração do modelo antes do título sai (formato real ead3b7f4)", () => {
  const r = cleanWriterOutput(`Ultrassonografia do abdômen total normal: ditado de normalidade. Gero o laudo normal completo a partir do modelo da categoria.\n\n${ABDOME}`);
  assert.equal(r.text, ABDOME);
  assert.equal(r.removed.length, 1);
});
check("narração sem a palavra ditado ('Segue o laudo…') também sai", () => {
  assert.equal(cleanWriterOutput(`Segue o laudo conforme solicitado.\n${ABDOME}`).text, ABDOME);
});
check("negativo: cabeçalho clínico antes do título fica", () => {
  const t = `Paciente: Maria da Silva\nData: 10/10/2026\n\n${ABDOME}`;
  assert.equal(cleanWriterOutput(t).text, t);
  const ind = `Indicação: controle após o ditado do exame anterior.\n\n${ABDOME}`;
  assert.equal(cleanWriterOutput(ind).text, ind);
});
check("negativo: texto clínico antes do título fica", () => {
  const t = `Exame comparativo com o de 12/05/2026.\n\n${ABDOME}`;
  assert.equal(cleanWriterOutput(t).text, t);
});
check("negativo: sem título em maiúsculas nada sai (título em caixa mista)", () => {
  const t = `Ultrassonografia do abdome total: ditado de normalidade.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nFígado normal.\n\nCONCLUSÃO:\nNormal.`;
  assert.equal(cleanWriterOutput(t).text, t);
});
check("negativo: mais de duas linhas antes do título fica", () => {
  const t = `Gero o laudo a partir do ditado.\nUsei o modelo.\nConfirme as medidas.\n${ABDOME}`;
  assert.equal(cleanWriterOutput(t).text, t);
});
check("negativo: 'ditado' no corpo, depois do título, não é mexido por este guard", () => {
  const t = `${ABDOME}\nFígado ditado como normal no exame anterior.`;
  assert.equal(cleanWriterOutput(t).text, t);
});

check("rótulo 'TÍTULO:' na frente do título sai; título fica", () => {
  assert.equal(cleanWriterOutput(`TÍTULO: ${ABDOME}`).text, ABDOME);
});
check("negativo: 'Título:' seguido de texto que não é título fica", () => {
  const t = `Título: exame de controle\n\n${ABDOME}`;
  assert.equal(cleanWriterOutput(t).text, t);
});

check("regra de prompt fala de markdown e do que vem depois da conclusão", () => {
  assert.match(WRITER_OUTPUT_RULE, /sem markdown/);
  assert.match(WRITER_OUTPUT_RULE, /depois da CONCLUSÃO/);
});

console.log(`\nwriterOutputGuard: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
