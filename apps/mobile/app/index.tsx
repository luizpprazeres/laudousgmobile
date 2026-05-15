import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { C } from "@/ui/tokens";

/**
 * Gate de autenticação:
 *   sessão ativa → /generate (tela principal)
 *   sem sessão  → /(auth)/login
 */
export default function IndexGate() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      if (active) setAuthed(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (authed === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }
  return authed ? <Redirect href="/generate" /> : <Redirect href="/(auth)/login" />;
}
