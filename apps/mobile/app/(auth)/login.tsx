import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Banner } from "@/ui/Banner";
import { LaudoUSGLogo } from "@/ui/LaudoUSGLogo";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { Eye, EyeOff } from "@/ui/icons";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const validPassword = password.length >= 6;
  const canSubmit = validEmail && validPassword && !busy;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      const { error: authErr } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            })
          : await supabase.auth.signUp({
              email: trimmedEmail,
              password,
            });
      if (authErr) throw authErr;
      router.replace("/generate");
    } catch (e) {
      setError(humanizeAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <LaudoUSGLogo size="lg" variant="auto" showTagline />
          </View>

          {error ? (
            <View style={{ marginBottom: 18 }}>
              <Banner
                severity="error"
                title="Não foi possível entrar"
                message={error}
                onDismiss={() => setError(null)}
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={t.textMute}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="mínimo 6 caracteres"
                placeholderTextColor={t.textMute}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                textContentType={mode === "signin" ? "password" : "newPassword"}
                editable={!busy}
                style={[styles.input, { flex: 1, paddingRight: 44 }]}
                onSubmitEditing={submit}
                returnKeyType={mode === "signin" ? "go" : "done"}
              />
              <Pressable
                onPress={() => setShowPwd((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
                accessibilityLabel={showPwd ? "Esconder senha" : "Mostrar senha"}
              >
                {showPwd ? (
                  <EyeOff size={18} color={t.textSec} />
                ) : (
                  <Eye size={18} color={t.textSec} />
                )}
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={[styles.cta, { opacity: canSubmit ? 1 : 0.45 }]}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setError(null);
            }}
            style={styles.switchBtn}
            hitSlop={6}
          >
            <Text style={styles.switchText}>
              {mode === "signin" ? (
                <>
                  Ainda não tem conta?{" "}
                  <Text style={styles.switchLink}>Criar conta</Text>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <Text style={styles.switchLink}>Entrar</Text>
                </>
              )}
            </Text>
          </Pressable>

          <Text style={styles.legal}>
            Ao continuar, você concorda com os termos de uso e política de
            privacidade.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function humanizeAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();

  // Credenciais
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Email ou senha incorretos.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirme seu email antes de entrar — verifique a caixa de entrada.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "Esse email já tem conta — toque em Entrar.";
  }
  if (lower.includes("user not found")) {
    return "Email não cadastrado. Toque em Criar conta.";
  }

  // Senha
  if (
    lower.includes("password should be") ||
    lower.includes("password is too short") ||
    lower.includes("password is too weak") ||
    lower.includes("weak password")
  ) {
    return "Senha fraca: use ao menos 6 caracteres, combinando letras e números.";
  }
  if (lower.includes("same password") || lower.includes("new password should be different")) {
    return "A nova senha precisa ser diferente da anterior.";
  }

  // Email
  if (
    lower.includes("invalid email") ||
    lower.includes("email address is invalid") ||
    lower.includes("unable to validate email")
  ) {
    return "Email inválido. Confira se digitou certo.";
  }

  // Rate / quota
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  }
  if (lower.includes("signups not allowed") || lower.includes("signup is disabled")) {
    return "Cadastro temporariamente fechado. Tente novamente mais tarde.";
  }

  // Sessão
  if (lower.includes("jwt") || lower.includes("session") || lower.includes("token")) {
    return "Sua sessão expirou. Entre novamente.";
  }

  // Rede
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed to fetch") ||
    lower.includes("offline")
  ) {
    return "Sem conexão com o servidor. Tente de novo em alguns segundos.";
  }

  return msg;
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.bg,
    },
    scroll: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    card: {
      width: "100%",
      maxWidth: 460,
      backgroundColor: t.card,
      borderRadius: 20,
      paddingHorizontal: 26,
      paddingTop: 36,
      paddingBottom: 28,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    header: {
      alignItems: "center",
      marginBottom: 28,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      color: t.textSec,
      fontFamily: FONT.medium,
      marginBottom: 6,
      letterSpacing: 0.1,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      position: "relative",
    },
    input: {
      fontSize: 16,
      color: t.text,
      fontFamily: FONT.body,
      backgroundColor: t.bg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: t.separator,
    },
    eyeBtn: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    cta: {
      backgroundColor: t.brand,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      shadowColor: t.brand,
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    ctaText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: FONT.semibold,
      letterSpacing: 0.2,
    },
    switchBtn: {
      alignItems: "center",
      paddingVertical: 16,
    },
    switchText: {
      fontSize: 14,
      color: t.textSec,
      fontFamily: FONT.body,
    },
    switchLink: {
      color: t.brand,
      fontFamily: FONT.semibold,
    },
    legal: {
      fontSize: 12,
      color: t.textMute,
      textAlign: "center",
      fontFamily: FONT.body,
      lineHeight: 17,
      marginTop: 8,
    },
  });
}
