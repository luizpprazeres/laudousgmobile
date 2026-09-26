'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight, ScanLine, Search, X } from 'lucide-react'
import { GENERIC_CATEGORIES } from '@/lib/deterministic'
import { categoryDotClass } from './categoryPresentation'
import { EXAM_CATEGORY_IMAGES } from './examCategoryImages'
import { groupCategories, matchesCategory, type CategoryEntry } from './categoryGroups'

const catalog = [
  ...GENERIC_CATEGORIES.map(({ id, name }) => ({ id, name })),
  { id: 'TIREOIDE', name: 'Tireoide' },
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
    <button type="button" onClick={() => onSelect(entry.id)} data-category-id={entry.id}
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
      <style>{`
        @font-face { font-family: 'Category Condensed'; src: url('/fonts/BarlowCondensed-Light.ttf') format('truetype'); font-style: normal; font-weight: 300; font-display: swap; }
        .exam-category-picker { letter-spacing: 0; color-scheme: light; background: #fff; color: #111827; }
        .exam-category-groups { display: flex; flex-wrap: wrap; gap: 14px; align-items: stretch; }
        .exam-category-group {
          --n: 1;
          flex: var(--n) 1 calc(var(--n) * 148px + (var(--n) - 1) * 10px + 34px);
          max-width: calc(var(--n) * 280px + (var(--n) - 1) * 10px + 34px);
          min-width: min(100%, 250px);
          background: #f7f8f9; border: 1px solid #eceef1; border-radius: 22px; padding: 12px 16px 16px;
        }
        .exam-category-group-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap: 10px; }
        .exam-category-item { position: relative; min-width: 0; min-height: 150px; padding: 14px 12px 12px; animation: category-enter 180ms ease-out both; }
        .exam-category-art { display: flex; flex: 0 0 84px; width: 84px; height: 84px; align-items: center; justify-content: center; align-self: center; }
        .exam-category-art img { display: block; width: 84px; height: 84px; object-fit: contain; border-radius: 4px; filter: grayscale(1); opacity: 0.8; }
        .exam-category-label, .exam-category-title, .exam-category-group-title { font-family: 'Category Condensed', 'Arial Narrow', sans-serif; font-weight: 300; text-transform: uppercase; letter-spacing: 0; }
        .exam-category-label { min-height: 40px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 18px; line-height: 20px; }
        .exam-category-group-title { font-size: 17px; line-height: 22px; color: #374151; }
        .exam-category-item:hover { transform: translateY(-2px); }
        @keyframes category-enter { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 480px) {
          .exam-category-group { flex-basis: 100%; max-width: none; padding: 10px 10px 12px; border-radius: 18px; }
          .exam-category-group-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .exam-category-item { min-height: 132px; padding: 12px 8px 10px; }
          .exam-category-art { flex-basis: 68px; width: 68px; height: 68px; }
          .exam-category-art img { width: 68px; height: 68px; }
          .exam-category-label { font-size: 17px; }
        }
        @media (max-width: 360px) {
          .exam-category-group-grid { grid-template-columns: minmax(0, 1fr); }
          .exam-category-item { min-height: 76px; flex-direction: row; align-items: center; }
          .exam-category-art { flex-basis: 56px; width: 56px; height: 56px; }
          .exam-category-art img { width: 56px; height: 56px; }
          .exam-category-label { min-height: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .exam-category-item { animation: none; transition: none; }
          .exam-category-item:hover { transform: none; }
        }
      `}</style>
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
