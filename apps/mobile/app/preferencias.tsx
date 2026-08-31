import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { deleteMeAccount, getMeProfile, updateMeProfile } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/ui/PageHeader";
import { useTheme, type ThemeMode } from "@/ui/ThemeProvider";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

const WRITING_STYLES = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    label: "Clássico completo",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    label: "Objetivo",
  },
] as const;

const THEMES: Array<{ value: ThemeMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

export default function PreferenciasScreen() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [writingStyleId, setWritingStyleId] = useState<string | null>(null);
  const { mode: theme, setMode: setThemeMode } = useTheme();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const profile = await getMeProfile();
        if (!alive) return;
        setEmail(profile.email);
        setPlan(profile.plan);
        setName(profile.name ?? "");
        setSavedName(profile.name ?? "");
        setWritingStyleId(profile.default_writing_style_id);
        // Tema: preferência vive no ThemeProvider (carrega do AsyncStorage lá).
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  async function saveName() {
    const clean = name.trim();
    if (clean === savedName) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await updateMeProfile({ name: clean || null });
      setName(profile.name ?? "");
      setSavedName(profile.name ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function selectWritingStyle(id: string) {
    if (id === writingStyleId) return;
    const previous = writingStyleId;
    setWritingStyleId(id);
    setSaving(true);
    setError(null);
    try {
      const profile = await updateMeProfile({ default_writing_style_id: id });
      setWritingStyleId(profile.default_writing_style_id);
    } catch (err) {
      setWritingStyleId(previous);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function selectTheme(value: ThemeMode) {
    setThemeMode(value); // aplica na hora (ThemeProvider) e persiste
  }

  async function deleteAccount() {
    if (deleteText.trim() !== "EXCLUIR" || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeAccount();
      await supabase.auth.signOut();
      router.replace("/(auth)/login");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.brand} />
        <Text style={styles.centerText}>Carregando preferências...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Preferências" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Não foi possível salvar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionHeader}>Conta</Text>
        <View style={styles.list}>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>Nome de exibição</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={saveName}
              onSubmitEditing={saveName}
              placeholder="Seu nome"
              placeholderTextColor={t.textMute}
              style={styles.input}
              returnKeyType="done"
            />
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
              {email}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plano</Text>
            <Text style={styles.badge}>{plan.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Escrita</Text>
        <View style={styles.list}>
          {WRITING_STYLES.map((style, index) => (
            <Pressable
              key={style.id}
              onPress={() => selectWritingStyle(style.id)}
              disabled={saving}
              style={({ pressed }) => [
                styles.row,
                index < WRITING_STYLES.length - 1 && styles.rowDivider,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.label}>{style.label}</Text>
              <View
                style={[
                  styles.radio,
                  writingStyleId === style.id && styles.radioActive,
                ]}
              >
                {writingStyleId === style.id ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Aparência</Text>
        <View style={styles.segmentCard}>
          {THEMES.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => selectTheme(option.value)}
              style={({ pressed }) => [
                styles.segmentItem,
                theme === option.value && styles.segmentItemActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  theme === option.value && styles.segmentTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Legal</Text>
        <View style={styles.list}>
          <Pressable
            onPress={() => router.push("/sobre" as never)}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.pressed,
            ]}
            accessibilityRole="link"
          >
            <Text style={styles.label}>Sobre / Legal</Text>
            <Text style={styles.value}>Termos, privacidade e disclaimer</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionHeader}>Zona de risco</Text>
        <View style={styles.list}>
          <Pressable
            onPress={() => {
              setDeleteConfirmOpen((value) => !value);
              setDeleteError(null);
            }}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, { color: t.danger }]}>
              Excluir minha conta
            </Text>
          </Pressable>
        </View>

        {deleteConfirmOpen ? (
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Exclusão definitiva</Text>
            <Text style={styles.dangerText}>
              Isso apaga sua conta e os dados vinculados, incluindo laudos,
              preferências, frases e sessões da Sala. Essa ação não pode ser
              desfeita.
            </Text>
            <Text style={styles.confirmLabel}>
              Digite EXCLUIR para confirmar.
            </Text>
            <TextInput
              value={deleteText}
              onChangeText={setDeleteText}
              autoCapitalize="characters"
              placeholder="EXCLUIR"
              placeholderTextColor={t.textMute}
              editable={!deleting}
              style={styles.confirmInput}
            />
            {deleteError ? (
              <Text style={styles.deleteError}>{deleteError}</Text>
            ) : null}
            <View style={styles.deleteActions}>
              <Pressable
                onPress={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteText("");
                  setDeleteError(null);
                }}
                disabled={deleting}
                style={[styles.cancelDeleteBtn, deleting && styles.disabled]}
              >
                <Text style={styles.cancelDeleteText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={deleteAccount}
                disabled={deleteText.trim() !== "EXCLUIR" || deleting}
                style={[
                  styles.deleteBtn,
                  (deleteText.trim() !== "EXCLUIR" || deleting) && styles.disabled,
                ]}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteBtnText}>Excluir conta</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {saving ? <Text style={styles.savingText}>Salvando...</Text> : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    centerText: {
      marginTop: 12,
      fontFamily: FONT.body,
      fontSize: 14,
      color: t.textSec,
    },
    sectionHeader: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 14,
      marginBottom: 6,
      marginHorizontal: 22,
    },
    list: {
      backgroundColor: t.card,
      marginHorizontal: 12,
      borderRadius: 12,
      overflow: "hidden",
    },
    row: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    pressed: {
      opacity: 0.72,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    label: {
      flexShrink: 0,
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.body,
    },
    value: {
      flex: 1,
      textAlign: "right",
      fontSize: 14,
      color: t.textSec,
      fontFamily: FONT.body,
    },
    input: {
      flex: 1,
      minHeight: 34,
      textAlign: "right",
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.body,
    },
    badge: {
      backgroundColor: t.brandLight,
      color: t.brandDeep,
      fontSize: 11,
      fontFamily: FONT.bold,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      letterSpacing: 0.3,
      overflow: "hidden",
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: t.textGhost,
      alignItems: "center",
      justifyContent: "center",
    },
    radioActive: {
      borderColor: t.brand,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.brand,
    },
    segmentCard: {
      flexDirection: "row",
      gap: 6,
      backgroundColor: t.card,
      marginHorizontal: 12,
      borderRadius: 12,
      padding: 6,
    },
    segmentItem: {
      flex: 1,
      borderRadius: 9,
      paddingVertical: 10,
      alignItems: "center",
    },
    segmentItemActive: {
      backgroundColor: t.brand,
    },
    segmentText: {
      fontFamily: FONT.semibold,
      fontSize: 13,
      color: t.textSec,
    },
    segmentTextActive: {
      color: "#fff",
    },
    savingText: {
      fontFamily: FONT.body,
      fontSize: 12,
      color: t.textSec,
      marginTop: 12,
      textAlign: "center",
    },
    dangerCard: {
      backgroundColor: t.card,
      marginHorizontal: 12,
      marginTop: 8,
      borderRadius: 12,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.danger,
    },
    dangerTitle: {
      fontFamily: FONT.semibold,
      fontSize: 16,
      color: t.danger,
    },
    dangerText: {
      marginTop: 8,
      fontFamily: FONT.body,
      fontSize: 14,
      lineHeight: 20,
      color: t.text,
    },
    confirmLabel: {
      marginTop: 14,
      fontFamily: FONT.semibold,
      fontSize: 13,
      color: t.text,
    },
    confirmInput: {
      marginTop: 8,
      borderRadius: 10,
      backgroundColor: t.fill1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: t.text,
      fontFamily: FONT.body,
      fontSize: 15,
    },
    deleteError: {
      marginTop: 8,
      color: t.danger,
      fontFamily: FONT.body,
      fontSize: 13,
    },
    deleteActions: {
      marginTop: 14,
      flexDirection: "row",
      gap: 10,
    },
    cancelDeleteBtn: {
      flex: 1,
      alignItems: "center",
      borderRadius: 10,
      backgroundColor: t.fill1,
      paddingVertical: 12,
    },
    cancelDeleteText: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
    deleteBtn: {
      flex: 1,
      alignItems: "center",
      borderRadius: 10,
      backgroundColor: t.danger,
      paddingVertical: 12,
      minHeight: 44,
    },
    deleteBtnText: {
      color: "#fff",
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
    disabled: {
      opacity: 0.45,
    },
    errorCard: {
      backgroundColor: t.card,
      marginHorizontal: 12,
      marginTop: 8,
      borderRadius: 12,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.warningText,
    },
    errorTitle: {
      fontFamily: FONT.semibold,
      color: t.text,
      fontSize: 14,
    },
    errorText: {
      marginTop: 4,
      fontFamily: FONT.body,
      color: t.textSec,
      fontSize: 12,
    },
  });
}
