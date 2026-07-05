/**
 * Triagem simplificada de risco de pré-eclâmpsia no 1º trimestre (FMF Algorithm
 * simplificado). Versão MVP usa fatores de risco materno + MAP + Doppler uterinas.
 *
 * Port literal de Services/PreEclampsiaCalculator.swift.
 *
 * Versão completa do FMF requer também PAPP-A e PlGF (biomarkers séricos). Esta
 * versão simplificada retorna risco categórico baseado nos inputs disponíveis em
 * ultrassonografia.
 */

export type PreEclampsiaRisk = "baixo" | "intermediario" | "alto";

export interface PreEclampsiaInput {
  idadeMaterna: number; // anos
  imc: number; // kg/m²
  mapMmHg: number; // pressão arterial média
  uterinaPiMedio: number; // IP médio das artérias uterinas (calculado D+E/2)
  igWeeks: number; // idade gestacional (11-13+6 ideal)
  primigesta: boolean; // sem partos prévios
  antecedentePE: boolean; // PE em gestação anterior
  hasOrSLE: boolean; // hipertensão crônica, diabetes, lúpus, SAF
}

export interface PreEclampsiaResult {
  risk: PreEclampsiaRisk;
  pontos: number;
  fatores: string[];
  insertBloco: string;
}

const RISK_LABEL: Record<PreEclampsiaRisk, string> = {
  baixo: "Baixo risco de pré-eclâmpsia",
  intermediario: "Risco intermediário de pré-eclâmpsia",
  alto: "Alto risco de pré-eclâmpsia",
};

const RISK_RECOMENDACAO: Record<PreEclampsiaRisk, string> = {
  baixo: "Acompanhamento de rotina pré-natal.",
  intermediario:
    "Considerar profilaxia com AAS 100-150 mg/dia até 36 semanas. Reavaliar com Doppler de uterinas no 2º trimestre.",
  alto: "Recomenda-se profilaxia com AAS 100-150 mg/dia (preferencialmente iniciada antes de 16 semanas) + acompanhamento em centro de medicina fetal. Monitorar com Doppler de uterinas seriado.",
};

/**
 * P90/P95 do IP médio das artérias uterinas por idade gestacional —
 * Gómez O, Figueras F et al. "Reference ranges for uterine artery mean
 * pulsatility index at 11–41 weeks of gestation." Ultrasound Obstet Gynecol
 * 2008;32:128–132 (referência da escola de Medicina Fetal Barcelona).
 * Modelo log-normal (Royston), GA em dias. Validado contra os âncoras do
 * paper: P95 ≈ 2,70 (11 sem) · 1,48 (22 sem) · 1,36 (24 sem).
 */
export function utaPiReference(gaWeeks: number): { p90: number; p95: number } {
  const ga = gaWeeks * 7;
  const logMedian = 1.39 - 0.012 * ga + 0.0000198 * ga * ga;
  const logSD = 0.272 - 0.000259 * ga;
  return {
    p90: Math.exp(logMedian + 1.2816 * logSD),
    p95: Math.exp(logMedian + 1.6449 * logSD),
  };
}

// Formata com 2 casas e vírgula decimal (equivalente a String(format: "%.2f")).
function fmt2(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

/**
 * Avaliação categórica simplificada por contagem de fatores de risco + valor
 * dos parâmetros ecográficos. Não substitui FMF risk calculator completo
 * (que requer PAPP-A + PlGF + MoM ajustado).
 */
export function calcularPreEclampsia(
  input: PreEclampsiaInput,
): PreEclampsiaResult | null {
  if (!(input.idadeMaterna >= 12 && input.idadeMaterna <= 60)) return null;
  if (!(input.imc > 10 && input.imc < 60)) return null;
  if (!(input.mapMmHg > 50 && input.mapMmHg < 200)) return null;
  if (!(input.uterinaPiMedio > 0)) return null;
  if (!(input.igWeeks >= 11 && input.igWeeks <= 24)) return null;

  let pontos = 0;
  const fatores: string[] = [];

  // Fatores maternos (alto peso)
  if (input.antecedentePE) {
    pontos += 3;
    fatores.push("Antecedente de pré-eclâmpsia");
  }
  if (input.hasOrSLE) {
    pontos += 3;
    fatores.push("Comorbidade vascular/autoimune (HAS/DM/LES/SAF)");
  }
  if (input.idadeMaterna >= 40) {
    pontos += 2;
    fatores.push("Idade materna ≥ 40 anos");
  } else if (input.idadeMaterna >= 35) {
    pontos += 1;
    fatores.push("Idade materna 35-39 anos");
  }
  if (input.imc >= 35) {
    pontos += 2;
    fatores.push("Obesidade grau II+ (IMC ≥ 35)");
  } else if (input.imc >= 30) {
    pontos += 1;
    fatores.push("Obesidade grau I (IMC 30-34,9)");
  }
  if (input.primigesta) {
    pontos += 1;
    fatores.push("Primigesta");
  }

  // MAP (mediana ~ 85-90 mmHg no 1T; >95 = elevada)
  if (input.mapMmHg >= 100) {
    pontos += 2;
    fatores.push("MAP elevada (≥ 100 mmHg)");
  } else if (input.mapMmHg >= 95) {
    pontos += 1;
    fatores.push("MAP moderadamente elevada (95-99 mmHg)");
  }

  // Doppler uterinas: P90/P95 do IP médio variam com a IG — Gómez 2008
  // (Medicina Fetal Barcelona), não cutoff fixo.
  const utaRef = utaPiReference(input.igWeeks);
  const p95Fmt = fmt2(utaRef.p95);
  if (input.uterinaPiMedio >= utaRef.p95) {
    pontos += 2;
    fatores.push(
      `IP médio das uterinas acima do percentil 95 para ${input.igWeeks} sem (≥ ${p95Fmt})`,
    );
  } else if (input.uterinaPiMedio >= utaRef.p90) {
    pontos += 1;
    const p90Fmt = fmt2(utaRef.p90);
    fatores.push(
      `IP médio das uterinas no percentil 90–95 para ${input.igWeeks} sem (≥ ${p90Fmt})`,
    );
  }

  let risk: PreEclampsiaRisk;
  if (pontos >= 5) risk = "alto";
  else if (pontos >= 2) risk = "intermediario";
  else risk = "baixo";

  const mapFmt = input.mapMmHg.toFixed(0);
  const uterinaFmt = fmt2(input.uterinaPiMedio);
  const imcFmt = input.imc.toFixed(1).replace(".", ",");

  const fatoresList =
    fatores.length === 0
      ? "Nenhum fator de risco identificado."
      : fatores.map((f) => `- ${f}`).join("\n");

  const bloco = `Triagem de pré-eclâmpsia (1º trimestre):
- Idade materna: ${input.idadeMaterna} anos
- IMC: ${imcFmt} kg/m²
- Pressão arterial média (MAP): ${mapFmt} mmHg
- IP médio das artérias uterinas: ${uterinaFmt}
- Primigesta: ${input.primigesta ? "Sim" : "Não"}
- Antecedente de PE: ${input.antecedentePE ? "Sim" : "Não"}
- Comorbidade vascular/autoimune: ${input.hasOrSLE ? "Sim" : "Não"}

Fatores identificados:
${fatoresList}

Conclusão: ${RISK_LABEL[risk]} (pontuação ${pontos}). ${RISK_RECOMENDACAO[risk]}

Observação: triagem simplificada — para risco refinado (1 em N), considerar protocolo FMF completo com PAPP-A e PlGF séricos.`;

  return { risk, pontos, fatores, insertBloco: bloco };
}

export function preEclampsiaRiskLabel(risk: PreEclampsiaRisk): string {
  return RISK_LABEL[risk];
}

export function preEclampsiaRiskRecomendacao(risk: PreEclampsiaRisk): string {
  return RISK_RECOMENDACAO[risk];
}
