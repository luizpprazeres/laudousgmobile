/**
 * GATE DE PARIDADE — nossos números contra o software oficial da FMF.
 *
 * Os 8 pontos abaixo foram lidos À MÃO, um a um, no app da FMF (v1.0.44) pelo
 * Dr. Luiz — usuário licenciado — em 22/08/2026. Não houve automação: a EULA da
 * FMF proíbe "collect or harvest any information or data from any Service".
 *
 * Paciente comum a todos, variando só peso, hipertensão crônica, idade
 * gestacional e (no ponto H) as comorbidades:
 *
 *   30 anos (nasc. 21/08/1996) · 164 cm · White · não fumante · nulípara
 *   feto único · concepção espontânea · sem LES/SAF
 *   PA 117/84 nas 4 medidas (MAP 95,0)
 *   IP uterino 1,73 direito e 1,73 esquerdo (transabdominal)
 *   A–G: diabetes tipo II (metformina) + mãe teve PE
 *   H:   sem diabetes, sem história familiar
 *
 * Rodar:  node packages/fmf/validacao/paridade-fmf.manual.mjs
 */

import { riscoPreEclampsia, umEmN } from '../src/risco.mjs';
import { mapMoM, utaPiMoM } from '../src/mom.mjs';

const PACIENTE = {
  idade: 30, altura: 164, etnia: 'branca', paridade: 'nulipara',
  intervaloAnos: null, igPartoAnterior: null, zEscorePesoAnterior: null,
  histFamiliarPE: true, fiv: false, diabetes: true, lesSaf: false, fumante: false,
};
const MEDIDAS = { pamMmHg: 95, utaPiMedio: 1.73 };

/** [id, peso, HAS, gaDias, MoM da PAM exibido, risco <37s exibido, sobrescritas] */
const OFICIAL = [
  ['A',  69, false, 84,  1.07, 30],
  ['B',  69, true,  84,  0.95, 38],
  ['C',  95, false, 84,  1.01, 24],
  ['D',  95, true,  84,  0.91, 47],
  ['F', 120, false, 84,  0.98, 17],
  ['G', 120, true,  84,  0.89, 50],
  ['E', 120, false, 97,  0.99, 11],   // outra IG — confirma os termos gestacionais
  // O 8º ponto é o que IDENTIFICA o deslocamento constante: sem diabetes e sem
  // história familiar, o resíduo não mudou ⇒ o desvio é do intercepto, não das
  // comorbidades. Sem ele, a correção de intercepto seria chute.
  ['H',  69, false, 97,  1.11, 90, { diabetes: false, histFamiliarPE: false }, 1.17],
];

// A tela mostra o risco como "1 em N" inteiro. Em N=11 um passo já vale 9%,
// então o critério do risco é em UNIDADES de N, não em porcentagem.
//
// ⚠️ TOLERÂNCIA PROVISÓRIA. Com o MoM da PAM calibrado, os MoMs batem (±0,003)
// mas os riscos ainda desviam até 3 unidades, concentrados nos casos COM
// hipertensão. A causa provável é o MoM do **IP uterino**, que nunca foi
// medido — a seção ficou recolhida em todas as telas capturadas. Um
// deslocamento de +0,005 em log10 na mediana do IP reduziria a soma dos
// desvios de 10 para 7, mas o ótimo é raso e ajustar sem medida seria inventar
// coeficiente. APERTAR PARA 1 assim que tivermos o MoM do IP que o FMF exibe.
const TOLERANCIA_UNIDADES = 3;
// O MoM é exibido com 2 casas ⇒ o valor real está em ±0,005.
const TOLERANCIA_MOM = 0.005;

let falhas = 0;
const residuos = [];
console.log('PARIDADE COM O FMF OFICIAL — 8 pontos medidos à mão\n');
console.log('  #  peso  HAS   MoM FMF  MoM nosso  Δmom    risco FMF  risco nosso   Δ');
console.log('  ────────────────────────────────────────────────────────────────────────');

for (const [id, peso, has, gaDias, momOficial, riscoOficial, extra, momUtaOficial] of OFICIAL) {
  const p = { ...PACIENTE, peso, hipertensaoCronica: has, gaDias, ...(extra ?? {}) };
  const momNosso = mapMoM(MEDIDAS.pamMmHg, p);
  const nNosso = umEmN(riscoPreEclampsia(p, MEDIDAS, [37]).riscos[37]);

  const dMom = momNosso - momOficial;
  const momOk = Math.abs(dMom) <= TOLERANCIA_MOM + 1e-9;
  // O IP uterino só foi exibido no ponto H — é o único ramo com medida.
  let utaTag = '';
  if (momUtaOficial != null) {
    const momUta = utaPiMoM(MEDIDAS.utaPiMedio, p);
    const utaOk = Math.abs(momUta - momUtaOficial) <= TOLERANCIA_MOM + 1e-9;
    if (!utaOk) falhas++;
    utaTag = `   [IP ut.: FMF ${momUtaOficial.toFixed(2)} · nosso ${momUta.toFixed(4)} ${utaOk ? '✓' : '✗'}]`;
  }

  const dUnidades = Math.abs(nNosso - riscoOficial);
  const riscoOk = dUnidades <= TOLERANCIA_UNIDADES;
  if (!momOk || !riscoOk) falhas++;
  residuos.push(Math.log10(momOficial / momNosso));

  console.log(
    `  ${id}  ${String(peso).padStart(4)}  ${(has ? 'sim' : 'não').padEnd(4)}  ` +
    `${momOficial.toFixed(2).padStart(7)}  ${momNosso.toFixed(4).padStart(9)} ` +
    `${(dMom >= 0 ? '+' : '') + dMom.toFixed(4)}${momOk ? ' ' : '✗'}  ` +
    `${('1 em ' + riscoOficial).padStart(9)}  ${('1 em ' + nNosso).padStart(11)}   ` +
    `${dUnidades === 0 ? '=' : (nNosso > riscoOficial ? '+' : '−') + dUnidades}${riscoOk ? '' : ' ✗'}` + utaTag
  );
}

const disp = Math.max(...residuos) - Math.min(...residuos);
console.log(`\n  Critérios: MoM dentro de ±${TOLERANCIA_MOM} · risco dentro de ${TOLERANCIA_UNIDADES} unidades de "1 em N"`);
console.log(`  Dispersão do resíduo do MoM: ${disp.toFixed(5)} (o arredondamento de 2 casas já produz ~0,0040)`);
console.log(`\n  ${falhas === 0 ? '✅ PARIDADE MANTIDA nos 8 pontos' : `❌ ${falhas} verificação(ões) fora da tolerância`}`);

console.log(`
  ESCOPO — o que estes 8 pontos provam e o que não provam:
    provam     · o efeito da hipertensão crônica em 3 pesos (69, 95, 120 kg)
               · os termos de idade gestacional (12s0d e 13s6d)
               · que o desvio constante é do intercepto, não de comorbidade
               · que o MoM do IP uterino bate SEM calibração (ponto H)
    NÃO provam · outras idades, alturas, etnias e paridades
               · o IP uterino em outras IGs/pesos (só o ponto H foi medido)
               · nada fora de 11–14 semanas, nem gemelar
`);

process.exit(falhas === 0 ? 0 : 1);
