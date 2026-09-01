type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

function numero(s: Secao, chave: string, converteMm = false): number | null {
  const bruto = texto(s, chave).toLowerCase().replace(',', '.')
  if (!bruto) return null
  const valor = Number.parseFloat(bruto)
  if (!Number.isFinite(valor) || valor < 0) return null
  return converteMm && bruto.includes('mm') ? valor / 10 : valor
}

const BEXIGA: Record<string, string> = {
  espessamento: 'espessamento parietal',
  trabeculacao: 'trabeculação parietal',
  calculo: 'imagem hiperecogênica com sombra acústica de permeio (cálculo)',
  diverticulo: 'imagem sacular comunicante (divertículo)',
}

export function adaptarProstataSuprapubica(estado: Estado) {
  const bexiga = secao(estado, 'bexiga')
  const prostata = secao(estado, 'prostata')
  const alteracoesBexiga = Array.isArray(bexiga.achados)
    ? (bexiga.achados as unknown[])
        .filter((valor): valor is string => typeof valor === 'string')
        .map((valor) => BEXIGA[valor])
        .filter((valor): valor is string => Boolean(valor))
    : []
  const extrasProstata = Array.isArray(prostata.extra)
    ? (prostata.extra as unknown[]).filter((valor): valor is string => typeof valor === 'string')
    : []
  const residuo = texto(bexiga, 'residuo')
  const aumentada = texto(prostata, 'volume') === 'aumentada'

  return {
    dados: {
      prostata_d1_cm: numero(prostata, 'd1', true),
      prostata_d2_cm: numero(prostata, 'd2', true),
      prostata_d3_cm: numero(prostata, 'd3', true),
      hiperplasia: aumentada,
      calcificacoes: extrasProstata.includes('calcificacoes'),
      ipp_cm: aumentada ? numero(prostata, 'volume.aumentada.ipp', true) : null,
      bexiga_achado: alteracoesBexiga.length > 0 ? alteracoesBexiga.join(', ') : null,
      volume_pre_miccional_ml: numero(bexiga, 'volume_pre'),
      residuo_pos_miccional_ml: residuo === 'valor' ? numero(bexiga, 'residuo.valor.ml') : null,
      residuo_desprezivel: residuo === 'desprezivel',
      achados_adicionais: null,
    },
    alteracoes: [],
    pendencias: [],
  }
}
