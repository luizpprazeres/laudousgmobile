/**
 * CERVICOMETRIA isolada — adaptador da tela para o renderer canônico.
 *
 * O renderer (`apps/api/.../categories/CERVICOMETRIA.ts`) escreve "____ cm"
 * quando falta o comprimento, afirma o orifício interno fechado por padrão e
 * divide por 10, em silêncio, qualquer colo > 6 (backstop de mm do ditado).
 * Na tela, onde o médico digita, isso vira portão:
 *  - medida lida de forma ESTRITA: número + unidade opcional (cm | mm). Sem
 *    unidade vale cm; mm é convertido aqui, de forma explícita. Texto sobrando
 *    ou valor fora da faixa plausível bloqueia — nunca é "corrigido" sozinho;
 *  - comprimento do colo e estado do orifício interno são obrigatórios;
 *  - placenta medida E "distante" ao mesmo tempo bloqueia;
 *  - com IG ≥ 32 semanas o renderer conclui "Não há sinais de placenta
 *    prévia" para qualquer distância medida: abaixo de 2,0 cm do orifício
 *    interno isso seria falso, então bloqueia.
 */

type Secao = Record<string, unknown>
type Estado = Record<string, unknown>
type Pendencia = { onde: string; valor: string; motivo: string; bloqueia: boolean }

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

/** Faixas plausíveis (cm). Colo ≤ 6: acima disso o renderer reinterpretaria como mm. */
export const FAIXA_COLO_CM = { min: 0.1, max: 6 } as const
export const FAIXA_PLACENTA_CM = { min: 0, max: 20 } as const
export const FAIXA_IG_SEMANAS = { min: 10, max: 42 } as const
/** Abaixo desta distância ao OI a placenta é baixa: o "sem sinais de prévia" do renderer não vale. */
export const PLACENTA_BAIXA_CM = 2

type Leitura = { valor: number | null; erro: string | null }

const fmt = (n: number) => String(n).replace('.', ',')

/** Medida linear estrita em cm: "3,4", "3.4 cm", "34 mm". */
export function lerCm(bruto: string, faixa: { min: number; max: number }): Leitura {
  if (!bruto) return { valor: null, erro: null }
  const m = bruto.toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(cm|mm)?$/)
  if (!m) return { valor: null, erro: 'medida ilegível: use um número em cm (ex.: 3,4) ou com a unidade (ex.: 34 mm)' }
  const n = Number(m[1])
  const valor = m[2] === 'mm' ? n / 10 : n
  if (valor < faixa.min || valor > faixa.max) {
    const pareceMm = !m[2] && n / 10 >= faixa.min && n / 10 <= faixa.max
    return {
      valor: null,
      erro: pareceMm
        ? `${bruto} cm está fora da faixa plausível — se a medida foi em milímetros, digite "${bruto} mm"`
        : `valor fora da faixa plausível (${fmt(faixa.min)}–${fmt(faixa.max)} cm)`,
    }
  }
  return { valor: Math.round(valor * 100) / 100, erro: null }
}

function lerSemanas(bruto: string): Leitura {
  if (!bruto) return { valor: null, erro: null }
  const m = bruto.toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(semanas?|sem|s)?$/)
  if (!m) return { valor: null, erro: 'idade gestacional ilegível: use semanas (ex.: 33)' }
  const n = Number(m[1])
  if (n < FAIXA_IG_SEMANAS.min || n > FAIXA_IG_SEMANAS.max) {
    return { valor: null, erro: `idade gestacional fora da faixa plausível (${FAIXA_IG_SEMANAS.min}–${FAIXA_IG_SEMANAS.max} semanas)` }
  }
  return { valor: n, erro: null }
}

export function adaptarCervicometria(estado: Estado) {
  const c = secao(estado, 'cervicometria')
  const pendencias: Pendencia[] = []
  const falta = (onde: string, valor: string, motivo: string) => pendencias.push({ onde, valor, motivo, bloqueia: true })

  const coloBruto = texto(c, 'colo_cm')
  const colo = lerCm(coloBruto, FAIXA_COLO_CM)
  if (!coloBruto) falta('colo uterino', '', 'informe o comprimento do colo (orifício interno → externo)')
  else if (colo.erro) falta('colo uterino', coloBruto, colo.erro)

  const orificio = texto(c, 'orificio')
  if (orificio !== 'fechado' && orificio !== 'aberto') falta('orifício interno', orificio, 'informe se o orifício interno está fechado ou aberto')

  const placentaBruto = texto(c, 'placenta_cm')
  const placenta = lerCm(placentaBruto, FAIXA_PLACENTA_CM)
  if (placenta.erro) falta('placenta', placentaBruto, placenta.erro)
  const distante = texto(c, 'placenta_distante') === 'sim'
  if (distante && placentaBruto) falta('placenta', placentaBruto, 'escolha a distância medida OU "placenta distante, sem medida", não as duas')

  const igBruto = texto(c, 'ig_semanas')
  const ig = lerSemanas(igBruto)
  if (ig.erro) falta('idade gestacional', igBruto, ig.erro)

  if (ig.valor !== null && ig.valor >= 32 && placenta.valor !== null && placenta.valor < PLACENTA_BAIXA_CM) {
    falta(
      'placenta',
      placentaBruto,
      'placenta a menos de 2,0 cm do orifício interno com IG ≥ 32 semanas: o laudo concluiria "não há sinais de placenta prévia" — revise a medida ou registre o achado no editor',
    )
  }

  return {
    dados: {
      colo_oi_oe_cm: colo.valor,
      orificio_interno_fechado: orificio !== 'aberto',
      placenta_distancia_cm: placenta.valor,
      placenta_distante: distante && placenta.valor === null,
      ig_semanas: ig.valor,
      cerclagem: texto(c, 'cerclagem') === 'sim',
      observacoes: texto(c, 'observacoes') || null,
    },
    alteracoes: [],
    pendencias,
  }
}
