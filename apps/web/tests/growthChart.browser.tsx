import { createRoot } from 'react-dom/client'
import { LaudarWebExperience } from '../src/components/laudar/LaudarWebExperience'
import { ReportDetail } from '../src/components/historico/ReportDetail'
import { intergrowthBiometryPreviewFromDating } from '../src/lib/calculators/intergrowthBiometry'
import { storedGrowthChartFromPreview } from '../src/lib/calculators/growthChartPersistence'

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
  const storedGrowthChart = storedGrowthChartFromPreview(preview)!
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
            ? { ...storedGrowthChart, percentile: storedGrowthChart.percentile - 1 }
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
