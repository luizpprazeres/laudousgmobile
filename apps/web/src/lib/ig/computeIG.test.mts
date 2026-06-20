/** Golden da fundação de IG. Rodar: npx tsx src/lib/ig/computeIG.test.mts */
import { computeIG } from './computeIG'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) { pass++; console.log(`✓ ${name}`) }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ''}`) }
}

// 1) Sem referência → só biometria.
const a = computeIG({ biometria: { semanas: 20, dias: 3 }, hojeISO: '2026-06-20' })
check('sem ref → só biometria', a.igConclusao === 'Gestação em torno de 20 semanas e 3 dias.', a.igConclusao)
check('sem ref → sem frase 1ª US', a.frase1aUS === undefined)

// 2) US precoce, divergência ≤ 5 dias → só biometria (não referencia).
//    US em 12/01/2026 com 8s2d; hoje 30/05/2026 (138 dias depois) → ref hoje = 8s2d+138 = 58+138=196d = 28s0d.
//    biometria 28s1d (197d) → divergência 1 dia ≤ 5 → só biometria.
const b = computeIG({
  biometria: { semanas: 28, dias: 1 },
  hojeISO: '2026-05-30',
  referencia: { tipo: 'us', dataISO: '2026-01-12', ig: { semanas: 8, dias: 2 } },
  corrigir: true,
})
check('US div ≤5 → só biometria', b.igConclusao === 'Gestação em torno de 28 semanas e 1 dia.', `${b.igConclusao} (div=${b.divergenciaDias})`)
check('US → frase 1ª US presente', /Primeira ultrassonografia realizada em 12\/01\/2026 com 8 semanas e 2 dias\. Hoje com /.test(b.frase1aUS ?? ''), b.frase1aUS)

// 3) US precoce, divergência > 5 dias, corrigir=true → frase com correção.
//    US 12/01/2026 com 8s2d; hoje 30/05/2026 → ref hoje 28s0d. biometria 26s0d (182d) → div 14 dias > 5.
const inputC = {
  biometria: { semanas: 26, dias: 0 },
  hojeISO: '2026-05-30',
  referencia: { tipo: 'us' as const, dataISO: '2026-01-12', ig: { semanas: 8, dias: 2 } },
  corrigir: true,
}
const c = computeIG(inputC)
check('US div >5 + corrigir → frase de correção',
  c.igConclusao === 'Gestação em torno de 26 semanas e 0 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 28 semanas e 0 dias.',
  `${c.igConclusao} (div=${c.divergenciaDias})`)

// 4) Mesma divergência, corrigir=false → só biometria (toggle off).
const d = computeIG({ ...inputC, corrigir: false })
check('US div >5 + corrigir=false → só biometria', d.igConclusao === 'Gestação em torno de 26 semanas e 0 dias.', d.igConclusao)

// 5) DUM: hoje - DUM. DUM 01/01/2026; hoje 30/05/2026 = 149 dias = 21s2d.
const e = computeIG({
  biometria: { semanas: 21, dias: 3 },
  hojeISO: '2026-05-30',
  referencia: { tipo: 'dum', dataISO: '2026-01-01' },
  corrigir: true,
})
check('DUM → ref hoje 21s2d', e.referenciaHojeSD?.semanas === 21 && e.referenciaHojeSD?.dias === 2, JSON.stringify(e.referenciaHojeSD))
check('DUM div ≤5 → só biometria', e.igConclusao === 'Gestação em torno de 21 semanas e 3 dias.', `${e.igConclusao} (div=${e.divergenciaDias})`)
check('DUM → frase DUM', /Data da última menstruação em 01\/01\/2026/.test(e.frase1aUS ?? ''), e.frase1aUS)

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ''))
if (fail) process.exit(1)
