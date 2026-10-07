import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TireoideFormPanel } from '../src/components/laudar/TireoideFormPanel'
import { adaptarTireoide } from '../src/lib/catalog/tireoideParaCatalogo'
import { initialTireoideState } from '../src/lib/deterministic/organs/tireoide'

function Preview() {
  const [state, setState] = useState(initialTireoideState)
  const [laudo, setLaudo] = useState('')
  const adaptacao = adaptarTireoide(state)
  const corpo = JSON.stringify(adaptacao)

  useEffect(() => {
    let alive = true
    fetch('/render', { method: 'POST', body: corpo })
      .then((response) => response.text())
      .then((text) => { if (alive) setLaudo(text) })
    return () => { alive = false }
  }, [corpo])

  return (
    <main className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6">
      <section aria-label="Nódulos tireoidianos">
        <TireoideFormPanel section="nodulos" state={state} onChange={setState} />
      </section>
      <pre data-testid="adaptacao" className="hidden">{JSON.stringify(adaptacao)}</pre>
      <pre data-testid="estado" className="hidden">{JSON.stringify(state)}</pre>
      <div role="status" aria-label="Laudo gerado" className="mt-4 whitespace-pre-wrap text-sm">{laudo}</div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
