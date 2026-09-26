'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/**
 * ESQUEMAS: a cena de mockups sobrepostos, em grafite, com luz lateral.
 *
 * Só RECORTES. Cada imagem em `/landing/esquemas/` foi cortada do asset do
 * produto antes de publicar: o arquivo servido é o fragmento, não o esquema
 * inteiro escondido por CSS. Isso reduz o que se entrega; não é proteção
 * contra cópia e não se afirma como tal.
 *
 * A rolagem abre o baralho, de reunido para a diagonal (`data-stage`:
 * `reunidos` → `abertos`). Tocar num card o traz para a frente.
 */

type Card = { id: string; title: string; caption: string; src: string; w: number; h: number; alt: string; soon?: boolean }

const CARDS: Card[] = [
  { id: 'mama', title: 'Mamas', caption: 'Horas e quadrantes', src: '/landing/esquemas/esquema-mama.jpg', w: 520, h: 422, alt: 'Recorte do esquema de mama com as posições em horas' },
  { id: 'tireoide', title: 'Tireoide', caption: 'Lobos e istmo', src: '/landing/esquemas/esquema-tireoide.jpg', w: 416, h: 520, alt: 'Recorte do esquema da tireoide mostrando um lobo e a traqueia' },
  { id: 'fetal', title: 'Posição fetal', caption: 'Apresentação e situação', src: '/landing/esquemas/esquema-fetal.jpg', w: 440, h: 440, alt: 'Recorte da ilustração de posição fetal' },
  { id: 'venoso', title: 'Mapa venoso', caption: 'Trajeto das safenas', src: '/landing/esquemas/esquema-venoso.jpg', w: 196, h: 560, alt: 'Recorte de uma vista do mapa venoso de membro inferior', soon: true },
]

/**
 * Posição aberta de cada card. O `x`/`y` em % do transform é relativo ao
 * PRÓPRIO card (não à cena): -90% a 90% abre o baralho em diagonal com
 * sobreposição parcial, sem esconder um card inteiro atrás do outro.
 */
const OPEN = [
  { x: -90, y: 8, r: -7 },
  { x: -30, y: -6, r: -2 },
  { x: 30, y: 6, r: 3 },
  { x: 90, y: -8, r: 8 },
]

function DeckCard({
  card, index, progress, active, onSelect,
}: {
  card: Card; index: number; progress: MotionValue<number>; active: boolean; onSelect: () => void
}) {
  const o = OPEN[index]
  const x = useTransform(progress, [0, 1], [`${index * 2}%`, `${o.x}%`])
  const y = useTransform(progress, [0, 1], [`${index * -2}%`, `${o.y}%`])
  const rotate = useTransform(progress, [0, 1], [index * 1.5 - 2, o.r])
  return (
    <motion.button
      type="button"
      // Os controles textuais abaixo são o caminho de teclado; o card é o alvo do mouse/toque.
      tabIndex={-1}
      aria-hidden
      onClick={onSelect}
      style={{ x, y, rotate, zIndex: active ? 20 : 10 + index }}
      whileHover={{ scale: 1.02 }}
      className={`absolute inset-0 m-auto h-fit w-[min(34%,320px)] overflow-hidden rounded-[18px] border text-left transition-[box-shadow,border-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        active ? 'border-white/25 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(52,211,153,0.35)]' : 'border-white/10 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]'
      }`}
      data-scheme-card={card.id}
    >
      <CardFace card={card} />
    </motion.button>
  )
}

function CardFace({ card }: { card: Card }) {
  return (
    <>
      <div className="flex items-center justify-between bg-[#161B22] px-4 py-3">
        <span className="text-[0.86rem] font-semibold text-white">{card.title}</span>
        {card.soon ? (
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-300">Em breve</span>
        ) : (
          <span className="text-[0.72rem] text-slate-400">{card.caption}</span>
        )}
      </div>
      <div className="relative bg-white">
        <Image
          src={card.src}
          alt={card.alt}
          width={card.w}
          height={card.h}
          loading="lazy"
          sizes="(min-width: 1024px) 360px, 70vw"
          className="mx-auto block h-[240px] w-full object-contain p-3 sm:h-[280px]"
        />
        {/* Luz lateral: a folha escurece para a direita, como sob uma luminária. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0)_40%,rgba(15,23,42,0.18))]" />
      </div>
    </>
  )
}

export default function SchemeDeck() {
  const reduce = useReducedMotionSafe()
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState('tireoide')
  const [stage, setStage] = useState<'reunidos' | 'abertos'>('reunidos')
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'center 0.55'] })
  const spread = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0, 1])
  useMotionValueEvent(spread, 'change', (v) => setStage(v > 0.5 ? 'abertos' : 'reunidos'))
  // Com movimento reduzido o baralho já nasce aberto (depois de montar).
  const shownStage = reduce ? 'abertos' : stage

  return (
    <section
      ref={ref}
      data-landing-section="esquemas"
      data-nav-dark
      className="relative isolate -mt-[6vw] overflow-hidden bg-[#0B0F14] pb-24 pt-[calc(6vw+6rem)] text-white [clip-path:polygon(0_6vw,100%_0,100%_100%,0_100%)] lg:pb-32"
    >
      {/* Fonte de luz à esquerda, fora da tela. */}
      <div aria-hidden className="pointer-events-none absolute -left-[20%] top-1/4 -z-10 h-[70%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.10),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 -z-10 h-full w-1/2 bg-[radial-gradient(60%_50%_at_80%_60%,rgba(16,185,129,0.10),transparent)]" />

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
        <div className="lg:col-span-4">
          <h2 className="font-barlow text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.025em] sm:text-[3rem]">
            Esquemas que nascem do laudo.
          </h2>
          <p className="mt-5 max-w-[30rem] text-[1.02rem] leading-relaxed text-slate-300">
            Mama, tireoide e posição fetal acompanham os achados descritos. O mapa venoso vem em breve. Aqui você vê recortes; o esquema inteiro fica no seu exame.
          </p>
        </div>

        {/* Desktop: baralho em diagonal, abre com a rolagem. */}
        <div
          data-scheme-deck
          data-stage={shownStage}
          data-active-card={active}
          className="relative hidden h-[620px] lg:col-span-8 lg:block"
        >
          {CARDS.map((card, i) => (
            <DeckCard key={card.id} card={card} index={i} progress={spread} active={active === card.id} onSelect={() => setActive(card.id)} />
          ))}
          <div role="group" aria-label="Trazer esquema para a frente" className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2">
            {CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                aria-pressed={active === card.id}
                onClick={() => setActive(card.id)}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[0.84rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  active === card.id ? 'border-emerald-400/60 bg-emerald-400/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/30 hover:text-white'
                }`}
              >
                {card.title}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: faixa lateral com snap; sem baralho sobreposto. */}
        <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 sm:-mx-8 sm:px-8 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CARDS.map((card, i) => (
            <li
              key={card.id}
              data-scheme-card={card.id}
              className={`w-[76%] flex-none snap-center overflow-hidden rounded-[18px] border border-white/10 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] sm:w-[48%] ${i % 2 ? 'rotate-[1.5deg]' : '-rotate-[1.5deg]'}`}
            >
              <CardFace card={card} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
