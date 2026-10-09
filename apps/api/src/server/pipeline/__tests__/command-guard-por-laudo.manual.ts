/**
 * Guard de comandos por laudo (T1 + MK-1 da revisão do W4, 09/10): casos reais da
 * revisão reescritos sem dado de paciente.
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/pipeline/__tests__/command-guard-por-laudo.manual.ts
 */
import assert from "node:assert/strict";
import { applyCommandGuard, extractConclusionCommands } from "../commandGuard";
import { applyCommandOperations, applyCommandOperationsWithAudit } from "../commandOperations";
import { parseConclusion, renderWithConclusion, splitReports } from "../conclusionUtils";
import { removeEmptyConclusionItems } from "../emptyConclusionItemsGuard";

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

const conclusoes = (t: string) => (t.match(/^CONCLUS[ÃA]O:/gim) ?? []).length;
const texts = (raw: string) => extractConclusionCommands(raw).map((c) => c.text);

const MSK_3 = `ULTRASSONOGRAFIA DO OMBRO DIREITO

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinal com espessura preservada.

CONCLUSÃO:
Ombro direito sem alterações.

ULTRASSONOGRAFIA DO PUNHO DIREITO

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores com aspecto habitual.

CONCLUSÃO:
Punho direito sem alterações.

ULTRASSONOGRAFIA DO JOELHO DIREITO

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Pequeno derrame articular.

CONCLUSÃO:
1) Derrame articular de pequeno volume.
2) ____`;

const SIMPLES = `ULTRASSONOGRAFIA DE ABDOME TOTAL

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fígado de dimensões normais.

CONCLUSÃO:
Esteatose hepática leve.`;

const TIREOIDE = `ULTRASSONOGRAFIA DE TIREOIDE

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Nódulo sólido no lobo direito.

CONCLUSÃO:
1) Nódulo tireoidiano à direita, Domingos 3.

*ESCORE DE NÓDULO TIREOIDEANO - Domingos Correia da Rocha - 2003
ACR - American College of Radiology*`;

// ---------------- MK-1: vários laudos no mesmo texto ----------------
check("splitReports separa por título 'ULTRASSONOGRAFIA…' em caixa alta", () => {
  assert.equal(splitReports(MSK_3).length, 3);
  assert.equal(splitReports(SIMPLES).length, 1);
  assert.equal(splitReports("Primeira ultrassonografia realizada em 01/02.\nCONCLUSÃO:\nX.").length, 1, "frase com 'ultrassonografia' não é título");
});
check("MK-1: comando num ditado de 3 laudos não colapsa os laudos 2 e 3 na conclusão do 1º", () => {
  const raw = "três exames. na conclusão acrescente controle ecográfico evolutivo.";
  for (const out of [applyCommandOperations(MSK_3, raw), applyCommandGuard(MSK_3, raw)]) {
    assert.equal(conclusoes(out), 3);
    assert.equal(out, MSK_3);
  }
  const audit = applyCommandOperationsWithAudit(MSK_3, raw);
  assert.ok(audit.results.every((r) => !r.applied && r.reason === "multi_laudo"));
});
check("MK-1: parseConclusion para no título do próximo laudo e devolve o resto intacto", () => {
  const p = parseConclusion(MSK_3);
  assert.deepEqual(p.items, ["Ombro direito sem alterações."]);
  assert.ok(p.after.startsWith("ULTRASSONOGRAFIA DO PUNHO DIREITO"));
  const out = renderWithConclusion(p, [...p.items, "Novo item."]);
  assert.equal(conclusoes(out), 3);
  assert.ok(out.includes("2) Novo item.\n\nULTRASSONOGRAFIA DO PUNHO DIREITO"));
});
check("guard de itens vazios age em cada laudo e mantém os três", () => {
  const out = removeEmptyConclusionItems(MSK_3);
  assert.equal(conclusoes(out), 3);
  assert.ok(out.endsWith("CONCLUSÃO:\n1) Derrame articular de pequeno volume."));
});
check("substituição literal ainda vale com vários laudos", () => {
  const out = applyCommandOperations(MSK_3, "no lugar de pequeno volume escreva volume moderado.");
  assert.ok(out.includes("1) Derrame articular de volume moderado."));
  assert.equal(conclusoes(out), 3);
});

// ---------------- Caminho writer: nada é acrescentado ----------------
check("writer (genérico/dedicado): comando de conclusão não acrescenta item", () => {
  const raw = "esteatose leve. na conclusão, recomendar controle em 6 meses.";
  assert.equal(applyCommandOperations(SIMPLES, raw, { writer: true }), SIMPLES);
  assert.equal(applyCommandGuard(SIMPLES, raw, { writer: true }), SIMPLES);
  const renderer = applyCommandOperations(SIMPLES, raw);
  assert.ok(renderer.includes("2) Recomenda-se controle em 6 meses."), "renderer continua recebendo o comando");
});
check("writer: comentário e substituição literal continuam", () => {
  const withComments = SIMPLES.replace("OS SEGUINTES", "COMENTÁRIOS:\nExame realizado em jejum.\n\nOS SEGUINTES");
  const out = applyCommandOperations(withComments, "acrescente nos comentários que a paciente estava sem preparo.", { writer: true });
  assert.ok(out.includes("A paciente estava sem preparo."));
});

// ---------------- Rodapé ----------------
check("rodapé (Domingos/ACR, BI-RADS, [REVISAR]) não vira item nem é renumerado", () => {
  const out = applyCommandOperations(TIREOIDE, "na conclusão, recomendar punção aspirativa por agulha fina.");
  assert.ok(out.includes("2) Recomenda-se punção aspirativa por agulha fina.\n\n*ESCORE DE NÓDULO TIREOIDEANO"));
  assert.ok(!/\d\)\s*\*ESCORE|\d\)\s*ACR/.test(out));
  const birads = SIMPLES + "\n\nBreast Imaging Reporting and Data System (BI-RADS®).";
  assert.deepEqual(parseConclusion(birads).items, ["Esteatose hepática leve."]);
  assert.deepEqual(parseConclusion(SIMPLES + "\n[REVISAR: medida]").items, ["Esteatose hepática leve."]);
});

// ---------------- Gatilho (T1): casos reais da revisão ----------------
check("'incluindo o istmo' (gerúndio) não é comando — era 'O istmo: 6,1 ml.'", () => {
  assert.deepEqual(texts("volume total da tireoide, incluindo o istmo: 6,1 ml."), []);
});
check("advérbio e particípio não são comando", () => {
  assert.deepEqual(texts("adicionalmente, nota-se cisto cortical simples. cateter colocado na veia."), []);
});
check("ponto decimal do ASR não corta a captura — era 'Cálculo no rim direito, medindo 0.'", () => {
  assert.deepEqual(texts("na conclusão cálculo no rim direito, medindo 0.5 cm."), ["Cálculo no rim direito, medindo 0.5 cm."]);
});
check("fala sobre a própria edição não vira item ('1 tracinho e descreve', 'a as seguintes frase')", () => {
  assert.deepEqual(texts("acrescente 1 tracinho e descreve."), []);
  assert.deepEqual(texts("coloca a as seguintes frase."), []);
});
check("comandos legítimos continuam: imperativo, informal, diagnóstico curto, 'escreva X'", () => {
  assert.deepEqual(texts("na conclusão, cisto simples no rim direito."), ["Cisto simples no rim direito."]);
  assert.deepEqual(texts("na conclusão colelitíase."), ["Colelitíase."]);
  assert.deepEqual(texts("coloca na conclusão esteatose hepática leve."), ["Esteatose hepática leve."]);
  assert.deepEqual(texts("na conclusão escreva cisto simples."), ["Cisto simples."]);
  assert.deepEqual(texts("recomendo controle ecográfico em seis meses."), ["Recomenda-se controle ecográfico em seis meses."]);
});

console.log(`\ncommand-guard-por-laudo: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
