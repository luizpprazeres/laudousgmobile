/**
 * GATE DE PORT — o TypeScript de `packages/shared` contra o motor `.mjs` daqui.
 *
 * `packages/fmf/src/*.mjs` é a fonte de verdade: é nele que a paridade com o
 * software oficial da FMF foi medida. O TypeScript existe para os apps
 * consumirem. Este gate prova que os dois calculam a MESMA coisa.
 *
 * Rodar:  node packages/fmf/validacao/port-typescript.manual.mjs
 *         (usa tsx para importar o .ts)
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { riscoPreEclampsia } from '../src/risco.mjs';

// ── população de teste: varre o domínio inteiro, não só casos bonitos ────────
let s = 0x9e3779b9;
const u = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(u() * a.length)];
const nInt = (lo, hi) => lo + u() * (hi - lo);

const CASOS = [];
for (let i = 0; i < 600; i++) {
  const paridade = pick(['nulipara', 'multipara-sem-pe', 'multipara-com-pe']);
  const multipara = paridade !== 'nulipara';
  const g = {
    idade: Math.round(nInt(16, 48)),
    peso: Math.round(nInt(42, 150)),
    altura: Math.round(nInt(145, 190)),
    gaDias: Math.round(nInt(77, 99)),
    etnia: pick(['branca', 'afro', 'sul-asiatica', 'leste-asiatica']),
    paridade,
    intervaloAnos: multipara ? Math.round(nInt(1, 12)) : null,
    igPartoAnterior: multipara ? Math.round(nInt(25, 42)) : null,
    zEscorePesoAnterior: paridade === 'multipara-com-pe' ? Math.round(nInt(-3, 3)) : null,
    histFamiliarPE: u() < 0.2,
    fiv: u() < 0.1,
    hipertensaoCronica: u() < 0.2,
    diabetes: u() < 0.15,
    lesSaf: u() < 0.08,
    fumante: u() < 0.15,
  };
  // cobre também os ramos sem marcador e com um marcador só
  const modo = u();
  const med =
    modo < 0.1 ? {}
    : modo < 0.2 ? { pamMmHg: Math.round(nInt(60, 130)) }
    : modo < 0.3 ? { utaPiMedio: Number(nInt(0.5, 4).toFixed(2)) }
    : { pamMmHg: Math.round(nInt(60, 130)), utaPiMedio: Number(nInt(0.5, 4).toFixed(2)) };
  CASOS.push({ g, med });
}

// ── lado TypeScript, via tsx num processo separado ───────────────────────────
// os casos vão por arquivo: em linha de comando estouram o limite do SO
const tmp = path.join(os.tmpdir(), `fmf-port-${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify(CASOS));

const script = `
import fs from 'node:fs';
import { calcularPreEclampsiaFmf, PeErroDeDominio } from ${JSON.stringify(
  new URL('../../shared/src/calculators/preEclampsiaFmf.ts', import.meta.url).pathname
)};
const casos = JSON.parse(fs.readFileSync(${JSON.stringify('PLACEHOLDER')}, 'utf8'));
const out = casos.map(({ g, med }) => {
  try { const r = calcularPreEclampsiaFmf(g, med);
        return { ok: true, r: [r.riscos[37], r.riscos[34], r.riscos[32], r.priorMean] }; }
  catch (e) { return { ok: false, erro: e instanceof PeErroDeDominio ? 'dominio' : 'outro' }; }
});
process.stdout.write(JSON.stringify(out));
`;

let TS;
try {
  const bruto = execFileSync(
    'node',
    ['--experimental-strip-types', '--input-type=module', '--eval', script.replace('PLACEHOLDER', tmp)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  TS = JSON.parse(bruto);
} finally {
  fs.rmSync(tmp, { force: true });
}

// ── comparação ───────────────────────────────────────────────────────────────
let comparados = 0, ambosErro = 0, divergencias = 0, piorRel = 0;
for (let i = 0; i < CASOS.length; i++) {
  const { g, med } = CASOS[i];
  let mjs = null;
  try { mjs = riscoPreEclampsia(g, med, [37, 34, 32]); } catch { /* domínio */ }

  if (mjs === null) {
    if (TS[i].ok) { divergencias++; console.log(`  ✗ caso ${i}: .mjs lançou, TS não`); }
    else ambosErro++;
    continue;
  }
  if (!TS[i].ok) { divergencias++; console.log(`  ✗ caso ${i}: TS lançou, .mjs não`); continue; }

  comparados++;
  const a = [mjs.riscos[37], mjs.riscos[34], mjs.riscos[32], mjs.priorMean];
  for (let k = 0; k < 4; k++) {
    const rel = Math.abs(a[k] - TS[i].r[k]) / Math.max(Math.abs(a[k]), 1e-300);
    if (rel > piorRel) piorRel = rel;
    if (rel > 1e-12) {
      divergencias++;
      console.log(`  ✗ caso ${i} campo ${k}: .mjs=${a[k]} TS=${TS[i].r[k]} rel=${rel.toExponential(2)}`);
      break;
    }
  }
}

console.log(`\nPORT TypeScript × motor .mjs`);
console.log(`  ${comparados} casos comparados · ${ambosErro} recusados por ambos · ${divergencias} divergências`);
console.log(`  pior diferença relativa: ${piorRel.toExponential(2)}  (limite 1e-12)`);
console.log(`\n  ${divergencias === 0 ? '✅ O PORT É FIEL' : '❌ o port DIVERGE do motor validado'}`);
process.exit(divergencias === 0 ? 0 : 1);
