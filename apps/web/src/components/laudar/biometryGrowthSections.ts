/**
 * BIOMETRIA E CRESCIMENTO no mesmo painel — agrupamento de APRESENTAÇÃO.
 *
 * O médico mede DBP/CC/CA/CF, anota o peso e, na sequência, classifica o
 * crescimento. Eram duas seções distantes na sub-nav; aqui elas passam a ser
 * uma só ENTRADA de navegação.
 *
 * O que este arquivo NÃO faz: mexer no estado. `biometria` e `crescimento_fetal`
 * continuam sendo dois módulos com duas chaves próprias — é delas que vivem os
 * adaptadores do catálogo, o companion, os rascunhos e o salvamento. Juntar as
 * chaves quebraria tudo isso sem nenhum ganho para quem preenche.
 */

import type { ExamSection, ExamState, OrganModule } from '@/lib/deterministic'

/** Seção como a sub-nav e o painel a enxergam (mesmo recorte de LaudarWebExperience). */
export type BiometryGrowthSection = Pick<ExamSection, 'id' | 'label' | 'group' | 'module' | 'normalBody'>

export const BIOMETRY_SECTION_ID = 'biometria'
export const GROWTH_SECTION_ID = 'crescimento_fetal'
/** Id só de navegação — nunca vira chave de estado. */
export const BIOMETRY_GROWTH_SECTION_ID = 'biometria_crescimento'
export const BIOMETRY_GROWTH_LABEL = 'Biometria e crescimento'

/**
 * Categorias em que o agrupamento vale. O Doppler entra porque no modo
 * combinado ele herda as seções da obstétrica; no modo isolado não há biometria
 * nem crescimento nas seções, e a checagem de presença abaixo já o exclui.
 */
const CATEGORIAS_AGRUPADAS = new Set(['OBSTETRICA', 'MORFOLOGICO', 'DOPPLER_OBSTETRICO'])

export type BiometryGrowthGroup = {
  /** Seções para a sub-nav e para a navegação anterior/próxima, sem duplicata. */
  sections: BiometryGrowthSection[]
  /** Módulos originais, quando o agrupamento se aplica. */
  biometry: OrganModule | null
  growth: OrganModule | null
}

/**
 * Substitui, na posição da biometria, uma entrada única "Biometria e
 * crescimento" e remove a entrada de crescimento fetal. Só age quando os DOIS
 * módulos existem na categoria — Doppler isolado e morfológico de 1º trimestre
 * seguem exatamente como estão.
 */
export function agruparBiometriaCrescimento(
  categoria: string,
  sections: BiometryGrowthSection[],
): BiometryGrowthGroup {
  const biometria = sections.find((section) => section.id === BIOMETRY_SECTION_ID)
  const crescimento = sections.find((section) => section.id === GROWTH_SECTION_ID)
  if (!CATEGORIAS_AGRUPADAS.has(categoria) || !biometria?.module || !crescimento?.module) {
    return { sections, biometry: null, growth: null }
  }
  const agrupadas = sections
    .filter((section) => section.id !== GROWTH_SECTION_ID)
    .map((section) =>
      section.id === BIOMETRY_SECTION_ID
        ? { id: BIOMETRY_GROWTH_SECTION_ID, label: BIOMETRY_GROWTH_LABEL, group: section.group }
        : section
    )
  return { sections: agrupadas, biometry: biometria.module, growth: crescimento.module }
}

/**
 * Mantém viva a seção ativa gravada antes do agrupamento (ou vinda do
 * companion): `biometria` e `crescimento_fetal` levam ao painel agrupado.
 */
export function resolverSecaoAtivaAgrupada(
  sections: BiometryGrowthSection[],
  activeId: string,
): string {
  if (activeId !== BIOMETRY_SECTION_ID && activeId !== GROWTH_SECTION_ID) return activeId
  return sections.some((section) => section.id === BIOMETRY_GROWTH_SECTION_ID)
    ? BIOMETRY_GROWTH_SECTION_ID
    : activeId
}

function moduloPreenchido(module: OrganModule | undefined, state: ExamState[string] | undefined) {
  if (!module) return false
  return JSON.stringify(state ?? {}) !== JSON.stringify(module.initialState())
}

/**
 * Marcação de concluído para a sub-nav quando há painel agrupado: a entrada
 * única fica marcada se a biometria OU o crescimento saíram dos defaults. As
 * demais seções seguem o mesmo critério de sempre (estado ≠ estado inicial).
 */
export function idsConcluidosAgrupados(
  sections: BiometryGrowthSection[],
  group: BiometryGrowthGroup,
  examState: ExamState | undefined,
): Set<string> {
  const concluidos = new Set<string>()
  for (const section of sections) {
    if (section.id === BIOMETRY_GROWTH_SECTION_ID) {
      if (
        moduloPreenchido(group.biometry ?? undefined, examState?.[BIOMETRY_SECTION_ID]) ||
        moduloPreenchido(group.growth ?? undefined, examState?.[GROWTH_SECTION_ID])
      ) concluidos.add(section.id)
      continue
    }
    if (section.normalBody) {
      concluidos.add(section.id)
      continue
    }
    if (moduloPreenchido(section.module, examState?.[section.id])) concluidos.add(section.id)
  }
  return concluidos
}
