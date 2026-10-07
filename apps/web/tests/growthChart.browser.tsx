import { createRoot } from 'react-dom/client'
import { LaudarWebExperience } from '../src/components/laudar/LaudarWebExperience'
import { ReportDetail } from '../src/components/historico/ReportDetail'
import { intergrowthBiometryPreviewFromDating } from '../src/lib/calculators/intergrowthBiometry'
import {
  attachStoredGrowthChartWithPrior,
  extractStoredGrowthChart,
  storedGrowthChartFromPreview,
} from '../src/lib/calculators/growthChartPersistence'

const root = createRoot(document.getElementById('root')!)

if (location.pathname === '/history' || location.pathname === '/history-invalid') {
  const preview = intergrowthBiometryPreviewFromDating(
    { cc: '230', ca: '210', cf: '50' },
    'cf',
    {
      referencia: 'dum',
      'referencia.dum.dum_data': '01/01/2026',
      'referencia.dum.exame_data': '21/06/2026',
    },
  )!
  const currentGrowthChart = storedGrowthChartFromPreview(preview)
  const longitudinal = attachStoredGrowthChartWithPrior(
    { __growth_chart: { incluir: 'sim' } },
    preview,
    [{ examDate: '2026-05-21', weightGrams: 400 }],
  )
  if (!longitudinal.ok) throw new Error(longitudinal.reason)
  const storedGrowthChart = extractStoredGrowthChart(longitudinal.state)!
  const invalidGrowthChart = storedGrowthChart.format === 'fetal-growth-intergrowth-v2'
    ? { ...storedGrowthChart, priorExams: [{ ...storedGrowthChart.priorExams[0], percentile: storedGrowthChart.priorExams[0].percentile - 1 }] }
    : { ...currentGrowthChart, percentile: currentGrowthChart.percentile - 1 }
  root.render(
    <div className="h-screen">
      <ReportDetail
        item={{
          id: 'saved-growth-chart',
          origin: 'web',
          category: 'OBSTETRICA',
          title: 'Obstétrica com gráfico salvo',
          text: 'ULTRASSONOGRAFIA OBSTÉTRICA\n\nLaudo sintético.',
          html: '<h1 data-report-block="true">ULTRASSONOGRAFIA OBSTÉTRICA</h1><p data-report-block="true">Laudo sintético.</p>',
          growthChart: location.pathname === '/history-invalid'
            ? invalidGrowthChart
            : storedGrowthChart,
          date: '2026-10-06T18:00:00Z',
        }}
        onDeleted={() => undefined}
      />
    </div>,
  )
} else {
  root.render(<LaudarWebExperience richEditor />)
}
