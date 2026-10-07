/**
 * PÉLVICO ABDOMINAL (via transabdominal isolada) — atalho no seletor, mesma
 * pelve por baixo.
 *
 * Mesmo desenho do `PELVICO_TRANSVAGINAL`: reaproveita os módulos de útero,
 * endométrio, ovários e bexiga da `PELVE_FEMININA` e o renderer canônico, com a
 * via fixada em `ta`. Não há segundo motor de texto clínico — ver
 * `catalog/migradas.ts` (CATEGORIAS_DERIVADAS).
 *
 * O que muda (audits/lote3/pelvico-abdominal-2026-10-05.md):
 *  - a bexiga vem primeiro e a REPLEÇÃO não tem padrão: a técnica TA afirma
 *    "bexiga repleta", então ela precisa ser confirmada pelo médico;
 *  - a finalidade fica só em rotina/Doppler (monitorização folicular e
 *    pós-abortamento trocariam a via);
 *  - o portão de completude (`adaptarPelveTransabdominal`) bloqueia o estado
 *    vazio e manda o endométrio não medido como "limitado pela técnica".
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganState } from '../types'
import { pelveFeminina, pelveSections } from './pelveFeminina'

export const PELVICO_TRANSABDOMINAL = 'PELVICO_TRANSABDOMINAL'

/** Finalidades compatíveis com a via transabdominal isolada. */
export const MODOS_TA = ['rotina', 'doppler']

const comVia = (opts: OrganState): OrganState => ({
  ...opts,
  via: 'ta',
  modo_pelve: MODOS_TA.includes(String(opts.modo_pelve ?? 'rotina')) ? opts.modo_pelve ?? 'rotina' : 'rotina',
})

/** Bexiga da pelve com a repleção SEM opção pré-marcada. */
const bexigaBase = pelveSections.find((section) => section.id === 'bexiga')!.module!
const bexigaSemPadrao: OrganModule = {
  ...bexigaBase,
  schema: {
    ...bexigaBase.schema,
    fields: bexigaBase.schema.fields.map((field) => field.key === 'replecao'
      ? { ...field, label: 'Repleção (confirme)', hint: 'obrigatória: a técnica afirma bexiga repleta', options: (field.options ?? []).map((option) => ({ ...option, isDefault: false })) }
      : field),
  },
  initialState: () => ({ ...bexigaBase.initialState(), replecao: '' }),
}

export const pelvicoTransabdominal: ExamCategory = {
  id: PELVICO_TRANSABDOMINAL,
  name: 'Pelve transabdominal',
  title: pelveFeminina.resolveTitle!(comVia({})),
  tecnica: pelveFeminina.resolveTecnica!(comVia({})),
  achadosHeader: pelveFeminina.achadosHeader,
  controls: (pelveFeminina.controls ?? [])
    .filter((control) => control.key !== 'via')
    .map((control) => control.key === 'modo_pelve'
      ? { ...control, options: (control.options ?? []).filter((option) => MODOS_TA.includes(option.value)) }
      : control),
  resolveTitle: (opts) => pelveFeminina.resolveTitle!(comVia(opts)),
  resolveTecnica: (opts) => pelveFeminina.resolveTecnica!(comVia(opts)),
  // Bexiga primeiro: é pré-requisito técnico da via.
  sections: [
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: bexigaSemPadrao },
    ...pelveSections.filter((section) => section.id !== 'bexiga'),
  ],
  conclusionNormal: pelveFeminina.conclusionNormal,
  calculators: pelveFeminina.calculators,
}
