import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="generate" options={{ headerShown: true, title: "Gerar laudo" }} />
          <Stack.Screen name="report/[id]" options={{ headerShown: true, title: "Laudo" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
