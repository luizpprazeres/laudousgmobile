import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { SystemBars } from "react-native-edge-to-edge";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import {
  useFonts as useBarlow,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from "@expo-google-fonts/barlow";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionRouting, type RouterAction } from "expo-quick-actions/router";
import { ShareIntentProvider } from "expo-share-intent";
import { darkTokens, lightTokens } from "@/ui/tokens";
import { BrandSplash } from "@/ui/BrandSplash";
import { LegalGate } from "@/features/legal/LegalGate";
import { ThemeProvider, useTheme } from "@/ui/ThemeProvider";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore */
});

export default function RootLayout() {
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
  const [barlowLoaded] = useBarlow({
    Barlow_700Bold,
    Barlow_800ExtraBold,
  });

  const ready = interLoaded && barlowLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) {
    // Fontes ainda carregando — mostra o splash visual com o logo da marca,
    // continuidade visual com o splash nativo (expo.splash em app.json).
    // Não mostra spinner aqui: a carga de fontes é rápida e o spinner causa
    // flicker. O spinner fica para o gate de auth (app/index.tsx).
    return <BrandSplash showSpinner={false} />;
  }

  return (
    // ShareIntentProvider precisa envolver o router para o share do
    // WhatsApp/galeria chegar via useShareIntentContext (B4 06/07).
    <ShareIntentProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ThemedRoot />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}

/**
 * Raiz tematizada (precisa estar DENTRO do ThemeProvider): StatusBar segue o
 * tema efetivo e o fundo das rotas usa os tokens ativos (dark mode universal).
 */
function ThemedRoot() {
  const { scheme } = useTheme();
  const t = scheme === "dark" ? darkTokens : lightTokens;

  // App shortcut Android (long-press no ícone → "Novo laudo"): 1 gesto para
  // o fluxo nº 1 do médico entre pacientes. Dinâmico — aparece após o 1º boot.
  useQuickActionRouting();
  useEffect(() => {
    QuickActions.setItems<RouterAction>([
      {
        id: "novo-laudo",
        title: "Novo laudo",
        subtitle: "Ditar achados agora",
        params: { href: "/generate" },
      },
    ]).catch(() => undefined);
  }, []);
  return (
    <>
      {/* Edge-to-edge (C7): SystemBars substitui expo-status-bar — no
          Android 15+ o app desenha atrás das barras; os insets de cada
          tela cuidam do resto (react-native-edge-to-edge/zoontek). */}
      <SystemBars style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          headerStyle: { backgroundColor: t.card },
          headerTintColor: t.text,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="generate" />
        <Stack.Screen name="historico" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="preferencias" />
        <Stack.Screen name="sobre" />
        <Stack.Screen name="biblioteca" />
        <Stack.Screen name="seguranca" />
        <Stack.Screen
          name="report/[id]"
          options={{ headerShown: true, title: "Laudo" }}
        />
      </Stack>
      {/* Gate de aceite legal — cobre todas as rotas (paridade iOS AppShellView). */}
      <LegalGate />
    </>
  );
}
