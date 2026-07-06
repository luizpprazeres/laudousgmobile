import { getShareExtensionKey } from "expo-share-intent";

/**
 * Intercepta deep links NATIVOS antes do expo-router resolver a rota.
 * Quando o link é um share intent (imagem compartilhada do WhatsApp/galeria
 * via "Compartilhar → LaudoUSG"), redireciona para a tela de geração — lá o
 * useShareIntentContext pega os arquivos e abre a análise de imagem.
 */
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return "/generate";
    }
  } catch (e) {
    console.warn("[mobile] redirect de share intent falhou:", e);
  }
  return path;
}
