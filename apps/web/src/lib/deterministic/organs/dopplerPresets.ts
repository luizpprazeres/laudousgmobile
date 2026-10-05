/**
 * ATALHOS COM DOPPLER — cards próprios no seletor, mesmos formulários e renderer.
 *
 * Tireoide, Cervical e Mamas já têm o modo Doppler no contrato canônico. Estes
 * cards só fixam o modo (Doppler realizado), o escopo e, por consequência, o
 * título e a técnica que o renderer da categoria-mãe escreve — ver
 * `catalog/migradas.ts` (CATEGORIAS_DERIVADAS). Nenhum motor novo.
 *
 * O que muda é o portão (`catalog/dopplerPresetsParaCatalogo.ts`): o formulário
 * da mãe nasce pré-marcado como normal e, no modo Doppler, isso viraria
 * "vascularização normal" ou "sem vascularização significativa" sem nenhum dado.
 * Aqui o médico escolhe o modelo normal explicitamente e informa o Doppler de
 * cada achado. Mapas de lacunas: laudario/audits/lote3/{tireoide,cervical,mamas}-doppler-2026-10-05.md.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganModule } from '../types'
import { cervical } from './cervical'
import { mamaria } from './mamaria'

export const TIREOIDE_DOPPLER = 'TIREOIDE_DOPPLER'
export const CERVICAL_DOPPLER = 'CERVICAL_DOPPLER'
export const MAMAS_DOPPLER = 'MAMAS_DOPPLER'
export const MAMAS_AXILAS_DOPPLER = 'MAMAS_AXILAS_DOPPLER'
export const MAMARIA_DOPPLER_PRESETS = [MAMAS_DOPPLER, MAMAS_AXILAS_DOPPLER] as const

/** Modelo de partida: nada é normal até o médico escolher. */
export const MODELO_NORMAL_CONTROL: Field = {
  key: 'modelo', label: 'Modelo de partida', kind: 'segmented', presentation: 'select',
  options: [
    { value: 'em_branco', label: 'Em branco — confirme antes de laudar', isDefault: true },
    { value: 'normal', label: 'Normal — estruturas não alteradas avaliadas e normais' },
  ],
}

// ── Cervical com Doppler ──────────────────────────────────────────────────────
/**
 * Mesmo módulo cervical; só a vascularização do linfonodo nasce "não informada"
 * em vez de "ausente" — o padrão antigo escrevia "sem vascularização
 * significativa ao Doppler" num Doppler que ninguém descreveu (auditoria D2b).
 */
const cervicalModule = cervical.sections[0]!.module!
const cervicalDopplerModule: OrganModule = {
  ...cervicalModule,
  schema: {
    ...cervicalModule.schema,
    category: CERVICAL_DOPPLER,
    fields: cervicalModule.schema.fields.map(field => field.key !== 'linfonodo' ? field : {
      ...field,
      options: field.options?.map(option => option.value !== 'alterado' ? option : {
        ...option,
        subFields: option.subFields?.map(sub => sub.key !== 'vasc' ? sub : {
          ...sub,
          options: [{ value: 'nao_informada', label: 'Não informada', isDefault: true }, ...(sub.options ?? []).map(o => ({ ...o, isDefault: false }))],
        }),
      }),
    }),
  },
  initialState: () => ({ ...cervicalModule.initialState(), 'linfonodo.alterado.vasc': 'nao_informada' }),
}

export const cervicalDoppler: ExamCategory = {
  ...cervical,
  id: CERVICAL_DOPPLER,
  name: 'Cervical com Doppler',
  title: 'ULTRASSONOGRAFIA CERVICAL COM DOPPLER COLORIDO',
  controls: [MODELO_NORMAL_CONTROL],
  sections: [{ ...cervical.sections[0]!, module: cervicalDopplerModule }],
}

// ── Mamas com Doppler / Mamas e axilas com Doppler ────────────────────────────
const mamariaSection = (id: string): ExamSection => mamaria.sections.find(section => section.id === id)!
/** Controles da mama sem escopo e sem Doppler (fixos no card) + modelo de partida. */
const mamariaControls = (mamaria.controls ?? []).filter(control => control.key !== 'escopo_exame' && control.key !== 'doppler_mamario')

export const mamasDoppler: ExamCategory = {
  ...mamaria,
  id: MAMAS_DOPPLER,
  name: 'Mamas com Doppler',
  title: 'ULTRASSONOGRAFIA DAS MAMAS',
  controls: [MODELO_NORMAL_CONTROL, ...mamariaControls],
  sections: [mamariaSection('mamas')],
  resolveSections: undefined,
}

export const mamasAxilasDoppler: ExamCategory = {
  ...mamaria,
  id: MAMAS_AXILAS_DOPPLER,
  name: 'Mamas e axilas com Doppler',
  title: 'ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES',
  controls: [MODELO_NORMAL_CONTROL, ...mamariaControls],
  sections: [mamariaSection('mamas'), mamariaSection('axilas')],
  resolveSections: undefined,
}

/** Escopo fixo de cada card de mama (o renderer da MAMARIA lê do `__opts`). */
export const ESCOPO_MAMARIA_DOPPLER: Record<(typeof MAMARIA_DOPPLER_PRESETS)[number], 'mamas' | 'mamas_axilas'> = {
  MAMAS_DOPPLER: 'mamas',
  MAMAS_AXILAS_DOPPLER: 'mamas_axilas',
}
