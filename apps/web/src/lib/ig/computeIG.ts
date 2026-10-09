/**
 * Fundação de IDADE GESTACIONAL determinística (escola Dr. Domingos).
 * Fonte: docs/plano-ig-deterministica.md ([[epico-ig-deterministica]]).
 *
 * Princípio: a ÂNCORA é sempre a biometria atual. A referência precoce (US precoce
 * ou DUM) só entra na frase quando há divergência > 5 dias E o médico sinaliza a
 * correção. Função PURA, sem IA e sem Date.now (hoje é passado pelo chamador) —
 * compartilhada por OBSTETRICA e MORFOLOGICO no web.
 */

export type SemanasDias = { semanas: number; dias: number }

export type Referencia =
  | { tipo: 'us'; dataISO: string; ig: SemanasDias } // US precoce: IG naquela data
  | { tipo: 'dum'; dataISO: string } // data da última menstruação

export interface IGInput {
  /** Biometria atual (medida hoje) — a âncora. */
  biometria: SemanasDias
  /** Data do exame (ISO yyyy-mm-dd). */
  hojeISO: string
  /** Referência precoce, se houver. */
  referencia?: Referencia
  /** Sinaliza a correção na conclusão quando diverge > 5 dias (toggle/voz). */
  corrigir?: boolean
}

export interface IGResult {
  /** Item de conclusão da IG (frase canônica). */
  igConclusao: string
  /** Prosa da 1ª US / DUM, quando há referência. */
  frase1aUS?: string
  divergenciaDias: number
  biometriaSD: SemanasDias
  referenciaHojeSD?: SemanasDias
}

const DIA_MS = 86_400_000
/** Limiar de divergência clínica (CONFIRMAR com Dr. Domingos se fixo). */
export const DIVERGENCIA_LIMIAR_DIAS = 5

export function sdToDays(sd: SemanasDias): number {
  return sd.semanas * 7 + sd.dias
}
export function daysToSD(days: number): SemanasDias {
  const d = Math.max(0, Math.round(days))
  return { semanas: Math.floor(d / 7), dias: d % 7 }
}
export function fmtSD(sd: SemanasDias): string {
  const s = `${sd.semanas} ${sd.semanas === 1 ? 'semana' : 'semanas'}`
  // Fonte (renderer/ig.ts) omite "e Y dias" quando dias = 0.
  if (sd.dias === 0) return s
  return `${s} e ${sd.dias} ${sd.dias === 1 ? 'dia' : 'dias'}`
}
function daysBetween(aISO: string, bISO: string): number {
  return Math.round((Date.parse(bISO) - Date.parse(aISO)) / DIA_MS)
}
/** yyyy-mm-dd → dd/mm/aaaa. */
export function formatBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

export function computeIG(input: IGInput): IGResult {
  const { biometria, hojeISO, referencia, corrigir } = input
  const bioDays = sdToDays(biometria)
  const bioSD = daysToSD(bioDays)

  let refTodayDays: number | undefined
  if (referencia) {
    const elapsed = daysBetween(referencia.dataISO, hojeISO)
    refTodayDays =
      referencia.tipo === 'us' ? sdToDays(referencia.ig) + elapsed : elapsed
  }
  const refSD = refTodayDays !== undefined ? daysToSD(refTodayDays) : undefined
  const divergencia =
    refTodayDays !== undefined ? Math.abs(bioDays - refTodayDays) : 0
  const fonte =
    referencia?.tipo === 'dum'
      ? 'data da última menstruação'
      : 'ultrassonografia precoce'

  // Regra da conclusão:
  //  - sem referência, OU divergência ≤ limiar, OU correção desligada → só biometria;
  //  - divergência > limiar E corrigir → frase com correção pela referência.
  let igConclusao: string
  if (
    referencia &&
    divergencia > DIVERGENCIA_LIMIAR_DIAS &&
    corrigir &&
    refSD
  ) {
    igConclusao = `Gestação em torno de ${fmtSD(bioSD)} pela biometria atual, devendo ser corrigida pela ${fonte}, compatível com ${fmtSD(refSD)}.`
  } else {
    igConclusao = `Gestação em torno de ${fmtSD(bioSD)}.`
  }

  let frase1aUS: string | undefined
  if (referencia && refSD) {
    const dataFmt = formatBR(referencia.dataISO)
    frase1aUS =
      referencia.tipo === 'us'
        ? `Primeira ultrassonografia realizada em ${dataFmt} com ${fmtSD(referencia.ig)}. Hoje com ${fmtSD(refSD)}.`
        : `Data da última menstruação em ${dataFmt}, correspondente a ${fmtSD(refSD)} na data do exame.`
  }

  return {
    igConclusao,
    frase1aUS,
    divergenciaDias: divergencia,
    biometriaSD: bioSD,
    referenciaHojeSD: refSD,
  }
}

// ── Leitura da DATAÇÃO DE REFERÊNCIA no estado da tela ────────────────────────
//
// A tela obstétrica mostra DUM e primeira US ao mesmo tempo, ambas opcionais,
// com a data do exame implícita (hoje, gravada no estado inicial). Estados
// antigos guardavam a escolha num seletor (`referencia`: nenhuma/usg/dum) e os
// dados em `referencia.usg.*` / `referencia.dum.*`. Este leitor é o ÚNICO lugar
// que conhece os dois formatos: composição local, adaptador do catálogo e curva
// de crescimento leem por aqui.

/** "DD/MM/AAAA" → "AAAA-MM-DD". Estrito: rejeita data inexistente (31/02). */
export function dataBRParaISO(v: unknown): string | null {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
}

/** Data local de hoje em "DD/MM/AAAA" — só para o ESTADO INICIAL, nunca na composição. */
export function hojeBR(agora: Date = new Date()): string {
  const d = String(agora.getDate()).padStart(2, '0')
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${agora.getFullYear()}`
}

export type PendenciaDatacao = { campo: 'dum' | 'us'; valor: string; motivo: string }

export interface DatacaoDaTela {
  /** Data do exame (DD/MM/AAAA) válida, ou null. */
  exame_data: string | null
  /** DUM completa e válida (DD/MM/AAAA), ou null. */
  dum_data: string | null
  /** Primeira US completa: data (DD/MM/AAAA) + IG naquela data. */
  us_data: string | null
  us_ig_sem: number | null
  us_ig_dias: number | null
  /** Referência usada na correção: primeira US completa vence a DUM. */
  referencia: Referencia | null
  /** Data do exame em ISO (para `computeIG`). */
  hojeISO: string | null
  /** Estados antigos podiam desligar a correção; os novos sempre corrigem (default do épico). */
  corrigir: boolean
  /** Referência começada e não utilizável — nunca descartada em silêncio. */
  pendencias: PendenciaDatacao[]
}

function textoDe(st: Readonly<Record<string, unknown>>, chave: string): string {
  const v = st[chave]
  return typeof v === 'string' ? v.trim() : ''
}

function inteiro(v: string): number | null {
  return /^\d{1,2}$/.test(v) ? Number(v) : null
}

/** Valores brutos efetivos da datação (formato novo ou legado), como a tela deve exibi-los. */
export interface DatacaoBruta {
  dum_data: string
  us_data: string
  us_ig_sem: string
  us_ig_dias: string
  exame_data: string
  /** O grupo da primeira US veio das chaves novas. */
  usNovo: boolean
  /** Algum valor exibido veio de `referencia.*`. */
  legado: boolean
}

export function datacaoBrutaDaTela(st: Readonly<Record<string, unknown>>): DatacaoBruta {
  const legado = textoDe(st, 'referencia')
  const legadoUs = legado === 'usg'
  const legadoDum = legado === 'dum'
  // Cada grupo vem inteiro do formato novo OU do legado — nunca campo a campo misturado.
  const usNovo = ['us_data', 'us_ig_sem', 'us_ig_dias'].some((k) => textoDe(st, k))
  const us = usNovo
    ? { data: textoDe(st, 'us_data'), sem: textoDe(st, 'us_ig_sem'), dias: textoDe(st, 'us_ig_dias') }
    : legadoUs
      ? {
          data: textoDe(st, 'referencia.usg.us_data'),
          sem: textoDe(st, 'referencia.usg.us_ig_sem'),
          dias: textoDe(st, 'referencia.usg.us_ig_dias'),
        }
      : { data: '', sem: '', dias: '' }
  const dumNovo = textoDe(st, 'dum_data')
  const dum = dumNovo || (legadoDum ? textoDe(st, 'referencia.dum.dum_data') : '')
  const exameNovo = textoDe(st, 'exame_data')
  const exameLegado = legadoUs
    ? textoDe(st, 'referencia.usg.exame_data')
    : legadoDum ? textoDe(st, 'referencia.dum.exame_data') : ''
  // A referência antiga foi projetada até a data do exame que veio com ela: o
  // "hoje" de um estado inicial mesclado por cima não pode reprojetá-la.
  const referenciaLegada = (!usNovo && legadoUs && Boolean(us.data || us.sem || us.dias)) ||
    (!dumNovo && Boolean(dum))
  const exame = referenciaLegada && exameLegado ? exameLegado : exameNovo || exameLegado
  return {
    dum_data: dum,
    us_data: us.data,
    us_ig_sem: us.sem,
    us_ig_dias: us.dias,
    exame_data: exame,
    usNovo,
    legado: referenciaLegada || (!exameNovo && Boolean(exame)),
  }
}

/**
 * Leva um estado antigo para as chaves novas antes da primeira edição, para que
 * o que a tela mostra seja exatamente o que o laudo usa. Sem dados legados,
 * devolve o próprio estado.
 */
export function migrarDatacaoLegada<T extends Record<string, unknown>>(st: T): T {
  const legado = textoDe(st, 'referencia')
  if (legado !== 'usg' && legado !== 'dum') return st
  const b = datacaoBrutaDaTela(st)
  const corrigirLegado = textoDe(st, `referencia.${legado}.corrigir`)
  return {
    ...st,
    referencia: 'nenhuma',
    corrigir_referencia: corrigirLegado === 'nao' ? 'nao' : 'sim',
    dum_data: b.dum_data,
    us_data: b.us_data,
    us_ig_sem: b.us_ig_sem,
    // Dias em branco valiam zero no formato antigo.
    us_ig_dias: b.us_ig_dias || (b.us_data || b.us_ig_sem ? '0' : ''),
    exame_data: b.exame_data,
  }
}

export function lerDatacaoDaTela(st: Readonly<Record<string, unknown>>): DatacaoDaTela {
  const legado = textoDe(st, 'referencia')
  const bruta = datacaoBrutaDaTela(st)
  const usNovo = bruta.usNovo
  const usRaw = { data: bruta.us_data, sem: bruta.us_ig_sem, dias: bruta.us_ig_dias }
  const dumRaw = bruta.dum_data
  const exameRaw = bruta.exame_data
  const hojeISO = dataBRParaISO(exameRaw)
  const corrigirNovo = textoDe(st, 'corrigir_referencia')
  const corrigir = corrigirNovo
    ? corrigirNovo !== 'nao'
    : !((legado === 'usg' || legado === 'dum') && textoDe(st, `referencia.${legado}.corrigir`) === 'nao')

  const pendencias: PendenciaDatacao[] = []
  const referenciaComecada = Boolean(dumRaw || usRaw.data || usRaw.sem || usRaw.dias)
  if (referenciaComecada && !hojeISO) {
    pendencias.push({
      campo: usRaw.data || usRaw.sem || usRaw.dias ? 'us' : 'dum',
      valor: exameRaw,
      motivo: 'Não foi possível definir a data do exame. Apague e preencha novamente a referência.',
    })
  }
  const posteriorAoExame = (iso: string) => hojeISO !== null && iso > hojeISO

  let dum: string | null = null
  let dumISO: string | null = null
  if (dumRaw) {
    const iso = dataBRParaISO(dumRaw)
    if (!iso) pendencias.push({ campo: 'dum', valor: dumRaw, motivo: 'Informe a DUM como DD/MM/AAAA ou apague o campo.' })
    else if (posteriorAoExame(iso)) pendencias.push({ campo: 'dum', valor: dumRaw, motivo: 'A DUM é posterior à data do exame.' })
    else { dum = dumRaw; dumISO = iso }
  }

  let us: { data: string; iso: string; ig: SemanasDias } | null = null
  if (usRaw.data || usRaw.sem || usRaw.dias) {
    const iso = dataBRParaISO(usRaw.data)
    const sem = inteiro(usRaw.sem)
    // Estados antigos aceitavam dias em branco como zero; o formato novo pede os três campos.
    const dias = usRaw.dias === '' && !usNovo ? 0 : inteiro(usRaw.dias)
    const valor = [usRaw.data, usRaw.sem, usRaw.dias].filter(Boolean).join(' · ')
    if (!iso || sem === null || dias === null || dias > 6) {
      pendencias.push({
        campo: 'us',
        valor,
        motivo: 'Complete a primeira ultrassonografia com data (DD/MM/AAAA), semanas e dias (0 a 6), ou apague os campos.',
      })
    } else if (posteriorAoExame(iso)) {
      pendencias.push({ campo: 'us', valor, motivo: 'A primeira ultrassonografia é posterior à data do exame.' })
    } else {
      us = { data: usRaw.data, iso, ig: { semanas: sem, dias } }
    }
  }

  const referencia: Referencia | null = us
    ? { tipo: 'us', dataISO: us.iso, ig: us.ig }
    : dumISO
      ? { tipo: 'dum', dataISO: dumISO }
      : null

  return {
    exame_data: hojeISO ? exameRaw : null,
    dum_data: dum,
    us_data: us?.data ?? null,
    us_ig_sem: us?.ig.semanas ?? null,
    us_ig_dias: us?.ig.dias ?? null,
    referencia,
    hojeISO,
    corrigir,
    pendencias,
  }
}
