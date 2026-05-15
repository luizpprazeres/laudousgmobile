import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Sheet } from "@/ui/Sheet";
import { C, FONT } from "@/ui/tokens";
import {
  Bar,
  Book,
  Chevron,
  Folder,
  Moon,
  Shield,
  Sliders,
} from "@/ui/icons";
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  onClose: () => void;
};

const NAV = [
  { id: "historico", label: "Histórico", Icon: Folder, route: "/historico" as const },
  { id: "analytics", label: "Analytics", Icon: Bar, route: "/analytics" as const },
  { id: "biblioteca", label: "Biblioteca", Icon: Book, route: "/biblioteca" as const },
  { id: "seguranca", label: "Segurança", Icon: Shield, route: "/seguranca" as const },
  { id: "preferencias", label: "Preferências", Icon: Sliders, route: "/preferencias" as const },
];

export function MenuSheet({ open, onClose }: Props) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [open]);

  const initials = (email ?? "?").slice(0, 2).toUpperCase();

  const navigate = (route: (typeof NAV)[number]["route"]) => {
    onClose();
    setTimeout(() => router.push(route), 220);
  };

  const signOut = async () => {
    onClose();
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <Sheet open={open} onClose={onClose} height={580}>
      <View style={{ paddingHorizontal: 22, paddingBottom: 24 }}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Sua conta</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email ?? "—"}
            </Text>
          </View>
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>PRO</Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          {NAV.map((it, i) => (
            <Pressable
              key={it.id}
              onPress={() => navigate(it.route)}
              style={[
                styles.navRow,
                i < NAV.length - 1 && styles.navRowBorder,
              ]}
              accessibilityRole="link"
            >
              <View style={styles.navIcon}>
                <it.Icon size={20} color={C.text2} />
              </View>
              <Text style={styles.navLabel}>{it.label}</Text>
              <Chevron size={14} color={C.textGhost} />
            </Pressable>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Pressable
            style={styles.footerBtn}
            onPress={() => Alert.alert("Tema", "Em breve.")}
          >
            <Moon size={16} color={C.text2} />
            <Text style={styles.footerBtnText}>Tema</Text>
          </Pressable>
          <Pressable style={styles.footerBtn} onPress={signOut}>
            <Text style={[styles.footerBtnText, { color: C.danger }]}>Sair</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: C.brandDeep,
    fontFamily: FONT.bold,
    fontSize: 17,
  },
  profileName: {
    fontSize: 17,
    color: C.text,
    fontFamily: FONT.semibold,
  },
  profileEmail: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 1,
    fontFamily: FONT.body,
  },
  proPill: {
    backgroundColor: C.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proPillText: {
    color: C.brandDeep,
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
    borderBottomColor: C.separator,
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
    color: C.text,
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
    backgroundColor: C.fill1,
  },
  footerBtnText: {
    fontSize: 15,
    color: C.text,
    fontFamily: FONT.medium,
  },
});
