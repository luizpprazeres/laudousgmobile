import {
  bladderStateConflicts,
  bladderInputIssues,
  kidneyInputIssues,
  normalizeBladderState,
  normalizeKidneyState,
} from '../deterministic/organs/urinaryShared'

type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

export type Pendencia = {
  onde: string
  valor: string
  motivo: string
  bloqueia?: boolean
}

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (state: Secao, key: string): string =>
  typeof state[key] === 'string' ? (state[key] as string).trim() : ''

const BASIC_CONTENT: Record<string, string> = {
  debris: 'com debris de permeio',
  calculo: 'com imagem hiperecogênica com sombra acústica (cálculo)',
  sonda: 'com balão de sonda vesical em seu interior',
  diverticulo: 'com imagem sacular comunicante com a luz vesical (divertículo)',
}

export function adaptarViasUrinarias(estado: Estado) {
  const pendencias: Pendencia[] = []
  const ureteres = secao(estado, 'ureteres')
  const bladder = normalizeBladderState(secao(estado, 'bexiga'))
  const kidneys = {
    direito: normalizeKidneyState(secao(estado, 'rim_direito')),
    esquerdo: normalizeKidneyState(secao(estado, 'rim_esquerdo')),
  }
  const dilatacaoUreteral = texto(ureteres, 'dilatacao') === 'sim'

  for (const motivo of [...bladderStateConflicts(bladder), ...bladderInputIssues(secao(estado, 'bexiga'))]) {
    pendencias.push({ onde: 'bexiga', valor: bladder.replecao, motivo, bloqueia: true })
  }
  for (const lado of ['direito', 'esquerdo'] as const) {
    for (const motivo of kidneyInputIssues(secao(estado, `rim_${lado}`))) {
      pendencias.push({ onde: `rim ${lado}`, valor: 'medida inválida', motivo, bloqueia: true })
    }
  }

  const wall = bladder.parede === 'espessada'
    ? 'de paredes espessadas'
    : bladder.parede === 'trabeculada'
      ? 'de paredes trabeculadas'
      : null
  const content = bladder.achados
    .map((finding) => BASIC_CONTENT[finding.tipo])
    .filter((value): value is string => Boolean(value))

  return {
    dados: {
      rim_direito: kidneys.direito,
      rim_esquerdo: kidneys.esquerdo,
      rins_detalhados: kidneys,
      bexiga: {
        avaliada: bladder.replecao !== 'insuficiente' && bladder.replecao !== 'vazia',
        parede_alterada: wall,
        conteudo_alterado: content.length > 0 ? content.join(', ') : null,
        espessura_parede_mm: bladder.espessura_parede_mm,
        volume_pre_miccional_ml: bladder.volume_pre_miccional_ml,
        residuo_pos_miccional_ml: bladder.residuo_pos_miccional_ml,
      },
      bexiga_detalhada: bladder,
      dilatacao_ureteral: dilatacaoUreteral,
      dilatacao_ureteral_descricao: dilatacaoUreteral ? texto(ureteres, 'dilatacao.sim.desc') || null : null,
      achados_adicionais: null,
    },
    alteracoes: [],
    pendencias,
  }
}
