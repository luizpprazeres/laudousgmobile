/**
 * GATE DE PARIDADE — nossos números contra o software oficial da FMF.
 *
 * Os 7 pontos abaixo foram lidos À MÃO, um a um, no app da FMF (v1.0.44) pelo
 * Dr. Luiz — usuário licenciado — em 22/08/2026. Não houve automação: a EULA da
 * FMF proíbe "collect or harvest any information or data from any Service".
 *
 * Todos compartilham a mesma paciente, variando só peso, hipertensão crônica e
 * (no ponto E) a idade gestacional:
 *
 *   30 anos (nasc. 21/08/1996) · 164 cm · White · não fumante · nulípara
 *   feto único · concepção espontânea · diabetes tipo II (metformina)
 *   mãe teve PE · sem LES/SAF · PA 117/84 nas 4 medidas (MAP 95,0)
 *   IP uterino 1,73 direito e 1,73 esquerdo (transabdominal)
 *
 * Rodar:  node packages/fmf/validacao/paridade-fmf.manual.mjs
 */

import { riscoPreEclampsia, umEmN } from '../src/risco.mjs';
import { mapMoM } from '../src/mom.mjs';

const gaDeCrl = (crl) => 23.53 + 8.052 * Math.sqrt(1.037 * crl);   // fórmula da própria FMF

const PACIENTE = {
  idade: 30, altura: 164, etnia: 'branca', paridade: 'nulipara',
  intervaloAnos: null, igPartoAnterior: null, zEscorePesoAnterior: null,
  histFamiliarPE: true, fiv: false, diabetes: true, lesSaf: false, fumante: false,
};
const MEDIDAS = { pamMmHg: 95, utaPiMedio: 1.73 };

/** [id, peso, HAS, gaDias, MoM da PAM exibido, risco <37s exibido] */
const OFICIAL = [
  ['A',  69, false, 84,           1.07, 30],
  ['B',  69, true,  84,           0.95, 38],
  ['C',  95, false, 84,           1.01, 24],
  ['D',  95, true,  84,           0.91, 47],
  ['F', 120, false, 84,           0.98, 17],
  ['G', 120, true,  84,           0.89, 50],
  ['E', 120, false, gaDeCrl(81),  0.99, 11],
];

// A tela mostra o risco como "1 em N" inteiro. Em N=11 um passo já vale 9%.
// Por isso o critério do risco é em UNIDADES de N, não em porcentagem.
const TOLERANCIA_UNIDADES = 2;

// Sabemos que sobra um deslocamento CONSTANTE de ~0,78% no MoM da PAM, e sabemos
// por quê: ele é confundido entre intercepto, diabetes, história familiar e
// idade — todos fixos nestes 7 pontos (ver a nota em src/mom.mjs). Portanto o
// gate NÃO exige que o MoM bata; exige que o resíduo seja o MESMO em todos os
// pontos. É essa constância que prova que a interação HAS×peso foi corrigida:
// se alguém quebrar a interação, o resíduo deixa de ser constante e o gate cai.
const DISPERSAO_MAX_LOG10 = 0.0024;    // ±0,5% — a própria resolução de 2 casas

let falhas = 0;
const residuos = [];
console.log('PARIDADE COM O FMF OFICIAL — 7 pontos medidos à mão\n');
console.log('  #  peso  HAS   MoM FMF  MoM nosso   resíduo   risco FMF  risco nosso   Δ');
console.log('  ──────────────────────────────────────────────────────────────────────────');

for (const [id, peso, has, gaDias, momOficial, riscoOficial] of OFICIAL) {
  const p = { ...PACIENTE, peso, hipertensaoCronica: has, gaDias };
  const momNosso = mapMoM(MEDIDAS.pamMmHg, p);
  const nNosso = umEmN(riscoPreEclampsia(p, MEDIDAS, [37]).riscos[37]);

  const residuo = Math.log10(momOficial / momNosso);
  residuos.push({ id, residuo });

  const dUnidades = Math.abs(nNosso - riscoOficial);
  const riscoOk = dUnidades <= TOLERANCIA_UNIDADES;
  if (!riscoOk) falhas++;

  console.log(
    `  ${id}  ${String(peso).padStart(4)}  ${(has ? 'sim' : 'não').padEnd(4)}  ` +
    `${momOficial.toFixed(2).padStart(7)}  ${momNosso.toFixed(4).padStart(9)}  ` +
    `${(residuo >= 0 ? '+' : '') + residuo.toFixed(5)}  ` +
    `${('1 em ' + riscoOficial).padStart(9)}  ${('1 em ' + nNosso).padStart(11)}   ` +
    `${dUnidades === 0 ? '=' : (nNosso > riscoOficial ? '+' : '−') + dUnidades}${riscoOk ? '' : ' ✗'}`
  );
}

const vals = residuos.map((r) => r.residuo);
const media = vals.reduce((a, b) => a + b, 0) / vals.length;
const dispersao = Math.max(...vals) - Math.min(...vals);
const constante = dispersao <= DISPERSAO_MAX_LOG10;
if (!constante) falhas++;

console.log(`\n  Resíduo do MoM: média ${media.toFixed(5)} (${(100 * (Math.pow(10, -media) - 1)).toFixed(2)}% no MoM)`);
console.log(`                  dispersão ${dispersao.toFixed(5)}  (limite ${DISPERSAO_MAX_LOG10})  ${constante ? '✅ constante' : '❌ varia'}`);
console.log(`\n  Critérios: risco dentro de ${TOLERANCIA_UNIDADES} unidades de "1 em N"`);
console.log('             resíduo do MoM CONSTANTE entre os pontos (não zero — ver src/mom.mjs)');
console.log(`\n  ${falhas === 0 ? '✅ PARIDADE MANTIDA nos 7 pontos' : `❌ ${falhas} verificação(ões) fora da tolerância`}`);

console.log(`
  ESCOPO — o que estes 7 pontos provam e o que não provam:
    provam   · o efeito da hipertensão crônica em 3 pesos (69, 95, 120 kg)
             · que os termos de idade gestacional estão certos (ponto E, 13s6d)
    NÃO provam · outras idades, alturas, etnias e paridades
               · o ramo do IP uterino (a tela ficou recolhida em A–E)
               · nada fora de 11–14 semanas
`);

process.exit(falhas === 0 ? 0 : 1);
