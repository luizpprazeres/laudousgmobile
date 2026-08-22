import {
  calcularPreEclampsiaFmf,
  pamDeAfericoes,
  type PeAfericao,
  type PeEtnia,
  type PeGestante,
  type PeMedidas,
  type PeParidade,
  type PeResultado,
} from '@laudousg/shared'

export type PeAfericaoForm = {
  sistolica: string
  diastolica: string
}

export type PeWebForm = {
  idade: string
  peso: string
  altura: string
  gaSemanas: string
  gaDias: string
  etnia: PeEtnia | ''
  paridade: PeParidade | ''
  intervaloAnos: string
  igPartoAnterior: string
  zEscorePesoAnterior: string
  histFamiliarPE: boolean
  fiv: boolean
  hipertensaoCronica: boolean
  diabetes: boolean
  lesSaf: boolean
  fumante: boolean
  afericoes: PeAfericaoForm[]
  utaPiMedio: string
}

export type PeWebCalculo = {
  gestante: PeGestante
  medidas: PeMedidas
  resultado: PeResultado
}

const NUMERO = /^-?\d+(?:[.,]\d+)?$/

function numeroObrigatorio(valor: string, campo: string): number {
  const normalizado = valor.trim()
  if (!NUMERO.test(normalizado)) throw new Error(`${campo}: valor ausente ou inválido`)
  return Number(normalizado.replace(',', '.'))
}

function numeroOpcional(valor: string, campo: string): number | null {
  if (!valor.trim()) return null
  return numeroObrigatorio(valor, campo)
}

function montarPam(afericoesForm: PeAfericaoForm[]) {
  const preenchidas = afericoesForm
    .map((afericao, index) => ({ afericao, index }))
    .filter(({ afericao }) => afericao.sistolica.trim() || afericao.diastolica.trim())

  if (preenchidas.length === 0) return null

  const afericoes: PeAfericao[] = preenchidas.map(({ afericao, index }) => {
    if (!afericao.sistolica.trim() || !afericao.diastolica.trim()) {
      throw new Error(`aferição ${index + 1}: informe as pressões sistólica e diastólica`)
    }
    const valor = {
      sistolica: numeroObrigatorio(afericao.sistolica, `aferição ${index + 1} — sistólica`),
      diastolica: numeroObrigatorio(afericao.diastolica, `aferição ${index + 1} — diastólica`),
    }
    try {
      pamDeAfericoes([valor])
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'pressão inválida'
      throw new Error(`aferição ${index + 1}: ${mensagem}`)
    }
    return valor
  })

  return pamDeAfericoes(afericoes)
}

/**
 * Adapta o formulário web ao contrato público do núcleo FMF.
 * A web só converte unidades de apresentação e organiza os campos; PAM, MoM e
 * risco são calculados exclusivamente por @laudousg/shared.
 */
export function calcularPreEclampsiaWeb(form: PeWebForm): PeWebCalculo {
  const semanas = numeroObrigatorio(form.gaSemanas, 'idade gestacional — semanas')
  const dias = numeroObrigatorio(form.gaDias, 'idade gestacional — dias')
  if (!Number.isInteger(semanas)) throw new Error('idade gestacional — semanas: use um número inteiro')
  if (!Number.isInteger(dias) || dias < 0 || dias > 6) {
    throw new Error('idade gestacional — dias: informe um valor entre 0 e 6')
  }
  if (!form.etnia) throw new Error('selecione a etnia materna')
  if (!form.paridade) throw new Error('selecione a paridade')

  const multipara = form.paridade !== 'nulipara'
  const intervaloAnos = multipara
    ? numeroOpcional(form.intervaloAnos, 'intervalo entre gestações')
    : null
  if (multipara && !(typeof intervaloAnos === 'number' && intervaloAnos > 0)) {
    throw new Error('multípara exige o intervalo entre gestações em anos (> 0)')
  }

  const gestante: PeGestante = {
    idade: numeroObrigatorio(form.idade, 'idade materna'),
    peso: numeroObrigatorio(form.peso, 'peso'),
    altura: numeroObrigatorio(form.altura, 'altura'),
    gaDias: semanas * 7 + dias,
    etnia: form.etnia,
    paridade: form.paridade,
    intervaloAnos,
    igPartoAnterior: multipara
      ? numeroOpcional(form.igPartoAnterior, 'IG do parto anterior')
      : null,
    zEscorePesoAnterior: form.paridade === 'multipara-com-pe'
      ? numeroOpcional(form.zEscorePesoAnterior, 'Z-score do peso ao nascer anterior')
      : null,
    histFamiliarPE: form.histFamiliarPE,
    fiv: form.fiv,
    hipertensaoCronica: form.hipertensaoCronica,
    diabetes: form.diabetes,
    lesSaf: form.lesSaf,
    fumante: form.fumante,
  }

  const pam = montarPam(form.afericoes)
  const medidas: PeMedidas = {
    pamMmHg: pam?.pamMmHg ?? null,
    afericoesPam: pam?.afericoes ?? null,
    utaPiMedio: numeroOpcional(form.utaPiMedio, 'IP médio das artérias uterinas'),
  }

  return {
    gestante,
    medidas,
    resultado: calcularPreEclampsiaFmf(gestante, medidas),
  }
}
