'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight, ScanLine, Search, X } from 'lucide-react'
import { GENERIC_CATEGORIES } from '@/lib/deterministic'
import { categoryDotClass } from './categoryPresentation'
import { EXAM_CATEGORY_IMAGES } from './examCategoryImages'
import { groupCategories, matchesCategory, type CategoryEntry } from './categoryGroups'
import { STRUCTURED_WEB_CATEGORY_CODES, WRITER_CATEGORY_OPTIONS } from '@/lib/writerCategories'
import { CLINICAL_WEB_MODELS } from '@/lib/clinicalModels'
import { HEPATIC_WEB_MODELS, HEPATIC_WEB_MODELS_ENABLED } from '@/lib/hepaticModels'

const catalog = [
  ...GENERIC_CATEGORIES.filter(({ id }) =>
    (STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(id)
  ).map(({ id, name }) => ({ id, name, mode: 'structured' as const })),
  { id: 'TIREOIDE', name: 'Tireoide', mode: 'structured' as const },
  { id: 'TIREOIDE_DOPPLER', name: 'Tireoide com Doppler', mode: 'structured' as const },
  ...WRITER_CATEGORY_OPTIONS
    .filter(({ id }) => !(STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(id))
    .map(({ id, name }) => ({ id, name, mode: 'writer' as const })),
  ...CLINICAL_WEB_MODELS.map(({ id, name }) => ({ id, name, mode: 'structured' as const })),
  ...(HEPATIC_WEB_MODELS_ENABLED ? HEPATIC_WEB_MODELS.map(({ id, name }) => ({ id, name, mode: 'structured' as const })) : []),
]

function CategoryArtwork({ categoryId }: { categoryId: string }) {
  const [failed, setFailed] = useState(false)
  const src = EXAM_CATEGORY_IMAGES[categoryId]
  return <span className="exam-category-art" aria-hidden="true">
    {src && !failed
      ? <img src={src} alt="" width={112} height={112} decoding="async" onError={() => setFailed(true)} />
      : <ScanLine className="h-8 w-8 text-gray-400" />}
  </span>
}

function CategoryCard({ entry, onSelect }: { entry: CategoryEntry; onSelect: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onSelect(entry.id)} data-category-id={entry.id} data-generation-mode={entry.mode}
      aria-label={entry.name}
      className="exam-category-item flex flex-col items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white text-left transition hover:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
      <span aria-hidden="true" className={`absolute right-3 top-3 h-2 w-2 rounded-full ${categoryDotClass(entry.id)}`} />
      <CategoryArtwork categoryId={entry.id} />
      <span className="exam-category-label w-full break-words">{entry.name}</span>
    </button>
  )
}

/**
 * ESCOLHA DO EXAME — cinco famílias sempre abertas, lado a lado.
 *
 * Cada família cresce na proporção dos exames que tem, então no desktop largo
 * as cinco cabem em duas ou três linhas sem acordeão nem aba: um clique leva ao
 * exame. A busca é global (nome, sinônimo, família, sem acento) e mostra os
 * resultados ainda agrupados. Os ids são os do catálogo compartilhado.
 */
export function ExamCategoryPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => groupCategories(catalog), [])
  const searching = query.trim().length > 0
  const visibleGroups = groups
    .map((group) => ({ ...group, entries: group.entries.filter((entry) => matchesCategory(entry, query)) }))
    .filter((group) => group.entries.length > 0)
  const nameOf = (id: string) => groups.flatMap((group) => group.entries).find((entry) => entry.id === id)
  const total = visibleGroups.reduce((sum, group) => sum + group.entries.length, 0)

  return (
    <main className="exam-category-picker min-h-screen bg-white px-4 py-5 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <img src="/icons/apple-touch-icon.png" alt="" width="36" height="36" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-semibold">Laudo<span className="text-emerald-600">USG</span></span>
          </div>
          <h1 className="exam-category-title order-3 w-full text-center text-[26px] leading-tight lg:order-none lg:w-auto lg:flex-1">Qual exame você deseja realizar?</h1>
          <div className="relative order-4 w-full lg:order-none lg:w-[340px]">
            <Search aria-hidden="true" className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input autoFocus value={query} onChange={event => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // Um único resultado: Enter abre o exame, sem ir até o card.
                const unico = visibleGroups.length === 1 && visibleGroups[0].entries.length === 1 ? visibleGroups[0].entries[0] : null
                if (event.key === 'Enter' && searching && unico) { event.preventDefault(); onSelect(unico.id) }
              }}
              aria-label="Buscar categoria" placeholder="Buscar exame, órgão ou família"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" title="Limpar busca"
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>}
          </div>
        </div>

        <div className="exam-category-groups" role="group" aria-label="Categorias de exame">
          {visibleGroups.map((group) => {
            const titleId = `exam-group-${group.id}`
            const shortcuts = searching ? [] : (group.shortcuts ?? []).map(nameOf).filter((entry): entry is CategoryEntry => Boolean(entry))
            return (
              <section key={group.id} aria-labelledby={titleId} data-category-group={group.id}
                className="exam-category-group" style={{ '--n': group.entries.length } as CSSProperties}>
                <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
                  <h2 id={titleId} className="exam-category-group-title">{group.label}</h2>
                  <span className="text-[11px] font-medium text-gray-400">{group.entries.length} {group.entries.length === 1 ? 'exame' : 'exames'}</span>
                </div>
                <div className="exam-category-group-grid">
                  {group.entries.map((entry) => <CategoryCard key={entry.id} entry={entry} onSelect={onSelect} />)}
                </div>
                {shortcuts.length ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 px-0.5">
                    {shortcuts.map((entry) => (
                      <button key={entry.id} type="button" onClick={() => onSelect(entry.id)} data-category-shortcut={entry.id}
                        aria-label={`${entry.name} (atalho, em ${entry.groupLabel})`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-[12.5px] font-semibold text-gray-600 transition hover:border-emerald-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:min-h-9">
                        {entry.name}
                        <span className="font-normal text-gray-400">· {entry.groupLabel}</span>
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
        {total === 0 && <p role="status" className="py-10 text-center text-sm text-gray-500">Nenhum exame encontrado.</p>}
      </div>
    </main>
  )
}
