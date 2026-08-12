import { darkTokens, lightTokens, type ColorTokens } from "./tokens";
import { useTheme } from "./ThemeProvider";

/**
 * Tokens de cor ativos: respeitam a PREFERÊNCIA do usuário (Preferências →
 * Aparência: auto/claro/escuro, via ThemeProvider) resolvida contra o tema
 * do SO. Telas legadas ainda importam `C` (light fixo) — migração em curso
 * (dark mode universal); use este hook em qualquer tela nova.
 */
export function useColorTokens(): ColorTokens {
  const { scheme } = useTheme();
  return scheme === "dark" ? darkTokens : lightTokens;
}
