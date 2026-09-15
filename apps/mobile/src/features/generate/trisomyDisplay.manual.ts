/**
 * Idade na data do exame e exibição de risco — a parte pura da calculadora
 * de trissomias do Android, testável sem montar o componente (React Native
 * não roda em `tsx` puro).
 *
 *   pnpm exec tsx src/features/generate/trisomyDisplay.manual.ts
 */
import assert from "node:assert/strict";
import {
  arredondarDoisAlgarismos,
  basalRatioT18T13,
  formatarRiscoExibicao,
  idadeNaDataExameAnos,
} from "./trisomyDisplay";
import type { FmfResult, TrisomyRisk } from "@laudousg/shared";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, run: () => void) => {
  try {
    run();
    ok++;
  } catch (e) {
    falhas.push(`${nome} — ${e instanceof Error ? e.message : String(e)}`);
  }
};

console.log("\nIdade na data do exame\n");

t("nasceu exatamente 35 anos antes do exame (365,25/dia) dá idade 35", () => {
  const dataExame = new Date("2026-09-15T12:00:00");
  const nascimento = new Date(dataExame.getTime() - 35 * 365.25 * 86_400_000);
  const idade = idadeNaDataExameAnos(nascimento, dataExame);
  assert.ok(Math.abs(idade - 35) < 1e-6, `esperado ~35, recebido ${idade}`);
});

t("seis meses a menos que 35 anos antes do exame dá idade ~35,5", () => {
  const dataExame = new Date("2026-09-15T12:00:00");
  const nascimento = new Date(dataExame.getTime() - 34.5 * 365.25 * 86_400_000);
  const idade = idadeNaDataExameAnos(nascimento, dataExame);
  assert.ok(Math.abs(idade - 34.5) < 0.02, `esperado ~34,5, recebido ${idade}`);
});

console.log("Arredondamento para 2 algarismos significativos\n");

t("3287 → 3300", () => {
  assert.equal(arredondarDoisAlgarismos(3287), 3300);
});
t("549 → 550", () => {
  assert.equal(arredondarDoisAlgarismos(549), 550);
});
t("63 → 63", () => {
  assert.equal(arredondarDoisAlgarismos(63), 63);
});
t("0 e negativos passam direto (guarda contra log10 de não positivo)", () => {
  assert.equal(arredondarDoisAlgarismos(0), 0);
  assert.equal(arredondarDoisAlgarismos(-5), -5);
});

console.log("Exibição do risco (teto/piso do app da FMF)\n");

const limites = { displayCapRatio: 10000, displayFloorRatio: 2 };

t("acima do teto (10000) → '< 1 em 10.000'", () => {
  const risco: TrisomyRisk = { probability: 1 / 50000, ratio: 50000, category: "baixo" };
  assert.equal(formatarRiscoExibicao(risco, limites), "< 1 em 10.000");
});
t("abaixo do piso (2) → '1 em 2'", () => {
  const risco: TrisomyRisk = { probability: 1 / 1.5, ratio: 1.5, category: "alto" };
  assert.equal(formatarRiscoExibicao(risco, limites), "1 em 2");
});
t("dentro da faixa → '1 em N' com N em 2 algarismos significativos", () => {
  const risco: TrisomyRisk = { probability: 1 / 3287, ratio: 3287, category: "baixo" };
  assert.equal(formatarRiscoExibicao(risco, limites), "1 em 3.300");
});
t("exatamente no teto não vira '<' (só acima)", () => {
  const risco: TrisomyRisk = { probability: 1 / 10000, ratio: 10000, category: "baixo" };
  assert.equal(formatarRiscoExibicao(risco, limites), "1 em 10.000");
});

console.log("Basal combinado T13/18\n");

t("soma das probabilidades basais de T13 e T18, invertida e arredondada", () => {
  const result = {
    basal: {
      t21: { probability: 0, ratio: 0, category: "baixo" },
      t18: { probability: 1 / 5000, ratio: 5000, category: "baixo" },
      t13: { probability: 1 / 20000, ratio: 20000, category: "baixo" },
    },
  } as FmfResult;
  // 1/5000 + 1/20000 = 0,00025 => 1/0,00025 = 4000
  assert.equal(basalRatioT18T13(result), 4000);
});

const total = ok + falhas.length;
console.log(`${"═".repeat(64)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — idade no exame e exibição de risco corretas`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(64)}\n`);
if (falhas.length > 0) process.exit(1);
