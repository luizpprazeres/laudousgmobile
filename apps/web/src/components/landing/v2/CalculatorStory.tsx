'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Activity, CalendarDays, Fingerprint, HeartPulse, ArrowDownRight } from 'lucide-react'
import { calcularDopplerParcial } from '@laudousg/shared'
import { useReducedMotionSafe } from './useReducedMotionSafe'
import { PE_DEMO, TRISOMY_DEMO } from './clinical-demo-fixtures'
import styles from './calculator-story.module.css'

const ITEMS = [
  { id: 'doppler', label: 'Doppler obstétrico', title: 'O índice ganha contexto.', body: 'Percentis por idade gestacional para os vasos avaliados e a relação cerebroplacentária. As medidas e a referência ficam juntas.', source: 'Fetal Medicine Barcelona · calculadora v2021', availability: 'No laudo Web', icon: Activity },
  { id: 'datacao', label: 'Idade gestacional e DPP', title: 'As datas se encontram.', body: 'Calcule a idade gestacional pela DUM ou por uma ultrassonografia anterior e consulte a data provável do parto.', source: 'DUM e ultrassonografia anterior', availability: 'No app · disponível em breve', icon: CalendarDays },
  { id: 'trissomias', label: 'Rastreamento de trissomias', title: 'Cada marcador entra na conta.', body: 'Organize dados maternos e marcadores do primeiro trimestre na estimativa de risco para T21, T18 e T13.', source: 'Modelo publicado pela FMF. Implementação LaudoUSG, não certificada pela FMF.', availability: 'Em validação na Web', icon: Fingerprint },
  { id: 'preeclampsia', label: 'Risco de pré-eclâmpsia', title: 'Uma avaliação, vários fatores.', body: 'Combine características maternas, pressão arterial média e Doppler das artérias uterinas na estimativa de risco.', source: 'Modelo de riscos competitivos (Wright et al., 2020). Software não certificado pela FMF.', availability: 'No laudo Web', icon: HeartPulse },
] as const

// Caso sintético fixo. Percentil calculado pelo mesmo núcleo compartilhado do produto.
const doppler = calcularDopplerParcial({ weeks: 32, days: 0, ipUmbilical: 1 })

function Illustration({ index }: { index: number }) {
  if (index === 0) return <div className={styles.illustration}>
    <div className={styles.sampleHeader}><span>Artéria umbilical</span><span>32 semanas</span></div>
    <div className={styles.metrics}><div><span>Índice de pulsatilidade</span><strong>1,00</strong></div><ArrowDownRight size={25} /><div><span>Percentil</span><strong>{doppler.arteriaUmbilical?.percentileLabel}</strong></div></div>
    <div className={styles.percentile} aria-hidden="true"><span /><i style={{ left: `${doppler.arteriaUmbilical?.percentile}%` }} /></div>
    <div className={styles.scaleLabels}><span>p5</span><span>p50</span><span>p95</span></div>
    <small>Caso demonstrativo · cálculo do LaudoUSG</small>
  </div>
  if (index === 1) return <div className={styles.illustration}>
    <div className={styles.sampleHeader}><span>Datação pela DUM</span><CalendarDays size={18} /></div>
    <div className={styles.gestation}><strong>24</strong><span>semanas<br /><b>+ 3 dias</b></span></div>
    <div className={styles.dateRows}><span>DUM <b>10/04/2026</b></span><span>Data do exame <b>28/09/2026</b></span><span>Data provável do parto <b>15/01/2027</b></span></div>
    <small>Datas demonstrativas</small>
  </div>
  if (index === 2) return <div className={styles.illustration}>
    <div className={styles.sampleHeader}><span>{TRISOMY_DEMO.caso}</span></div>
    <dl className={styles.trisomies}>{TRISOMY_DEMO.riscos.map(r => <div key={r.id}><dt>Trissomia {r.id}</dt><dd>{r.risco}</dd></div>)}</dl>
    <Excerpt lines={TRISOMY_DEMO.trecho} />
  </div>
  return <div className={styles.illustration}>
    <div className={styles.sampleHeader}><span>{PE_DEMO.caso}</span><HeartPulse size={19} /></div>
    <div className={styles.peResult}><span>Antes de 37 semanas</span><strong>{PE_DEMO.umEmN}</strong></div>
    <dl className={styles.peMarkers}>
      <div><dt>IG</dt><dd>{PE_DEMO.ig}</dd></div>
      <div><dt>PAM</dt><dd>{PE_DEMO.momPam} MoM</dd></div>
      <div><dt>IP uterinas</dt><dd>{PE_DEMO.momUtaPi} MoM</dd></div>
    </dl>
    <Excerpt lines={PE_DEMO.trecho} />
  </div>
}

// Texto idêntico ao bloco que o laudo recebe; só a seleção de linhas é da landing.
function Excerpt({ lines }: { lines: readonly string[] }) {
  return <figure className={styles.excerpt}>
    <figcaption>Trecho inserido no laudo · caso sintético</figcaption>
    <blockquote>{lines.map(line => <p key={line}>{line}</p>)}</blockquote>
  </figure>
}

function CalculatorCard({ index, progress, staticMode, active }: { index: number; progress: MotionValue<number>; staticMode: boolean; active: boolean }) {
  const item = ITEMS[index]
  const Icon = item.icon
  const y = useTransform(progress, v => staticMode ? '0%' : `${Math.max(0, index - v) * 115 - Math.min(3, Math.max(0, v - index)) * 3.5}%`)
  const scale = useTransform(progress, v => staticMode ? 1 : 1 - Math.min(3, Math.max(0, v - index)) * .045)
  const filter = useTransform(progress, v => staticMode ? 'none' : `blur(${Math.min(3, Math.max(0, v - index)) * 1.4}px) brightness(${1 - Math.min(3, Math.max(0, v - index)) * .12})`)
  return <motion.article id={`calculadora-${item.id}`} data-calculator-card={item.id} aria-hidden={!staticMode && !active} className={styles.card} data-tone={index} style={{ y, scale, filter, zIndex: index + 1 }}>
    <div className={styles.cardTop}><span>0{index + 1}</span><span className={styles.availability}>{item.availability}</span><Icon strokeWidth={1.4} size={25} /></div>
    <Illustration index={index} />
    <div className={styles.cardCopy}><h3>{item.title}</h3><p>{item.body}</p><span className={styles.reference}>{item.source}</span></div>
  </motion.article>
}

export default function CalculatorStory() {
  const section = useRef<HTMLElement>(null)
  const reduce = useReducedMotionSafe()
  const [compact, setCompact] = useState(false)
  const [active, setActive] = useState(0)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px), (max-height: 799px)')
    const sync = () => setCompact(mq.matches)
    sync(); mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const staticMode = reduce || compact
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })
  const progress = useTransform(scrollYProgress, [0, .12, .88, 1], [0, 0, 3, 3])
  useMotionValueEvent(progress, 'change', v => setActive(Math.max(0, Math.min(3, Math.floor(v + .1)))))
  const select = (index: number) => {
    if (staticMode) { document.getElementById(`calculadora-${ITEMS[index].id}`)?.scrollIntoView({ behavior: 'auto', block: 'center' }); return }
    const el = section.current
    if (!el) return
    const ratio = .12 + (index / 3) * .76
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + (el.offsetHeight - window.innerHeight) * ratio, behavior: 'auto' })
  }
  return <section ref={section} id="calculadoras" data-landing-section="calculadoras" className={`${styles.section} ${staticMode ? styles.static : ''}`} aria-labelledby="calculator-title">
    <div className={styles.stage}>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>Calculadoras clínicas</span>
        <h2 id="calculator-title">Menos contas.<br /><em>Mais contexto para o exame.</em></h2>
        <p>Da datação ao Doppler, reúna medidas, referências e estimativas no mesmo lugar em que você lauda.</p>
        <div className={styles.navigation} aria-label="Explorar calculadoras">
          {ITEMS.map((item, i) => <button key={item.id} onClick={() => select(i)} aria-current={!staticMode && active === i ? 'step' : undefined}><span>0{i + 1}</span><strong>{item.label}</strong><ArrowDownRight size={17} /></button>)}
        </div>
        <p className={styles.note}>Apoio ao raciocínio clínico. Você confere os dados, interpreta os resultados e decide o que entra no laudo.</p>
      </div>
      <div className={styles.deck}>{ITEMS.map((item, index) => <CalculatorCard key={item.id} index={index} progress={progress} staticMode={staticMode} active={active === index} />)}</div>
    </div>
  </section>
}
