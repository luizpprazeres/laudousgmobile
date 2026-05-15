import { useEffect, useState } from "react";
import { Alert, Button, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";

const STYLES = [
  { code: "CLASSICO_COMPLETO", name: "Clássico completo" },
  { code: "DIRETO_OBJETIVO", name: "Direto objetivo" },
  { code: "DETALHADO_PROTOCOLAR", name: "Detalhado protocolar" },
] as const;

export default function SettingsScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [styleCode, setStyleCode] = useState<string>("CLASSICO_COMPLETO");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Ajustes</Text>
      <Text>Conta: {email ?? "..."}</Text>
      <Text style={{ marginTop: 24, fontWeight: "600" }}>Estilo de escrita</Text>
      {STYLES.map((s) => (
        <Button
          key={s.code}
          title={`${styleCode === s.code ? "● " : "○ "}${s.name}`}
          onPress={() => {
            setStyleCode(s.code);
            // TODO: persistir profiles.default_writing_style_id via supabase
            Alert.alert("Estilo", `Selecionado: ${s.name}`);
          }}
        />
      ))}
      <View style={{ marginTop: 32 }}>
        <Button title="Sair" color="#c00" onPress={signOut} />
      </View>
    </View>
  );
}
