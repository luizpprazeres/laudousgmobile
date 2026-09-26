import { createRoot } from 'react-dom/client'
import { LaudarWebExperience } from '../src/components/laudar/LaudarWebExperience'

// `?reabrir=<id>` faz o papel da página /app/gerar: repassa o id e mais nada.
const reabrir = new URLSearchParams(window.location.search).get('reabrir') ?? undefined
createRoot(document.getElementById('root')!).render(<LaudarWebExperience key={reabrir ?? 'novo'} richEditor reopenReportId={reabrir} />)
