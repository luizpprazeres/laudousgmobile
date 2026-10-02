/**
 * O que a faixa e os botões de cópia dizem. A revisão médica cobre SÓ o texto
 * do médico: acréscimos da Sala (anotações/frases) nunca herdam o verde.
 */
import type { ReviewView } from "./review";

export type CopyMode = "medical" | "with-additions";
export type CopyAction = { mode: CopyMode; label: string; tone: "approved" | "draft" };
export type BannerState = "reviewed" | "pending" | "stale";

export type CopyPlan = {
  banner: BannerState;
  title: string;
  detail: string;
  primary: CopyAction;
  secondary: CopyAction | null;
};

export function copyPlan(args: {
  review: ReviewView;
  offline: boolean;
  reportStale?: boolean;
  additionCount: number;
  lastSyncLabel: string | null;
}): CopyPlan {
  const { review, offline, additionCount, lastSyncLabel } = args;
  const secondary: CopyAction | null =
    additionCount > 0
      ? { mode: "with-additions", label: "Copiar com acréscimos · não revisados", tone: "draft" }
      : null;
  const additionsNote =
    additionCount > 0
      ? ` ${additionCount === 1 ? "Há 1 acréscimo da Sala" : `Há ${additionCount} acréscimos da Sala`}, marcado${additionCount === 1 ? "" : "s"} no texto, que o médico não revisou.`
      : "";

  // Versão na tela atrás da lista (recarga do laudo falhou/pendente), mesmo
  // com o latest respondendo: nunca verde nem "atual".
  if (args.reportStale && !offline) {
    return {
      banner: "stale", title: "Laudo desatualizado · aguardando atualização",
      detail: `O médico atualizou este laudo. O texto abaixo ainda é a versão anterior; se copiar, é rascunho.${additionsNote}`,
      primary: { mode: "medical", label: "Copiar rascunho · versão anterior", tone: "draft" }, secondary,
    };
  }
  // Sem conexão: nada parece atual nem aprovado, mesmo que a última versão fosse.
  if (offline) {
    return {
      banner: "stale",
      title: "Sem conexão · última versão recebida",
      detail: `${lastSyncLabel ? `Recebida às ${lastSyncLabel}. ` : ""}Pode ter mudado desde então. Se copiar, é rascunho.${additionsNote}`,
      primary: { mode: "medical", label: "Copiar rascunho · sem conexão", tone: "draft" },
      secondary,
    };
  }
  if (review.status === "reviewed") {
    return {
      banner: "reviewed",
      title: "Texto do médico revisado",
      detail:
        additionCount > 0
          ? `Copie o laudo revisado sem os acréscimos.${additionsNote}`
          : "Pode copiar e imprimir.",
      primary: {
        mode: "medical",
        label: additionCount > 0 ? "Copiar laudo revisado · sem acréscimos" : "Copiar laudo revisado",
        tone: "approved",
      },
      secondary,
    };
  }
  return {
    banner: "pending",
    title: "Aguardando revisão do médico",
    detail: `O médico ainda não confirmou este texto. Se copiar, é rascunho.${additionsNote}`,
    primary: { mode: "medical", label: "Copiar rascunho · não revisado", tone: "draft" },
    secondary,
  };
}
