/**
 * AS FLAGS DE PRODUÇÃO ATRAVESSAM O CAMINHO DO CATÁLOGO — o gate.
 *
 * O mesmo esquecimento apareceu TRÊS vezes: `omitPicoNull` na tireoide (D5),
 * `igCorrection` na obstétrica, e mais seis categorias na varredura de 22/08.
 * O registry declarava `render: (f, o) => renderX(f, { objetivo: o.objetivo })`
 * e descartava tudo o mais — inclusive guards de segurança.
 *
 * O pior deles: o Doppler umbilical. Com IP de 1,8 (o alerta é 1,5), o laudo
 * pelo caminho do catálogo concluía
 *
 *   "Índice de pulsatilidade NORMAL nas artérias uterinas, umbilical e ACM."
 *
 * enquanto o mesmo caso pelo caminho do app dizia
 *
 *   "Índice de pulsatilidade ELEVADO na artéria umbilical."
 *
 * Este gate não confere se cada flag está LIGADA — isso é do ambiente. Confere
 * que ligá-la MUDA o laudo, que é o que prova que ela atravessa. Uma flag que
 * não muda nada quando ligada está sendo descartada em algum lugar.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/flags-de-producao.manual.ts
 */

import { laudoPadraoDe } from "../modeloNormalRegistry";

type Caso = {
  categoria: string;
  flag: string;
  porque: string;
  /** Dados que fazem a flag ter efeito — sem eles ela é inerte por natureza. */
  dados: Record<string, unknown>;
  /** O que o laudo passa a dizer (ou deixa de dizer) com a flag ligada. */
  comFlag?: string;
  semFlag?: string;
  /** Barreira incorporada ao contrato clínico: deve permanecer ativa mesmo com a flag desligada. */
  sempreAtivo?: boolean;
};

const CASOS: Caso[] = [
  {
    categoria: "DOPPLER_OBSTETRICO",
    flag: "DOPPLER_UMBILICAL_SAFETY",
    porque:
      "GUARD DE SEGURANÇA — umbilical acima do p95 estava saindo como 'pulsatilidade normal'. O guard usa o percentil/IG e não um corte fixo de IP.",
    dados: { ip_umbilical: 1.8, perc_umbilical: 96 },
    comFlag: "elevado na artéria umbilical",
    sempreAtivo: true,
  },
  {
    categoria: "OBSTETRICA",
    flag: "IG_REFERENCE_CORRECTION",
    porque:
      "a frase da primeira ultrassonografia. A flag está ligada há 65 dias e a frase nunca saía por este caminho.",
    dados: {
      primeira_us_data: "12/01/2026",
      primeira_us_ig_semanas: 8,
      primeira_us_ig_dias: 2,
      data_exame: "20/06/2026",
      referencia_fonte: "usg_precoce",
      ig_semanas: 32,
      ig_dias: 2,
    },
    comFlag: "12/01/2026",
  },
];

let falhas = 0;
console.log("═".repeat(74));
console.log("As flags de produção atravessam o catálogo?");
console.log("═".repeat(74));

for (const c of CASOS) {
  delete process.env[c.flag];
  const off = laudoPadraoDe(c.categoria, "CLASSICO_COMPLETO", c.dados as never) ?? "";
  process.env[c.flag] = "true";
  const on = laudoPadraoDe(c.categoria, "CLASSICO_COMPLETO", c.dados as never) ?? "";
  delete process.env[c.flag];

  console.log(`\n▸ ${c.categoria} · ${c.flag}`);
  console.log(`  ${c.porque}`);

  if (off === "" || on === "") {
    console.log("  ✗ NÃO RENDERIZOU — categoria sumiu (o sintoma do `env()` no caminho do render)");
    falhas++;
    continue;
  }
  if (c.sempreAtivo) {
    if (c.comFlag && (!off.includes(c.comFlag) || !on.includes(c.comFlag))) {
      console.log(`  ✗ a barreira clínica não permaneceu ativa nos dois estados da flag`);
      falhas++;
    } else {
      console.log("  ✓ barreira clínica incorporada ao renderer e ativa nos dois estados da flag");
    }
    continue;
  }
  if (off === on) {
    console.log("  ✗ LIGAR A FLAG NÃO MUDA NADA — está sendo descartada antes do renderer");
    falhas++;
    continue;
  }
  if (c.comFlag && !on.includes(c.comFlag)) {
    console.log(`  ✗ com a flag, o laudo não contém "${c.comFlag}"`);
    falhas++;
  }
  if (c.semFlag && !off.includes(c.semFlag)) {
    console.log(`  ⚠ sem a flag o laudo não contém "${c.semFlag}" — o caso mudou de forma`);
  }
  const a = off.split("\n"), b = on.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.log(`  ✓ muda na linha ${i}:`);
      console.log(`      sem: ${(a[i] ?? "(ausente)").trim().slice(0, 88)}`);
      console.log(`      com: ${(b[i] ?? "(ausente)").trim().slice(0, 88)}`);
      break;
    }
  }
}

console.log("\n" + "═".repeat(74));
console.log(falhas === 0 ? "✓ todas as flags exercitadas atravessam" : `✗ ${falhas} flag(s) descartada(s)`);
console.log("═".repeat(74));
process.exit(falhas ? 1 : 0);
