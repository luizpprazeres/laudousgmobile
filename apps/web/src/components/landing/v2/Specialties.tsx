'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'
import { CATEGORY_GROUPS } from '@/components/laudar/categoryGroups'
import { EXAM_CATEGORY_IMAGES } from '@/components/laudar/examCategoryImages'

/**
 * ESPECIALIDADES: exatamente os grupos e exames do seletor da Web.
 *
 * Os nomes repetem os do catálogo (sem importar o motor determinístico, que
 * não cabe no bundle da landing). Se uma categoria entrar no seletor, ela
 * aparece aqui pelo `CATEGORY_GROUPS`; se não tiver nome abaixo, cai no id.
 *
 * Desktop: cinco colunas que deslizam em ritmos diferentes com a rolagem,
 * ocupando a largura toda. Mobile: uma faixa horizontal por grupo, com snap.
 */

const NAMES: Record<string, string> = {
  ABDOMEN_TOTAL: 'Abdome total',
  ABDOMEN_SUPERIOR: 'Abdome superior',
  VIAS_URINARIAS: 'Vias urinárias',
  PROSTATA_SUPRAPUBICA: 'Próstata',
  DOPPLER_CAROTIDAS: 'Doppler de carótidas e vertebrais',
  OBSTETRICA: 'Obstétrica',
  DOPPLER_OBSTETRICO: 'Obstétrica com Doppler',
  MORFOLOGICO: 'Morfológica',
  CERVICOMETRIA: 'Cervicometria',
  PELVE_FEMININA: 'Pelve feminina',
  MAMARIA: 'Mamas e axilas',
  TIREOIDE: 'Tireoide',
  CERVICAL: 'Cervical',
  PARTES_MOLES: 'Partes moles',
  MUSCULOESQUELETICO: 'Musculoesquelético',
}

const DRIFT = [40, -30, 60, -50, 30]

function Tile({ id, className = '' }: { id: string; className?: string }) {
  const src = EXAM_CATEGORY_IMAGES[id]
  return (
    <li
      data-category-tile={id}
      className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 pr-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_14px_30px_-18px_rgba(5,150,105,0.45)] ${className}`}
    >
      {src ? (
        <Image src={src} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 flex-none rounded-xl bg-slate-50 object-cover grayscale" />
      ) : null}
      <span className="text-[0.92rem] font-semibold leading-snug text-slate-900">{NAMES[id] ?? id}</span>
    </li>
  )
}

function Column({ index, progress, label, ids }: { index: number; progress: MotionValue<number>; label: string; ids: string[] }) {
  const reduce = useReducedMotionSafe()
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [DRIFT[index], -DRIFT[index]])
  return (
    <motion.div style={{ y }} className="min-w-0" data-specialty-group={label}>
      <h3 className="mb-3 px-1 font-barlow text-[1.15rem] font-bold text-slate-950">{label}</h3>
      <ul className="flex flex-col gap-2.5">
        {ids.map((id) => <Tile key={id} id={id} />)}
      </ul>
    </motion.div>
  )
}

export default function Specialties() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const total = CATEGORY_GROUPS.reduce((n, g) => n + g.categories.length, 0)

  return (
    <section ref={ref} data-landing-section="especialidades" className="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="max-w-[46rem]">
          <h2 className="font-barlow text-[2.2rem] font-extrabold leading-[1.04] tracking-[-0.025em] text-slate-950 sm:text-[3rem]">
            {total} exames, organizados como você pensa o dia.
          </h2>
          <p className="mt-4 max-w-[38rem] text-[1.02rem] leading-relaxed text-slate-600">
            Da medicina interna ao musculoesquelético, cada exame abre com os órgãos do jeito que você examina.
          </p>
        </div>

        {/* Desktop: colunas com deriva na rolagem. */}
        <div className="mt-14 hidden grid-cols-5 gap-5 lg:grid">
          {CATEGORY_GROUPS.map((group, i) => (
            <Column key={group.id} index={i} progress={scrollYProgress} label={group.label} ids={group.categories} />
          ))}
        </div>

        {/* Mobile e tablet: um grupo por faixa, rolagem lateral com snap. */}
        <div className="mt-10 space-y-8 lg:hidden">
          {CATEGORY_GROUPS.map((group) => (
            <div key={group.id} data-specialty-group={group.label}>
              <h3 className="mb-3 font-barlow text-[1.1rem] font-bold text-slate-950">{group.label}</h3>
              <ul className="-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {group.categories.map((id) => (
                  <Tile key={id} id={id} className="w-[78%] flex-none snap-start sm:w-[46%]" />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
