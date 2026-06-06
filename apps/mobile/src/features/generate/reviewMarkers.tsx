import type { ReactNode } from "react";
import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

export const REVIEW_MARKER_COLOR = "#7C3AED";
const REVIEW_MARKER_RE = /\s*\[REVISAR\b[^\]]*\]/g;

export function stripReviewMarkers(text: string): string {
  return text.replace(REVIEW_MARKER_RE, "");
}

export function renderReviewHighlighted(
  text: string,
  markerStyle?: StyleProp<TextStyle>,
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(REVIEW_MARKER_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    parts.push(
      <Text
        key={`review-${index}-${parts.length}`}
        style={[{ color: REVIEW_MARKER_COLOR, fontWeight: "700" }, markerStyle]}
      >
        {" (?)"}
      </Text>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
