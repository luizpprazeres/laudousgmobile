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
  /** compatibilidade com telas antigas: idade materna em anos, direto. Preferir `dataNascimento`. */
  idade?: string
  /** dd/mm/aaaa — usada para calcular a idade decimal na DPP, como o app oficial da FMF */
  dataNascimento?: string
  /** dd/mm/aaaa — data do exame; vazia usa a data de hoje */
  dataExame?: string
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
  /** diabetes TIPO 1 (requer `diabetes: true`) — distingue de tipo 2, que só marca `diabetes` */
  diabetesTipo1?: boolean
  lesSaf: boolean
  fumante: boolean
  afericoes: PeAfericaoForm[]
  utaPiMedio: string
  utaPiFonte?: 'manual' | 'bilateral'
  utaPiDireito?: string
  utaPiEsquerdo?: string
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

const DIA_MS = 86_400_000
const DATA_BR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/**
 * "DD/MM/AAAA" → data em UTC (meia-noite), como as outras datas da web
 * (`apps/web/src/lib/deterministic/organs/obstetrica.ts`). Parse ESTRITO:
 * rejeita data inexistente (31/02). Sempre em UTC para a aritmética de dias
 * não depender do fuso horário de quem roda o cálculo.
 *
 * Exportado para reuso por outras calculadoras web (ex.: `trisomyFmf.ts`)
 * que também precisam de idade decimal a partir de uma data dd/mm/aaaa.
 */
export function parseDataBr(valor: string, campo: string): Date {
  const m = valor.trim().match(DATA_BR)
  if (!m) throw new Error(`${campo}: use o formato dd/mm/aaaa`)
  const dia = Number(m[1])
  const mes = Number(m[2])
  const ano = Number(m[3])
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new Error(`${campo}: data inexistente`)
  }
  return data
}

/** Data de hoje (calendário local de quem preenche o formulário) como meia-noite UTC. */
export function hojeComoDataUtc(): Date {
  const agora = new Date()
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()))
}

/** DPP = data do exame + (280 − IG atual em dias). */
function calcularDpp(dataExame: Date, gaDiasAtual: number): Date {
  return new Date(dataExame.getTime() + (280 - gaDiasAtual) * DIA_MS)
}

/**
 * Idade decimal entre duas datas: (fim − início) / 365,25 — mesma convenção
 * usada pelo app da FMF. Exportada para reuso (ex.: idade na data do exame
 * da calculadora de trissomias, em vez da idade na DPP usada aqui).
 */
export function idadeDecimalEntreDatas(inicio: Date, fim: Date): number {
  return (fim.getTime() - inicio.getTime()) / DIA_MS / 365.25
}

/** Idade decimal na DPP: (DPP − nascimento) / 365,25 — o app da FMF usa exatamente isso. */
function idadeDecimalNaDpp(nascimento: Date, dpp: Date): number {
  return idadeDecimalEntreDatas(nascimento, dpp)
}

/**
 * Idade materna para o motor. Preferimos a data de nascimento (idade decimal
 * na DPP, igual ao app oficial da FMF); se o formulário só trouxer `idade`
 * numérica — telas antigas —, usamos o valor direto por compatibilidade.
 */
function idadeMaternaParaMotor(form: PeWebForm, gaDiasAtual: number): number {
  const nascimentoStr = form.dataNascimento?.trim()
  if (nascimentoStr) {
    const nascimento = parseDataBr(nascimentoStr, 'data de nascimento')
    const exameStr = form.dataExame?.trim()
    const dataExame = exameStr ? parseDataBr(exameStr, 'data do exame') : hojeComoDataUtc()
    return idadeDecimalNaDpp(nascimento, calcularDpp(dataExame, gaDiasAtual))
  }
  const idadeStr = form.idade?.trim()
  if (idadeStr) return numeroObrigatorio(idadeStr, 'idade materna')
  throw new Error('informe a data de nascimento materna')
}

/**
 * Prévia não destrutiva da idade na DPP, para o médico conferir na tela antes
 * de calcular o risco. `null` quando os dados ainda não permitem calcular
 * (não lança erro — é só uma prévia).
 */
export function idadeNaDppPreview(form: PeWebForm): number | null {
  if (!form.dataNascimento?.trim()) return null
  const semanas = Number(form.gaSemanas?.trim().replace(',', '.'))
  const dias = Number(form.gaDias?.trim().replace(',', '.'))
  if (!Number.isInteger(semanas) || !Number.isInteger(dias) || dias < 0 || dias > 6) return null
  try {
    return idadeMaternaParaMotor(form, semanas * 7 + dias)
  } catch {
    return null
  }
}

export function ipUterinoMedio(form: PeWebForm): number | null {
  if (form.utaPiFonte !== 'bilateral') {
    return numeroOpcional(form.utaPiMedio, 'IP médio das artérias uterinas')
  }
  const direito = numeroOpcional(form.utaPiDireito ?? '', 'IP uterino direito')
  const esquerdo = numeroOpcional(form.utaPiEsquerdo ?? '', 'IP uterino esquerdo')
  if (direito === null && esquerdo === null) return null
  if (direito === null || esquerdo === null) throw new Error('Informe os IPs uterinos direito e esquerdo')
  if (direito <= 0 || esquerdo <= 0) throw new Error('Os IPs uterinos devem ser positivos')
  return (direito + esquerdo) / 2
}

export function trocarFonteIp(form: PeWebForm, fonte: 'manual' | 'bilateral'): PeWebForm {
  return { ...form, utaPiFonte: fonte, utaPiMedio: '', utaPiDireito: '', utaPiEsquerdo: '' }
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

  const gaDiasAtual = semanas * 7 + dias

  const gestante: PeGestante = {
    idade: idadeMaternaParaMotor(form, gaDiasAtual),
    peso: numeroObrigatorio(form.peso, 'peso'),
    altura: numeroObrigatorio(form.altura, 'altura'),
    gaDias: gaDiasAtual,
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
    diabetesTipo1: form.diabetes ? Boolean(form.diabetesTipo1) : false,
    lesSaf: form.lesSaf,
    fumante: form.fumante,
  }

  const pam = montarPam(form.afericoes)
  const medidas: PeMedidas = {
    pamMmHg: pam?.pamMmHg ?? null,
    afericoesPam: pam?.afericoes ?? null,
    utaPiMedio: ipUterinoMedio(form),
  }

  return {
    gestante,
    medidas,
    resultado: calcularPreEclampsiaFmf(gestante, medidas),
  }
}
