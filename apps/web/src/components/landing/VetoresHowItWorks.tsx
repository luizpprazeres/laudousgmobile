'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { Mic, Database, FileText, Zap } from 'lucide-react'

const BLOCKS = [
  'Fígado e esteatose',
  'Rins e cistos',
  'Medidas e topografia',
  'Útero e anexos',
  'Vesícula e vias biliares',
  'Conclusão numerada',
]

const EXAMPLES = [
  {
    achado: 'fígado com esteatose leve',
    match: [0, 5],
    laudo:
      'Fígado com discreto aumento difuso da ecogenicidade parenquimatosa, compatível com esteatose hepática leve.',
  },
  {
    achado: 'cisto simples no rim direito',
    match: [1, 2],
    laudo:
      'Rim direito com imagem anecoica de paredes finas, sem septações, no terço inferior, compatível com cisto simples.',
  },
  {
    achado: 'útero em anteversão, endométrio 8 mm',
    match: [3, 2],
    laudo:
      'Útero em anteversão, contornos regulares. Eco endometrial centrado e homogêneo, medindo 0,8 cm.',
  },
]

// Tempo (em ticks de 1100ms): 0 = achado, 1 = busca, 2 = laudo, 3 = respiro.
const STEP_OF_TICK = [0, 1, 2, 2]

export default function VetoresHowItWorks() {
  const reduce = useReducedMotion()
  const [ex, setEx] = useState(0)
  const [step, setStep] = useState(reduce ? 2 : 0)

  useEffect(() => {
    if (reduce) return
    let tick = 0
    const id = setInterval(() => {
      tick = (tick + 1) % STEP_OF_TICK.length
      setStep(STEP_OF_TICK[tick])
      if (tick === 0) setEx((e) => (e + 1) % EXAMPLES.length)
    }, 1100)
    return () => clearInterval(id)
  }, [reduce])

  const current = EXAMPLES[ex]
  const matched = (i: number) => current.match.includes(i)
  const showMatch = step >= 1
  const showLaudo = step >= 2

  const pick = (i: number) => {
    setEx(i)
    setStep(2)
  }

  return (
    <section className="bg-white px-6 sm:px-10 py-20 sm:py-24">
      <div className="max-w-[1080px] mx-auto">
        <div className="max-w-[640px] mb-12">
          <h2 className="font-barlow font-extrabold text-[2rem] sm:text-[2.5rem] leading-[1.08] tracking-[-0.02em] text-[#0f172a] mb-4">
            Não é a IA inventando.{' '}
            <span className="text-emerald-600">É o conhecimento certo, na hora certa.</span>
          </h2>
          <p className="text-[0.96rem] leading-[1.7] text-slate-600 max-w-[540px]">
            Quando você dita um achado, o sistema procura por similaridade os trechos de
            conhecimento clínico mais parecidos e monta o laudo a partir deles. O resultado é
            consistente e fiel à boa prática, não um texto solto.
          </p>
        </div>

        {/* Seletor de exemplos (interativo) */}
        <div className="flex flex-wrap gap-2 mb-7">
          {EXAMPLES.map((e, i) => (
            <button
              key={e.achado}
              onClick={() => pick(i)}
              aria-pressed={i === ex}
              className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition-colors duration-200 border ${
                i === ex
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200 hover:text-slate-700'
              }`}
            >
              {e.achado}
            </button>
          ))}
        </div>

        {/* Diagrama */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_1fr] gap-5 lg:gap-4 items-center">
          {/* 1. Achado ditado */}
          <Stage icon={Mic} label="Você dita">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.achado}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-[0.92rem] text-[#0f172a] font-medium leading-snug"
              >
                &ldquo;{current.achado}&rdquo;
              </motion.p>
            </AnimatePresence>
          </Stage>

          {/* 2. Busca por similaridade */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-3 text-slate-400">
              <Database className="w-4 h-4" strokeWidth={1.8} />
              <span className="text-[0.66rem] font-bold uppercase tracking-[0.1em]">Busca por similaridade</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BLOCKS.map((b, i) => {
                const on = showMatch && matched(i)
                return (
                  <motion.div
                    key={b}
                    animate={
                      reduce
                        ? undefined
                        : { scale: on ? 1 : 0.98, opacity: on || !showMatch ? 1 : 0.4 }
                    }
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={`rounded-lg px-2.5 py-2 text-[0.7rem] leading-tight border transition-colors duration-300 ${
                      on
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-[0_4px_14px_rgba(16,185,129,0.18)]'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {b}
                  </motion.div>
                )
              })}
            </div>

            {/* Latência ~0,2s */}
            <motion.div
              animate={reduce ? undefined : { opacity: showMatch ? 1 : 0, y: showMatch ? 0 : 6 }}
              transition={{ duration: 0.4 }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1 text-[0.7rem] font-bold"
            >
              <Zap className="w-3.5 h-3.5" strokeWidth={2.4} fill="currentColor" />
              conecta em ~0,2 s
            </motion.div>
          </div>

          {/* 3. Laudo montado */}
          <Stage icon={FileText} label="Laudo pronto" accent>
            <AnimatePresence mode="wait">
              {showLaudo ? (
                <motion.p
                  key={current.laudo}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-[0.84rem] text-slate-700 leading-[1.55]"
                >
                  {current.laudo}
                </motion.p>
              ) : (
                <motion.div
                  key="skeleton"
                  initial={false}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-2"
                  aria-hidden
                >
                  {[100, 92, 70].map((w) => (
                    <span key={w} className="h-2.5 rounded bg-slate-200" style={{ width: `${w}%` }} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Stage>
        </div>
      </div>
    </section>
  )
}

function Stage({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: typeof Mic
  label: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 min-h-[128px] flex flex-col ${
        accent ? 'border-emerald-200' : 'border-slate-200'
      }`}
    >
      <div className={`flex items-center gap-2 mb-3 ${accent ? 'text-emerald-600' : 'text-slate-400'}`}>
        <Icon className="w-4 h-4" strokeWidth={1.8} />
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  )
}
