import { calcularPreEclampsiaWeb, type PeWebForm } from '@/lib/calculators/preEclampsia'
import { calculateTrisomyWeb, formatarRiscoExibicao, type TrisomyWebForm } from '@/lib/calculators/trisomyFmf'

// Casos SINTÉTICOS da landing. Nenhum dado de paciente. As saídas vêm dos mesmos
// adaptadores e formatadores que o laudo da Web usa (`insertBloco` e `block`);
// nada aqui é digitado à mão. Datas fixas para o resultado não depender do dia.
// Proveniência: docs/workstreams/2026-09-28-sala-landing/CLINICAL-EXAMPLES.md

export const PE_DEMO_FORM: PeWebForm = {
  dataNascimento: '14/03/1995',
  dataExame: '28/09/2026',
  peso: '64',
  altura: '164',
  gaSemanas: '12',
  gaDias: '4',
  etnia: 'branca',
  paridade: 'nulipara',
  intervaloAnos: '',
  igPartoAnterior: '',
  zEscorePesoAnterior: '',
  histFamiliarPE: false,
  fiv: false,
  hipertensaoCronica: false,
  diabetes: false,
  lesSaf: false,
  fumante: false,
  afericoes: [
    { sistolica: '112', diastolica: '70' },
    { sistolica: '110', diastolica: '68' },
    { sistolica: '114', diastolica: '72' },
    { sistolica: '110', diastolica: '70' },
  ],
  utaPiMedio: '',
  utaPiFonte: 'bilateral',
  utaPiDireito: '1,52',
  utaPiEsquerdo: '1,78',
}

export const TRISOMY_DEMO_FORM: TrisomyWebForm = {
  dataNascimento: '02/07/1992',
  dataExame: '28/09/2026',
  crl: '62',
  nt: '1,7',
  fhr: '158',
  ethnicity: 'white',
  weight: '66',
  smoking: false,
  previousT21: false,
  previousT18: false,
  previousT13: false,
  freeBetaHcgMoM: '1,08',
  pappaMoM: '0,94',
  isMoMCorrected: true,
  dvPI: '',
  tricuspid: '',
  nasalBone: 'present',
}

// Linhas copiadas do bloco real, sem reescrita. O card mostra só um trecho para
// não sobrecarregar o mobile; `startsWith` falha alto se o formatador mudar.
function trecho(bloco: string, inicios: string[]): string[] {
  const linhas = bloco.split('\n')
  return inicios.map(inicio => {
    const linha = linhas.find(l => l.startsWith(inicio))
    if (!linha) throw new Error(`clinical-demo-fixtures: linha "${inicio}" não encontrada no bloco`)
    return linha
  })
}

const pe = calcularPreEclampsiaWeb(PE_DEMO_FORM)
const peMom = (nome: 'map' | 'utaPi') => pe.resultado.marcadores.find(m => m.nome === nome)?.mom.toFixed(2).replace('.', ',')

export const PE_DEMO = {
  caso: 'Caso sintético A · nulípara, sem fatores de risco',
  ig: `${Math.floor(pe.gestante.gaDias / 7)} semanas e ${pe.gestante.gaDias % 7} dias`,
  umEmN: `1 em ${pe.resultado.umEmN.toLocaleString('pt-BR')}`,
  momPam: peMom('map'),
  momUtaPi: peMom('utaPi'),
  versao: pe.resultado.versaoParametros,
  bloco: pe.resultado.insertBloco,
  trecho: trecho(pe.resultado.insertBloco, [
    'Risco de pré-eclâmpsia com parto antes de 37 semanas',
    'Baixo risco para pré-eclâmpsia pré-termo',
  ]),
}

const tri = calculateTrisomyWeb(TRISOMY_DEMO_FORM)

export const TRISOMY_DEMO = {
  caso: 'Caso sintético B · 11 a 13+6 semanas, CCN 62 mm',
  // Mesmos grupos do trecho do laudo e do app da FMF: T21 e T13/18 combinada.
  // Mostrar T18 e T13 separadas ao lado do "trissomias 13/18" do laudo parecia contradição.
  riscos: [
    { id: '21', rotulo: 'Trissomia 21', risco: formatarRiscoExibicao(tri.result.t21, tri.result) },
    { id: '13-18', rotulo: 'Trissomias 13/18', risco: formatarRiscoExibicao(tri.result.t18t13, tri.result) },
  ],
  versao: tri.result.modelVersion,
  bloco: tri.block,
  trecho: trecho(tri.block, ['Risco ajustado pelos marcadores', 'Baixo risco para trissomia 21']),
}
