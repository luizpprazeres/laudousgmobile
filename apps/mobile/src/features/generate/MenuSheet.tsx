import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Sheet } from "@/ui/Sheet";
import { C, FONT, type ColorTokens } from "@/ui/tokens";
import type { BannerSeverity } from "@/ui/Banner";
import {
  Bar,
  Book,
  Chevron,
  Folder,
  Moon,
  Shield,
  Sliders,
} from "@/ui/icons";
import { getMeProfile } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type Identity = {
  email: string | null;
  name: string | null;
  plan: string | null;
};

type Notice = {
  severity: BannerSeverity;
  title?: string;
  message: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onNotice?: (n: Notice) => void;
};

const NAV = [
  { id: "historico", label: "Histórico", Icon: Folder, route: "/historico" as const },
  { id: "analytics", label: "Analytics", Icon: Bar, route: "/analytics" as const },
  { id: "biblioteca", label: "Biblioteca", Icon: Book, route: "/biblioteca" as const },
  { id: "seguranca", label: "Segurança", Icon: Shield, route: "/seguranca" as const },
  { id: "preferencias", label: "Preferências", Icon: Sliders, route: "/preferencias" as const },
];

function initialsOf(identity: Identity): string {
  const source = identity.name?.trim() || identity.email || "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function displayName(identity: Identity): string {
  if (identity.name?.trim()) return identity.name.trim();
  if (identity.email) return identity.email;
  return "Sua conta";
}

function planLabel(plan: string | null): string | null {
  if (!plan) return null;
  const normalized = plan.toLowerCase();
  if (normalized === "free") return null;
  return normalized.toUpperCase();
}

export function MenuSheet({ open, onClose, onNotice }: Props) {
  // Sheet background usa tokens light fixos (C). Para evitar texto branco
  // sobre fundo claro quando o SO está em dark mode, fixamos os tokens do
  // conteúdo também em light. Quando o Sheet ganhar suporte a dark, trocar.
  const t = C;
  const styles = useMemo(() => makeStyles(t), []);
  const [identity, setIdentity] = useState<Identity>({
    email: null,
    name: null,
    plan: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);

    (async () => {
      // Caminho principal: /api/me/profile (name + plan reais).
      try {
        const profile = await getMeProfile();
        if (!alive) return;
        setIdentity({
          email: profile.email,
          name: profile.name,
          plan: profile.plan,
        });
        return;
      } catch {
        // Fallback: pelo menos mostrar o email do Supabase Auth se o
        // /api/me/profile estiver indisponível ou desautenticado.
      }
      const { data } = await supabase.auth.getUser();
      if (alive) {
        setIdentity({
          email: data.user?.email ?? null,
          name: null,
          plan: null,
        });
      }
    })().finally(() => {
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [open]);

  const navigate = (route: (typeof NAV)[number]["route"]) => {
    onClose();
    setTimeout(() => router.push(route), 220);
  };

  const signOut = async () => {
    onClose();
    try {
      await supabase.auth.signOut();
    } catch (e) {
      onNotice?.({
        severity: "error",
        title: "Erro ao sair",
        message: e instanceof Error ? e.message : String(e),
      });
      return;
    }
    router.replace("/(auth)/login");
  };

  const openTheme = () => {
    onClose();
    setTimeout(() => router.push("/preferencias"), 220);
  };

  const initials = initialsOf(identity);
  const name = displayName(identity);
  const plan = planLabel(identity.plan);
  const showSubtitle = !!identity.email && identity.email !== name;

  return (
    <Sheet open={open} onClose={onClose} height={580}>
      <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {loading && !identity.email ? "Carregando…" : name}
            </Text>
            {showSubtitle ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {identity.email}
              </Text>
            ) : null}
          </View>
          {plan ? (
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>{plan}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 12 }}>
          {NAV.map((it, i) => (
            <Pressable
              key={it.id}
              onPress={() => navigate(it.route)}
              style={({ pressed }) => [
                styles.navRow,
                i < NAV.length - 1 && styles.navRowBorder,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="link"
            >
              <View style={styles.navIcon}>
                <it.Icon size={20} color={t.text2} />
              </View>
              <Text style={styles.navLabel}>{it.label}</Text>
              <Chevron size={14} color={t.textGhost} />
            </Pressable>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Pressable style={styles.footerBtn} onPress={openTheme}>
            <Moon size={16} color={t.text2} />
            <Text style={styles.footerBtnText}>Tema</Text>
          </Pressable>
          <Pressable style={styles.footerBtn} onPress={signOut}>
            <Text style={[styles.footerBtnText, { color: t.danger }]}>Sair</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    profile: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingTop: 14,
      paddingBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: t.brandLight,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: t.brandDeep,
      fontFamily: FONT.bold,
      fontSize: 17,
    },
    profileName: {
      fontSize: 17,
      color: t.text,
      fontFamily: FONT.semibold,
    },
    profileEmail: {
      fontSize: 13,
      color: t.textSec,
      marginTop: 1,
      fontFamily: FONT.body,
    },
    proPill: {
      backgroundColor: t.brandLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    proPillText: {
      color: t.brandDeep,
      fontSize: 11,
      fontFamily: FONT.bold,
      letterSpacing: 0.3,
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
    },
    navRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    navIcon: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    navLabel: {
      flex: 1,
      fontSize: 16,
      color: t.text,
      fontFamily: FONT.medium,
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 24,
    },
    footerBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: t.fill1,
    },
    footerBtnText: {
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.medium,
    },
  });
}
