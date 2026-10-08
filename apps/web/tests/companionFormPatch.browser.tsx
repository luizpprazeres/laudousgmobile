import { createRoot } from 'react-dom/client'
import { CompanionPanel } from '../src/components/laudar/CompanionPanel'

declare global {
  interface Window {
    __companionApplyAllowed?: boolean
  }
}

window.__companionApplyAllowed = false

createRoot(document.getElementById('root')!).render(
  <CompanionPanel
    open
    activeCategory={location.pathname === '/carotidas' ? 'DOPPLER_CAROTIDAS' : 'ABDOMEN_TOTAL'}
    allowFormPatch
    onClose={() => undefined}
    onApplyText={() => undefined}
    onApplyStructured={() => Boolean(window.__companionApplyAllowed)}
    onApplyFormPatch={() => Boolean(window.__companionApplyAllowed)}
  />,
)
