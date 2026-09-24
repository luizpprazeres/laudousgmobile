import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MamariaFormPanel } from '../src/components/laudar/MamariaFormPanel'
import { adaptarMamaria } from '../src/lib/catalog/mamariaParaCatalogo'
import type { OrganState } from '../src/lib/deterministic'

/**
 * Harness isolado do painel de mamas: o PAINEL real, o ADAPTADOR real
 * (`mamariaParaCatalogo`) e o RENDERER real (no servidor do teste). Nada de
 * texto clínico nasce aqui — a página só mostra o que os três produzem.
 */
function Preview() {
  const [mamas, setMamas] = useState<OrganState>({ fundo: 'heterogeneo', achados_ids: [] })
  const [doppler, setDoppler] = useState(false)
  const [laudo, setLaudo] = useState('')
  const adaptacao = adaptarMamaria({ mamas, __opts: { doppler_mamario: doppler ? 'sim' : 'nao' } })

  const corpo = JSON.stringify({ alteracoes: adaptacao.alteracoes, dados: adaptacao.dados })
  useEffect(() => {
    let alive = true
    fetch('/render', { method: 'POST', body: corpo })
      .then((r) => r.text())
      .then((text) => { if (alive) setLaudo(text) })
    return () => { alive = false }
  }, [corpo])

  return (
    <main className="mx-auto max-w-[1300px] px-3 py-4 sm:px-6">
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={doppler} onChange={(e) => setDoppler(e.target.checked)} />
        Doppler mamário (harness)
      </label>
      <section aria-label="Mamas" className="rounded-[22px] border border-gray-200 bg-white p-4 sm:p-5">
        <MamariaFormPanel state={mamas} onChange={setMamas} dopplerEnabled={doppler} />
      </section>
      <pre data-testid="adaptacao" className="mt-4 hidden">{JSON.stringify(adaptacao)}</pre>
      <pre data-testid="estado" className="hidden">{JSON.stringify(mamas)}</pre>
      <div role="status" aria-label="Laudo gerado" className="mt-4 whitespace-pre-wrap text-sm">{laudo}</div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
