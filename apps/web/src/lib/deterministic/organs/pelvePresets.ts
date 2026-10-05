/**
 * ATALHOS DA PELVE — Pélvico transvaginal com Doppler, Pélvico abdominal com
 * Doppler e Monitorização folicular.
 *
 * Nenhum motor novo: os três são DERIVADOS da PELVE_FEMININA (ver
 * `catalog/migradas.ts`) e partem dos cards que já existem — transvaginal
 * (via `tv`) e abdominal (via `ta`) — fixando o modo que a pelve já tem
 * (`modo_pelve` = doppler | monitorizacao_folicular). Título, técnica, corpo e
 * conclusão saem do renderer canônico da pelve.
 *
 * As travas contra normalidade presumida vivem no adaptador
 * (`adaptarPelvePreset`): o portão de completude da via e, por card, o dado que
 * o modo exige (vascularização do achado focal no Doppler; folículos medidos
 * na monitorização).
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganState } from '../types'
import { pelveFeminina } from './pelveFeminina'
import { pelvicoTransvaginal } from './pelvicoTransvaginal'
import { pelvicoTransabdominal } from './pelvicoTransabdominal'

export const PELVICO_TRANSVAGINAL_DOPPLER = 'PELVICO_TRANSVAGINAL_DOPPLER'
export const PELVICO_TRANSABDOMINAL_DOPPLER = 'PELVICO_TRANSABDOMINAL_DOPPLER'
export const MONITORIZACAO_FOLICULAR = 'MONITORIZACAO_FOLICULAR'

type Modo = 'doppler' | 'monitorizacao_folicular'
type Via = 'tv' | 'ta'

/** Card-base de cada atalho e o modo que ele fixa. */
export const PELVE_PRESETS: Record<string, { base: string; via: Via; modo: Modo }> = {
  [PELVICO_TRANSVAGINAL_DOPPLER]: { base: 'PELVICO_TRANSVAGINAL', via: 'tv', modo: 'doppler' },
  [PELVICO_TRANSABDOMINAL_DOPPLER]: { base: 'PELVICO_TRANSABDOMINAL', via: 'ta', modo: 'doppler' },
  [MONITORIZACAO_FOLICULAR]: { base: 'PELVICO_TRANSVAGINAL', via: 'tv', modo: 'monitorizacao_folicular' },
}
export const PELVE_PRESET_IDS = Object.keys(PELVE_PRESETS)

export function pelvePresetDe(categoria: string) {
  return PELVE_PRESETS[categoria]
}

function derivado(id: string, nome: string, base: ExamCategory, via: Via, modo: Modo): ExamCategory {
  const efetivas = (opts: OrganState): OrganState => ({ ...opts, via, modo_pelve: modo })
  return {
    ...base,
    id,
    name: nome,
    title: pelveFeminina.resolveTitle!(efetivas({})),
    tecnica: pelveFeminina.resolveTecnica!(efetivas({})),
    // A finalidade é fixa no card; menopausa não se aplica à monitorização folicular.
    controls: (base.controls ?? []).filter((c) => c.key !== 'modo_pelve' && !(modo === 'monitorizacao_folicular' && c.key === 'menopausa')),
    resolveTitle: (opts) => pelveFeminina.resolveTitle!(efetivas(opts)),
    resolveTecnica: (opts) => pelveFeminina.resolveTecnica!(efetivas(opts)),
  }
}

export const pelvicoTransvaginalDoppler = derivado(PELVICO_TRANSVAGINAL_DOPPLER, 'Pélvico transvaginal com Doppler', pelvicoTransvaginal, 'tv', 'doppler')
export const pelvicoTransabdominalDoppler = derivado(PELVICO_TRANSABDOMINAL_DOPPLER, 'Pélvico abdominal com Doppler', pelvicoTransabdominal, 'ta', 'doppler')
export const monitorizacaoFolicular = derivado(MONITORIZACAO_FOLICULAR, 'Monitorização folicular', pelvicoTransvaginal, 'tv', 'monitorizacao_folicular')

export const PELVE_PRESET_CATEGORIES: ExamCategory[] = [pelvicoTransvaginalDoppler, pelvicoTransabdominalDoppler, monitorizacaoFolicular]
