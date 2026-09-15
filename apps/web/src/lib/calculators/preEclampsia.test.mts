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
const { calcularPreEclampsiaWeb, trocarFonteIp } = preEclampsiaModule.default ?? preEclampsiaModule
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
check('compatibilidade: idade numérica antiga (sem data de nascimento) chega direto ao motor', unico.gestante.idade === 36)
check('sem marcar diabetes, diabetesTipo1 chega false ao motor', unico.gestante.diabetes === false && unico.gestante.diabetesTipo1 === false)
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

const bilateral = { ...base(), utaPiFonte: 'bilateral' as const, utaPiDireito: '1,2', utaPiEsquerdo: '1,6', utaPiMedio: '5' }
const lados = calcularPreEclampsiaWeb(bilateral)
for (const [direito, esquerdo] of [['1.1', '1.3'], ['1.21', '1.24']]) {
  const preciso = calcularPreEclampsiaWeb({...bilateral, utaPiDireito: direito, utaPiEsquerdo: esquerdo})
  check('media chega ao kernel sem arredondamento de display', preciso.medidas.utaPiMedio === (Number(direito) + Number(esquerdo)) / 2)
}
check('bilateral usa media dos lados e ignora media residual', lados.medidas.utaPiMedio === 1.4)
const manual = calcularPreEclampsiaWeb({ ...bilateral, utaPiFonte: 'manual', utaPiMedio: '1,4' })
check('manual ignora lados e preserva risco do kernel', manual.resultado.umEmN === lados.resultado.umEmN)
for (const form of [
  { ...bilateral, utaPiEsquerdo: '' },
  { ...bilateral, utaPiDireito: 'abc' },
  { ...bilateral, utaPiDireito: '-1' },
]) {
  let erro = false
  try { calcularPreEclampsiaWeb(form) } catch { erro = true }
  check('bilateral incompleto/invalido nao produz resultado residual', erro)
}
const trocado = trocarFonteIp(bilateral, 'manual')
check('troca fonte limpa os tres IPs', trocado.utaPiMedio === '' && trocado.utaPiDireito === '' && trocado.utaPiEsquerdo === '')
check('troca fonte remove marcador anterior', calcularPreEclampsiaWeb(trocado).medidas.utaPiMedio === null)
const historia = { ...base(), intervaloAnos: '3', igPartoAnterior: '35', zEscorePesoAnterior: '-1' }
const nuli = calcularPreEclampsiaWeb(historia)
check('nulipara exclui historia oculta', nuli.gestante.intervaloAnos === null && nuli.gestante.igPartoAnterior === null && nuli.gestante.zEscorePesoAnterior === null)
const semPe = calcularPreEclampsiaWeb({ ...historia, paridade: 'multipara-sem-pe' })
check('multipara sem PE preserva IG e intervalo, exclui z-score oculto', semPe.gestante.igPartoAnterior === 35 && semPe.gestante.intervaloAnos === 3 && semPe.gestante.zEscorePesoAnterior === null)
const comPe = calcularPreEclampsiaWeb({ ...historia, paridade: 'multipara-com-pe' })
check('multipara com PE preserva toda historia aplicavel', comPe.gestante.zEscorePesoAnterior === -1 && comPe.gestante.igPartoAnterior === 35)
for (const total of [1, 2, 3, 4]) {
  check(`preserva ${total} afericoes`, calcularPreEclampsiaWeb({ ...base(), afericoes: quatro.afericoes.slice(0, total) }).medidas.afericoesPam === total)
}

// ── Data de nascimento → idade decimal na DPP ──────────────────────────────
const comNascimento = calcularPreEclampsiaWeb({
  ...base(),
  idade: undefined,
  dataNascimento: '01/03/1991',
  dataExame: '15/09/2026',
})
const nascimentoUtcMs = Date.UTC(1991, 2, 1)
const dppUtcMs = Date.UTC(2027, 2, 30) // exame 15/09/2026 + (280 - 84) dias, IG 12+0
const idadeEsperada = (dppUtcMs - nascimentoUtcMs) / 86_400_000 / 365.25
check(
  'idade decimal na DPP bate com (DPP − nascimento)/365,25',
  Math.abs(comNascimento.gestante.idade - idadeEsperada) < 1e-9,
  `esperado ${idadeEsperada}, obtido ${comNascimento.gestante.idade}`,
)
check(
  'exemplo do enunciado: nascimento 01/03/1991 + exame 15/09/2026 + IG 12+0 → 36,08 anos na DPP',
  Math.abs(comNascimento.gestante.idade - 36.08) < 0.01,
  String(comNascimento.gestante.idade),
)

const semDataExame = calcularPreEclampsiaWeb({ ...base(), idade: undefined, dataNascimento: '01/03/1991' })
check('sem data do exame, usa hoje e ainda calcula uma idade finita', Number.isFinite(semDataExame.gestante.idade))

let mensagemData = ''
try {
  calcularPreEclampsiaWeb({ ...base(), idade: undefined, dataNascimento: '31/02/1990' })
} catch (error) {
  mensagemData = error instanceof Error ? error.message : ''
}
check('data de nascimento inexistente (31/02) é rejeitada em português', mensagemData.includes('data de nascimento') && mensagemData.includes('inexistente'), mensagemData)

let mensagemSemIdade = ''
try {
  calcularPreEclampsiaWeb({ ...base(), idade: undefined, dataNascimento: undefined })
} catch (error) {
  mensagemSemIdade = error instanceof Error ? error.message : ''
}
check('sem data de nascimento e sem idade, erro pede a data de nascimento', mensagemSemIdade.includes('data de nascimento'), mensagemSemIdade)

// ── Etnia mista ─────────────────────────────────────────────────────────────
const etniaMista = calcularPreEclampsiaWeb({ ...base(), etnia: 'mista' })
check('etnia mista chega ao motor', etniaMista.gestante.etnia === 'mista')

// ── Diabetes tri-estado ──────────────────────────────────────────────────────
const diabetesTipo1 = calcularPreEclampsiaWeb({ ...base(), diabetes: true, diabetesTipo1: true })
check('diabetes tipo 1 marca diabetes e diabetesTipo1 no motor', diabetesTipo1.gestante.diabetes === true && diabetesTipo1.gestante.diabetesTipo1 === true)
const diabetesTipo2 = calcularPreEclampsiaWeb({ ...base(), diabetes: true, diabetesTipo1: false })
check('diabetes tipo 2 marca diabetes mas não diabetesTipo1', diabetesTipo2.gestante.diabetes === true && diabetesTipo2.gestante.diabetesTipo1 === false)

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ''))
if (fail) process.exit(1)
