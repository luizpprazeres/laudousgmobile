import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { BrandSplash } from "@/ui/BrandSplash";

/**
 * Gate de autenticação:
 *   sessão ativa → /generate (tela principal)
 *   sem sessão  → /(auth)/login
 *
 * Enquanto a sessão é consultada, exibe BrandSplash (logo + spinner) — dá
 * continuidade visual ao splash nativo do Expo (mesma marca, mesmas cores).
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
    return <BrandSplash />;
  }
  return authed ? <Redirect href="/generate" /> : <Redirect href="/(auth)/login" />;
}
