import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { Banner } from "@/ui/Banner";
import { FONT, SPACING } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { PrimaryButton, SecondaryButton } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { LaudoUSGLogo } from "@/ui/LaudoUSGLogo";
import { Book, Info, Shield } from "@/ui/icons";

type Mode = "signin" | "signup";

const RISE_DURATION_MS = 520;
const STAGGER_MS = 100;

/**
 * Haptics: silenciosamente no-op em web e em devices sem motor háptico.
 */
const haptic = {
  selection: () => {
    Haptics.selectionAsync().catch(() => {});
  },
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    );
  },
};

export default function LoginScreen() {
  const t = useColorTokens();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Animação de entrada (rise + stagger) — plus do RN que mantemos.
  const animValues = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.stagger(
      STAGGER_MS,
      animValues.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: RISE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [animValues]);

  const trimmedEmail = email.trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const validPassword = mode === "signin" ? password.length > 0 : password.length >= 8;
  const canSubmit = validEmail && validPassword && !busy;

  async function submit() {
    if (!canSubmit) return;
    haptic.light();
    setError(null);
    setBusy(true);
    try {
      const { data, error: authErr } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            })
          : await supabase.auth.signUp({
              email: trimmedEmail,
              password,
              options: { emailRedirectTo: "laudousg://auth/callback" },
            });
      if (authErr) throw authErr;
      haptic.success();
      if (data.session) {
        router.replace("/generate");
      } else {
        setMode("signin");
        setPassword("");
        setInfo(
          `Conta criada. Confirme o link enviado para ${trimmedEmail} e depois entre com sua senha.`,
        );
      }
    } catch (e) {
      haptic.error();
      setError(humanizeAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (busy) return;
    setError(null);
    setInfo(null);
    if (!validEmail) {
      setError("Preencha seu email acima para enviarmos o link de redefinição.");
      return;
    }
    haptic.light();
    setBusy(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        { redirectTo: "laudousg://auth/reset-password" },
      );
      if (resetErr) throw resetErr;
      haptic.success();
      setInfo(
        `Enviamos um link de redefinição para ${trimmedEmail}. Confira também o spam.`,
      );
    } catch (e) {
      haptic.error();
      setError(humanizeAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  const riseStyle = (idx: number) => ({
    opacity: animValues[idx],
    transform: [
      {
        translateY: animValues[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  });

  const legalLinks = [
    { label: "Termos de Uso", icon: <Book size={13} color={t.textSec} /> },
    { label: "Privacidade", icon: <Shield size={13} color={t.textSec} /> },
    { label: "Disclaimer", icon: <Info size={13} color={t.textSec} /> },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: SPACING.lg,
            paddingTop: insets.top + SPACING.xl,
            paddingBottom: insets.bottom + SPACING.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header discreto: só o wordmark, com respiro no topo (o ícone
              tinha fidelidade de clipart e a tagline caps gritava — critique
              04/07; o header do generate segue o mesmo padrão). */}
          <Animated.View
            style={[
              {
                alignItems: "center",
                marginTop: SPACING.xl,
                marginBottom: SPACING.xl,
              },
              riseStyle(0),
            ]}
          >
            <LaudoUSGLogo size="lg" variant="auto" />
          </Animated.View>

          <View style={{ gap: SPACING.md }}>
            {error ? (
              <Banner
                severity="error"
                title="Não foi possível entrar"
                message={error}
                onDismiss={() => setError(null)}
              />
            ) : null}
            {info ? (
              <Banner
                severity="success"
                message={info}
                onDismiss={() => setInfo(null)}
              />
            ) : null}

            <Animated.View style={riseStyle(1)}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@clinica.com"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoCapitalize="none"
                editable={!busy}
              />
            </Animated.View>

            <Animated.View style={riseStyle(2)}>
              <Field
                label="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                textContentType={mode === "signin" ? "password" : "newPassword"}
                autoCapitalize="none"
                editable={!busy}
                returnKeyType={mode === "signin" ? "go" : "done"}
                onSubmitEditing={submit}
              />
            </Animated.View>

            {mode === "signin" ? (
              <Animated.View style={[riseStyle(3), { alignItems: "flex-end" }]}>
                <Pressable
                  onPress={forgotPassword}
                  hitSlop={8}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text
                    style={{
                      color: t.textSec,
                      fontFamily: FONT.medium,
                      fontSize: 13,
                      textDecorationLine: "underline",
                    }}
                  >
                    Esqueci minha senha
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}

            <Animated.View style={[riseStyle(3), { marginTop: SPACING.xs, gap: SPACING.sm }]}>
              <PrimaryButton
                title={mode === "signin" ? "Entrar" : "Criar conta"}
                loading={busy}
                disabled={!canSubmit}
                onPress={submit}
              />
              <SecondaryButton
                title={mode === "signin" ? "Criar conta nova" : "Já tenho conta"}
                onPress={() => {
                  haptic.selection();
                  setMode((m) => (m === "signin" ? "signup" : "signin"));
                  setError(null);
                }}
              />
            </Animated.View>
          </View>

          <Animated.View
            style={[
              {
                flexDirection: "row",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: SPACING.md,
                marginTop: SPACING.xxl,
              },
              riseStyle(4),
            ]}
          >
            {legalLinks.map((l) => (
              <Pressable
                key={l.label}
                onPress={() => router.push("/sobre" as never)}
                hitSlop={8}
                accessibilityRole="link"
                style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xxs }}
              >
                {l.icon}
                <Text style={{ fontFamily: FONT.body, fontSize: 13, color: t.textSec }}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function humanizeAuthError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();

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
  if (
    lower.includes("password should be") ||
    lower.includes("password is too short") ||
    lower.includes("password is too weak") ||
    lower.includes("weak password")
  ) {
    return "Senha fraca: use ao menos 8 caracteres, combinando letras e números.";
  }
  if (lower.includes("same password") || lower.includes("new password should be different")) {
    return "A nova senha precisa ser diferente da anterior.";
  }
  if (
    lower.includes("invalid email") ||
    lower.includes("email address is invalid") ||
    lower.includes("unable to validate email")
  ) {
    return "Email inválido. Confira se digitou certo.";
  }
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
  if (lower.includes("jwt") || lower.includes("session") || lower.includes("token")) {
    return "Sua sessão expirou. Entre novamente.";
  }
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
