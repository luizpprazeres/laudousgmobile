import type { ExamState } from '../deterministic/compose'
import type { Field, OrganState } from '../deterministic/types'
import { dopplerObstetrico } from '../deterministic/organs/dopplerObstetrico'
import { adaptarObstetrica } from './obstetricaParaCatalogo'
import { adaptarDopplerObstetrico } from './dopplerParaCatalogo'

const VALORES_OCULTOS_NEUTROS = new Set(['', 'nao_avaliado', 'normal', 'ausente'])

function pendenciasDopplerOculto(estado: ExamState) {
  const weeks = Number.parseFloat(String(estado.ig?.bio_sem ?? '').replace(',', '.'))
  if (!Number.isFinite(weeks)) return []
  const doppler = estado.doppler ?? {}
  const sections = dopplerObstetrico.resolveSections!(estado.__opts ?? {})
  const fields = sections.find((section) => section.id === 'doppler')?.module?.schema.fields ?? []
  return fields.flatMap((field) => {
    if (field.minGestationalWeeks === undefined || weeks >= field.minGestationalWeeks) return []
    const value = doppler[field.key]
    const preenchido = Array.isArray(value)
      ? value.length > 0
      : !VALORES_OCULTOS_NEUTROS.has(String(value ?? '').trim())
    if (!preenchido) return []
    return [{
      onde: `Doppler obstétrico — ${field.label}`,
      valor: String(value),
      motivo: `O campo foi preenchido, mas não é aplicável antes de ${field.minGestationalWeeks} semanas. Revise o valor ou a idade gestacional.`,
      bloqueia: true,
    }]
  })
}

function pendenciasConflitoDoppler(estado: ExamState, dados: Record<string, unknown> | null | undefined) {
  if (!dados) return []
  const doppler = estado.doppler ?? {}
  const conflitos = [
    { campo: 'umbilical', alterado: 'umbilical_alterado', rotulo: 'Artéria umbilical' },
    { campo: 'acm', alterado: 'acm_alterado', rotulo: 'Artéria cerebral média' },
  ]
  return conflitos.flatMap(({ campo, alterado, rotulo }) =>
    doppler[campo] === 'normal' && dados[alterado] === true
      ? [{
          onde: `Doppler obstétrico — ${rotulo}`,
          valor: 'Normal',
          motivo: 'A avaliação qualitativa normal contradiz o percentil calculado. Revise o índice ou a seleção.',
          bloqueia: true,
        }]
      : [],
  )
}

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
  if (!isolado && estado.__growth_chart) visivel.__growth_chart = { ...estado.__growth_chart }
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
  const pendenciasOcultas = pendenciasDopplerOculto(estado)
  if (somenteDoppler(estado)) {
    const adaptado = adaptarDopplerObstetrico({
      ...visivel,
      doppler: { ...visivel.doppler, ig_sem: visivel.ig.bio_sem, ig_dias: visivel.ig.bio_dias },
    })
    return {
      ...adaptado,
      pendencias: [
        ...adaptado.pendencias,
        ...pendenciasOcultas,
        ...pendenciasConflitoDoppler(estado, adaptado.dados),
      ],
    }
  }
  const adaptado = adaptarObstetrica({
    ...visivel,
    doppler: {
      realizado: 'sim',
      ...Object.fromEntries(Object.entries(visivel.doppler).map(([key, value]) => [`realizado.sim.${key}`, value])),
    },
  }, { incluirDoppler: true })
  return {
    ...adaptado,
    pendencias: [
      ...adaptado.pendencias,
      ...pendenciasOcultas,
      ...pendenciasConflitoDoppler(
        estado,
        adaptado.dados.doppler && typeof adaptado.dados.doppler === 'object'
          ? adaptado.dados.doppler as Record<string, unknown>
          : null,
      ),
    ],
  }
}
