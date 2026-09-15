'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import type { PeWebCalculo, PeWebForm } from '@/lib/calculators/preEclampsia'

type Props = {
  open: boolean
  form: PeWebForm
  calculo: PeWebCalculo
  /** momento em que o cálculo exibido foi produzido */
  calculadoEm: Date
  onClose: () => void
}

const ETNIA_LABEL = {
  branca: 'Branca',
  afro: 'Negra',
  'sul-asiatica': 'Sul-asiática',
  'leste-asiatica': 'Leste-asiática', 'mista': 'Mista',
} as const

const PARIDADE_LABEL = {
  nulipara: 'Nulípara',
  'multipara-sem-pe': 'Multípara, sem pré-eclâmpsia anterior',
  'multipara-com-pe': 'Multípara, com pré-eclâmpsia anterior',
} as const

type PeCampoBooleano = 'hipertensaoCronica' | 'lesSaf' | 'histFamiliarPE' | 'fiv' | 'fumante'

const CONDICOES: { campo: PeCampoBooleano; label: string }[] = [
  { campo: 'hipertensaoCronica', label: 'Hipertensão arterial crônica' },
  { campo: 'lesSaf', label: 'LES ou síndrome antifosfolípide' },
  { campo: 'histFamiliarPE', label: 'Mãe teve pré-eclâmpsia' },
  { campo: 'fiv', label: 'Fertilização in vitro' },
  { campo: 'fumante', label: 'Fumante' },
]

/** Diabetes é tri-estado (não / tipo 1 / tipo 2) — não cabe na lista booleana acima. */
function rotuloDiabetes(form: PeWebForm): string | null {
  if (!form.diabetes) return null
  return form.diabetesTipo1 ? 'Diabetes mellitus tipo 1' : 'Diabetes mellitus tipo 2'
}

/**
 * A folha é impressa a partir de um portal fora do root do app; as regras de
 * `@media print` vivem dentro do portal e desaparecem junto com ele ao fechar,
 * para não deixar o restante da aplicação com impressão alterada.
 */
const SHEET_CSS = `
.pe-print-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 16px;
  overflow: auto;
  background: rgba(15, 23, 42, 0.55);
}
.pe-print-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 210mm;
  max-height: calc(100vh - 32px);
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  outline: none;
}
.pe-print-shell:focus-visible { box-shadow: 0 0 0 3px #059669, 0 24px 60px rgba(15, 23, 42, 0.35); }
.pe-print-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 12px 12px 0 0;
  background: #ffffff;
}
.pe-print-toolbar-title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  color: #6b7280;
}
.pe-print-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.pe-print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: #059669;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.pe-print-btn:hover { background: #047857; }
.pe-print-btn-ghost {
  background: #ffffff;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}
.pe-print-btn-ghost:hover { background: #f3f4f6; }
.pe-print-scroll { overflow: auto; padding: 14px; background: #f3f4f6; border-radius: 0 0 12px 12px; }
.pe-sheet {
  margin: 0 auto;
  padding: 16mm 14mm;
  max-width: 210mm;
  background: #ffffff;
  color: #111827;
  font-size: 11pt;
  line-height: 1.45;
}
.pe-sheet-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1.5px solid #111827;
}
.pe-sheet-title { margin: 0; font-size: 14pt; font-weight: 800; letter-spacing: 0; }
.pe-sheet-title:focus { outline: none; }
.pe-sheet-subtitle { margin: 2px 0 0; font-size: 9pt; color: #4b5563; }
.pe-sheet-meta { margin: 0; font-size: 8.5pt; color: #374151; text-align: right; }
.pe-sheet-meta div { display: flex; gap: 6px; justify-content: flex-end; }
.pe-sheet-meta dt { font-weight: 700; color: #6b7280; }
.pe-sheet-meta dd { margin: 0; }
.pe-sheet-block { margin-top: 12px; break-inside: avoid; page-break-inside: avoid; }
.pe-sheet-block-title {
  margin: 0 0 5px;
  font-size: 8.5pt;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  color: #6b7280;
}
.pe-sheet-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 14px;
  margin: 0;
  font-size: 10pt;
}
.pe-sheet-grid div { min-width: 0; }
.pe-sheet-grid dt { font-size: 8.5pt; color: #6b7280; }
.pe-sheet-grid dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.pe-sheet-list { margin: 0; padding-left: 18px; font-size: 10pt; }
.pe-sheet-resultado {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border: 1.5px solid #111827;
  border-radius: 6px;
}
.pe-sheet-risco { font-size: 17pt; font-weight: 800; line-height: 1.1; }
.pe-sheet-risco small { display: block; font-size: 8.5pt; font-weight: 500; color: #4b5563; }
.pe-sheet-corte { font-size: 9.5pt; font-weight: 700; }
.pe-sheet-bloco {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  font-family: inherit;
  font-size: 9.5pt;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.pe-sheet-foot {
  margin-top: 14px;
  padding-top: 8px;
  border-top: 1px solid #d1d5db;
  font-size: 8pt;
  line-height: 1.45;
  color: #4b5563;
}
@media (max-width: 640px) {
  .pe-print-overlay { padding: 0; }
  .pe-print-shell { max-height: 100vh; border-radius: 0; }
  .pe-print-toolbar { border-radius: 0; }
  .pe-print-scroll { padding: 8px; border-radius: 0; }
  .pe-sheet { padding: 16px; font-size: 12.5px; }
  .pe-sheet-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pe-sheet-meta { text-align: left; }
  .pe-sheet-meta div { justify-content: flex-start; }
}
@media print {
  @page { size: A4; margin: 14mm; }
  html, body {
    background: #ffffff !important;
    height: auto !important;
    overflow: visible !important;
  }
  body > *:not([data-pe-print-root]) { display: none !important; }
  [data-pe-print-root] .pe-print-overlay {
    position: static !important;
    display: block !important;
    padding: 0 !important;
    overflow: visible !important;
    background: none !important;
  }
  [data-pe-print-root] .pe-print-shell {
    display: block !important;
    width: auto !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  [data-pe-print-root] .pe-print-toolbar { display: none !important; }
  [data-pe-print-root] .pe-print-scroll {
    padding: 0 !important;
    overflow: visible !important;
    background: #ffffff !important;
  }
  [data-pe-print-root] .pe-sheet {
    max-width: none !important;
    padding: 0 !important;
    font-size: 10.5pt !important;
  }
}
`

const dec = (valor: number, casas: number) =>
  valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

export function PreEclampsiaPrintSheet({ open, form, calculo, calculadoEm, onClose }: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const tituloId = useId()

  useEffect(() => {
    if (!open) return
    const container = document.createElement('div')
    container.setAttribute('data-pe-print-root', '')
    document.body.appendChild(container)

    const focoAnterior = document.activeElement as HTMLElement | null
    const inertados: Element[] = []
    for (const filho of Array.from(document.body.children)) {
      if (filho === container || filho.hasAttribute('inert')) continue
      filho.setAttribute('inert', '')
      inertados.push(filho)
    }
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Tab') {
        evento.stopPropagation()
        const buttons = shellRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (evento.shiftKey && (document.activeElement === first || document.activeElement === shellRef.current)) {
          evento.preventDefault()
          last.focus()
        } else if (!evento.shiftKey && document.activeElement === last) {
          evento.preventDefault()
          first.focus()
        }
        return
      }
      if (evento.key !== 'Escape') return
      evento.preventDefault()
      evento.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', aoTeclar, true)
    setHost(container)

    return () => {
      document.removeEventListener('keydown', aoTeclar, true)
      for (const filho of inertados) filho.removeAttribute('inert')
      document.body.style.overflow = overflowAnterior
      container.remove()
      setHost(null)
      if (focoAnterior?.isConnected) focoAnterior.focus()
    }
  }, [open, onClose])

  useEffect(() => {
    if (host) shellRef.current?.focus()
  }, [host])

  if (!open || !host) return null

  const { gestante, medidas, resultado } = calculo
  const diabetesLabel = rotuloDiabetes(form)
  const condicoes = [
    ...(diabetesLabel ? [diabetesLabel] : []),
    ...CONDICOES.filter(({ campo }) => form[campo]).map(({ label }) => label),
  ]
  const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(calculadoEm)

  return createPortal(
    <>
      <style>{SHEET_CSS}</style>
      <div
        className="pe-print-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <div
          ref={shellRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          className="pe-print-shell"
        >
          <div className="pe-print-toolbar">
            <p className="pe-print-toolbar-title">Pré-visualização da folha</p>
            <div className="pe-print-actions">
              <button type="button" className="pe-print-btn" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" /> Imprimir
              </button>
              <button type="button" className="pe-print-btn pe-print-btn-ghost" onClick={onClose}>
                <X className="h-4 w-4" aria-hidden="true" /> Fechar
              </button>
            </div>
          </div>

          <div className="pe-print-scroll">
            <article className="pe-sheet">
              <header className="pe-sheet-head">
                <div>
                  <h2 id={tituloId} className="pe-sheet-title">
                    Rastreio de pré-eclâmpsia — 1º trimestre
                  </h2>
                  <p className="pe-sheet-subtitle">
                    Cálculo de risco pelo modelo da FMF, a partir dos dados digitados nesta consulta.
                  </p>
                </div>
                <dl className="pe-sheet-meta">
                  <div>
                    <dt>Cálculo:</dt>
                    <dd>{dataHora}</dd>
                  </div>
                  <div>
                    <dt>Parâmetros:</dt>
                    <dd>{resultado.versaoParametros}</dd>
                  </div>
                </dl>
              </header>

              <section className="pe-sheet-block">
                <h3 className="pe-sheet-block-title">Dados usados no cálculo</h3>
                <dl className="pe-sheet-grid">
                  <Dado rotulo="Idade na DPP" valor={`${dec(gestante.idade, 1)} anos`} />
                  <Dado rotulo="Peso" valor={`${dec(gestante.peso, 1)} kg`} />
                  <Dado rotulo="Altura" valor={`${dec(gestante.altura, 1)} cm`} />
                  <Dado
                    rotulo="Idade gestacional"
                    valor={`${form.gaSemanas.trim()} semanas e ${form.gaDias.trim()} dias`}
                  />
                  <Dado rotulo="Etnia" valor={ETNIA_LABEL[gestante.etnia]} />
                  <Dado rotulo="História obstétrica" valor={PARIDADE_LABEL[gestante.paridade]} />
                  {typeof gestante.igPartoAnterior === 'number' ? (
                    <Dado rotulo="IG do parto anterior" valor={`${dec(gestante.igPartoAnterior, 1)} semanas`} />
                  ) : null}
                  {typeof gestante.intervaloAnos === 'number' ? (
                    <Dado rotulo="Intervalo entre gestações" valor={`${dec(gestante.intervaloAnos, 1)} anos`} />
                  ) : null}
                  {typeof gestante.zEscorePesoAnterior === 'number' ? (
                    <Dado rotulo="Z-score do peso ao nascer" valor={dec(gestante.zEscorePesoAnterior, 2)} />
                  ) : null}
                </dl>
              </section>

              <section className="pe-sheet-block">
                <h3 className="pe-sheet-block-title">Condições maternas registradas</h3>
                {condicoes.length > 0 ? (
                  <ul className="pe-sheet-list">
                    {condicoes.map((condicao) => (
                      <li key={condicao}>{condicao}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: '10pt' }}>Nenhuma condição assinalada.</p>
                )}
              </section>

              <section className="pe-sheet-block">
                <h3 className="pe-sheet-block-title">Marcadores</h3>
                <dl className="pe-sheet-grid">
                  <Dado
                    rotulo="Pressão arterial média"
                    valor={
                      typeof medidas.pamMmHg === 'number'
                        ? `${dec(medidas.pamMmHg, 1)} mmHg${
                            medidas.afericoesPam
                              ? ` · ${medidas.afericoesPam} ${medidas.afericoesPam === 1 ? 'aferição' : 'aferições'}`
                              : ''
                          }`
                        : 'Não informada'
                    }
                  />
                  <Dado
                    rotulo="IP médio das artérias uterinas"
                    valor={typeof medidas.utaPiMedio === 'number' ? dec(medidas.utaPiMedio, 3) : 'Não informado'}
                  />
                  {resultado.marcadores.map((marcador) => (
                    <Dado
                      key={marcador.nome}
                      rotulo={marcador.nome === 'map' ? 'PAM em MoM' : 'IP uterino em MoM'}
                      valor={`${dec(marcador.mom, 2)} MoM${marcador.truncado ? ' · truncado pelo modelo' : ''}`}
                    />
                  ))}
                </dl>
                {resultado.marcadores.length === 0 ? (
                  <p style={{ margin: '6px 0 0', fontSize: '9.5pt' }}>
                    Resultado calculado somente com a história materna.
                  </p>
                ) : null}
              </section>

              <section className="pe-sheet-block">
                <h3 className="pe-sheet-block-title">Resultado</h3>
                <div className="pe-sheet-resultado">
                  <p className="pe-sheet-risco">
                    1 em {resultado.umEmN.toLocaleString('pt-BR')}
                    <small>Pré-eclâmpsia com parto antes de 37 semanas</small>
                  </p>
                  <p className="pe-sheet-corte">
                    {resultado.altoRisco ? 'Atingiu o corte de 1:100' : 'Abaixo do corte de 1:100'}
                  </p>
                </div>
              </section>

              <section className="pe-sheet-block">
                <h3 className="pe-sheet-block-title">Texto para o laudo</h3>
                <pre className="pe-sheet-bloco">{resultado.insertBloco}</pre>
              </section>

              <footer className="pe-sheet-foot">
                Folha gerada localmente a partir dos dados digitados nesta consulta, sem identificação da paciente.
                É um apoio ao raciocínio clínico e não substitui a avaliação do médico responsável.
              </footer>
            </article>
          </div>
        </div>
      </div>
    </>,
    host
  )
}
