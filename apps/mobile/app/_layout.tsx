import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { C } from "@/ui/tokens";
import { BrandSplash } from "@/ui/BrandSplash";

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.bg },
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
