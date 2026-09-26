'use client'

import { Link2, X } from 'lucide-react'
import { associationsFor, associationByCode, type AssociationDefinition, type CompositionSession } from '@/lib/composition/associations'
import type { CompositionCategoryCode } from '@/lib/composition/contract'
import { CATEGORIES } from '@/lib/deterministic'
import { categoryDotClass } from './categoryPresentation'

/**
 * "ASSOCIAR EXAME" — só oferece os pares com contrato de composição.
 *
 * Fora de uma associação, mostra os pares possíveis a partir da categoria
 * aberta. Dentro dela, mostra os componentes como chips removíveis e diz o que
 * é compartilhado. Nenhum menu lateral de órgão: os órgãos continuam nos cards.
 */
export function AssociationPanel({
  categoria,
  session,
  onAssociate,
  onRemove,
}: {
  categoria: string
  session: CompositionSession | null
  onAssociate: (definition: AssociationDefinition) => void
  onRemove: (componentId: string) => void
}) {
  if (session) {
    const definition = associationByCode(session.associationCode)
    return (
      <div
        data-association-panel="active"
        data-association-code={session.associationCode}
        className="flex flex-wrap items-center gap-2 rounded-[22px] border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30"
      >
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-emerald-800 dark:text-emerald-300">
          <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
          Exames associados
        </span>
        {session.components.map((component) => (
          <span
            key={component.componentId}
            data-association-component={component.categoryCode}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-black/[0.08] bg-white pl-3 pr-1 text-[13px] font-semibold text-gray-700 dark:border-white/10 dark:bg-gray-900 dark:text-gray-200"
          >
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${categoryDotClass(component.categoryCode)}`} />
            {nameOf(component.categoryCode)}
            <button
              type="button"
              onClick={() => onRemove(component.componentId)}
              aria-label={`Remover ${nameOf(component.categoryCode)} da associação`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:hover:bg-red-950/40"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </span>
        ))}
        <span className="text-[12px] text-emerald-900/80 dark:text-emerald-200/80">
          {definition.sharedBladder
            ? 'Bexiga avaliada uma vez, por via transabdominal, e compartilhada pelos dois exames.'
            : 'Cada exame mantém sua via e suas classificações; nada é compartilhado.'}
        </span>
      </div>
    )
  }

  const options = associationsFor(categoria)
  if (!options.length) return null
  return (
    <div data-association-panel="idle" className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">Associar exame:</span>
      {options.map(({ definition, add }) => (
        <button
          key={definition.code}
          type="button"
          data-associate={definition.code}
          onClick={() => onAssociate(definition)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-[13px] font-semibold text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-emerald-950/40"
        >
          <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
          {definition.addLabel[add]}
        </button>
      ))}
    </div>
  )
}

export function nameOf(category: CompositionCategoryCode | string) {
  return CATEGORIES[category]?.name ?? category
}
