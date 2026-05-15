import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function submit() {
    setBusy(true);
    try {
      const { error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      router.replace("/generate");
    } catch (e) {
      Alert.alert("Erro", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>LaudoUSG</Text>
      <Text>{mode === "signin" ? "Entrar" : "Criar conta"}</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="senha"
        secureTextEntry
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
      />
      <Button
        title={busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
        onPress={submit}
        disabled={busy}
      />
      <Button
        title={
          mode === "signin"
            ? "Não tem conta? Criar"
            : "Já tem conta? Entrar"
        }
        onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
      />
    </View>
  );
}
