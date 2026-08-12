import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Tema do app: resolve a preferência do usuário (auto | light | dark, persistida
 * em AsyncStorage "laudousg.theme_mode" — mesma chave já usada em Preferências)
 * contra o tema do SO. Antes deste provider a preferência era gravada mas nunca
 * aplicada (B1 do android-gap-analysis).
 */

export type ThemeMode = "auto" | "light" | "dark";

const THEME_KEY = "laudousg.theme_mode";

type ThemeContextValue = {
  mode: ThemeMode;
  /** Esquema efetivo após resolver "auto" contra o SO. */
  scheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("auto");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "auto") {
          setModeState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => undefined);
  }, []);

  const scheme: "light" | "dark" =
    mode === "auto" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  return (
    <ThemeContext.Provider value={{ mode, scheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Preferência + esquema efetivo. Fora do provider, cai no tema do SO (auto). */
export function useTheme(): ThemeContextValue {
  const systemScheme = useColorScheme();
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    mode: "auto",
    scheme: systemScheme === "dark" ? "dark" : "light",
    setMode: () => undefined,
  };
}
