'use client'

import { useCallback, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Check, Copy, Mic, Search } from 'lucide-react'
import styles from './mobile-story.module.css'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/**
 * SEÇÃO MOBILE — o app do iPhone usado de ponta a ponta, guiado pela rolagem.
 *
 * O progresso da rolagem (0 a 1) vira uma MotionValue e cada detalhe do aparelho
 * é um `useTransform` dela: as telas se sucedem ao descer e voltam ao subir, sem
 * vídeo e sem estado React a cada pixel. O React só re-renderiza quando a ETAPA
 * muda (5 vezes), para trocar o texto ao lado.
 *
 * Com `prefers-reduced-motion`, nada é preso à rolagem: os botões de etapa trocam
 * a tela na hora, e cada tela aparece no seu estado final.
 *
 * Dados fictícios de demonstração. Interface recriada a partir do app iOS
 * (GenerateView, RecordingOverlay, CategorySheet), sem áudio nem rede.
 */

const STEPS = [
  {
    id: 'abrir',
    label: 'Abrir',
    title: 'No celular, ao lado do aparelho.',
    body: 'O app abre na tela de ditado, com o exame à vista.',
  },
  {
    id: 'ditar',
    label: 'Ditar',
    title: 'Dite com o gel na mão.',
    body: 'Fale os achados. Confira o texto antes de gerar o laudo.',
  },
  {
    id: 'categoria',
    label: 'Exame',
    title: 'Escolha o exame.',
    body: 'As mais comuns ficam no topo. A busca encontra as demais.',
  },
  {
    id: 'gerar',
    label: 'Gerar',
    title: 'Um toque para gerar.',
    body: 'Achados organizados, medidas e lado conferidos, texto no padrão do exame.',
  },
  {
    id: 'laudo',
    label: 'Laudo',
    title: 'O laudo pronto para revisar.',
    body: 'Leia, ajuste o que quiser e copie para o sistema da clínica.',
  },
] as const

const N = STEPS.length
/**
 * Ponto de "etapa completa": toda revelação e barra termina até 0,88 da etapa,
 * e o cruzamento com a próxima tela só começa em 0,94. Botões e o modo de
 * movimento reduzido param aqui, com a tela inteira e sem mistura.
 */
const COMPLETA = 0.92

const DITADO = [
  'Fígado com aumento difuso da ecogenicidade.',
  'Vesícula com cálculo móvel de 1,2 cm.',
  'Rim direito com cisto simples de 2,1 cm no polo superior.',
]

const ACHADOS = ['Esteatose hepática', 'Colelitíase, cálculo de 1,2 cm', 'Cisto simples no rim direito, 2,1 cm']

const CATEGORIAS = [
  { nome: 'Abdome total', sub: 'Fígado, vias biliares, pâncreas, baço, rins' },
  { nome: 'Pelve', sub: 'Útero e ovários' },
  { nome: 'Obstétrica', sub: 'Biometria e vitalidade' },
  { nome: 'Tireoide', sub: 'Lobos, istmo e nódulos' },
]

const ETAPAS_GERACAO = ['Organizando os achados', 'Conferindo medidas e lateralidade', 'Redigindo o laudo']

const LAUDO: Array<{ kind: 'note' | 'title' | 'heading' | 'line'; text: string }> = [
  { kind: 'note', text: 'Trecho ilustrativo, não é um laudo completo' },
  { kind: 'title', text: 'ULTRASSONOGRAFIA DE ABDOME TOTAL' },
  { kind: 'heading', text: 'ACHADOS' },
  { kind: 'line', text: 'Fígado de dimensões normais, com aumento difuso da ecogenicidade do parênquima.' },
  { kind: 'line', text: 'Vesícula biliar com imagem hiperecogênica móvel, com sombra acústica, medindo 1,2 cm.' },
  { kind: 'line', text: 'Rim direito com imagem anecoica de paredes finas no polo superior, medindo 2,1 cm.' },
  { kind: 'heading', text: 'IMPRESSÃO' },
  { kind: 'line', text: 'Esteatose hepática. Colelitíase. Cisto renal simples à direita.' },
]

/** Faixa [a, b] do progresso global que pertence à etapa `i`, em frações locais. */
const faixa = (i: number, a: number, b: number): [number, number] => [(i + a) / N, (i + b) / N]

/** Opacidade de uma tela: entra no início da etapa e sai no fim, com cruzamento curto. */
function useLayer(progress: MotionValue<number>, i: number) {
  const f = 0.06 / N
  const start = i / N
  const end = (i + 1) / N
  const input = i === 0 ? [0, end - f, end + f] : i === N - 1 ? [start - f, start + f, 1] : [start - f, start + f, end - f, end + f]
  const output = i === 0 ? [1, 1, 0] : i === N - 1 ? [0, 1, 1] : [0, 1, 1, 0]
  const opacity = useTransform(progress, input, output)
  const y = useTransform(progress, input, output.map((o) => (o === 1 ? 0 : 12)))
  return { opacity, y }
}

function Reveal({ progress, range, children, className }: {
  progress: MotionValue<number>
  range: [number, number]
  children: React.ReactNode
  className?: string
}) {
  const opacity = useTransform(progress, range, [0, 1])
  const y = useTransform(progress, range, [8, 0])
  return <motion.div className={className} style={{ opacity, y }}>{children}</motion.div>
}

function StatusBar({ progress }: { progress: MotionValue<number> }) {
  // Clara só sobre a tela escura de gravação (etapa "ditar"), acompanhando a rolagem.
  const f = 0.06 / N
  const color = useTransform(progress, [1 / N - f, 1 / N + f, 2 / N - f, 2 / N + f], ['#111827', '#ecfdf5', '#ecfdf5', '#111827'])
  return (
    <motion.div className={styles.statusBar} style={{ color }} aria-hidden="true">
      <span>9:41</span>
      <span className={styles.statusIcons}><span /><span /></span>
    </motion.div>
  )
}

function AppHeader() {
  return (
    <div className={styles.appHeader}>
      <span className={styles.wordmark}><b>Laudo</b><span>USG</span></span>
      <span className={styles.chip}><span className={styles.chipDot} />Abdome total</span>
    </div>
  )
}

function ScreenAbrir({ progress, animate }: { progress: MotionValue<number>; animate: boolean }) {
  const layer = useLayer(progress, 0)
  const scale = useTransform(progress, [0, faixa(0, 0, 0.5)[1]], [animate ? 0.94 : 1, 1])
  return (
    <motion.div className={styles.layer} style={{ ...layer, scale }}>
      <AppHeader />
      <div className={styles.panel}>
        <span className={styles.panelTitle}>Achados</span>
        <p className={styles.hint}>Toque no microfone e dite os achados do exame.</p>
      </div>
      <div className={styles.micRow}><span className={styles.mic}><Mic strokeWidth={2.2} /></span></div>
    </motion.div>
  )
}

function WaveBar({ progress, i }: { progress: MotionValue<number>; i: number }) {
  // Altura ligada à rolagem (sobe e desce com ela), não a um loop infinito.
  const scaleY = useTransform(progress, faixa(1, 0, 1), [1, 1 + ((i * 7) % 5) * 0.55 + Math.sin(i) * 0.4])
  return <motion.span style={{ scaleY }} />
}

function ScreenDitar({ progress }: { progress: MotionValue<number> }) {
  const layer = useLayer(progress, 1)
  return (
    <motion.div className={`${styles.layer} ${styles.recording}`} style={layer}>
      <div className={styles.listening}><span className={styles.pulse} />OUVINDO</div>
      <div className={styles.wave} aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => <WaveBar key={i} progress={progress} i={i} />)}
      </div>
      <div className={styles.transcript}>
        {DITADO.map((linha, k) => (
          <Reveal key={linha} progress={progress} range={faixa(1, 0.12 + k * 0.22, 0.28 + k * 0.22)}>{linha}</Reveal>
        ))}
      </div>
      <div className={styles.recordingActions}>
        <span className={styles.ghostButton}>Cancelar</span>
        <span className={styles.solidButton}>Parar e usar</span>
      </div>
    </motion.div>
  )
}

function ScreenCategoria({ progress }: { progress: MotionValue<number> }) {
  const layer = useLayer(progress, 2)
  const sheetY = useTransform(progress, faixa(2, 0.3, 0.55), ['100%', '0%'])
  const scrim = useTransform(progress, faixa(2, 0.3, 0.55), [0, 1])
  const pick = useTransform(progress, faixa(2, 0.62, 0.78), [0, 1])
  return (
    <motion.div className={styles.layer} style={layer}>
      <AppHeader />
      <div className={styles.panel}>
        <span className={styles.panelTitle}>Achados reconhecidos</span>
        {ACHADOS.map((achado, k) => (
          <Reveal key={achado} progress={progress} range={faixa(2, 0.02 + k * 0.08, 0.12 + k * 0.08)} className={styles.findingRow}>
            <span className={styles.findingTick}><Check strokeWidth={3} /></span>
            <span>{achado}</span>
          </Reveal>
        ))}
      </div>
      <motion.div className={styles.scrim} style={{ opacity: scrim }} />
      <motion.div className={styles.sheet} style={{ y: sheetY }}>
        <span className={styles.grabber} />
        <span className={styles.sheetTitle}>Escolher categoria</span>
        <span className={styles.search}><Search strokeWidth={2.2} />Buscar categoria</span>
        <span className={styles.panelTitle}>Mais usadas</span>
        {CATEGORIAS.map((c, k) => (
          <span key={c.nome} className={styles.categoryRow}>
            {k === 0 ? <motion.span className={styles.categoryPick} style={{ opacity: pick }} /> : null}
            <span style={{ position: 'relative' }}>{c.nome}<small>{c.sub}</small></span>
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
}

function StageRow({ progress, k }: { progress: MotionValue<number>; k: number }) {
  const done = useTransform(progress, faixa(3, 0.25 + k * 0.22, 0.32 + k * 0.22), [0, 1])
  return (
    <div className={styles.stageRow}>
      <span className={styles.stageIcon}>
        <motion.span className={styles.stageIconDone} style={{ opacity: done, scale: done }}><Check strokeWidth={3} /></motion.span>
      </span>
      <span>{ETAPAS_GERACAO[k]}</span>
    </div>
  )
}

function ScreenGerar({ progress }: { progress: MotionValue<number> }) {
  const layer = useLayer(progress, 3)
  const press = useTransform(progress, faixa(3, 0.08, 0.14), [1, 0.96])
  const fill = useTransform(progress, faixa(3, 0.18, 0.88), [0, 1])
  return (
    <motion.div className={styles.layer} style={layer}>
      <AppHeader />
      <div className={styles.panel}>
        <span className={styles.panelTitle}>Gerando o laudo</span>
        {ETAPAS_GERACAO.map((etapa, k) => <StageRow key={etapa} progress={progress} k={k} />)}
        <div className={styles.progressTrack}><motion.div className={styles.progressFill} style={{ scaleX: fill }} /></div>
      </div>
      <motion.div className={styles.primaryButton} style={{ scale: press }}>Gerar laudo</motion.div>
    </motion.div>
  )
}

function ScreenLaudo({ progress }: { progress: MotionValue<number> }) {
  const layer = useLayer(progress, 4)
  const passo = 0.7 / LAUDO.length // última linha termina em 0,74
  return (
    <motion.div className={styles.layer} style={layer}>
      <AppHeader />
      <div className={styles.report}>
        {LAUDO.map((item, k) => (
          <Reveal
            key={item.text}
            progress={progress}
            range={faixa(4, 0.04 + k * passo, 0.04 + (k + 1) * passo)}
            className={item.kind === 'note' ? styles.reportNote : item.kind === 'title' ? styles.reportTitle : item.kind === 'heading' ? styles.reportHeading : undefined}
          >
            {item.text}
          </Reveal>
        ))}
      </div>
      <Reveal progress={progress} range={faixa(4, 0.78, 0.88)} className={styles.copyButton}>
        <Copy strokeWidth={2.2} />Copiar laudo
      </Reveal>
    </motion.div>
  )
}

function Phone({ progress, animate, stepTitle }: { progress: MotionValue<number>; animate: boolean; stepTitle: string }) {
  return (
    <div className={styles.phoneWrap}>
      <div className={styles.phone} role="img" aria-label={`Demonstração do aplicativo LaudoUSG no iPhone: ${stepTitle}`}>
        <div className={styles.screen} aria-hidden="true">
          <span className={styles.island} />
          <StatusBar progress={progress} />
          <ScreenAbrir progress={progress} animate={animate} />
          <ScreenDitar progress={progress} />
          <ScreenCategoria progress={progress} />
          <ScreenGerar progress={progress} />
          <ScreenLaudo progress={progress} />
        </div>
      </div>
    </div>
  )
}

function StepFill({ progress, i }: { progress: MotionValue<number>; i: number }) {
  const scaleX = useTransform(progress, [i / N, (i + 1) / N], [0, 1])
  return <motion.span className={styles.stepFill} style={{ scaleX }} aria-hidden="true" />
}

export default function MobileStory() {
  // `false` no SSR e na hidratação (mesma árvore dos dois lados); depois, a preferência real.
  const reduce = useReducedMotionSafe()
  const sectionRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  // Movimento reduzido: o progresso é posto pelos botões, no estado final da etapa.
  const manual = useMotionValue(COMPLETA / N)
  const progress = reduce ? manual : scrollYProgress

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (reduce) return
    const next = Math.min(N - 1, Math.max(0, Math.floor(v * N)))
    if (next !== stepRef.current) {
      stepRef.current = next
      setStep(next)
    }
  })

  const goTo = useCallback((i: number) => {
    if (reduce) {
      stepRef.current = i
      manual.set((i + COMPLETA) / N)
      setStep(i)
      return
    }
    const el = sectionRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    const trilha = el.offsetHeight - window.innerHeight
    // Etapa completa: frases e barras já terminaram, sem cruzar com a próxima.
    window.scrollTo({ top: top + trilha * ((i + COMPLETA) / N), behavior: 'smooth' })
  }, [manual, reduce])

  const atual = STEPS[step]

  return (
    <section
      id="mobile"
      ref={sectionRef}
      data-landing-section="mobile"
      data-stage={atual.id}
      data-nav-dark
      aria-labelledby="mobile-story-title"
      className={`${styles.section} ${reduce ? styles.static : ''}`}
    >
      <div className={styles.stage}>
        <div className={styles.copy}>
          <h2 id="mobile-story-title" className={styles.lead}>
            Também no iPhone,
            <span className={styles.leadAccent}>onde você trabalha.</span>
          </h2>
          <div className={styles.stepText} aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={atual.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className={styles.stepTitle}>{atual.title}</h3>
                <p className={styles.stepBody}>{atual.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <span className={styles.demoLabel}>Demonstração com dados fictícios</span>
        </div>

        <Phone progress={progress} animate={!reduce} stepTitle={atual.title} />

        <nav className={styles.nav} aria-label="Etapas da demonstração">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              data-stage={s.id}
              aria-current={i === step ? 'step' : undefined}
              className={styles.stepButton}
              onClick={() => goTo(i)}
            >
              {!reduce ? <StepFill progress={scrollYProgress} i={i} /> : null}
              <span className={styles.stepButtonLabel}>{s.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </section>
  )
}
