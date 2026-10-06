import { categoryDisplayLabel } from '@laudousg/shared'
import type { StoredGrowthChart } from '@/lib/calculators/growthChartPersistence'

/**
 * O item do histórico e as duas traduções que toda tela dele precisa.
 *
 * Vive à parte porque a lista, o painel e a folha do celular usam os três — e
 * uma segunda tabela de rótulos divergiria no primeiro nome de categoria que
 * mudasse.
 */

export type HistoryItem = {
  id: string
  /** `web` = montado por cliques, sem IA. `ia` = gerado pelo aplicativo. */
  origin: 'web' | 'ia'
  category: string
  title: string | null
  text: string
  /** Camada opcional de apresentação dos laudos editados na web. */
  html?: string | null
  /** Figura obstétrica reproduzível, sem imagem persistida. */
  growthChart?: StoredGrowthChart | null
  /**
   * Composição de exames associados com envelope que esta versão reabre para
   * edição. Laudos avulsos (legado) continuam só texto.
   */
  reopenable?: boolean
  date: string
}

/** Código de categoria → o nome que o médico lê. */
export function categoriaLabel(code: string): string {
  const map: Record<string, string> = {
    ABDOMEN_TOTAL: 'Abdome total',
    ABDOME_SUPERIOR: 'Abdome superior',
    ABDOMEN_SUPERIOR: 'Abdome superior',
    PROSTATA_SUPRAPUBICA: 'Próstata',
    VIAS_URINARIAS: 'Vias urinárias',
    MAMARIA: 'Mamas e axilas',
    PELVE_FEMININA: 'Pelve feminina',
    PELVICO_TRANSVAGINAL: 'Pélvico transvaginal',
    PELVICO_TRANSABDOMINAL: 'Pélvico abdominal',
    PELVICO_TRANSVAGINAL_DOPPLER: 'Pélvico transvaginal com Doppler',
    PELVICO_TRANSABDOMINAL_DOPPLER: 'Pélvico abdominal com Doppler',
    MONITORIZACAO_FOLICULAR: 'Monitorização folicular',
    HISTEROSSONOGRAFIA: 'Histerossonografia',
    PESQUISA_ENDOMETRIOSE: 'Pesquisa de endometriose',
    HYCOSY: 'Histerossonossalpingografia (HyCoSy)',
    CERVICAL: 'Cervical',
    CERVICOMETRIA: 'Cervicometria',
    PARTES_MOLES: 'Partes moles',
    TIREOIDE: 'Tireoide',
    TIREOIDE_DOPPLER: 'Tireoide com Doppler',
    CERVICAL_DOPPLER: 'Cervical com Doppler',
    MAMAS_DOPPLER: 'Mamas com Doppler',
    MAMAS_AXILAS_DOPPLER: 'Mamas e axilas com Doppler',
    MUSCULOESQUELETICO: 'Musculoesquelético',
    MSK_COTOVELO: 'Cotovelo unilateral',
    MSK_COTOVELO_BILATERAL: 'Cotovelo bilateral',
    MSK_JOELHO: 'Joelho unilateral',
    MSK_JOELHO_BILATERAL: 'Joelho bilateral',
    MSK_MAO: 'Mão unilateral',
    MSK_MAO_BILATERAL: 'Mão bilateral',
    MSK_OMBRO: 'Ombro unilateral',
    MSK_OMBRO_BILATERAL: 'Ombro bilateral',
    MSK_PUNHO: 'Punho unilateral',
    MSK_PUNHO_BILATERAL: 'Punho bilateral',
    MSK_PE: 'Pé unilateral',
    MSK_PE_BILATERAL: 'Pé bilateral',
    MSK_QUADRIL: 'Quadril unilateral',
    MSK_QUADRIL_BILATERAL: 'Quadril bilateral',
    MSK_TORNOZELO: 'Tornozelo unilateral',
    MSK_TORNOZELO_BILATERAL: 'Tornozelo bilateral',
    OBSTETRICA: 'Obstétrica',
    PERFIL_BIOFISICO_FETAL: 'Perfil biofísico fetal',
    ECOCARDIOGRAFIA_FETAL: 'Ecocardiografia fetal',
    AXILAS: 'Axilas',
    MORFOLOGICO: 'Morfológica',
    DOPPLER_OBSTETRICO: 'Doppler obstétrico',
    DOPPLER_RENAL: 'Doppler renal',
    DOPPLER_HEPATICO: 'Doppler hepático',
    DOPPLER_VENOSO_MMII: 'Doppler venoso (MMII)',
    DOPPLER_ARTERIAL_MMII: 'Doppler arterial (MMII)',
    DOPPLER_FISTULA_AV: 'Doppler de fístula AV',
    DOPPLER_ARTERIAS_TEMPORAIS: 'Doppler de artérias temporais',
    DOPPLER_AORTA_ILIACAS: 'Doppler de aorta e ilíacas',
    DOPPLER_TRANSPLANTE_RENAL: 'Doppler de transplante renal',
    MAMA_MASCULINA: 'Mama masculina',
    BOLSA_TESTICULAR_DOPPLER: 'Bolsa testicular com Doppler',
    ABDOMEN_TOTAL_DOPPLER: 'Abdome total com Doppler',
    DOPPLER_VENOSO_MMSS: 'Doppler venoso (MMSS)',
    DOPPLER_ARTERIAL_MMSS: 'Doppler arterial (MMSS)',
    TORAX: 'Ultrassonografia de tórax',
    QUADRIL_INFANTIL: 'Quadril infantil',
    ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA: 'Abdome total + Próstata',
    MAMARIA__PELVE_FEMININA: 'Mamas e axilas + Pelve feminina',
  }
  return map[code] ?? categoryDisplayLabel(code)
}

/** `2026-08-21T10:14:00Z` → `21/08/2026 10:14`. */
export function dataFmt(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : iso
}

/**
 * O agrupamento da lista: hoje, ontem, e depois a data.
 *
 * "há 3 dias" seria mais bonito e menos útil — o médico procura o laudo de uma
 * data, não de um intervalo.
 */
export function grupoDaData(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 'Sem data'
  const dia = `${m[1]}-${m[2]}-${m[3]}`
  const agora = new Date()
  const iso0 = (d: Date) => d.toISOString().slice(0, 10)
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (dia === iso0(agora)) return 'Hoje'
  if (dia === iso0(ontem)) return 'Ontem'
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** A primeira linha com conteúdo — serve de prévia na lista. */
export function resumo(texto: string): string {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !/^(ULTRASSONOGRAFIA|COMENT[ÁA]RIOS:|T[ÉE]CNICA:|ACHADOS:|OS SEGUINTES)/i.test(l))
  return linhas[0]?.slice(0, 110) ?? ''
}
