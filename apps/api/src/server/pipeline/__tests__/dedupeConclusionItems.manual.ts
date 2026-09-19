/**
 * GUARDA DE FORMA DA CONCLUSÃO — `dedupeConclusionItems` + `normalizeDumFormat`.
 *
 * O teste nasceu de 100 laudos reais de produção, e por isso apontava para um
 * JSON no scratchpad de uma sessão específica. A sessão morreu, o arquivo foi
 * embora e o teste parou de RODAR — sem nunca falhar por mérito, o que é a pior
 * forma de um guard morrer: ele some do resultado da bateria e ninguém percebe.
 *
 * Agora o corpo do teste é SINTÉTICO e versionado, cobrindo as assinaturas de
 * defeito que os laudos-100 revelaram. O corpo real continua aceito, quando
 * existir, por `LAUDOS_CORPUS` — é o que confirma que a propriedade vale no
 * texto de verdade, não só no que eu imaginei.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/pipeline/__tests__/dedupeConclusionItems.manual.ts
 *   LAUDOS_CORPUS=/caminho/laudos-100.json pnpm exec tsx ... (com o corpo real)
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { normalizeDumFormat, dedupeConclusionItems } from "../dumFormatGuard";

const pipe = (g: string): string => dedupeConclusionItems(normalizeDumFormat(g));

const corpo = (linhas: string[]): string =>
  [
    "ULTRASSONOGRAFIA OBSTÉTRICA",
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    "Feto único, em apresentação cefálica.",
    "",
    "CONCLUSÃO:",
    ...linhas,
  ].join("\n");

let falhas = 0;
function caso(nome: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${nome}`);
  } catch (err) {
    falhas++;
    console.log(`  ✗ ${nome}\n      ${(err as Error).message.split("\n")[0]}`);
  }
}

console.log("\nGuarda de forma da conclusão — corpo sintético\n");

caso("item repetido sai, e a conclusão é renumerada", () => {
  const antes = corpo([
    "1) Gestação em torno de 32 semanas e 2 dias.",
    "2) Líquido amniótico em quantidade aumentada (ILA = 26,0 cm).",
    "3) Líquido amniótico em quantidade aumentada (ILA = 26,0 cm).",
  ]);
  const depois = dedupeConclusionItems(antes);
  const vezes = (depois.match(/L[íi]quido amni[óo]tico em quantidade aumentada/gi) ?? []).length;
  assert.equal(vezes, 1, `o item duplicado sobreviveu (${vezes}×)`);
  assert.ok(depois.includes("2) Líquido amniótico"), "a conclusão não foi renumerada");
  assert.ok(!depois.includes("3)"), "sobrou um terceiro item");
});

caso("conclusão sem duplicata passa byte-idêntica", () => {
  const t = corpo([
    "1) Gestação em torno de 32 semanas e 2 dias.",
    "2) Líquido amniótico em quantidade normal.",
    "3) Colo uterino ecograficamente normal.",
  ]);
  assert.equal(dedupeConclusionItems(t), t, "o dedupe mexeu em laudo sem duplicata");
});

caso("texto sem seção de conclusão passa byte-idêntico", () => {
  const t = "ULTRASSONOGRAFIA OBSTÉTRICA\n\nFeto único, em apresentação cefálica.";
  assert.equal(dedupeConclusionItems(t), t);
});

caso("itens que diferem só por espaço contam como o mesmo", () => {
  const t = corpo([
    "1) Gestação em torno de 32 semanas e 2 dias.",
    "2) Colo uterino ecograficamente normal.  ",
    "3) Colo uterino ecograficamente normal.",
  ]);
  const vezes = (dedupeConclusionItems(t).match(/Colo uterino ecograficamente normal/g) ?? []).length;
  assert.equal(vezes, 1, `espaço no fim escondeu a duplicata (${vezes}×)`);
});

caso("o placeholder de IG sai e a gestação real fica", () => {
  const t = corpo([
    "1) Gestação em torno de ____ semanas.",
    "2) Gestação em torno de 32 semanas e 2 dias.",
  ]);
  const depois = pipe(t);
  assert.ok(!depois.includes("____"), "o placeholder de IG sobreviveu");
  assert.ok(depois.includes("32 semanas e 2 dias"), "a gestação real foi removida junto");
});

caso("o placeholder de IG SOZINHO fica — conclusão vazia é pior", () => {
  const t = corpo(["1) Gestação em torno de ____ semanas."]);
  assert.ok(pipe(t).includes("____"), "esvaziou a conclusão");
});

caso("as duas funções são idempotentes", () => {
  const casos = [
    corpo(["1) A.", "2) A.", "3) B."]),
    corpo(["1) Gestação em torno de ____ semanas.", "2) Gestação em torno de 30 semanas."]),
    "Primeira ultrassonografia realizada 20/02/2026 com 9 semanas e 3 dias.",
    "Data da última menstruação correspondente a 12 semanas e 1 dias na data do exame.",
  ];
  for (const c of casos) {
    const d = dedupeConclusionItems(c);
    assert.equal(dedupeConclusionItems(d), d, `dedupe não idempotente em: ${c.slice(0, 40)}`);
    const p = pipe(c);
    assert.equal(pipe(p), p, `pipeline não idempotente em: ${c.slice(0, 40)}`);
  }
});

caso("normalizeDumFormat corrige as formas observadas", () => {
  assert.ok(
    normalizeDumFormat("Primeira ultrassonografia realizada 20/02/2026 com 9 semanas.")
      .startsWith("Primeira USG: 20/02/2026, com "),
    "a frase da primeira USG não virou canônica",
  );
  assert.ok(
    normalizeDumFormat("Data da última menstruação correspondente a 12 semanas na data do exame.")
      .startsWith("Idade gestacional de 12 semanas"),
    "a linha de DUM fabricada não virou idade gestacional",
  );
  assert.equal(normalizeDumFormat("Gestação de 30 semanas e 1 dias."), "Gestação de 30 semanas e 1 dia.");
  assert.equal(normalizeDumFormat("Restam 21 dias."), "Restam 21 dias.", "'21 dias' não pode virar singular");
});

/**
 * CORPO REAL — opcional. A propriedade que importa é a mesma: idempotência, e
 * nenhum laudo sem duplicata alterado.
 */
const CORPUS = process.env.LAUDOS_CORPUS;
if (CORPUS && existsSync(CORPUS)) {
  const arr: Array<{ report_id: string; category_code: string; generated_output: string }> =
    JSON.parse(readFileSync(CORPUS, "utf8"));
  const OBST = new Set(["OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO"]);
  const mudaram: string[] = [];
  console.log(`\nCorpo real — ${CORPUS}\n`);
  caso("corpo real: idempotente e conservador", () => {
    for (const r of arr) {
      if (!OBST.has(r.category_code)) continue;
      const g = r.generated_output ?? "";
      const d1 = dedupeConclusionItems(g);
      assert.equal(dedupeConclusionItems(d1), d1, `dedupe não idempotente em ${r.report_id}`);
      const out = pipe(g);
      assert.equal(pipe(out), out, `pipeline não idempotente em ${r.report_id}`);
      if (d1 !== g) mudaram.push(r.report_id);
      else assert.equal(d1, g, `dedupe alterou laudo sem duplicata: ${r.report_id}`);
    }
  });
  console.log(`  ${mudaram.length} laudo(s) obstétricos tinham item de conclusão duplicado`);
} else {
  console.log("\n  (corpo real não informado — defina LAUDOS_CORPUS para exercitá-lo)");
}

console.log(falhas === 0 ? "\n✓ guarda de forma da conclusão OK\n" : `\n✗ ${falhas} falha(s)\n`);
process.exit(falhas ? 1 : 0);
