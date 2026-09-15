/**
 * T42 — corpus de 100 casos gerado pelo gate, inteiramente sintético.
 * Não lê laudos reais, scratchpads, banco, rede nem arquivos temporários.
 * Em apps/api: pnpm exec tsx src/server/pipeline/__tests__/dumFormatGuard.manual.ts
 */
import assert from "node:assert/strict";
import { normalizeDumFormat } from "../dumFormatGuard";

type Fixture = { id: string; input: string; expected: string };
const fixtures: Fixture[] = [];

// Dez cenários, dez datas/idades sintéticas distribuídas em duas grafias do cabeçalho.
// As saídas esperadas são independentes do guard; não usamos sua saída como golden.
for (const [headerIndex, header] of ["CONCLUSÃO:", "CONCLUSAO:"].entries()) {
  for (let seed = 1; seed <= 5; seed++) {
    const variant = headerIndex * 5 + seed;
    const date = `${String(variant).padStart(2, "0")}/02/2030`;
    const weeks = 20 + variant;
    const body = `Exame sintético de ${date}.`;
    const conclusion = (items: string[]) => `${body}\n\n${header}\n${items.join("\n")}`;
    const add = (scenario: string, input: string, expected = input) => {
      fixtures.push({ id: `${scenario}/${header}/${seed}`, input, expected });
    };

    add(
      "primeira-usg-drift",
      `Primeira ultrassonografia realizada ${date} com idade gestacional de ${weeks} semanas e 2 dias.`,
      `Primeira USG: ${date}, com idade gestacional de ${weeks} semanas e 2 dias.`,
    );
    add(
      "dum-fabricada",
      `Data da última menstruação correspondente a ${weeks} semanas e 2 dias na data do exame.`,
      `Idade gestacional de ${weeks} semanas e 2 dias.`,
    );
    add(
      "singular-dia",
      `Idade gestacional de ${weeks} semanas e 1 dias.`,
      `Idade gestacional de ${weeks} semanas e 1 dia.`,
    );
    add(
      "placeholder-removido-e-renumerado",
      conclusion([
        "1) Gestação em torno de ____ semanas.",
        `2) Gestação de ${weeks} semanas e 2 dias.`,
        "3) Vitalidade fetal preservada.",
      ]),
      conclusion([
        `1) Gestação de ${weeks} semanas e 2 dias.`,
        "2) Vitalidade fetal preservada.",
      ]),
    );

    // Preservar conteúdo correto, outros números e a conclusão única.
    add("primeira-usg-canonica", `Primeira USG: ${date}, com idade gestacional de ${weeks} semanas e 2 dias.`);
    add("dum-data-preservada", `Data da última menstruação: ${date}.`);
    add("vinte-e-um-dias", `Exame sintético ${variant}: retorno em 21 dias.`);
    add("placeholder-unico-preservado", conclusion(["1) Gestação em torno de ____ semanas."]));
    add("placeholder-fora-conclusao", `${body}\nGestação em torno de ____ semanas.`);
    add("texto-sem-defeito", conclusion([`1) Gestação de ${weeks} semanas e 2 dias.`, "2) Vitalidade fetal preservada."]));
  }
}

assert.equal(fixtures.length, 100, "corpus sintético incompleto");
assert.equal(new Set(fixtures.map((fixture) => fixture.id)).size, 100, "ids de fixture duplicados");
assert.equal(new Set(fixtures.map((fixture) => fixture.input)).size, 100, "entradas de fixture duplicadas");
let changed = 0;
for (const fixture of fixtures) {
  const once = normalizeDumFormat(fixture.input);
  assert.equal(once, fixture.expected, `${fixture.id}: resultado divergente`);
  assert.equal(normalizeDumFormat(once), once, `${fixture.id}: guard não idempotente`);
  if (once !== fixture.input) changed++;
}
assert.equal(changed, 40, "as quatro correções devem agir; os 60 controles devem permanecer byte-idênticos");
console.log(`dumFormatGuard: ${fixtures.length}/100 casos sintéticos passaram; ${changed} corrigidos, ${fixtures.length - changed} preservados; todos idempotentes.`);
