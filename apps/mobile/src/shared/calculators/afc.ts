/**
 * Antral Follicle Count (AFC) — contagem de folículos antrais (2-10mm) em ambos
 * ovários como marcador de reserva ovariana. Soma direita + esquerda.
 *
 * Port literal de Services/AFCCalculator.swift.
 *
 * Classificação (consenso clínico Bologna/PCOS Rotterdam):
 * - <7: reserva ovariana diminuída
 * - 7-14: reserva ovariana normal
 * - 15-19: reserva ovariana alta
 * - ≥20: suspeita morfológica de SOP (síndrome dos ovários policísticos)
 */

export type AFCClassification =
  | "diminuida"
  | "normal"
  | "alta"
  | "sopSuspeita";

export interface AFCInput {
  direito: number;
  esquerdo: number;
}

export interface AFCResult {
  total: number;
  classification: AFCClassification;
  insertBloco: string;
}

const CLASSIFICATION_LABEL: Record<AFCClassification, string> = {
  diminuida: "Reserva ovariana diminuída",
  normal: "Reserva ovariana normal",
  alta: "Reserva ovariana alta",
  sopSuspeita:
    "Achados morfológicos sugestivos de síndrome dos ovários policísticos (SOP)",
};

const CLASSIFICATION_RECOMENDACAO: Record<AFCClassification, string> = {
  diminuida:
    " Convém, a critério clínico, correlacionar com dosagens hormonais (FSH, AMH) para avaliar reserva ovariana.",
  normal: "",
  alta: "",
  sopSuspeita:
    " Convém, a critério clínico, correlacionar com critérios de Rotterdam (clínica + dosagens hormonais) para diagnóstico de SOP.",
};

export function calcularAFC(input: AFCInput): AFCResult | null {
  if (!(input.direito >= 0 && input.esquerdo >= 0)) return null;
  const total = input.direito + input.esquerdo;
  if (!(total > 0)) return null;

  let cls: AFCClassification;
  if (total < 7) cls = "diminuida";
  else if (total < 15) cls = "normal";
  else if (total < 20) cls = "alta";
  else cls = "sopSuspeita";

  const bloco = `Contagem de folículos antrais (AFC):
- Ovário direito: ${input.direito} folículos.
- Ovário esquerdo: ${input.esquerdo} folículos.
- Total: ${total} folículos.

Conclusão: ${CLASSIFICATION_LABEL[cls]}.${CLASSIFICATION_RECOMENDACAO[cls]}`;

  return { total, classification: cls, insertBloco: bloco };
}

export function afcClassificationLabel(cls: AFCClassification): string {
  return CLASSIFICATION_LABEL[cls];
}
