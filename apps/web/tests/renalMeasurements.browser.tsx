import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { OrganFormPanel } from '../src/components/laudar/OrganFormPanel'
import { rimDireitoModule, rimEsquerdoModule } from '../src/lib/deterministic/organs/rim'
import { adaptarAbdome } from '../src/lib/catalog/abdomeParaCatalogo'
import type { OrganState } from '../src/lib/deterministic'

function Preview() {
  const [state, setState] = useState<Record<string, OrganState>>({
    rim_direito: rimDireitoModule.initialState(), rim_esquerdo: rimEsquerdoModule.initialState(),
  })
  const [text, setText] = useState('')
  useEffect(() => {
    let alive = true
    fetch('/render', { method: 'POST', body: JSON.stringify(adaptarAbdome(state).dados) })
      .then(r => r.text()).then(text => { if (alive) setText(text) })
    return () => { alive = false }
  }, [state])
  return (
    <main className="mx-auto max-w-6xl p-3 sm:p-6">
      <h1 className="mb-5 text-xl font-semibold">Abdome Total</h1>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {[rimDireitoModule, rimEsquerdoModule].map(module => (
            <section key={module.schema.id} aria-label={module.schema.name} className="min-w-0">
              <h2 className="mb-2 text-sm font-semibold">{module.schema.name}</h2>
              <OrganFormPanel compact schema={module.schema} state={state[module.schema.id]}
                onChange={next => setState(current => ({ ...current, [module.schema.id]: next }))} />
            </section>
          ))}
        </div>
        <section className="min-w-0 border-t border-gray-200 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h2 className="mb-3 text-sm font-semibold">Laudo</h2>
          <div role="status" aria-label="Laudo gerado" className="whitespace-pre-wrap text-sm leading-6">{text}</div>
        </section>
      </div>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Preview />)
