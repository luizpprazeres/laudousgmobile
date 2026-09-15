import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PreEclampsiaFmfPanel } from '../src/components/laudar/PreEclampsiaFmfPanel'

function Preview() {
  const [block, setBlock] = useState('')
  return <main style={{maxWidth: 620, margin: '0 auto', padding: 12}}>
    <PreEclampsiaFmfPanel insertedBlock={block} onInsert={setBlock} onRemove={() => setBlock('')} />
    {new URLSearchParams(location.search).has('multiple') ? <PreEclampsiaFmfPanel onInsert={() => {}} onRemove={() => {}} /> : null}
  </main>
}
createRoot(document.getElementById('root')!).render(<Preview />)
