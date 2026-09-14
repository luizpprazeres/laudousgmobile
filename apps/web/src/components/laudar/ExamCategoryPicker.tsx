'use client'

import { useState } from 'react'
import { ScanLine, Search, X } from 'lucide-react'
import { GENERIC_CATEGORIES } from '@/lib/deterministic'
import { categoryDotClass } from './categoryPresentation'
import { EXAM_CATEGORY_IMAGES } from './examCategoryImages'

const categories = [
  ...GENERIC_CATEGORIES.map(({ id, name }) => ({
    id, name: id === 'DOPPLER_OBSTETRICO' ? 'Obstétrica com Doppler' : name,
  })),
  { id: 'TIREOIDE', name: 'Tireoide' },
]
function normalized(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function CategoryArtwork({ categoryId }: { categoryId: string }) {
  const [failed, setFailed] = useState(false)
  const src = EXAM_CATEGORY_IMAGES[categoryId]
  return <span className="exam-category-art" aria-hidden="true">
    {src && !failed
      ? <img src={src} alt="" width={112} height={112} decoding="async" onError={() => setFailed(true)} />
      : <ScanLine className="h-8 w-8 text-gray-400" />}
  </span>
}

export function ExamCategoryPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const visible = categories.filter(({ name }) => normalized(name).includes(normalized(query.trim())))
  return (
    <main className="exam-category-picker min-h-screen bg-white px-5 py-8 text-gray-900">
      <style>{`
        @font-face { font-family: 'Category Condensed'; src: url('/fonts/BarlowCondensed-Light.ttf') format('truetype'); font-style: normal; font-weight: 300; font-display: swap; }
        .exam-category-picker { letter-spacing: 0; color-scheme: light; background: #fff; color: #111827; }
        .exam-category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
        .exam-category-item { position: relative; min-width: 0; min-height: 184px; animation: category-enter 180ms ease-out both; }
        .exam-category-art { display: flex; flex: 0 0 112px; width: 112px; height: 112px; align-items: center; justify-content: center; align-self: center; }
        .exam-category-art img { display: block; width: 112px; height: 112px; object-fit: contain; border-radius: 4px; filter: grayscale(1); opacity: 0.8; }
        .exam-category-label, .exam-category-title { font-family: 'Category Condensed', 'Arial Narrow', sans-serif; font-weight: 300; text-transform: uppercase; letter-spacing: 0; }
        .exam-category-label { min-height: 48px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 20px; line-height: 24px; }
        .exam-category-item:hover { transform: translateY(-3px); }
        @keyframes category-enter { from { opacity: 0; } to { opacity: 1; } }
        @media (min-width: 1100px) {
          .exam-category-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); padding-bottom: 14px; }
          .exam-category-item:nth-child(even) { position: relative; top: 12px; }
        }
        @media (max-width: 480px) {
          .exam-category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .exam-category-item { padding: 14px 10px; min-height: 184px; }
        }
        @media (max-width: 360px) {
          .exam-category-grid { grid-template-columns: minmax(0, 1fr); }
          .exam-category-item { min-height: 100px; flex-direction: row; align-items: center; }
          .exam-category-art { flex-basis: 76px; width: 76px; height: 76px; }
          .exam-category-art img { width: 76px; height: 76px; }
          .exam-category-label { min-height: 0; align-items: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .exam-category-item { animation: none; transition: none; }
          .exam-category-item:hover { transform: none; }
        }
      `}</style>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <img src="/icons/apple-touch-icon.png" alt="" width="36" height="36" className="h-9 w-9 rounded-lg" />
          <span className="text-xl font-semibold">Laudo<span className="text-emerald-600">USG</span></span>
        </div>
        <h1 className="exam-category-title text-center text-[28px] leading-tight">Qual exame você deseja realizar?</h1>
        <div className="relative mx-auto mb-8 mt-6 max-w-md">
          <Search aria-hidden="true" className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)}
            aria-label="Buscar categoria" placeholder="Buscar exame"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" title="Limpar busca"
            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>}
        </div>
        <div className="exam-category-grid" aria-label="Categorias de exame">
          {visible.map(({ id, name }) => {
            return <button key={id} type="button" onClick={() => onSelect(id)}
              className="exam-category-item flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
              <span aria-hidden="true" className={`absolute right-3 top-3 h-2 w-2 rounded-full ${categoryDotClass(id)}`} />
              <CategoryArtwork categoryId={id} />
              <span className="exam-category-label w-full break-words">{name}</span>
            </button>
          })}
        </div>
        {visible.length === 0 && <p role="status" className="py-10 text-center text-sm text-gray-500">Nenhum exame encontrado.</p>}
      </div>
    </main>
  )
}
