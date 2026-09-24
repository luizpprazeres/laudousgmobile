import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MamariaFormPanel } from '../src/components/laudar/MamariaFormPanel'
import { MamariaBiradsPanel } from '../src/components/laudar/MamariaBiradsPanel'
import { adaptarMamaria } from '../src/lib/catalog/mamariaParaCatalogo'
import type { OrganState } from '../src/lib/deterministic'

/** Formulário e painel de BI-RADS sobre o MESMO estado, como na tela real. */
function Preview() {
  const [mamas, setMamas] = useState<OrganState>({ fundo: 'heterogeneo', achados_ids: [] })
  const [laudo, setLaudo] = useState('')
  const { dados } = adaptarMamaria({ mamas, __opts: { escopo_exame: 'mamas' } })
  const corpo = JSON.stringify({ dados })
  useEffect(() => {
    let alive = true
    fetch('/render', { method: 'POST', body: corpo }).then((r) => r.text()).then((t) => { if (alive) setLaudo(t) })
    return () => { alive = false }
  }, [corpo])
  return (
    <main className="mx-auto grid max-w-[1300px] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-2">
      <section aria-label="Mamas" className="min-w-0 rounded-[22px] border border-gray-200 bg-white p-4 sm:p-5">
        <MamariaFormPanel state={mamas} onChange={setMamas} />
      </section>
      <section aria-label="BI-RADS" className="min-w-0 rounded-[22px] border border-gray-200 bg-white p-4 sm:p-5">
        <MamariaBiradsPanel state={mamas} onChange={setMamas} />
      </section>
      <div role="status" aria-label="Laudo gerado" className="whitespace-pre-wrap text-sm lg:col-span-2">{laudo}</div>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Preview />)
