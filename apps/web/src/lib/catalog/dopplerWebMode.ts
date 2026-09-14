import type { ExamState } from '../deterministic/compose'
import type { Field, OrganState } from '../deterministic/types'
import { dopplerObstetrico } from '../deterministic/organs/dopplerObstetrico'
import { adaptarObstetrica } from './obstetricaParaCatalogo'
import { adaptarDopplerObstetrico } from './dopplerParaCatalogo'

export function somenteDoppler(estado: ExamState): boolean {
  return estado.__opts?.somente_doppler === 'sim'
}

export function categoriaRenderDoppler(estado: ExamState): string {
  return somenteDoppler(estado) ? 'DOPPLER_OBSTETRICO' : 'OBSTETRICA'
}

export function chaveDocumentoDoppler(categoria: string, estado: ExamState): string {
  return categoria === 'DOPPLER_OBSTETRICO'
    ? `${categoria}:${somenteDoppler(estado) ? 'isolado' : 'combinado'}`
    : categoria
}

/** Retem o preenchimento na tela; so campos do modo atual saem dela. */
export function estadoDopplerVisivel(estado: ExamState): ExamState {
  const isolado = somenteDoppler(estado)
  const sections = dopplerObstetrico.resolveSections!(estado.__opts ?? {})
  const visivel: ExamState = {
    __opts: { somente_doppler: isolado ? 'sim' : 'nao' },
  }
  for (const section of sections) visivel[section.id] = { ...(estado[section.id] ?? {}) }
  if (isolado) visivel.ig = { bio_sem: estado.ig?.bio_sem ?? '', bio_dias: estado.ig?.bio_dias ?? '' }
  const weeks = Number.parseFloat(String(visivel.ig.bio_sem ?? '').replace(',', '.'))
  const indices: OrganState = {}
  const fields = sections.find((section) => section.id === 'doppler')!.module!.schema.fields
  const pick = (fields: Field[], prefix = '') => {
    for (const field of fields) {
      if (field.minGestationalWeeks !== undefined && Number.isFinite(weeks) && weeks < field.minGestationalWeeks) continue
      const key = `${prefix}${field.key}`
      const value = visivel.doppler[key]
      if (value !== undefined) indices[key] = value
      for (const option of field.options ?? []) {
        if (value === option.value || (Array.isArray(value) && value.includes(option.value))) {
          pick(option.subFields ?? [], `${key}.${option.value}.`)
        }
      }
    }
  }
  pick(fields)
  visivel.doppler = indices
  return visivel
}

export function adaptarDopplerWeb(estado: ExamState) {
  const visivel = estadoDopplerVisivel(estado)
  if (somenteDoppler(estado)) {
    return adaptarDopplerObstetrico({
      ...visivel,
      doppler: { ...visivel.doppler, ig_sem: visivel.ig.bio_sem, ig_dias: visivel.ig.bio_dias },
    })
  }
  return adaptarObstetrica({
    ...visivel,
    doppler: {
      realizado: 'sim',
      ...Object.fromEntries(Object.entries(visivel.doppler).map(([key, value]) => [`realizado.sim.${key}`, value])),
    },
  }, { incluirDoppler: true })
}
