/**
 * Teste manual do renderer PROSTATA_SUPRAPUBICA (S6, curadoria A10 + dex1).
 * Rodar: tsx src/server/renderer/__tests__/prostata-suprapubica.manual.ts
 */
import {
  renderProstataSuprapubica,
  calcPesoProstatico,
  ippGrau,
  type ProstataSuprapubicaFindings,
} from "../categories/PROSTATA_SUPRAPUBICA";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

const P = (p: Partial<ProstataSuprapubicaFindings> = {}): ProstataSuprapubicaFindings => ({
  prostata_d1_cm: null, prostata_d2_cm: null, prostata_d3_cm: null,
  hiperplasia: false, calcificacoes: false, ipp_cm: null,
  bexiga_achado: null, volume_pre_miccional_ml: null,
  residuo_pos_miccional_ml: null, residuo_desprezivel: false,
  achados_adicionais: null, ...p,
});

// ── Cálculo de peso ──
{
  const r = calcPesoProstatico(5.1, 4.4, 3.9); // V=45,79 → peso 48,08
  check("peso: fórmula elipsoide×1,05", r !== null && Math.abs(r.pesoG - 48.1) < 0.2, JSON.stringify(r));
}
check("peso: null se medida faltando", calcPesoProstatico(5.1, null, 3.9) === null);
check("peso: null se medida < 1cm (truncação)", calcPesoProstatico(5.1, 0.4, 3.9) === null);

// ── IPP graus (A10) ──
check("IPP 0,5 → Grau 1", ippGrau(0.5) === "Grau 1");
check("IPP 0,6 → Grau 2", ippGrau(0.6) === "Grau 2");
check("IPP 1,0 → Grau 2", ippGrau(1.0) === "Grau 2");
check("IPP 1,3 → Grau 3", ippGrau(1.3) === "Grau 3");
check("IPP 1,8 → protrusão acentuada", ippGrau(1.8) === "protrusão acentuada");

// ── Render normal (curadoria 2026-06-18) ──
{
  const out = renderProstataSuprapubica(P({ prostata_d1_cm: 4.0, prostata_d2_cm: 3.2, prostata_d3_cm: 2.8, volume_pre_miccional_ml: 280, residuo_desprezivel: true }));
  const corpo = out.split("CONCLUSÃO")[0] ?? "";
  const concl = out.split("CONCLUSÃO")[1] ?? "";
  check("título TRANSABDOMINAL", out.includes("ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)"));
  check("COMENTÁRIOS completo (4.0 MHz, decúbito, múltiplos cortes)", out.includes("transdutor de 4.0 MHz") && out.includes("múltiplos cortes transversais"));
  check("corpo: bexiga 'de forma, ecotextura e contornos' + volume na mesma linha", corpo.includes("Bexiga de forma, ecotextura e contornos regulares. Volume pré-miccional de 280 mL."));
  check("corpo: próstata SÓ medidas (sem ecotextura)", corpo.includes("Próstata medindo 4,0 x 3,2 x 2,8 cm.") && !/Próstata[^\n]*ecotextura/.test(corpo));
  check("corpo: vesículas seminais descritas", corpo.includes("Vesículas seminais de dimensões, ecogenicidade e contornos normais."));
  check("corpo: resíduo NÃO aparece no corpo", !corpo.includes("Resíduo"));
  // Conclusão cobre TODAS as estruturas normais, numerada
  check("conclusão 1) bexiga normal", concl.includes("1) Bexiga ecograficamente normal."));
  check("conclusão 2) resíduo desprezível", concl.includes("2) Resíduo pós-miccional desprezível."));
  check("conclusão 3) próstata peso", concl.includes("3) Próstata de dimensões normais (peso aproximado de 19,7 gramas)."));
  check("conclusão 4) vesículas normais", concl.includes("4) Vesículas seminais ecograficamente normais."));
  check("observação final da via", out.includes("não detalha adequadamente lesões focais"));
}

// ── Aumentada + IPP + resíduo elevado ──
{
  const out = renderProstataSuprapubica(P({
    prostata_d1_cm: 5.5, prostata_d2_cm: 4.8, prostata_d3_cm: 4.5, hiperplasia: true,
    ipp_cm: 1.2, volume_pre_miccional_ml: 320, residuo_pos_miccional_ml: 150,
  }));
  check("aumentada: SEM 'hiperplasia prostática benigna'", out.includes("Próstata de volume aumentado (peso aproximado de 65,3 gramas).") && !out.includes("hiperplasia prostática benigna"));
  check("aumentada: SEM grau leve/mod/acent", !/leve|moderada|acentuada/.test(out));
  check("IPP na conclusão com grau (só quando aumentada)", out.includes("Protrusão prostática intravesical de 1,2 cm (Grau 3)."));
  check("resíduo elevado SEM interpretar causa", out.includes("Resíduo pós-miccional elevado (150 mL).") && !out.includes("obstrução infravesical significativa"));
  check("volume pré-miccional no corpo (mL)", out.includes("Volume pré-miccional de 320 mL."));
}

// ── IPP NÃO aparece quando próstata normal ──
{
  const out = renderProstataSuprapubica(P({ prostata_d1_cm: 4.0, prostata_d2_cm: 3.2, prostata_d3_cm: 2.8, ipp_cm: 0.4 }));
  check("IPP omitido quando próstata normal", !out.includes("protrusão") && !out.includes("IPP"));
}

// ── Bexiga alterada + calcificações ──
{
  const out = renderProstataSuprapubica(P({
    prostata_d1_cm: 4.0, prostata_d2_cm: 3.2, prostata_d3_cm: 2.8,
    calcificacoes: true, bexiga_achado: "paredes espessadas e trabeculadas",
  }));
  check("calcificações no corpo e conclusão", out.includes("Calcificações prostáticas."));
  check("bexiga alterada → conclusão correlação obstrução", out.includes("Alterações vesicais (paredes espessadas e trabeculadas), a correlacionar com obstrução infravesical."));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exit(1);
