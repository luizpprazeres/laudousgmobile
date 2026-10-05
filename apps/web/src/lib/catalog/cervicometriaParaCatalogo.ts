/**
 * CERVICOMETRIA isolada — adaptador da tela para o renderer canônico.
 *
 * A leitura estrita (cm/mm, faixas) e os portões ficam em
 * `cervicometriaLeitura.ts`, compartilhados com o complemento dentro de
 * OBSTETRICA, MORFOLOGICO e DOPPLER_OBSTETRICO. Aqui só entra o que é da
 * categoria isolada: a idade gestacional digitada na própria tela.
 */

import { lerCervicometria, lerSemanas, pendenciaPlacentaBaixa } from './cervicometriaLeitura'

export { FAIXA_COLO_CM, FAIXA_IG_SEMANAS, FAIXA_PLACENTA_CM, PLACENTA_BAIXA_CM, lerCm } from './cervicometriaLeitura'

type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

export function adaptarCervicometria(estado: Estado) {
  const c = secao(estado, 'cervicometria')
  const leitura = lerCervicometria({
    colo: texto(c, 'colo_cm'),
    orificio: texto(c, 'orificio'),
    placenta: texto(c, 'placenta_cm'),
    placentaDistante: texto(c, 'placenta_distante'),
    cerclagem: texto(c, 'cerclagem'),
    observacoes: texto(c, 'observacoes'),
  })

  const igBruto = texto(c, 'ig_semanas')
  const ig = lerSemanas(igBruto)
  if (ig.erro) leitura.falta('idade gestacional', igBruto, ig.erro)
  pendenciaPlacentaBaixa(leitura.placentaCm, ig.valor, leitura.falta, leitura.placentaBruta)

  return {
    dados: { ...leitura.dados, ig_semanas: ig.valor },
    alteracoes: [],
    pendencias: leitura.pendencias,
  }
}
