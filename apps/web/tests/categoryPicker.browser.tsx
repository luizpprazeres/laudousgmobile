import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ExamCategoryPicker } from '../src/components/laudar/ExamCategoryPicker'

/** Seletor real; a escolha fica visível para o teste. */
function Preview() {
  const [escolhida, setEscolhida] = useState('')
  return <>
    <output data-testid="escolhida" className="sr-only">{escolhida}</output>
    <ExamCategoryPicker onSelect={setEscolhida} />
  </>
}
createRoot(document.getElementById('root')!).render(<Preview />)
