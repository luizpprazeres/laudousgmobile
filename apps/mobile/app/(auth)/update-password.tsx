import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Banner } from "@/ui/Banner";
import { PrimaryButton } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { FONT, SPACING } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

export default function UpdatePasswordScreen() {
  const t = useColorTokens();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = password.length >= 8 && password === confirmation && !busy;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Não foi possível trocar a senha. Solicite um novo link.");
      return;
    }
    router.replace("/generate");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, justifyContent: "center", padding: SPACING.lg, backgroundColor: t.bg }}
    >
      <View style={{ gap: SPACING.md }}>
        <Text style={{ color: t.text, fontFamily: FONT.bold, fontSize: 24 }}>
          Crie uma nova senha
        </Text>
        <Text style={{ color: t.textSec, fontFamily: FONT.body, fontSize: 14 }}>
          Use pelo menos 8 caracteres.
        </Text>
        {error ? <Banner severity="error" message={error} /> : null}
        <Field
          label="Nova senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Field
          label="Repita a nova senha"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoComplete="new-password"
        />
        {confirmation.length > 0 && password !== confirmation ? (
          <Banner severity="warning" message="As senhas ainda não são iguais." />
        ) : null}
        <PrimaryButton title="Salvar nova senha" loading={busy} disabled={!valid} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}
