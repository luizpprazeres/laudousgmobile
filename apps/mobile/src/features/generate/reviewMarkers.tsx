import type { ReactNode } from "react";
import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import { COR_REVISAR, REVIEW_MARKER_RE, corDaLinha } from "./reviewMarkers.rules";

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
): ReactNode[] {
  const linhas = text.split("\n");
  const out: ReactNode[] = [];

  linhas.forEach((linha, i) => {
    const cor = corDaLinha(linha);
    const temRevisar = linha.includes("[REVISAR");

    // O marcador verboso vira "(?)" discreto — some sozinho ao copiar/enviar,
    // porque `stripReviewMarkers` age sobre o texto, não sobre a exibição.
    const exibida = temRevisar ? linha.replace(REVIEW_MARKER_RE, " (?)") : linha;

    if (cor) {
      out.push(
        <Text
          key={`l-${i}`}
          style={[{ backgroundColor: cor.bg, color: cor.fg }, temRevisar ? markerStyle : null]}
        >
          {exibida}
        </Text>,
      );
    } else {
      out.push(exibida);
    }
    if (i < linhas.length - 1) out.push("\n");
  });

  return out;
}
