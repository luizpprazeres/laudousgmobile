import type { NoduloTireoide } from '../deterministic/organs/tireoide'
import {
  calcularTiRads,
  type TiRadsFocos,
  type TiRadsInput,
  type TiRadsResult,
} from './tiRads'

const ECO: Record<NonNullable<NoduloTireoide['acrEcogenicidade']>, NonNullable<TiRadsInput['ecogenicidade']>> = {
  anecoico: 'anecoico',
  hiper_ou_isoecoico: 'hiperecoico_isoecoico',
  hipoecoico: 'hipoecóico',
  muito_hipoecoico: 'muito_hipoecóico',
}

const FORMA: Record<NonNullable<NoduloTireoide['acrForma']>, NonNullable<TiRadsInput['forma']>> = {
  mais_larga_que_alta: 'mais_largo_que_alto',
  mais_alta_que_larga: 'mais_alto_que_largo',
}

const MARGEM: Record<NonNullable<NoduloTireoide['acrMargem']>, NonNullable<TiRadsInput['margens']>> = {
  lisa: 'lisas_mal_definidas',
  mal_definida: 'lisas_mal_definidas',
  lobulada_ou_irregular: 'lobuladas_irregulares',
  extensao_extratireoidiana: 'extensao_extratireoidiana',
}

const FOCOS: Record<NonNullable<NoduloTireoide['acrFocos']>[number], TiRadsFocos> = {
  nenhum_ou_cauda_cometa: 'nenhum_cauda_cometa',
  macrocalcificacoes: 'macrocalcificacoes',
  calcificacoes_perifericas: 'calcificacoes_perifericas',
  focos_puntiformes: 'focos_ecogenicos_puntiformes',
}

function maiorDiametroMm(nodulo: NoduloTireoide): number | undefined {
  const medidas = [nodulo.c1, nodulo.c2, nodulo.c3]
    .map((valor) => Number.parseFloat(valor.trim().replace(',', '.')))
    .filter((valor) => Number.isFinite(valor) && valor > 0)
  return medidas.length ? Math.max(...medidas) * 10 : undefined
}

export function acrTiradsCompleto(nodulo: NoduloTireoide): boolean {
  if (nodulo.acrComposicao === 'cistico' || nodulo.acrComposicao === 'espongiforme') return true
  if (nodulo.acrEcogenicidade === 'anecoico') return false
  return Boolean(
    nodulo.acrComposicao
    && nodulo.acrEcogenicidade
    && nodulo.acrForma
    && nodulo.acrMargem
    && nodulo.acrFocos?.length,
  )
}

/** Prévia visual; o renderer canônico continua sendo a autoridade do laudo. */
export function previewAcrDoNodulo(nodulo: NoduloTireoide): TiRadsResult | null {
  if (!acrTiradsCompleto(nodulo)) return null
  return calcularTiRads({
    composicao: nodulo.acrComposicao!,
    ecogenicidade: ECO[nodulo.acrEcogenicidade!],
    forma: FORMA[nodulo.acrForma!],
    margens: MARGEM[nodulo.acrMargem!],
    focosEcogenicos: nodulo.acrFocos!.map((foco) => FOCOS[foco]),
    tamanhoMm: maiorDiametroMm(nodulo),
  })
}
