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

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

const lista = (s: Secao, chave: string): string[] =>
  Array.isArray(s[chave]) ? (s[chave] as unknown[]).filter((v): v is string => typeof v === 'string') : []

function numeros(bruto: string, unidadePadrao: 'cm' | 'mm'): number[] | null {
  if (!bruto) return null
  const normalizado = bruto.toLowerCase().replaceAll(',', '.')
  const valores = normalizado
    .split(/[x×]/i)
    .map((parte) => Number.parseFloat(parte))
    .filter((valor) => Number.isFinite(valor) && valor > 0)
  if (valores.length === 0) return null

  const unidadeInformada = normalizado.includes('mm') ? 'mm' : normalizado.includes('cm') ? 'cm' : unidadePadrao
  if (unidadeInformada === unidadePadrao) return valores
  return unidadePadrao === 'cm' ? valores.map((valor) => valor / 10) : valores.map((valor) => valor * 10)
}

const numero = (s: Secao, chave: string, unidadePadrao: 'cm' | 'mm' = 'cm') =>
  numeros(texto(s, chave), unidadePadrao)?.[0] ?? null

const PAREDE: Record<string, string> = {
  espessada: 'paredes espessadas',
  trabeculada: 'paredes trabeculadas',
}

const CONTEUDO: Record<string, string> = {
  debris: 'debris de permeio',
  calculo: 'imagem hiperecogênica com sombra acústica (cálculo)',
  sonda: 'balão de sonda vesical em seu interior',
}

function fraseComPrefixo(valores: string[], mapa: Record<string, string>, prefixo: string): string | null {
  const termos = valores.map((valor) => mapa[valor]).filter((valor): valor is string => Boolean(valor))
  if (termos.length === 0) return null
  return `${prefixo} ${termos.join(' e ')}`
}

function achadosDoRim(s: Secao, pendencias: Pendencia[], lado: string) {
  const tipos = lista(s, 'achados')
  const suportados = new Set(['litiase', 'cisto_simples', 'cisto_complexo', 'nodulo', 'ectasia'])

  return tipos.flatMap((tipo) => {
    if (!suportados.has(tipo)) {
      pendencias.push({
        onde: `rim ${lado}`,
        valor: tipo,
        motivo: 'este achado renal ainda não existe no renderer canônico',
        bloqueia: true,
      })
      return []
    }

    const prefixo = `achados.${tipo}`
    const medidas = tipo === 'litiase'
      ? numeros(texto(s, `${prefixo}.medida`), 'cm')
      : numeros(texto(s, `${prefixo}.medidas`), 'cm')
    const localizacao = texto(s, `${prefixo}.local`) || null
    const caracteristica = tipo === 'cisto_complexo' ? texto(s, `${prefixo}.carac`) || null : null

    return [{
      tipo,
      medidas_cm: medidas,
      localizacao,
      caracteristica,
      descricao_raw: [tipo.replaceAll('_', ' '), localizacao].filter(Boolean).join(' — ') || null,
    }]
  })
}

function rim(s: Secao, pendencias: Pendencia[], lado: string) {
  const estrutura = lista(s, 'estrutura')
  const dimensao = texto(s, 'dimensao')
  const hidronefrose = texto(s, 'hidronefrose')

  return {
    medidas_cm: numeros(texto(s, 'medidas'), 'cm'),
    espessura_parenquima_cm: numero(s, 'espessura', 'cm'),
    dimensao: dimensao || 'normal',
    situacao_baixa: estrutura.includes('situacao_baixa'),
    rotacao: estrutura.includes('rotacao'),
    drc: estrutura.includes('drc'),
    alteracao_difusa: texto(s, 'alteracao_difusa') || null,
    hidronefrose: hidronefrose || 'ausente',
    achados: achadosDoRim(s, pendencias, lado),
  }
}

export function adaptarViasUrinarias(estado: Estado) {
  const pendencias: Pendencia[] = []
  const ureteres = secao(estado, 'ureteres')
  const bexiga = secao(estado, 'bexiga')
  const dilatacaoUreteral = texto(ureteres, 'dilatacao') === 'sim'

  return {
    dados: {
      rim_direito: rim(secao(estado, 'rim_direito'), pendencias, 'direito'),
      rim_esquerdo: rim(secao(estado, 'rim_esquerdo'), pendencias, 'esquerdo'),
      bexiga: {
        avaliada: texto(bexiga, 'avaliada') !== 'nao',
        parede_alterada: fraseComPrefixo(lista(bexiga, 'parede'), PAREDE, 'de'),
        conteudo_alterado: fraseComPrefixo(lista(bexiga, 'conteudo'), CONTEUDO, 'com'),
        espessura_parede_mm: numero(bexiga, 'espessura_parede', 'mm'),
        volume_pre_miccional_ml: numero(bexiga, 'volume_pre'),
        residuo_pos_miccional_ml: numero(bexiga, 'residuo'),
      },
      dilatacao_ureteral: dilatacaoUreteral,
      dilatacao_ureteral_descricao: dilatacaoUreteral ? texto(ureteres, 'dilatacao.sim.desc') || null : null,
      achados_adicionais: null,
    },
    alteracoes: [],
    pendencias,
  }
}
