type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

function numeroEmCm(bruto: string): number | null {
  if (!bruto) return null
  const normalizado = bruto.toLowerCase().replace(',', '.')
  const valor = Number.parseFloat(normalizado)
  if (!Number.isFinite(valor) || valor < 0) return null
  return normalizado.includes('mm') ? valor / 10 : valor
}

function numero(bruto: string): number | null {
  if (!bruto) return null
  const valor = Number.parseFloat(bruto.replace(',', '.'))
  return Number.isFinite(valor) && valor >= 0 ? valor : null
}

export function adaptarCervicometria(estado: Estado) {
  const c = secao(estado, 'cervicometria')
  const placenta = numeroEmCm(texto(c, 'placenta_cm'))

  return {
    dados: {
      colo_oi_oe_cm: numeroEmCm(texto(c, 'colo_cm')),
      orificio_interno_fechado: texto(c, 'orificio') !== 'aberto',
      placenta_distancia_cm: placenta,
      placenta_distante: texto(c, 'placenta_distante') === 'sim' && placenta === null,
      ig_semanas: numero(texto(c, 'ig_semanas')),
      cerclagem: texto(c, 'cerclagem') === 'sim',
      observacoes: texto(c, 'observacoes') || null,
    },
    alteracoes: [],
    pendencias: [],
  }
}
