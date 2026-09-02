/** Gate de integração da tela web. Rodar: pnpm exec tsx apps/web/src/lib/calculators/preEclampsia.test.mts */
import * as importedPreEclampsia from './preEclampsia.ts'
import type { PeWebForm } from './preEclampsia.ts'
import * as importedReportRichText from '../../components/laudar/reportRichText.ts'

// O pacote web ainda é carregado como CommonJS pelo runner isolado do tsx.
// Next/TypeScript expõem os exports nomeados normalmente; o runner os agrupa
// em `default`. Aceitar as duas formas mantém este gate executável nos dois.
const preEclampsiaModule = importedPreEclampsia as typeof importedPreEclampsia & {
  default?: typeof importedPreEclampsia
}
const { calcularPreEclampsiaWeb } = preEclampsiaModule.default ?? preEclampsiaModule
const reportRichTextModule = importedReportRichText as typeof importedReportRichText & {
  default?: typeof importedReportRichText
}
const { mergeReportHtml, reportHtmlToText, textToReportHtml } = reportRichTextModule.default ?? reportRichTextModule

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
check(
  'bloco usa o título clínico aprovado',
  unico.resultado.insertBloco.startsWith('CÁLCULO DE RISCO DE PRÉ-ECLÂMPSIA (1º trimestre)'),
)
check(
  'bloco apresenta IG e baixo risco na redação aprovada',
  unico.resultado.insertBloco.includes('Idade gestacional: 12 semanas e 0 dias.')
    && unico.resultado.insertBloco.includes(
      'Baixo risco para pré-eclâmpsia pré-termo (corte de 1 em 100). Seguimento pré-natal de rotina.',
    ),
)
check(
  'bloco compacto não repete marcadores nem ressalva a aferição única',
  !unico.resultado.insertBloco.includes('Calculado com:')
    && !unico.resultado.insertBloco.includes('Ressalvas:'),
)
const htmlDoBloco = textToReportHtml(unico.resultado.insertBloco)
check(
  'referência FMF fica em itálico somente na apresentação rica da web',
  htmlDoBloco.includes('<em>Baseado no modelo de riscos competitivos')
    && reportHtmlToText(htmlDoBloco) === unico.resultado.insertBloco,
)
check(
  'atualização corrige referência FMF antiga que ainda estava sem itálico',
  mergeReportHtml(
    htmlDoBloco.replace('<em>Baseado', 'Baseado').replace('pela FMF.</em>', 'pela FMF.'),
    unico.resultado.insertBloco,
  ).includes('<em>Baseado no modelo de riscos competitivos'),
)

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
