/**
 * Leitura estrita e portões da cervicometria — UMA regra para a categoria
 * isolada (CERVICOMETRIA) e para o complemento dentro de OBSTETRICA,
 * MORFOLOGICO e DOPPLER_OBSTETRICO.
 *
 * A redação é do renderer canônico (`renderCervicometriaBloco`); aqui só se
 * decide o que pode chegar até ele:
 *  - medida = número + unidade opcional (cm | mm). Sem unidade vale cm; mm é
 *    convertido aqui, de forma explícita. Texto sobrando ou valor fora da
 *    faixa plausível bloqueia — nunca é "corrigido" sozinho (o renderer divide
 *    por 10, em silêncio, colo > 6 e placenta > 30);
 *  - comprimento do colo e estado do orifício interno são obrigatórios;
 *  - placenta medida E "distante" ao mesmo tempo bloqueia;
 *  - com IG ≥ 32 semanas o renderer conclui "Não há sinais de placenta prévia"
 *    para qualquer distância medida: abaixo de 2,0 cm isso seria falso.
 */

export type PendenciaCervicometria = { onde: string; valor: string; motivo: string; bloqueia: boolean }

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

export function lerSemanas(bruto: string): Leitura {
  if (!bruto) return { valor: null, erro: null }
  const m = bruto.toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(semanas?|sem|s)?$/)
  if (!m) return { valor: null, erro: 'idade gestacional ilegível: use semanas (ex.: 33)' }
  const n = Number(m[1])
  if (n < FAIXA_IG_SEMANAS.min || n > FAIXA_IG_SEMANAS.max) {
    return { valor: null, erro: `idade gestacional fora da faixa plausível (${FAIXA_IG_SEMANAS.min}–${FAIXA_IG_SEMANAS.max} semanas)` }
  }
  return { valor: n, erro: null }
}

/** Os campos da cervicometria já lidos como texto (isolada ou complemento). */
export type CamposCervicometria = {
  colo: string
  orificio: string
  placenta: string
  placentaDistante: string
  cerclagem: string
  observacoes: string
}

/** Dados no formato do renderer (`CervicometriaAddonSchema`) + pendências. */
export function lerCervicometria(campos: CamposCervicometria, rotulo = '') {
  const pendencias: PendenciaCervicometria[] = []
  const falta = (onde: string, valor: string, motivo: string) =>
    pendencias.push({ onde: rotulo ? `${rotulo} — ${onde}` : onde, valor, motivo, bloqueia: true })

  const colo = lerCm(campos.colo, FAIXA_COLO_CM)
  if (!campos.colo) falta('colo uterino', '', 'informe o comprimento do colo (orifício interno → externo)')
  else if (colo.erro) falta('colo uterino', campos.colo, colo.erro)

  if (campos.orificio !== 'fechado' && campos.orificio !== 'aberto') {
    falta('orifício interno', campos.orificio, 'informe se o orifício interno está fechado ou aberto')
  }

  const placenta = lerCm(campos.placenta, FAIXA_PLACENTA_CM)
  if (placenta.erro) falta('placenta', campos.placenta, placenta.erro)
  const distante = campos.placentaDistante === 'sim'
  if (distante && campos.placenta) falta('placenta', campos.placenta, 'escolha a distância medida OU "placenta distante, sem medida", não as duas')

  return {
    dados: {
      colo_oi_oe_cm: colo.valor,
      orificio_interno_fechado: campos.orificio !== 'aberto',
      placenta_distancia_cm: placenta.valor,
      placenta_distante: distante && placenta.valor === null,
      cerclagem: campos.cerclagem === 'sim',
      observacoes: campos.observacoes || null,
    },
    pendencias,
    /** Para o portão da placenta baixa (precisa da IG que o renderer receberá). */
    placentaCm: placenta.valor,
    placentaBruta: campos.placenta,
    falta,
  }
}

/** Placenta < 2,0 cm com IG ≥ 32: o renderer afirmaria "sem sinais de placenta prévia". */
export function pendenciaPlacentaBaixa(
  placentaCm: number | null,
  igSemanas: number | null,
  falta: (onde: string, valor: string, motivo: string) => void,
  placentaBruta: string,
) {
  if (igSemanas !== null && igSemanas >= 32 && placentaCm !== null && placentaCm < PLACENTA_BAIXA_CM) {
    falta(
      'placenta',
      placentaBruta,
      'placenta a menos de 2,0 cm do orifício interno com IG ≥ 32 semanas: o laudo concluiria "não há sinais de placenta prévia" — revise a medida ou registre o achado no editor',
    )
  }
}

type Secao = Record<string, unknown>
const texto = (s: Secao, chave: string): string => typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

/**
 * Complemento dentro de OBSTETRICA/MORFOLOGICO/DOPPLER_OBSTETRICO: desligado →
 * `null` e nenhuma pendência; ligado → a mesma leitura da categoria isolada.
 * `igSemanas` é a IG que o adaptador do exame principal manda ao renderer.
 */
export function cervicometriaComplemento(secao: Secao, igSemanas: number | null) {
  if (texto(secao, 'realizada') !== 'sim') return { dados: null, pendencias: [] as PendenciaCervicometria[] }
  const p = 'realizada.sim.'
  const leitura = lerCervicometria({
    colo: texto(secao, `${p}colo_cm`),
    orificio: texto(secao, `${p}orificio`),
    placenta: texto(secao, `${p}placenta_cm`),
    placentaDistante: texto(secao, `${p}placenta_distante`),
    cerclagem: texto(secao, `${p}cerclagem`),
    observacoes: texto(secao, `${p}observacoes`),
  }, 'cervicometria')
  pendenciaPlacentaBaixa(leitura.placentaCm, igSemanas, leitura.falta, leitura.placentaBruta)
  return { dados: leitura.dados, pendencias: leitura.pendencias }
}
