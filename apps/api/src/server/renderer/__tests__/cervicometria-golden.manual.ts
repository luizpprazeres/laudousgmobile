/**
 * GOLDEN da CERVICOMETRIA (ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL p/ medida do colo).
 * Determinístico (sem LLM). Trava o formato da casa (ground truth aa95bb81), os
 * thresholds do colo (normal / um pouco curto / curto+TPP), a placenta (com medida /
 * distante / omitida), a placenta prévia por IG (>=32 sem) e a cerclagem.
 * Rodar: tsx src/server/renderer/__tests__/cervicometria-golden.manual.ts
 */
import {
  renderCervicometria,
  CervicometriaFindingsSchema,
  type CervicometriaFindings,
} from "../categories/CERVICOMETRIA";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

function F(over: Partial<CervicometriaFindings>): CervicometriaFindings {
  return {
    colo_oi_oe_cm: null,
    orificio_interno_fechado: true,
    placenta_distancia_cm: null,
    placenta_distante: false,
    ig_semanas: null,
    cerclagem: false,
    observacoes: null,
    ...over,
  };
}
const concl = (l: string) => l.split("CONCLUSÃO:")[1] ?? "";

// ── Estrutura / formato da casa (ground truth aa95bb81) ──
{
  const l = renderCervicometria(F({ colo_oi_oe_cm: 4.0, placenta_distancia_cm: 6.4 }));
  check("título ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL", /^ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL/.test(l), l);
  check("COMENTÁRIOS transdutor 6.5 MHz", /transdutor de 6\.5 MHz, pela técnica transvaginal/.test(l));
  check("cabeçalho OS SEGUINTES ASPECTOS", /OS SEGUINTES ASPECTOS FORAM OBSERVADOS:/.test(l));
  check("linha comprimento do colo (OI→OE)", /Distância do orifício interno ao orifício externo do colo uterino de 4,0 cm\./.test(l), l);
  check("orifício interno fechado", /Orifício interno do colo uterino fechado\./.test(l));
  check("placenta com medida", /Extremidade inferior da placenta distando cerca de 6,4 cm do orifício interno do colo\./.test(l));
  check("conclusão normal (item único, sem número)", /CONCLUSÃO:\nColo uterino ecograficamente normal\.$/.test(l.trim()), l);
}

// ── Thresholds do colo ──
{
  check("L=3,0 → normal", /ecograficamente normal/.test(concl(renderCervicometria(F({ colo_oi_oe_cm: 3.0 })))));
  check("L=2,5 → normal (limite)", /ecograficamente normal/.test(concl(renderCervicometria(F({ colo_oi_oe_cm: 2.5 })))));
  check("L=2,4 → um pouco curto", /um pouco curto \(medindo 2,4 cm\)/.test(concl(renderCervicometria(F({ colo_oi_oe_cm: 2.4 })))));
  check("L=2,0 → um pouco curto (limite)", /um pouco curto \(medindo 2,0 cm\)/.test(concl(renderCervicometria(F({ colo_oi_oe_cm: 2.0 })))));
  {
    const c = concl(renderCervicometria(F({ colo_oi_oe_cm: 1.8 })));
    check("L=1,8 → curto + alto risco TPP", /Colo uterino curto \(medindo 1,8 cm\), com alto risco para trabalho de parto prematuro\./.test(c), c);
  }
}

// ── Placenta: distante (sem número) e omitida ──
{
  const l = renderCervicometria(F({ colo_oi_oe_cm: 3.5, placenta_distante: true }));
  check("placenta distante (sem número)", /Extremidade inferior da placenta distante do orifício interno do colo\./.test(l) && !/distando cerca/.test(l), l);
}
{
  const l = renderCervicometria(F({ colo_oi_oe_cm: 3.5 }));
  check("placenta não avaliada → linha omitida", !/placenta/i.test(l), l);
}

// ── Placenta prévia por IG (>= 32 semanas) ──
{
  const lAntes = renderCervicometria(F({ colo_oi_oe_cm: 3.5, placenta_distancia_cm: 5.0, ig_semanas: 30 }));
  check("IG 30 sem → SEM item de placenta prévia", !/placenta prévia/i.test(lAntes), concl(lAntes));
  check("IG 30 sem → conclusão item único", /CONCLUSÃO:\nColo uterino ecograficamente normal\.$/.test(lAntes.trim()), concl(lAntes));

  const lDepois = renderCervicometria(F({ colo_oi_oe_cm: 3.5, placenta_distancia_cm: 5.0, ig_semanas: 33 }));
  check("IG 33 sem → item 'Não há sinais de placenta prévia'", /Não há sinais de placenta prévia\./.test(lDepois), concl(lDepois));
  check("IG 33 sem → conclusão numerada (2 itens)", /1\) Colo uterino ecograficamente normal\.\n2\) Não há sinais de placenta prévia\./.test(lDepois), concl(lDepois));
}
{
  // >=32 sem MAS sem avaliação de placenta → não afirma placenta prévia (seguro).
  const l = renderCervicometria(F({ colo_oi_oe_cm: 3.5, ig_semanas: 34 }));
  check("IG 34 sem SEM placenta avaliada → sem item de placenta prévia", !/placenta prévia/i.test(l), concl(l));
}

// ── Cerclagem (corpo + conclusão) ──
{
  const l = renderCervicometria(F({ colo_oi_oe_cm: 3.2, cerclagem: true }));
  check("cerclagem no corpo", /Imagens hiperecoicas puntiformes na topografia do canal endocervical, compatíveis com pontos de cerclagem\./.test(l), l);
  check("cerclagem na conclusão", /Pontos de cerclagem uterina em topografia habitual\./.test(l));
  check("cerclagem → conclusão numerada", /1\) Colo uterino ecograficamente normal\.\n2\) Pontos de cerclagem/.test(concl(l)), concl(l));
}

// ── Sem medida do colo → placeholder ____, mas conclusão normal ──
{
  const l = renderCervicometria(F({}));
  check("sem colo ditado → '____ cm' no corpo", /de ____ cm\./.test(l), l);
}

// ── Schema aceita o shape esperado ──
{
  const ok = CervicometriaFindingsSchema.safeParse(F({ colo_oi_oe_cm: 2.3 })).success;
  check("schema parseia findings válido", ok);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
