import { useColorScheme } from "react-native";
import { darkTokens, lightTokens, type ColorTokens } from "./tokens";

/**
 * Returns the active color token set based on the OS color scheme.
 * Existing screens still import `C` directly (light only) for backwards
 * compatibility — call this hook instead when you want a screen to react
 * to system theme changes.
 */
export function useColorTokens(): ColorTokens {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTokens : lightTokens;
}
