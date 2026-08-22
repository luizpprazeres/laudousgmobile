/**
 * Gera os GOLDEN VECTORS a partir do motor validado (`../src/*.mjs`).
 *
 * Qualquer port — Swift, Kotlin, outra linguagem — tem de reproduzir estes
 * números. É o contrato de paridade entre plataformas: sem ele, iOS e Android
 * divergem em silêncio, que foi exatamente o que aconteceu com a calculadora
 * anterior.
 *
 * Rodar:  node packages/fmf/validacao/gerar-golden.mjs > packages/fmf/validacao/golden.json
 */

import { riscoPreEclampsia } from '../src/risco.mjs';
import { mapMoM, utaPiMoM } from '../src/mom.mjs';

let s = 0x51ed270b;
const u = () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(u() * a.length)];
const num = (lo, hi, casas = 0) => Number((lo + u() * (hi - lo)).toFixed(casas));

const casos = [];

// ── 1. os 8 pontos medidos no software oficial da FMF ───────────────────────
const OFICIAL = { idade: 30, altura: 164, etnia: 'branca', paridade: 'nulipara',
  intervaloAnos: null, igPartoAnterior: null, zEscorePesoAnterior: null,
  histFamiliarPE: true, fiv: false, diabetes: true, lesSaf: false, fumante: false };
for (const [id, peso, has, ga, extra] of [
  ['oficial-A', 69, false, 84, {}], ['oficial-B', 69, true, 84, {}],
  ['oficial-C', 95, false, 84, {}], ['oficial-D', 95, true, 84, {}],
  ['oficial-F', 120, false, 84, {}], ['oficial-G', 120, true, 84, {}],
  ['oficial-E', 120, false, 97, {}],
  ['oficial-H', 69, false, 97, { diabetes: false, histFamiliarPE: false }],
]) {
  casos.push({ id, g: { ...OFICIAL, peso, hipertensaoCronica: has, gaDias: ga, ...extra },
               med: { pamMmHg: 95, utaPiMedio: 1.73 } });
}

// ── 2. bordas do domínio ────────────────────────────────────────────────────
const BASE = { idade: 30, peso: 69, altura: 164, etnia: 'branca', paridade: 'nulipara',
  intervaloAnos: null, igPartoAnterior: null, zEscorePesoAnterior: null,
  histFamiliarPE: false, fiv: false, hipertensaoCronica: false, diabetes: false,
  lesSaf: false, fumante: false, gaDias: 84 };
const BORDAS = [
  ['borda-ig-min', { gaDias: 77 }, { pamMmHg: 88, utaPiMedio: 1.85 }],
  ['borda-ig-max', { gaDias: 99 }, { pamMmHg: 88, utaPiMedio: 1.50 }],
  ['trunca-idade-baixa', { idade: 10 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['trunca-idade-alta', { idade: 60 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['trunca-peso-baixo', { peso: 25 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['trunca-peso-alto', { peso: 250 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['trunca-altura-baixa', { altura: 110 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['trunca-altura-alta', { altura: 215 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['trunca-mom-pam-alto', {}, { pamMmHg: 175, utaPiMedio: 1.7 }],
  ['trunca-mom-pam-baixo', {}, { pamMmHg: 55, utaPiMedio: 1.7 }],
  ['trunca-mom-uta-alto', {}, { pamMmHg: 88, utaPiMedio: 5.5 }],
  ['trunca-mom-uta-baixo', {}, { pamMmHg: 88, utaPiMedio: 0.25 }],
  ['sem-marcador', {}, {}],
  ['so-pam', {}, { pamMmHg: 88 }],
  ['so-uta', {}, { utaPiMedio: 1.7 }],
  ['multip-sem-pe-intervalo-min', { paridade: 'multipara-sem-pe', igPartoAnterior: 40, intervaloAnos: 0.3 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['multip-sem-pe-intervalo-max', { paridade: 'multipara-sem-pe', igPartoAnterior: 40, intervaloAnos: 20 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['multip-com-pe-parto-24', { paridade: 'multipara-com-pe', igPartoAnterior: 24, intervaloAnos: 3, zEscorePesoAnterior: -2 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['multip-com-pe-parto-42', { paridade: 'multipara-com-pe', igPartoAnterior: 42, intervaloAnos: 3, zEscorePesoAnterior: 1 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['todas-comorbidades', { hipertensaoCronica: true, diabetes: true, lesSaf: true, fiv: true, histFamiliarPE: true, fumante: true }, { pamMmHg: 100, utaPiMedio: 2.4 }],
  ['afro', { etnia: 'afro' }, { pamMmHg: 92, utaPiMedio: 1.9 }],
  ['sul-asiatica', { etnia: 'sul-asiatica' }, { pamMmHg: 90, utaPiMedio: 1.8 }],
  ['leste-asiatica', { etnia: 'leste-asiatica' }, { pamMmHg: 90, utaPiMedio: 1.8 }],
];
for (const [id, ov, med] of BORDAS) casos.push({ id, g: { ...BASE, ...ov }, med });

// ── 2b. casos que DEVEM ser recusados (fail-closed é propriedade de segurança) ─
const RECUSAS = [
  ['recusa-ig-antes', { gaDias: 70 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['recusa-ig-depois', { gaDias: 110 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['recusa-pam-zero', {}, { pamMmHg: 0, utaPiMedio: 1.7 }],
  ['recusa-pam-negativa', {}, { pamMmHg: -10, utaPiMedio: 1.7 }],
  ['recusa-uta-zero', {}, { pamMmHg: 88, utaPiMedio: 0 }],
  ['recusa-uta-absurdo', {}, { pamMmHg: 88, utaPiMedio: 99 }],
  ['recusa-idade-absurda', { idade: 200 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['recusa-peso-absurdo', { peso: 500 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['recusa-multip-sem-intervalo', { paridade: 'multipara-sem-pe', igPartoAnterior: 40, intervaloAnos: null }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['recusa-multip-sem-ig-anterior', { paridade: 'multipara-sem-pe', igPartoAnterior: null, intervaloAnos: 3 }, { pamMmHg: 88, utaPiMedio: 1.7 }],
  ['recusa-multip-pe-sem-zscore', { paridade: 'multipara-com-pe', igPartoAnterior: 32, intervaloAnos: 3, zEscorePesoAnterior: null }, { pamMmHg: 88, utaPiMedio: 1.7 }],
];
for (const [id, ov, med] of RECUSAS) casos.push({ id, g: { ...BASE, ...ov }, med });

// ── 3. varredura pseudoaleatória do domínio ─────────────────────────────────
for (let i = 0; i < 300; i++) {
  const paridade = pick(['nulipara', 'multipara-sem-pe', 'multipara-com-pe']);
  const mp = paridade !== 'nulipara';
  casos.push({
    id: `aleatorio-${String(i).padStart(3, '0')}`,
    g: { idade: num(16, 48), peso: num(42, 150), altura: num(145, 190), gaDias: num(77, 99),
      etnia: pick(['branca', 'afro', 'sul-asiatica', 'leste-asiatica']), paridade,
      intervaloAnos: mp ? num(1, 12, 1) : null,
      igPartoAnterior: mp ? num(25, 42) : null,
      zEscorePesoAnterior: paridade === 'multipara-com-pe' ? num(-3, 3, 1) : null,
      histFamiliarPE: u() < 0.2, fiv: u() < 0.1, hipertensaoCronica: u() < 0.2,
      diabetes: u() < 0.15, lesSaf: u() < 0.08, fumante: u() < 0.15 },
    med: { pamMmHg: num(60, 130), utaPiMedio: num(0.5, 4, 2) },
  });
}

// ── saída ───────────────────────────────────────────────────────────────────
const saida = { versao: 'FMF/AJOG-2020+cal-2026-08-22', casos: [] };
let recusados = 0;
for (const c of casos) {
  try {
    const r = riscoPreEclampsia(c.g, c.med, [37, 34, 32]);
    saida.casos.push({
      id: c.id, entrada: c,
      esperado: {
        priorMean: r.priorMean,
        risco37: r.riscos[37], risco34: r.riscos[34], risco32: r.riscos[32],
        momPam: c.med.pamMmHg != null ? mapMoM(c.med.pamMmHg, c.g) : null,
        momUtaPi: c.med.utaPiMedio != null ? utaPiMoM(c.med.utaPiMedio, c.g) : null,
      },
    });
  } catch (e) {
    saida.casos.push({ id: c.id, entrada: c, esperado: { erroDeDominio: true } });
    recusados++;
  }
}
process.stderr.write(`${saida.casos.length} casos · ${recusados} recusados por domínio\n`);
process.stdout.write(JSON.stringify(saida, null, 1));
