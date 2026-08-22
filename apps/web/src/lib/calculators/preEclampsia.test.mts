/** Gate de integração da tela web. Rodar: pnpm exec tsx apps/web/src/lib/calculators/preEclampsia.test.mts */
import { calcularPreEclampsiaWeb, type PeWebForm } from './preEclampsia'

let pass = 0
let fail = 0
const check = (name: string, condition: boolean, detail?: string) => {
  if (condition) {
    pass++
    console.log(`✓ ${name}`)
  } else {
    fail++
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ''}`)
  }
}

const base = (): PeWebForm => ({
  idade: '36',
  peso: '69',
  altura: '164',
  gaSemanas: '12',
  gaDias: '0',
  etnia: 'branca',
  paridade: 'nulipara',
  intervaloAnos: '',
  igPartoAnterior: '',
  zEscorePesoAnterior: '',
  histFamiliarPE: true,
  fiv: false,
  hipertensaoCronica: false,
  diabetes: false,
  lesSaf: false,
  fumante: false,
  afericoes: [{ sistolica: '120', diastolica: '80' }],
  utaPiMedio: '1,08',
})

const unico = calcularPreEclampsiaWeb(base())
check('monta PeGestante sem transformar peso em IMC', unico.gestante.peso === 69 && unico.gestante.altura === 164)
check('converte 12+0 para 84 dias', unico.gestante.gaDias === 84)
check('preserva etnia, paridade e história', unico.gestante.etnia === 'branca' && unico.gestante.paridade === 'nulipara' && unico.gestante.histFamiliarPE)
check('PAM vem de uma aferição via núcleo compartilhado', Math.abs((unico.medidas.pamMmHg ?? 0) - 93.33333333333333) < 1e-10 && unico.medidas.afericoesPam === 1)
check('retorna os dois MoMs e risco 1 em N', unico.resultado.marcadores.length === 2 && Number.isFinite(unico.resultado.umEmN))
check('bloco declara aferição única', unico.resultado.insertBloco.includes('(aferição única)'))

const quatro = base()
quatro.afericoes = [
  { sistolica: '120', diastolica: '80' },
  { sistolica: '118', diastolica: '78' },
  { sistolica: '122', diastolica: '82' },
  { sistolica: '120', diastolica: '80' },
]
const protocolo = calcularPreEclampsiaWeb(quatro)
check('aceita quatro aferições sem perder nenhuma', protocolo.medidas.afericoesPam === 4)
check('bloco declara protocolo com quatro aferições', protocolo.resultado.insertBloco.includes('(4 aferições)'))

const multipara = base()
multipara.paridade = 'multipara-com-pe'
multipara.intervaloAnos = '3'
let mensagem = ''
try {
  calcularPreEclampsiaWeb(multipara)
} catch (error) {
  mensagem = error instanceof Error ? error.message : ''
}
check('erro de domínio da multípara chega em português', mensagem.includes('exige a IG do parto anterior'), mensagem)

const foraDaJanela = base()
foraDaJanela.gaSemanas = '15'
mensagem = ''
try {
  calcularPreEclampsiaWeb(foraDaJanela)
} catch (error) {
  mensagem = error instanceof Error ? error.message : ''
}
check('erro do núcleo não vira número fora da janela', mensagem.includes('fora da janela do modelo'), mensagem)

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ''))
if (fail) process.exit(1)
