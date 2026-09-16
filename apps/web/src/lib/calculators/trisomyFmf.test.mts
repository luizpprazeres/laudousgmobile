/** Gate de integração da tela web. Rodar: pnpm exec tsx apps/web/src/lib/calculators/trisomyFmf.test.mts */
import * as importedModule from './trisomyFmf.ts'
import type { TrisomyWebForm } from './trisomyFmf.ts'

// O pacote web ainda é carregado como CommonJS pelo runner isolado do tsx.
// Next/TypeScript expõem os exports nomeados normalmente; o runner os agrupa
// em `default`. Aceitar as duas formas mantém este gate executável nos dois.
const runtimeModule = importedModule as typeof importedModule & { default?: typeof importedModule }
const {
  calculateTrisomyWeb,
  idadeNaDataExamePreview,
  arredondarDoisAlgarismos,
  formatarRiscoExibicao,
  basalRatioT18T13,
} = runtimeModule.default ?? runtimeModule

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

const base: TrisomyWebForm = {
  maternalAge: '39', crl: '72,4', nt: '3,1', fhr: '165', ethnicity: 'white',
  weight: '', smoking: false, previousT21: false, previousT18: false, previousT13: false,
  freeBetaHcgMoM: '', pappaMoM: '', isMoMCorrected: false,
  dvPI: '', tricuspid: '', nasalBone: '',
}

// --- compatibilidade: maternalAge direto (telas antigas) ---
const fhrOnly = calculateTrisomyWeb(base)
check('compatibilidade maternalAge: CCN chega ao motor', fhrOnly.input.crl === 72.4)
check('compatibilidade maternalAge: TN chega ao motor', fhrOnly.input.nt === 3.1)
check('compatibilidade maternalAge: idade materna usada direto', fhrOnly.input.maternalAge === 39)
check(
  'compatibilidade maternalAge: marcadores usados',
  JSON.stringify(fhrOnly.result.markersUsed) === JSON.stringify(['Idade materna', 'TN', 'FCF']),
)
// 21 antes da calibração cal-2026-09-15c (FCF com IG datada, médias/SD reajustadas ao app da FMF); 19 depois
check('compatibilidade maternalAge: risco T21 calculado', fhrOnly.result.t21.ratio === 19, String(fhrOnly.result.t21.ratio))
// --- bloco enxuto do laudo (packages/shared/fmfTrisomyFormatter.ts) ---
check(
  'bloco começa com o título do rastreio combinado',
  fhrOnly.block.startsWith('RASTREIO COMBINADO DE TRISSOMIAS (1º trimestre, FMF)'),
  fhrOnly.block,
)
check(
  'bloco enxuto não repete marcadores utilizados/não utilizados nem versão do modelo',
  !/Marcadores utilizados/i.test(fhrOnly.block) &&
    !/Marcadores não informados/i.test(fhrOnly.block) &&
    !/Modelo /.test(fhrOnly.block) &&
    !/validação clínica externa pendente/i.test(fhrOnly.block),
  fhrOnly.block,
)
check(
  'bloco traz o risco basal (idade materna + IG) para trissomia 21 e trissomias 13/18',
  /Risco basal, pela idade materna e idade gestacional: trissomia 21 — 1 em [\d.,<> ]+; trissomias 13\/18 — 1 em [\d.,<> ]+\./.test(
    fhrOnly.block,
  ),
  fhrOnly.block,
)
check(
  'bloco traz o risco ajustado com os marcadores usados entre parênteses, sem "Idade materna"',
  fhrOnly.block.includes('Risco ajustado pelos marcadores (TN, FCF): trissomia 21'),
  fhrOnly.block,
)
check(
  // ratio 19 (comentário acima) cai na faixa de alto risco (≤ 100)
  'bloco classifica corretamente o risco alto de T21',
  fhrOnly.block.includes(
    'Alto risco para trissomia 21 (≥ 1 em 100): recomenda-se aconselhamento genético e oferta de teste diagnóstico invasivo, a critério do médico assistente.',
  ),
  fhrOnly.block,
)
check(
  'bloco de risco alto não menciona a linha de baixo risco',
  !fhrOnly.block.includes('Baixo risco para trissomia 21'),
  fhrOnly.block,
)

// idade jovem e TN normal, sem marcadores extras além dos obrigatórios → baixo risco esperado
const baixoRisco = calculateTrisomyWeb({ ...base, maternalAge: '22', nt: '1,5', fhr: '' })
check(
  'bloco de baixo risco traz a linha "Baixo risco para trissomia 21 (< 1 em 1.000)."',
  baixoRisco.result.t21.category === 'baixo' &&
    baixoRisco.block.includes('Baixo risco para trissomia 21 (< 1 em 1.000).'),
  `categoria=${baixoRisco.result.t21.category}\n${baixoRisco.block}`,
)
check(
  'bloco sem avisos do motor não tem linha "Observação"',
  baixoRisco.result.warnings.length === 0 && !baixoRisco.block.includes('Observação:'),
  baixoRisco.block,
)

// Free β-hCG fora do intervalo truncado (0,1–10 MoM) gera aviso do motor
const comAviso = calculateTrisomyWeb({
  ...base,
  freeBetaHcgMoM: '15',
  pappaMoM: '0,7',
  isMoMCorrected: true,
})
check(
  'bloco reflete o aviso do motor na última linha, prefixado por "Observação:"',
  comAviso.result.warnings.length > 0 && comAviso.block.endsWith(`Observação: ${comAviso.result.warnings.join(' ')}`),
  comAviso.block,
)

let mensagemMoM = ''
try {
  calculateTrisomyWeb({ ...base, freeBetaHcgMoM: '1,5' })
} catch (error) {
  mensagemMoM = error instanceof Error ? error.message : ''
}
check('bioquímica sem confirmação de MoM corrigido é rejeitada', /MoM já corrigido/.test(mensagemMoM), mensagemMoM)

const biochemistry = calculateTrisomyWeb({
  ...base,
  freeBetaHcgMoM: '1,5',
  pappaMoM: '0,7',
  isMoMCorrected: true,
})
check('bioquímica: Free β-hCG chega ao motor', biochemistry.input.freeBetaHcgMoM === 1.5)
check('bioquímica: PAPP-A chega ao motor', biochemistry.input.pappaMoM === 0.7)

// --- data de nascimento → idade decimal na data do exame ---
const porData = calculateTrisomyWeb({
  ...base,
  maternalAge: '',
  dataNascimento: '10/03/1987',
  dataExame: '10/03/2026',
})
check(
  'data de nascimento: idade decimal calculada (aniversário exato = idade inteira)',
  Math.abs(porData.input.maternalAge - 39) < 0.05,
  String(porData.input.maternalAge),
)

const previaData = idadeNaDataExamePreview({ ...base, maternalAge: '', dataNascimento: '10/03/1987', dataExame: '10/03/2026' })
check('prévia de idade na data do exame calcula um número finito', typeof previaData === 'number' && Number.isFinite(previaData))

const previaSemNascimento = idadeNaDataExamePreview({ ...base })
check('prévia sem data de nascimento retorna null (não lança erro)', previaSemNascimento === null)

const previaDataInvalida = idadeNaDataExamePreview({ ...base, maternalAge: '', dataNascimento: '31/02/1990' })
check('prévia com data inexistente retorna null (não lança erro)', previaDataInvalida === null)

let mensagemDataInexistente = ''
try {
  calculateTrisomyWeb({ ...base, maternalAge: '', dataNascimento: '31/02/1990' })
} catch (error) {
  mensagemDataInexistente = error instanceof Error ? error.message : ''
}
check(
  'data de nascimento inexistente (31/02) é rejeitada em português',
  mensagemDataInexistente.includes('data de nascimento') && mensagemDataInexistente.includes('inexistente'),
  mensagemDataInexistente,
)

const semDataExame = calculateTrisomyWeb({ ...base, maternalAge: '', dataNascimento: '10/03/1997' })
check('sem data do exame, usa hoje e ainda calcula uma idade finita', Number.isFinite(semDataExame.input.maternalAge))

let mensagemSemNadaDeIdade = ''
try {
  calculateTrisomyWeb({ ...base, maternalAge: '', dataNascimento: '' })
} catch (error) {
  mensagemSemNadaDeIdade = error instanceof Error ? error.message : ''
}
check(
  'sem data de nascimento e sem idade materna, erro pede a data de nascimento',
  mensagemSemNadaDeIdade.includes('data de nascimento'),
  mensagemSemNadaDeIdade,
)

let mensagemForaDaFaixa = ''
try {
  calculateTrisomyWeb({ ...base, maternalAge: '', dataNascimento: '10/03/1968', dataExame: '10/03/2026' })
} catch (error) {
  mensagemForaDaFaixa = error instanceof Error ? error.message : ''
}
check(
  'idade fora da faixa (58 anos) é rejeitada em português',
  mensagemForaDaFaixa.includes('idade materna') && mensagemForaDaFaixa.includes('entre 15 e 50'),
  mensagemForaDaFaixa,
)

// --- formatação de teto/piso de exibição, como o app oficial da FMF ---
check('arredondamento 2 algarismos: 3287 → 3300', arredondarDoisAlgarismos(3287) === 3300, String(arredondarDoisAlgarismos(3287)))
check('arredondamento 2 algarismos: 549 → 550', arredondarDoisAlgarismos(549) === 550, String(arredondarDoisAlgarismos(549)))
check('arredondamento 2 algarismos: 63 → 63 (já 2 algarismos)', arredondarDoisAlgarismos(63) === 63, String(arredondarDoisAlgarismos(63)))
check('arredondamento 2 algarismos: 5 → 5 (abaixo de 10, mantém)', arredondarDoisAlgarismos(5) === 5, String(arredondarDoisAlgarismos(5)))

const limites = { displayCapRatio: 10000, displayFloorRatio: 2 }
check(
  'teto de exibição: ratio > 10000 mostra "< 1 em 10.000"',
  formatarRiscoExibicao({ probability: 1 / 50000, ratio: 50000, category: 'baixo' }, limites) === '< 1 em 10.000',
  formatarRiscoExibicao({ probability: 1 / 50000, ratio: 50000, category: 'baixo' }, limites),
)
check(
  'piso de exibição: ratio < 2 mostra "1 em 2"',
  formatarRiscoExibicao({ probability: 0.8, ratio: 1, category: 'alto' }, limites) === '1 em 2',
  formatarRiscoExibicao({ probability: 0.8, ratio: 1, category: 'alto' }, limites),
)
check(
  'dentro da faixa: ratio 3287 mostra "1 em 3.300"',
  formatarRiscoExibicao({ probability: 1 / 3287, ratio: 3287, category: 'baixo' }, limites) === '1 em 3.300',
  formatarRiscoExibicao({ probability: 1 / 3287, ratio: 3287, category: 'baixo' }, limites),
)
check(
  'no limite exato do teto (10000): ainda mostra "1 em 10.000", não "<"',
  formatarRiscoExibicao({ probability: 1 / 10000, ratio: 10000, category: 'baixo' }, limites) === '1 em 10.000',
  formatarRiscoExibicao({ probability: 1 / 10000, ratio: 10000, category: 'baixo' }, limites),
)

// --- risco combinado T13/18 (basal), derivado do resultado do motor ---
const combinado = calculateTrisomyWeb(base)
const t18t13BasalEsperado = Math.round(
  1 / (combinado.result.basal.t18.probability + combinado.result.basal.t13.probability),
)
check(
  'basal T13/18 combinado soma as probabilidades basais de T13 e T18',
  basalRatioT18T13(combinado.result) === t18t13BasalEsperado,
  `${basalRatioT18T13(combinado.result)} !== ${t18t13BasalEsperado}`,
)
check('motor já expõe o risco corrigido combinado T13/18 (result.t18t13)', typeof combinado.result.t18t13.ratio === 'number')

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ''))
if (fail) process.exit(1)
