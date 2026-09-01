type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

function medidas(bruto: string): number[] | null {
  if (!bruto) return null
  const emMm = bruto.toLowerCase().includes('mm')
  const valores = bruto
    .replaceAll(',', '.')
    .split(/[x×]/i)
    .map((parte) => Number.parseFloat(parte))
    .filter((valor) => Number.isFinite(valor) && valor > 0)
    .map((valor) => emMm ? valor / 10 : valor)
  return valores.length > 0 ? valores : null
}

export function adaptarCervical(estado: Estado) {
  const c = secao(estado, 'cervical')
  const alterado = texto(c, 'linfonodo') === 'alterado'
  const nivel = texto(c, 'linfonodo.alterado.nivel') || 'III'
  const suspeicoes = Array.isArray(c['linfonodo.alterado.suspeito'])
    ? c['linfonodo.alterado.suspeito'] as unknown[]
    : []

  return {
    dados: {
      /** A tela descreve vascularização em todo linfonodo alterado. */
      com_doppler: alterado,
      niveis_normais: [],
      linfonodos_alterados: alterado ? [{
        nivel,
        medidas_cm: medidas(texto(c, 'linfonodo.alterado.medidas')),
        forma: texto(c, 'linfonodo.alterado.forma') || null,
        hilo: texto(c, 'linfonodo.alterado.hilo') || null,
        vascularizacao: texto(c, 'linfonodo.alterado.vasc') || null,
        suspeito: suspeicoes.includes('sim'),
        descricao_raw: null,
      }] : [],
      submandibulares: [],
      parotidas: [],
      tireoide_descrita: false,
      tireoide_alterada: false,
      tireoide_descricao: null,
      achados_adicionais: null,
    },
    alteracoes: [],
    pendencias: [],
  }
}
