'use client'

import Image from 'next/image'
import { MousePointer2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  useVelocity,
  useSpring,
  type MotionValue,
} from 'framer-motion'
import styles from './mobile-story.module.css'
import StoreAvailability from './StoreAvailability'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/** Captura real controlada exclusivamente pela rolagem, sem reprodução automática. */

type Step = {
  id: string
  label: string
  title: string
  body: string
  src: string
  alt: string
}

const BASE = '/landing/mobile-real'

const STEPS: Step[] = [
  {
    id: 'inicio',
    label: 'Início',
    title: 'No celular, ao lado do aparelho.',
    body: 'O app abre pronto para o exame. O microfone fica ao alcance do polegar.',
    src: `${BASE}/inicio.jpg`,
    alt: 'Tela inicial do aplicativo LaudoUSG no iPhone, com o botão de microfone no rodapé',
  },
  {
    id: 'categoria',
    label: 'Exame',
    title: 'Escolha o exame.',
    body: 'As categorias mais usadas ficam à mão. A busca encontra as outras.',
    src: `${BASE}/categoria.jpg`,
    alt: 'Lista de categorias de exame no aplicativo, com a escolha do exame',
  },
  {
    id: 'gravacao',
    label: 'Ditar',
    title: 'Dite com o gel na mão.',
    body: 'Fale os achados enquanto examina. A transcrição aparece na hora.',
    src: `${BASE}/gravacao.jpg`,
    alt: 'Tela de gravação do aplicativo ouvindo o ditado, com a transcrição aparecendo',
  },
  {
    id: 'achados',
    label: 'Achados',
    title: 'Confira o que foi entendido.',
    body: 'Os achados aparecem em texto antes de gerar o laudo.',
    src: `${BASE}/achados.jpg`,
    alt: 'Achados ditados, transcritos na tela do aplicativo',
  },
  {
    id: 'geracao',
    label: 'Gerar',
    title: 'Um toque para gerar.',
    body: 'O app organiza os achados e redige no padrão do exame.',
    src: `${BASE}/geracao.jpg`,
    alt: 'Tela do aplicativo gerando o laudo',
  },
  {
    id: 'laudo',
    label: 'Laudo',
    title: 'O laudo pronto para revisar.',
    body: 'Leia, ajuste o que quiser e copie. A revisão final é sempre sua.',
    src: `${BASE}/laudo.jpg`,
    alt: 'Laudo gerado exibido no aplicativo, em caso demonstrativo',
  },
  {
    id: 'sala',
    label: 'Sala',
    title: 'A sala acompanha.',
    body: 'Do celular para a Sala do Auxiliar. A equipe recebe o mesmo laudo e pode copiar ou imprimir.',
    src: `${BASE}/sala.png`,
    alt: 'Sala do Auxiliar aberta no navegador, mostrando o laudo recebido do celular',
  },
]

const N = STEPS.length
const SALA = N - 1
/** Ponto de "etapa completa": botões e movimento reduzido param aqui. */
const COMPLETA = 0.92

// Times in the public clip (source recording starts at 00:14).
const CHAPTERS = [0, 4, 12, 59, 62, 71.5, 87] as const
// O ditado ocupa menos rolagem, preservando todos os quadros da captura.
const SCROLL_STOPS = [0, .15, .319, .419, .519, .659, .859, 1]
function storyProgressAt(value: number) {
  const v = Math.max(0, Math.min(1, value))
  const i = Math.min(SALA, SCROLL_STOPS.findIndex((_, i) => v < SCROLL_STOPS[i + 1]) < 0
    ? SALA : SCROLL_STOPS.findIndex((_, i) => v < SCROLL_STOPS[i + 1]))
  return (i + (v - SCROLL_STOPS[i]) / (SCROLL_STOPS[i + 1] - SCROLL_STOPS[i])) / N
}
function filmTimeAt(progress: number) {
  const t = Math.max(0, Math.min(SALA, progress * N))
  const i = Math.min(5, Math.floor(t))
  return Math.min(86.9, CHAPTERS[i] + (t - i) * (CHAPTERS[i + 1] - CHAPTERS[i]))
}

/**
 * A cena: telefone e, na última etapa, o monitor da Sala. O telefone recua
 * para o canto e o monitor entra maior; os dois continuam sem distorção.
 */
function Scene({ progress, still, stepTitle, activeStep, videoRef, onLoaded, failed }: {
  progress: MotionValue<number>; still: boolean; stepTitle: string; activeStep: number
  videoRef: RefObject<HTMLVideoElement>; onLoaded: () => void; failed: boolean
}) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [categoryZoom, setCategoryZoom] = useState(1.65)
  const [salaOffset, setSalaOffset] = useState(-62)
  useEffect(() => {
    const scene = sceneRef.current
    const phone = scene?.querySelector<HTMLElement>(`.${styles.phone}`)
    if (!scene || !phone) return
    const measure = () => {
      setCategoryZoom(Math.min(1.9, (scene.clientWidth - 28) / phone.offsetWidth))
      setSalaOffset(scene.clientWidth < 500 ? -25 : -62)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(scene)
    observer.observe(phone)
    measure()
    return () => observer.disconnect()
  }, [])
  const local = (v: number) => Math.max(0, Math.min(1, v * N - SALA))
  // Camera keyframes act on the complete device, not on the screen image.
  const camera = (v: number, values: number[]) => {
    const stops = [0, .8, 1.2, 1.85, 2, 2.1, 2.25, 2.8, 3, 3.6, 4, 4.4, 5, 5.6, 6]
    const t = v * N
    const i = stops.findIndex((stop, i) => i < stops.length - 1 && t <= stops[i + 1])
    if (i < 0) return values[values.length - 1]
    const mix = Math.max(0, Math.min(1, (t - stops[i]) / (stops[i + 1] - stops[i])))
    const ease = mix * mix * (3 - 2 * mix)
    return values[i] + (values[i + 1] - values[i]) * ease
  }
  const phoneScale = useTransform(progress, v => v * N >= SALA
    ? 1 - Math.min(local(v) / .38, 1) * .32
    : still ? 1 : camera(v, [1, 1, categoryZoom, categoryZoom, 1.7, 1.7, 1.5, 1.5, 1.5, 1.5, 1.5, 1, 1.55, 1.55, 1]))
  const phoneX = useTransform(progress, v => `${v * N >= SALA
    ? salaOffset * Math.min(local(v) / .38, 1)
    : still ? 0 : camera(v, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])}%`)
  const phoneY = useTransform(progress, v => `${v * N >= SALA
    ? 50 * Math.min(local(v) / .38, 1)
    : still ? 0 : camera(v, [0, 0, 32, 32, -36, -36, -8, -8, -8, -8, -25, 0, 18, 18, 0])}%`)
  const pointerTop = useTransform(progress, v => `${v * N < 1 ? 9 : v * N < 2 ? 27 : v * N < 2.11 ? 92.5 : v * N < 3 ? 72 : 92.5}%`)
  const pointerLeft = useTransform(progress, v => `${v * N < 1 ? 78 : v * N < 2 ? 57 : v * N < 2.11 ? 90 : v * N < 3 ? 73 : 50}%`)
  const pointerOpacity = useTransform(progress, v => {
    const t = v * N
    if (still) return 0
    const windows = [[.78, .99], [1.78, 1.99], [2.045, 2.105], [2.97, 2.999], [4, 4.2]]
    const w = windows.find(([a, b]) => t >= a && t <= b)
    return w ? Math.min(1, (t - w[0]) / ((w[1] - w[0]) * .2)) : 0
  })
  const monitorX = useTransform(progress, (v) => `${24 * (1 - Math.min(local(v) / 0.75, 1))}%`)
  const monitorScale = useTransform(progress, (v) => 0.8 + 0.2 * Math.min(local(v) / 0.75, 1))
  const xNumber = useTransform(phoneX, v => parseFloat(v))
  const yNumber = useTransform(phoneY, v => parseFloat(v))
  const scaleSpeed = useVelocity(phoneScale)
  const xSpeed = useVelocity(xNumber)
  const ySpeed = useVelocity(yNumber)
  const blurTarget = useTransform(() => still ? 0 : Math.min(2.8,
    Math.abs(scaleSpeed.get()) * .7 + Math.abs(xSpeed.get()) * .018 + Math.abs(ySpeed.get()) * .018))
  const blur = useSpring(blurTarget, { stiffness: 240, damping: 28 })
  const phoneFilter = useTransform(blur, v => still || v < .025 ? 'none' : `blur(${v.toFixed(2)}px)`)
  const sala = STEPS[SALA]
  return (
    <div ref={sceneRef} className={styles.scene} role="group" aria-label={`Demonstração do aplicativo LaudoUSG: ${stepTitle}`}>
      <motion.div className={styles.monitor} style={{ x: monitorX, scale: monitorScale }} initial={{ opacity: 0 }} animate={{ opacity: activeStep === SALA ? 1 : 0 }} transition={{ duration: still ? 0 : 0.3 }} data-screen={sala.id}>
        <div className={styles.monitorScreen}>
          <Image src={sala.src} alt={sala.alt} fill sizes="(max-width: 899px) 150vw, 1400px" className={styles.monitorImage} />
        </div>
        <span className={styles.monitorChin} aria-hidden="true">iMac</span>
        <span className={styles.monitorStand} aria-hidden="true" />
      </motion.div>

      <motion.div className={styles.phoneWrap} style={{ scale: phoneScale, x: phoneX, y: phoneY, filter: phoneFilter }}>
        <div className={styles.phone}>
          <div className={styles.screen}>
            {still || failed ? <Image src={STEPS[Math.min(activeStep, 5)].src} alt={STEPS[Math.min(activeStep, 5)].alt} fill sizes="(max-width: 899px) 55vw, 340px" className={styles.shotImage} /> : null}
            {!still && <video ref={videoRef} className={styles.realVideo} muted playsInline preload="none" style={{ opacity: failed ? 0 : 1 }} poster={`${BASE}/inicio.jpg`} onLoadedMetadata={onLoaded} aria-label="Gravação real: escolha do abdome, microfone, ditado, geração e revisão do laudo" />}
            <motion.div aria-hidden="true" className={styles.touchPointer} style={{ top: pointerTop, left: pointerLeft, opacity: pointerOpacity }}>
              <span className={styles.touchRing} /><MousePointer2 fill="white" size={20} />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function MobileStory() {
  // `false` no SSR e na hidratação (mesma árvore dos dois lados); depois, a preferência real.
  const reduce = useReducedMotionSafe()
  const sectionRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pendingTime = useRef(0)
  const [failed, setFailed] = useState(false)
  const [visible, setVisible] = useState(false)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const scrollProgress = useTransform(scrollYProgress, storyProgressAt)
  const manual = useMotionValue((SALA + COMPLETA) / N)
  const progress = reduce ? manual : scrollProgress

  // Serializa seeks: rolagem rápida substitui o destino pendente em vez de
  // acumular capítulos ou iniciar playback. Ao parar, exibe o último destino.
  const flushSeek = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 1 || video.seeking) return
    video.pause()
    if (Math.abs(video.currentTime - pendingTime.current) > 1 / 60)
      video.currentTime = pendingTime.current
  }, [])
  const syncProgress = useCallback((v: number) => {
    const next = Math.min(SALA, Math.max(0, Math.floor(v * N)))
    if (next !== stepRef.current) { stepRef.current = next; setStep(next) }
    pendingTime.current = filmTimeAt(v)
    flushSeek()
  }, [flushSeek])
  useMotionValueEvent(scrollProgress, 'change', v => { if (!reduce) syncProgress(v) })
  useEffect(() => {
    if (reduce) { stepRef.current = SALA; setStep(SALA) }
    else syncProgress(scrollProgress.get())
  }, [reduce, scrollProgress, syncProgress])
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(section)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const video = videoRef.current
    if (!video || reduce) return
    const error = () => setFailed(true)
    video.addEventListener('seeked', flushSeek)
    video.addEventListener('error', error)
    if (visible && !video.getAttribute('src')) {
      video.src = `${BASE}/demonstracao-real.mp4`
      video.load()
    }
    return () => {
      video.removeEventListener('seeked', flushSeek)
      video.removeEventListener('error', error)
    }
  }, [visible, reduce, flushSeek])
  const onLoaded = flushSeek

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
          <span className={styles.demoLabel}>{reduce ? "Capturas reais · movimento reduzido" : failed ? "Vídeo indisponível · captura real" : "Role para explorar · captura real"}</span>
          <div className={styles.stores}><StoreAvailability /></div>
        </div>

        <Scene progress={progress} still={reduce} stepTitle={atual.title} activeStep={step}
          videoRef={videoRef} onLoaded={onLoaded} failed={failed} />


      </div>
    </section>
  )
}
