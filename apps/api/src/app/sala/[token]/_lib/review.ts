/**
 * Estado de revisão médica exibido na Sala. Contrato do backend: `reviewStatus`
 * "reviewed" | "pending" e `reviewedAt` por laudo. Ausente, desconhecido ou
 * malformado = pending: a Sala NUNCA mostra "revisado" na dúvida.
 */
export type ReviewStatus = "reviewed" | "pending";

export type ReviewFields = {
  reviewStatus?: unknown;
  reviewedAt?: unknown;
};

export type ReviewView = { status: ReviewStatus; reviewedAt: string | null };

export function reviewOf(source: ReviewFields | null | undefined): ReviewView {
  if (!source || source.reviewStatus !== "reviewed") {
    return { status: "pending", reviewedAt: null };
  }
  const at = typeof source.reviewedAt === "string" ? source.reviewedAt : null;
  return { status: "reviewed", reviewedAt: at };
}
