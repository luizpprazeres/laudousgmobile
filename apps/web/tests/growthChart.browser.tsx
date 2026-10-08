import { storeClinicalCharts } from '../src/lib/calculators/clinicalCharts'
import { calcularPreEclampsiaWeb } from '../src/lib/calculators/preEclampsia'
import { calculateTrisomyWeb } from '../src/lib/calculators/trisomyFmf'
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

if (location.pathname === '/history' || location.pathname === '/history-invalid' || location.pathname === '/history-mixed' || location.pathname === '/history-doppler' || location.pathname === '/history-firsttrim') {
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
          growthChart: location.pathname === '/history-invalid' ? invalidGrowthChart : location.pathname === '/history-firsttrim' ? null : storedGrowthChart,
          clinicalCharts: ['/history-mixed', '/history-doppler', '/history-firsttrim'].includes(location.pathname) ? storeClinicalCharts({
            doppler: { weeks: location.pathname === '/history-firsttrim' ? 12 : 24, days: 3, ipUmbilical: 1, ipMCA: 2, ipMedioUterinas: 0.8 },
            pe: location.pathname === '/history-doppler' ? undefined : calcularPreEclampsiaWeb({ idade: '36', peso: '69', altura: '164', gaSemanas: '12', gaDias: '0', etnia: 'branca', paridade: 'nulipara', intervaloAnos: '', igPartoAnterior: '', zEscorePesoAnterior: '', histFamiliarPE: true, fiv: false, hipertensaoCronica: false, diabetes: false, lesSaf: false, fumante: false, afericoes: [{ sistolica: '120', diastolica: '80' }], utaPiMedio: '1,08', utaPiFonte: 'manual' }),
            trisomy: location.pathname === '/history-doppler' ? undefined : calculateTrisomyWeb({ maternalAge: '36', crl: '64', nt: '1.5', fhr: '160', ethnicity: 'white', weight: '69', smoking: false, previousT21: false, previousT18: false, previousT13: false, freeBetaHcgMoM: '', pappaMoM: '', isMoMCorrected: false, dvPI: '', tricuspid: '', nasalBone: '' }),
          }) : null,
          date: '2026-10-06T18:00:00Z',
        }}
        onDeleted={() => undefined}
      />
    </div>,
  )
} else {
  root.render(<LaudarWebExperience richEditor />)
}
