'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReducedMotionSafe } from './useReducedMotionSafe'
import { Check, Copy } from 'lucide-react'
import { PlansLink, SignupCta } from './Cta'

/**
 * HERO: a sensação de usar o LaudoUSG na primeira dobra.
 *
 * É uma DEMONSTRAÇÃO local e declarada. Os achados são sintéticos, o texto é
 * um exemplo fixo escrito aqui, e nada vai a servidor. O produto real monta o
 * laudo no renderer canônico; esta vitrine só mostra a experiência: clicar
 * no achado e ver o laudo mudar na hora.
 *
 * Etapas expostas para QA em `data-stage`: `achados` (esperando), `redigindo`
 * (texto sendo escrito) e `laudo` (texto completo).
 */

type OrganId = 'figado' | 'vesicula' | 'rim' | 'bexiga'
type Organ = {
  id: OrganId
  label: string
  options: Array<{ id: string; label: string; body: string; conclusion?: string }>
}

const ORGANS: Organ[] = [
  {
    id: 'figado',
    label: 'Fígado',
    options: [
      { id: 'normal', label: 'Normal', body: 'Fígado de dimensões normais, contornos regulares e ecotextura homogênea.' },
      { id: 'esteatose', label: 'Esteatose leve', body: 'Fígado de dimensões normais, contornos regulares, com aumento difuso e leve da ecogenicidade do parênquima.', conclusion: 'Esteatose hepática leve.' },
    ],
  },
  {
    id: 'vesicula',
    label: 'Vesícula',
    options: [
      { id: 'normal', label: 'Normal', body: 'Vesícula biliar normodistendida, de paredes finas e conteúdo anecoico.' },
      { id: 'calculo', label: 'Cálculo', body: 'Vesícula biliar normodistendida, de paredes finas, contendo imagem hiperecogênica móvel com sombra acústica posterior.', conclusion: 'Colelitíase.' },
    ],
  },
  {
    id: 'rim',
    label: 'Rim direito',
    options: [
      { id: 'normal', label: 'Normal', body: 'Rim direito de forma, dimensões e ecotextura preservadas, sem dilatação do sistema coletor.' },
      { id: 'cisto', label: 'Cisto simples', body: 'Rim direito de dimensões preservadas, com imagem anecoica de paredes finas e reforço acústico posterior no terço médio, sem septos ou componente sólido.', conclusion: 'Cisto renal simples à direita.' },
    ],
  },
  {
    id: 'bexiga',
    label: 'Bexiga',
    options: [
      { id: 'normal', label: 'Normal', body: 'Bexiga com boa repleção, paredes regulares e conteúdo anecoico.' },
      { id: 'espessada', label: 'Parede espessada', body: 'Bexiga com boa repleção e espessamento difuso das paredes.', conclusion: 'Espessamento parietal vesical.' },
    ],
  },
]

const SCRIPT: Array<[OrganId, string]> = [['figado', 'esteatose'], ['vesicula', 'calculo'], ['rim', 'cisto']]
const INITIAL: Record<OrganId, string> = { figado: 'normal', vesicula: 'normal', rim: 'normal', bexiga: 'normal' }

function composeDemo(state: Record<OrganId, string>) {
  const picked = ORGANS.map((o) => o.options.find((opt) => opt.id === state[o.id]) ?? o.options[0])
  const conclusions = picked.map((p) => p.conclusion).filter(Boolean) as string[]
  return {
    body: picked.map((p) => p.body),
    // A vitrine mostra só quatro estruturas: nunca concluir "abdome normal".
    conclusion: conclusions.length ? conclusions : ['Estruturas demonstradas sem alterações.'],
  }
}

export default function HeroWorkspace() {
  const reduce = useReducedMotionSafe()
  const [state, setState] = useState<Record<OrganId, string>>(INITIAL)
  const [changed, setChanged] = useState<OrganId | null>(null)
  /** Órgão aberto no layout mobile (uma aba por vez). */
  const [focusOrgan, setFocusOrgan] = useState<OrganId>('figado')
  const [typed, setTyped] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const userTook = useRef(false)
  const doc = useMemo(() => composeDemo(state), [state])
  const stage = typed !== null ? 'redigindo' : changed ? 'laudo' : 'achados'

  const choose = useCallback((organ: OrganId, option: string) => {
    setState((s) => (s[organ] === option ? s : { ...s, [organ]: option }))
    setChanged(organ)
    setFocusOrgan(organ)
    setTyped(reduce ? null : 0)
  }, [reduce])

  // A frase alterada é "escrita" na hora; o resto do laudo já está lá.
  const changedIndex = changed ? ORGANS.findIndex((o) => o.id === changed) : -1
  const changedText = changedIndex >= 0 ? doc.body[changedIndex] : ''
  useEffect(() => {
    if (typed === null) return
    if (typed >= changedText.length) {
      setTyped(null)
      return
    }
    const t = window.setTimeout(() => setTyped((n) => (n === null ? null : n + 3)), 14)
    return () => window.clearTimeout(t)
  }, [typed, changedText.length])

  // Roteiro de entrada: três achados marcados sozinhos, até o médico tocar.
  useEffect(() => {
    if (reduce) {
      setState({ ...INITIAL, figado: 'esteatose', vesicula: 'calculo', rim: 'cisto' })
      return
    }
    const timers = SCRIPT.map(([organ, option], i) =>
      window.setTimeout(() => {
        if (!userTook.current) choose(organ, option)
      }, 1300 + i * 2300),
    )
    return () => timers.forEach(window.clearTimeout)
  }, [reduce, choose])

  const section = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] })
  const windowY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80])
  const glowOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.35])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText([
        'EXEMPLO ILUSTRATIVO PARCIAL. NÃO É LAUDO DE PACIENTE.',
        '',
        'ACHADOS:', ...doc.body, '', 'IMPRESSÃO:', ...doc.conclusion,
      ].join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sem permissão de área de transferência: nada a fazer na vitrine */
    }
  }

  return (
    <section
      ref={section}
      data-landing-section="hero"
      className="relative isolate overflow-hidden bg-white pt-20 min-[360px]:pt-24 lg:pt-28"
    >
      {/* Luz principal: vem de cima à direita, onde está o produto. */}
      <motion.div
        aria-hidden
        style={{ opacity: glowOpacity }}
        className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[720px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.16),rgba(16,185,129,0.04)_60%,transparent)]"
      />
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-6 px-5 pb-16 sm:px-8 lg:min-h-[calc(100dvh-7rem)] lg:grid-cols-12 lg:gap-8 lg:px-12 lg:pb-24">
        {/* Título e produto visíveis já no HTML do servidor: nada da primeira
            dobra depende de JS para aparecer em rede lenta. */}
        <div className="lg:col-span-5">
          <p className="mb-5 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-emerald-700">Para ultrassonografistas</p>
          <h1 className="font-barlow text-[2.1rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-slate-950 min-[360px]:text-[2.6rem] sm:text-[3.2rem] xl:text-[3.9rem]">
            O laudo se escreve enquanto você <span className="text-emerald-600">examina.</span>
          </h1>
          <p className="mt-4 max-w-[34rem] text-[0.98rem] leading-relaxed text-slate-600 min-[360px]:mt-6 min-[360px]:text-[1.06rem]">
            Marque os achados em cards por órgão. O laudo aparece redigido no seu estilo, pronto para revisar e copiar.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 min-[360px]:mt-8">
            <SignupCta size="lg" />
            <span className="hidden min-[360px]:inline-flex"><PlansLink /></span>
          </div>
        </div>

        {/* O produto: sai da coluna e encosta na borda direita no desktop. */}
        <motion.div
          style={{ y: windowY }}
          className="lg:col-span-7 lg:-mr-12 xl:-mr-[max(3rem,calc((100vw-1440px)/2+3rem))]"
        >
          <div
            data-hero-demo
            data-stage={stage}
            className="relative overflow-hidden rounded-[22px] border border-slate-900/10 bg-slate-50 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_40px_80px_-40px_rgba(15,23,42,0.45),0_12px_24px_-12px_rgba(15,23,42,0.18)] lg:rounded-r-none"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 text-[0.8rem] font-semibold text-slate-800">
                  Abdome total
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-800">Demonstração</span>
              </div>
              <span role="status" aria-live="polite" className="sr-only whitespace-nowrap text-[0.72rem] font-medium text-slate-500 sm:not-sr-only">
                {stage === 'redigindo' ? 'Redigindo…' : stage === 'laudo' ? 'Laudo atualizado' : 'Marque um achado'}
              </span>
            </div>

            {/* MOBILE: uma aba por órgão; opções e o trecho do laudo no mesmo card,
                para o achado e o texto ficarem lado a lado na mesma tela. */}
            <div className="p-3 md:hidden">
              <div role="group" aria-label="Escolher órgão de exemplo" className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-200/60 p-1">
                {ORGANS.map((organ) => {
                  const selected = focusOrgan === organ.id
                  const altered = state[organ.id] !== 'normal'
                  return (
                    <button
                      key={organ.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        userTook.current = true
                        setFocusOrgan(organ.id)
                      }}
                      className={`min-h-11 truncate rounded-xl px-1 text-[0.74rem] font-semibold transition-colors ${
                        selected ? 'bg-white text-slate-950 shadow-sm' : altered ? 'text-emerald-800' : 'text-slate-600'
                      }`}
                    >
                      {organ.label.replace(' direito', '')}
                    </button>
                  )
                })}
              </div>
              {(() => {
                const organ = ORGANS.find((o) => o.id === focusOrgan)!
                const index = ORGANS.indexOf(organ)
                const line = doc.body[index]
                const isTyping = changed === organ.id && typed !== null
                return (
                  <div data-hero-organ={organ.id} className="mt-2.5 rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-[0.84rem] font-semibold text-slate-900">{organ.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {organ.options.map((opt) => {
                        const active = state[organ.id] === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              userTook.current = true
                              choose(organ.id, opt.id)
                            }}
                            className={`min-h-11 rounded-xl border px-3 text-[0.82rem] font-medium transition-colors active:scale-[0.98] ${
                              active
                                ? opt.id === 'normal' ? 'border-slate-300 bg-slate-100 text-slate-900' : 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 border-t border-slate-100 pt-3 font-['Times_New_Roman',Georgia,serif] text-[0.9rem] leading-[1.55] text-slate-800">
                      <p className="mb-1 font-sans text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">No laudo</p>
                      {/* Altura reservada para a frase mais longa: a digitação não empurra a página. */}
                      <p className={`min-h-[7.8rem] min-[400px]:min-h-[6.3rem] ${changed === organ.id ? 'rounded-sm bg-emerald-50' : ''}`}>
                        {isTyping ? line.slice(0, typed ?? 0) : line}
                      </p>
                      <p className="mt-2 font-sans text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">Impressão</p>
                      <p>{doc.conclusion.join(' ')}</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="hidden grid-cols-1 md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 md:grid-cols-1 md:p-4" aria-label="Achados de exemplo">
                {ORGANS.map((organ) => (
                  <fieldset key={organ.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <legend className="sr-only">{organ.label}</legend>
                    <p aria-hidden className="mb-2 text-[0.82rem] font-semibold text-slate-900">{organ.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {organ.options.map((opt) => {
                        const active = state[organ.id] === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              userTook.current = true
                              choose(organ.id, opt.id)
                            }}
                            className={`min-h-11 rounded-xl border px-3 text-[0.8rem] font-medium transition-[background-color,border-color,color] duration-150 active:scale-[0.98] md:min-h-9 ${
                              active
                                ? opt.id === 'normal'
                                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                                  : 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>

              <article
                aria-label="Laudo de exemplo"
                className="relative m-3 mt-0 rounded-2xl border border-slate-200 bg-white px-5 py-5 font-['Times_New_Roman',Georgia,serif] text-[0.92rem] leading-[1.6] text-slate-800 md:m-4 md:ml-0 md:min-h-[420px]"
              >
                <h2 className="mb-1 text-center text-[0.86rem] font-bold uppercase tracking-wide">Prévia parcial do laudo</h2>
                <p className="mb-4 text-center font-sans text-[0.7rem] text-slate-500">Exemplo ilustrativo com achados sintéticos. O produto completo fica na sua conta.</p>
                <p className="mb-1 text-[0.78rem] font-bold uppercase">Achados:</p>
                {doc.body.map((line, i) => {
                  const isChanged = i === changedIndex
                  const shown = isChanged && typed !== null ? line.slice(0, typed) : line
                  return (
                    <p key={ORGANS[i].id} className={`mb-2 rounded-sm transition-colors duration-700 ${isChanged ? 'bg-emerald-50' : 'bg-transparent'}`}>
                      {shown}
                      {isChanged && typed !== null ? <span aria-hidden className="ml-px inline-block h-[1em] w-px translate-y-[2px] bg-emerald-600" /> : null}
                    </p>
                  )
                })}
                <p className="mb-1 mt-4 text-[0.78rem] font-bold uppercase">Impressão:</p>
                {doc.conclusion.map((c) => <p key={c}>{c}</p>)}
                <button
                  type="button"
                  onClick={copy}
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 px-3 font-sans text-[0.78rem] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 md:min-h-9"
                >
                  {copied ? <Check aria-hidden className="h-3.5 w-3.5 text-emerald-600" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
                  {copied ? 'Exemplo copiado' : 'Copiar exemplo'}
                </button>
              </article>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
