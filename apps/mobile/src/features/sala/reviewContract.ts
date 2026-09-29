export function reviewedRevision(detail: unknown, expectedText: string): number {
  const report = (detail as { report?: { content_revision?: unknown; final_output?: unknown; generated_output?: unknown } })?.report;
  const revision = report?.content_revision;
  const text = report?.final_output ?? report?.generated_output;
  if (!Number.isInteger(revision) || (revision as number) < 1) {
    throw new Error("A revisão ainda não está disponível. Atualize o aplicativo e tente novamente.");
  }
  if (!expectedText.trim() || text !== expectedText) {
    throw new Error("O laudo mudou ou ainda não terminou de salvar. Reabra o laudo, confira o texto e tente liberar novamente.");
  }
  return revision as number;
}
