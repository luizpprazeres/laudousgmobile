import { useEffect } from "react";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter } from "expo-router";
import { SystemBars } from "react-native-edge-to-edge";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionRouting, type RouterAction } from "expo-quick-actions/router";
import { ShareIntentProvider } from "expo-share-intent";
import { darkTokens, lightTokens } from "@/ui/tokens";
import { LegalGate } from "@/features/legal/LegalGate";
import { ThemeProvider, useTheme } from "@/ui/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { parseAuthDeepLink } from "@/features/auth/deepLink";

SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore */
});

export default function RootLayout() {
  // Fontes agora são EMBUTIDAS NATIVAMENTE (config plugin do expo-font em
  // app.json) — disponíveis desde o frame 0, sem loadAsync e sem gate.
  // CAUSA RAIZ do incidente v10 (06/07): os .ttf carregados em runtime via
  // @expo-google-fonts NÃO eram embarcados nos AABs (só no APK universal);
  // instalando pela Play (splits), useFonts nunca resolvia e o app ficava
  // PRESO NA SPLASH para sempre. Fontes nativas eliminam a classe inteira
  // do problema (e o boot fica mais rápido).
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

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
  const router = useRouter();
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
  useEffect(() => {
    let active = true;

    const handle = async (url: string | null) => {
      if (!url || !active) return;
      const auth = parseAuthDeepLink(url);
      if (!auth) return;
      const { error } = await supabase.auth.setSession({
        access_token: auth.accessToken,
        refresh_token: auth.refreshToken,
      });
      if (error || !active) return;
      router.replace(
        auth.type === "recovery"
          ? "/(auth)/update-password"
          : "/generate",
      );
    };

    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener("url", ({ url }) => void handle(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, [router]);
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
