/**
 * Idade decimal na DPP e mapeamento do diabetes tri-estado — a parte pura da
 * calculadora de pré-eclâmpsia do Android, testável sem montar o componente
 * (React Native não roda em `tsx` puro).
 *
 *   pnpm exec tsx src/features/generate/preEclampsiaAge.manual.ts
 */
import assert from "node:assert/strict";
import { diabetesParaEngine, idadeNaDppAnos } from "./preEclampsiaAge";

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

console.log("\nIdade na DPP\n");

t("nasceu exatamente 35 anos antes da DPP (365,25/dia) dá idade 35", () => {
  const dataExame = new Date("2026-09-15T12:00:00");
  const gaDias = 84; // 12 semanas
  const dppEsperada = new Date(dataExame);
  dppEsperada.setDate(dppEsperada.getDate() + (280 - gaDias));
  const nascimento = new Date(dppEsperada.getTime() - 35 * 365.25 * 86_400_000);
  const idade = idadeNaDppAnos(nascimento, gaDias, dataExame);
  assert.ok(Math.abs(idade - 35) < 1e-6, `esperado ~35, recebido ${idade}`);
});

t("seis meses a menos que 35 anos antes da DPP dá idade ~35,5", () => {
  const dataExame = new Date("2026-09-15T12:00:00");
  const gaDias = 91; // 13 semanas
  const dppEsperada = new Date(dataExame);
  dppEsperada.setDate(dppEsperada.getDate() + (280 - gaDias));
  const nascimento = new Date(dppEsperada.getTime() - 34.5 * 365.25 * 86_400_000);
  const idade = idadeNaDppAnos(nascimento, gaDias, dataExame);
  assert.ok(Math.abs(idade - 34.5) < 0.02, `esperado ~34,5, recebido ${idade}`);
});

console.log("Diabetes tri-estado → motor\n");

t("não → diabetes false, tipo1 false", () => {
  assert.deepEqual(diabetesParaEngine("nao"), { diabetes: false, diabetesTipo1: false });
});
t("tipo 1 → diabetes true, tipo1 true", () => {
  assert.deepEqual(diabetesParaEngine("tipo1"), { diabetes: true, diabetesTipo1: true });
});
t("tipo 2 → diabetes true, tipo1 false", () => {
  assert.deepEqual(diabetesParaEngine("tipo2"), { diabetes: true, diabetesTipo1: false });
});

const total = ok + falhas.length;
console.log(`${"═".repeat(64)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — idade na DPP e diabetes tri-estado corretos`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(64)}\n`);
if (falhas.length > 0) process.exit(1);
