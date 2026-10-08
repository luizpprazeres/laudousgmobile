import type { ReactNode } from "react";
import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import {
  buildReviewSignals,
  stripAutomaticReviewMarkers,
  type ReviewSignalIssue,
} from "@laudousg/shared";
import { COR_FALTA, COR_REVISAR } from "./reviewMarkers.rules";

export {
  COR_FALTA,
  COR_REVISAR,
  corDaLinha,
  stripReviewMarkers,
} from "./reviewMarkers.rules";

/** @deprecated use COR_REVISAR/COR_FALTA — mantido para não quebrar imports. */
export const REVIEW_MARKER_COLOR = COR_REVISAR.fg;

/**
 * Destaca as LINHAS que pedem atenção — não só o marcador.
 *
 * A versão anterior pintava apenas um "(?)" roxo de 3 caracteres no meio do
 * texto, e ignorava `____` por completo: quem lia no Android via um laudo com
 * lacunas sem nenhum sinal, e quem lia no iOS via a linha inteira realçada. Os
 * dois apps mostravam coisas diferentes para o mesmo laudo.
 *
 * A regra da cor vive em `reviewMarkers.rules.ts`, sem React, porque é a parte
 * que importa e a que erra.
 */
export function renderReviewHighlighted(
  text: string,
  markerStyle?: StyleProp<TextStyle>,
  issues: readonly ReviewSignalIssue[] = [],
  onShowReason?: (title: string, message: string) => void,
): ReactNode[] {
  const displayText = stripAutomaticReviewMarkers(text);
  const { highlights } = buildReviewSignals(displayText, issues);
  const occurrences: Array<{
    start: number;
    end: number;
    kind: "missing" | "warning";
    id: string;
    message: string;
  }> = [];

  for (const signal of highlights) {
    let from = 0;
    while (from < displayText.length) {
      const start = displayText.indexOf(signal.anchor, from);
      if (start < 0) break;
      occurrences.push({
        start,
        end: start + signal.anchor.length,
        kind: signal.kind,
        id: signal.id,
        message: signal.message,
      });
      from = start + Math.max(signal.anchor.length, 1);
    }
  }

  occurrences.sort((a, b) => a.start - b.start || (a.kind === "missing" ? -1 : 1));
  const selected = occurrences.filter((candidate, index, all) =>
    !all.slice(0, index).some(
      (current) => candidate.start < current.end && candidate.end > current.start,
    ),
  );
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const occurrence of selected) {
    if (occurrence.start > cursor) out.push(displayText.slice(cursor, occurrence.start));
    const palette = occurrence.kind === "missing" ? COR_FALTA : COR_REVISAR;
    const title = occurrence.kind === "missing" ? "Informação pendente" : "Conferir este trecho";
    out.push(
      <Text
        key={`${occurrence.id}-${occurrence.start}`}
        accessibilityRole="button"
        accessibilityLabel={`${displayText.slice(occurrence.start, occurrence.end)}. ${occurrence.message}`}
        onPress={onShowReason ? () => onShowReason(title, occurrence.message) : undefined}
        style={[{ backgroundColor: palette.bg, color: palette.fg }, markerStyle]}
      >
        {displayText.slice(occurrence.start, occurrence.end)}
      </Text>,
    );
    cursor = occurrence.end;
  }
  if (cursor < displayText.length) out.push(displayText.slice(cursor));

  return out;
}
