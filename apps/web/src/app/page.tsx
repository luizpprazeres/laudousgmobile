'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'
import { Zap, PenLine, Sparkles, Waypoints } from 'lucide-react'
import MobileFirst from '@/components/landing/MobileFirst'
import VetoresHowItWorks from '@/components/landing/VetoresHowItWorks'
import SalaEquipe from '@/components/landing/SalaEquipe'
import Esquemas from '@/components/landing/Esquemas'
import ComOuSemIA from '@/components/landing/ComOuSemIA'
import Stores from '@/components/landing/Stores'
import Pricing from '@/components/landing/Pricing'

// ── Transcrição em tempo real (visual do card Velocidade) ────────────────────
const TRANSCRIPT_LINES = [
  'Fígado de dimensões normais, ecotextura homogênea.',
  'Vesícula biliar sem cálculos, parede fina.',
  'Veia porta de calibre normal, cerca de 11 mm.',
  'Baço homogêneo, dimensões preservadas.',
  'Rins de topografia habitual, sem dilatações.',
  'Bexiga com paredes regulares, sem espessamentos.',
  'Útero em anteversão, endométrio medindo 0,8 cm.',
  'Ovário direito com imagens anecoicas simples.',
  'Doppler uterino: IR 0,59 bilateral, sem notch.',
  'Fluxo diastólico presente na artéria umbilical.',
]

function RecordingTranscript() {
  const [lines, setLines] = useState<string[]>([TRANSCRIPT_LINES[0]])
  const [idx, setIdx] = useState(1)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLines(TRANSCRIPT_LINES.slice(0, 4))
      return
    }
    const t = setInterval(() => {
      setLines(prev => {
        const next = [...prev, TRANSCRIPT_LINES[idx % TRANSCRIPT_LINES.length]]
        return next.length > 4 ? next.slice(-4) : next
      })
      setIdx(i => i + 1)
    }, 1800)
    return () => clearInterval(t)
  }, [idx])

  return (
    <div className="hidden lg:block flex-shrink-0 w-[300px] relative">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[0.7rem] font-bold text-red-400 uppercase tracking-[0.1em]">Gravando</span>
      </div>
      <div
        className="overflow-hidden"
        style={{
          height: '90px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
        }}
      >
        <div
          className="flex flex-col gap-1 transition-transform duration-700 ease-out"
          style={{ transform: `translateY(${Math.max(0, lines.length - 4) * -22}px)` }}
        >
          {lines.map((line, i) => (
            <p
              key={i}
              className="text-[0.72rem] text-slate-500 leading-[1.5] font-mono truncate"
              style={{ opacity: i === lines.length - 1 ? 1 : 0.4 }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Animação de scroll reveal ─────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
}

// ── Entrada do hero (stagger no load) ─────────────────────────────────────────
const heroContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
}
const heroItem = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
}

// ── CTA pílula expandível ─────────────────────────────────────────────────────
function CtaPill({ expanded = false, onDark = false, large = false }: { expanded?: boolean; onDark?: boolean; large?: boolean }) {
  const pad = large ? 'px-6 py-3.5' : expanded ? 'px-[14px] py-[11px]' : 'px-[14px] py-[9px] hover:pr-5'
  const iconSize = large ? 'w-5 h-5' : 'w-[17px] h-[17px]'
  const textSize = large ? 'text-[0.98rem]' : 'text-[0.82rem]'
  const spanCls = large
    ? 'max-w-[220px] ml-2.5'
    : expanded ? 'max-w-[160px] ml-2' : 'max-w-0 group-hover:max-w-[160px] group-hover:ml-2'
  return (
    <Link
      href="/signup"
      className={`group inline-flex items-center overflow-hidden text-white rounded-full transition-all duration-[350ms] ease-[cubic-bezier(.4,0,.2,1)] active:scale-[0.98] ${onDark ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-[#0f172a] hover:bg-[#1e293b]'} ${large ? 'shadow-[0_8px_24px_rgba(15,23,42,0.22)] hover:shadow-[0_12px_30px_rgba(15,23,42,0.28)]' : ''} ${pad}`}
    >
      <svg className={`${iconSize} flex-shrink-0`} viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2">
        <circle cx="9" cy="7" r="3" />
        <path d="M4 16c0-3 2.2-5 5-5s5 2 5 5" />
      </svg>
      <span
        className={`overflow-hidden whitespace-nowrap ${textSize} font-semibold transition-all duration-[350ms] ease-[cubic-bezier(.4,0,.2,1)] ${spanCls}`}
      >
        Criar conta grátis
      </span>
    </Link>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [counts, setCounts] = useState({ cat: 0, ms: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCounts({ cat: 35, ms: 2800 })
      return
    }
    let timer: ReturnType<typeof setInterval> | undefined
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      const targets = { cat: 35, ms: 2800 }
      const current = { cat: 0, ms: 0 }
      timer = setInterval(() => {
        let done = true
        const next = { ...current }
        for (const k of Object.keys(targets) as Array<keyof typeof targets>) {
          if (current[k] < targets[k]) {
            const step = Math.ceil(targets[k] / 40)
            current[k] = Math.min(current[k] + step, targets[k])
            next[k] = current[k]
            done = false
          }
        }
        setCounts({ ...next })
        if (done && timer) clearInterval(timer)
      }, 30)
    }, { threshold: 0.2 })
    obs.observe(el)
    return () => {
      obs.disconnect()
      if (timer) clearInterval(timer)
    }
  }, [])

  const msDisplay = counts.ms >= 1000
    ? `~${(counts.ms / 1000).toFixed(counts.ms === 2800 ? 1 : 0)}s`
    : `${counts.ms}ms`

  return (
    <div ref={containerRef} className="bg-slate-50 border-y border-slate-200 py-7 px-8">
      <div className="max-w-[920px] mx-auto grid grid-cols-2 divide-x divide-slate-200">
        <div className="text-center px-4">
          <div className="font-barlow font-extrabold text-[2rem] text-emerald-600 leading-none mb-1">
            {counts.cat}+
          </div>
          <div className="text-[0.75rem] text-slate-500 font-medium">especialidades de USG</div>
          <div className="text-[0.65rem] text-slate-400 mt-0.5">abdominal, obstétrico, morfológico e mais</div>
        </div>
        <div className="text-center px-4">
          <div className="font-barlow font-extrabold text-[2rem] text-emerald-600 leading-none mb-1">
            {msDisplay}
          </div>
          <div className="text-[0.75rem] text-slate-500 font-medium">do achado ao laudo completo</div>
          <div className="text-[0.65rem] text-slate-400 mt-0.5">tempo médio de geração</div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const reduce = useReducedMotion()
  // Força o play do vídeo do hero (Safari/alguns browsers ignoram o autoPlay
  // do atributo). Mudo + playsInline garante que é permitido.
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = heroVideoRef.current
    if (!v) return
    const tryPlay = () => { v.play().catch(() => {}) }
    tryPlay()
    v.addEventListener('canplay', tryPlay)
    // O Chrome pausa vídeo mudo fora da viewport e não retoma sozinho ao
    // voltar; o IntersectionObserver dá play() quando o hero reaparece.
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) tryPlay() },
      { threshold: 0.15 },
    )
    io.observe(v)
    // Retoma ao voltar pra aba.
    const onVis = () => { if (document.visibilityState === 'visible') tryPlay() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      v.removeEventListener('canplay', tryPlay)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  // Nav adaptativo: escurece sobre seções escuras (contraste correto da glass).
  const [navOnDark, setNavOnDark] = useState(false)
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-nav-dark]'))
    if (!els.length) return
    const visible = new Set<Element>()
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        }
        setNavOnDark(visible.size > 0)
      },
      { rootMargin: '0px 0px -90% 0px', threshold: 0 },
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white text-[#0f172a] selection:bg-emerald-100">

      {/* ── NAV — glass adaptativo ────────────────────────────────────────────── */}
      <header
        className={`fixed w-full top-0 z-50 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 ${
          navOnDark
            ? 'bg-slate-900/40 border-b border-white/10'
            : 'bg-white/60 border-b border-slate-200/70 shadow-[0_1px_24px_rgba(15,23,42,0.04)]'
        }`}
      >
        <div className="px-6 sm:px-10 lg:px-16 py-3.5 flex justify-between items-center">
          <LaudoUSGLogo size="md" variant={navOnDark ? 'white' : 'default'} />
          <nav className="flex items-center gap-5 sm:gap-7">
            <a href="#precos" className={`hidden sm:inline text-[0.82rem] font-medium transition-colors ${navOnDark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              Preços
            </a>
            <Link href="/login" className={`text-[0.82rem] font-medium transition-colors ${navOnDark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              Entrar
            </Link>
            <CtaPill onDark={navOnDark} />
          </nav>
        </div>
      </header>

      <main>

        {/* ── HERO — vídeo full-bleed, conteúdo à esquerda ─────────────────────── */}
        <section className="relative min-h-[100dvh] overflow-hidden bg-white">
          <video
            ref={heroVideoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/brand/hero-poster-v2.jpg"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-[72%_26%] md:object-[center_26%] pointer-events-none"
          >
            <source src="/brand/hero-loop-v2.webm" type="video/webm" />
            <source src="/brand/hero-loop-v2.mp4" type="video/mp4" />
          </video>

          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/10 to-transparent" />
          <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-white/70 via-white/15 to-transparent" />

          <div className="relative z-10 min-h-[100dvh] flex items-center px-6 sm:px-10 lg:px-16 pt-28 pb-16">
            <motion.div
              variants={heroContainer}
              initial={reduce ? false : 'hidden'}
              animate="visible"
              className="max-w-[620px] mt-[13vh]"
            >
              <motion.div variants={heroItem} className="inline-flex items-center gap-2 bg-emerald-50/90 backdrop-blur-sm border border-emerald-200 text-emerald-700 text-[0.7rem] font-bold uppercase tracking-[0.08em] px-3 py-1 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Para médicos ultrassonografistas
              </motion.div>

              <motion.h1 variants={heroItem} className="font-barlow font-extrabold leading-[1.0] tracking-[-0.03em] text-[#0f172a] mb-6">
                <span className="block text-[2.1rem] sm:text-[2.6rem] lg:text-[3rem]">Laudos de</span>
                <span className="block text-[2.1rem] sm:text-[2.6rem] lg:text-[3rem]">Ultrassonografia</span>
                <span className="block text-[2.1rem] sm:text-[2.6rem] lg:text-[3rem] text-emerald-500 italic leading-[1.15] pb-1">com IA</span>
              </motion.h1>

              <motion.p variants={heroItem} className="text-[1.02rem] text-slate-600 leading-[1.7] max-w-[440px] mb-8">
                Dite os achados. O sistema monta o laudo em segundos,{' '}
                <strong className="text-[#0f172a] font-semibold">calibrado para a sua forma de escrever</strong>.
              </motion.p>

              <motion.div variants={heroItem}>
                <CtaPill expanded large />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── MOBILE-FIRST (color-block emerald) ──────────────────────────────── */}
        <MobileFirst />

        {/* ── STATS (logo abaixo do bloco verde) ──────────────────────────────── */}
        <StatsBar />

        {/* ── COMO FUNCIONA / VETORES (diagrama animado) ──────────────────────── */}
        <VetoresHowItWorks />

        {/* ── DIFERENCIAIS (bento enxuto) ─────────────────────────────────────── */}
        <section className="bg-slate-50 border-t border-slate-200 pt-[60px] pb-[80px] px-6 sm:px-8">
          <div className="max-w-[920px] mx-auto">
            <p className="inline-flex items-center gap-1.5 text-emerald-500 text-[0.7rem] font-bold uppercase tracking-[0.1em] mb-3">
              Por que o LaudoUSG
            </p>
            <h2 className="font-barlow font-extrabold text-[2rem] tracking-[-0.025em] text-[#0f172a] leading-[1.2] mb-2">
              Feito por quem lauda,<br />para quem lauda.
            </h2>
            <p className="text-[0.9rem] text-slate-500 leading-[1.6] max-w-[480px] mb-9">
              Cada detalhe nasceu de um plantão real. Menos teclado, mais paciente, e o laudo
              continua soando como você.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Velocidade — card grande com transcrição ao vivo */}
              <motion.div
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                className="sm:col-span-2 group bg-white border border-slate-200 rounded-2xl p-7 relative overflow-hidden hover:border-emerald-200 hover:shadow-[0_12px_32px_rgba(16,185,129,0.09)] hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-200 ease-out grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center"
              >
                <div className="relative z-10">
                  <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-[22px] h-[22px] text-emerald-600" strokeWidth={1.8} />
                  </div>
                  <h3 className="font-barlow font-bold text-[1.15rem] text-[#0f172a] mb-2">Do achado ao laudo em segundos</h3>
                  <p className="text-[0.85rem] text-slate-500 leading-[1.65] max-w-[440px]">
                    Fale durante o exame e veja a transcrição acontecer. Em vez de minutos
                    preenchendo formulário, são segundos até o laudo pronto.{' '}
                    <strong className="text-[#0f172a] font-semibold">Mais tempo olhando no olho do paciente, menos encarando o teclado.</strong>
                  </p>
                </div>
                <RecordingTranscript />
              </motion.div>

              <DiffCard
                icon={<PenLine className="w-[22px] h-[22px] text-emerald-600" strokeWidth={1.8} />}
                title="Calibrado ao seu jeito"
                delay={0.05}
              >
                O laudo sai escrito do <strong className="text-[#0f172a] font-semibold">seu</strong> jeito,
                não de um template engessado. Quanto mais você usa, mais ele soa como você escreveria à mão.
              </DiffCard>

              <DiffCard
                icon={<Sparkles className="w-[22px] h-[22px] text-emerald-600" strokeWidth={1.8} />}
                title="Consultor IA do seu lado"
                delay={0.1}
              >
                Travou num diagnóstico diferencial? Na dúvida de como redigir aquele achado?
                Pergunta ali mesmo, sem trocar de tela nem abrir outra aba.
              </DiffCard>

              {/* Cartografia — em breve, card largo */}
              <motion.div
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} transition={{ delay: 0.05 }}
                className="sm:col-span-2 relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-7"
              >
                <span className="absolute top-5 right-5 text-[0.6rem] font-bold uppercase tracking-[0.1em] bg-emerald-500 text-white px-2.5 py-1 rounded-full">Em breve</span>
                <div className="w-11 h-11 bg-white border border-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <Waypoints className="w-[22px] h-[22px] text-emerald-600" strokeWidth={1.8} />
                </div>
                <h3 className="font-barlow font-bold text-[1.05rem] text-[#0f172a] mb-2">Cartografia automática no Doppler</h3>
                <p className="text-[0.85rem] text-slate-600 leading-[1.65] max-w-[520px]">
                  Em breve: o mapa vascular do seu Doppler desenhado automaticamente a partir
                  do laudo. O tipo de detalhe que faz o paciente lembrar de você.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── SALA DO AUXILIAR + EQUIPE (split, imagem real) ──────────────────── */}
        <SalaEquipe />

        {/* ── ESQUEMAS VISUAIS (split, slot de asset) ─────────────────────────── */}
        <Esquemas />

        {/* ── ESCREVER COM OU SEM IA (dark duo) ───────────────────────────────── */}
        <div data-nav-dark>
          <ComOuSemIA />
        </div>

        {/* ── EM BREVE NAS LOJAS (device + badges) ────────────────────────────── */}
        <Stores />

        {/* ── PLANOS (dark, neon, tamanhos variados) ──────────────────────────── */}
        <div data-nav-dark>
          <Pricing />
        </div>

        {/* ── CTA FINAL ───────────────────────────────────────────────────────── */}
        <section className="relative bg-white border-t border-slate-100 py-[88px] px-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.04)_0%,transparent_60%)]" />
          <div className="relative max-w-[920px] mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
              <h2 className="font-barlow font-extrabold text-[2.2rem] tracking-[-0.02em] leading-[1.2] text-[#0f172a] mb-3.5">
                Pronto para dar alta<br />ao <span className="text-emerald-600">laudo manual?</span>
              </h2>
              <p className="text-[0.9rem] text-slate-500 mb-7">
                Cada laudo digitado à mão é tempo que você poderia estar com o próximo paciente.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.97] text-white text-[0.95rem] font-bold px-7 py-3.5 rounded-xl shadow-[0_4px_20px_rgba(5,150,105,0.3)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.35)] hover:-translate-y-0.5 transition-[transform,box-shadow,background-color] duration-150 ease-out"
              >
                Comece agora, é grátis
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </Link>
              <p className="text-[0.72rem] text-slate-400 mt-3">Sem cartão · 10 laudos grátis · Cancele quando quiser</p>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-[1080px] mx-auto px-6 sm:px-10 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr] gap-10 sm:gap-8">
            {/* Marca */}
            <div>
              <LaudoUSGLogo size="md" />
              <p className="mt-4 text-[0.85rem] text-slate-500 leading-[1.65] max-w-[320px]">
                Laudos de ultrassonografia com IA, calibrados pra sua forma de escrever.
                Mais tempo com o paciente, menos no teclado.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Criar conta grátis
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </Link>
            </div>

            {/* Produto */}
            <div>
              <h4 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 mb-4">Produto</h4>
              <ul className="flex flex-col gap-2.5 text-[0.85rem] text-slate-500">
                <li><a href="#precos" className="hover:text-slate-900 transition-colors">Preços</a></li>
                <li><Link href="/precos" className="hover:text-slate-900 transition-colors">Planos e preços</Link></li>
                <li><Link href="/login" className="hover:text-slate-900 transition-colors">Entrar</Link></li>
                <li><Link href="/signup" className="hover:text-slate-900 transition-colors">Criar conta</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-400 mb-4">Legal</h4>
              <ul className="flex flex-col gap-2.5 text-[0.85rem] text-slate-500">
                <li><Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacidade</Link></li>
                <li><Link href="/terms" className="hover:text-slate-900 transition-colors">Termos de uso</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.72rem] text-slate-400">
            <span>© {new Date().getFullYear()} LaudoUSG. Todos os direitos reservados.</span>
            <span>Feito no Brasil, para ultrassonografistas.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Card de diferencial ───────────────────────────────────────────────────────
function DiffCard({
  icon, title, children, delay = 0,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} transition={{ delay }}
      className="group bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden hover:border-emerald-200 hover:shadow-[0_12px_32px_rgba(16,185,129,0.09)] hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-200 ease-out"
    >
      <div className="absolute -top-8 -right-8 w-28 h-28 bg-emerald-500/[0.06] rounded-full transition-transform duration-300 group-hover:scale-[2]" />
      <div className="relative z-10">
        <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center mb-3.5">
          {icon}
        </div>
        <h3 className="font-barlow font-bold text-[1rem] text-[#0f172a] mb-1.5">{title}</h3>
        <p className="text-[0.82rem] text-slate-500 leading-[1.65]">{children}</p>
      </div>
    </motion.div>
  )
}
