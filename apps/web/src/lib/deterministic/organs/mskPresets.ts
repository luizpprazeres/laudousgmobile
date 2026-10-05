/**
 * ATALHOS MUSCULOESQUELÉTICOS — 16 cards (8 segmentos × unilateral/bilateral).
 *
 * Não há motor novo: cada card é uma categoria DERIVADA do MUSCULOESQUELETICO
 * (ver `catalog/migradas.ts`, CATEGORIAS_DERIVADAS). Mesmas seções, mesmos
 * módulos, mesmo adaptador e mesmo renderer canônico; o card só fixa o
 * segmento (e, no bilateral, o lado = ambos).
 *
 * Duas travas que o formulário-base não tem, porque ele abre com todas as
 * estruturas em "Normal":
 *  - unilateral: o lado não tem padrão — o médico escolhe direito ou esquerdo;
 *  - confirmação: o laudo só sai depois de o médico confirmar que as
 *    estruturas sem alteração foram revisadas. Sem isso, abrir o card já
 *    produziria um laudo normal completo que ninguém examinou.
 * As travas vivem no adaptador (`adaptarMskPreset`), não no motor-base.
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganState } from '../types'
import { SEGMENTOS, musculoesqueletico } from './musculoesqueletico'

export interface MskPreset {
  id: string
  segmento: string
  bilateral: boolean
  nome: string
}

const NOMES: Record<string, string> = {
  cotovelo: 'Cotovelo', joelho: 'Joelho', mao: 'Mão', ombro: 'Ombro',
  punho: 'Punho', pe: 'Pé', quadril: 'Quadril', tornozelo: 'Tornozelo',
}
/** Ordem de exibição: alfabética pelo nome humano. */
const ORDEM = ['cotovelo', 'joelho', 'mao', 'ombro', 'punho', 'pe', 'quadril', 'tornozelo']

export const MSK_PRESETS: MskPreset[] = ORDEM.flatMap((segmento) => [
  { id: `MSK_${segmento.toUpperCase()}`, segmento, bilateral: false, nome: `${NOMES[segmento]} unilateral` },
  { id: `MSK_${segmento.toUpperCase()}_BILATERAL`, segmento, bilateral: true, nome: `${NOMES[segmento]} bilateral` },
])
export const MSK_PRESET_IDS = MSK_PRESETS.map((p) => p.id)

export function mskPresetDe(categoria: string): MskPreset | undefined {
  return MSK_PRESETS.find((p) => p.id === categoria)
}

/** Opções efetivas do exame: o segmento (e o lado, no bilateral) vêm do card. */
export function opcoesDoPreset(preset: MskPreset, opts: OrganState = {}): OrganState {
  return { ...opts, segmento: preset.segmento, ...(preset.bilateral ? { lado: 'ambos' } : {}) }
}

export const CONFIRMACAO_CONTROL_KEY = 'revisao_normais'

function controlesDo(preset: MskPreset): Field[] {
  const label = NOMES[preset.segmento]!
  const controles: Field[] = [
    { key: 'segmento', label: 'Segmento', kind: 'segmented', options: [{ value: preset.segmento, label, isDefault: true }] },
    preset.bilateral
      ? { key: 'lado', label: 'Lado', kind: 'segmented', options: [{ value: 'ambos', label: 'Bilateral', isDefault: true }] }
      // Unilateral sem padrão: o lado é sempre escolhido.
      : { key: 'lado', label: 'Lado (escolha)', kind: 'segmented', options: [{ value: 'direito', label: 'Direito' }, { value: 'esquerdo', label: 'Esquerdo' }] },
    {
      key: CONFIRMACAO_CONTROL_KEY, label: 'Estruturas sem alteração', kind: 'segmented',
      options: [
        { value: 'pendente', label: 'Revisão pendente', isDefault: true },
        { value: 'confirmado', label: 'Revisadas e normais' },
      ],
    },
  ]
  return controles
}

function categoriaDo(preset: MskPreset): ExamCategory {
  const base = musculoesqueletico
  const efetivas = (opts: OrganState) => opcoesDoPreset(preset, opts)
  return {
    ...base,
    id: preset.id,
    name: preset.nome,
    title: base.resolveTitle!(efetivas({ lado: preset.bilateral ? 'ambos' : 'direito' })),
    controls: controlesDo(preset),
    resolveTitle: (opts) => base.resolveTitle!(efetivas(opts)),
    resolveSections: (opts) => base.resolveSections!(efetivas(opts)),
    // Estado inicial só do segmento do card (mesmos ids da categoria-base).
    sections: base.sections.filter((s) => s.id.startsWith(`${preset.segmento}__`)),
  }
}

export const MSK_PRESET_CATEGORIES: ExamCategory[] = MSK_PRESETS.map(categoriaDo)

/** Sanidade para testes: todo segmento do motor-base tem os dois cards. */
export const SEGMENTOS_COBERTOS = Object.keys(SEGMENTOS).every((s) => ORDEM.includes(s))
