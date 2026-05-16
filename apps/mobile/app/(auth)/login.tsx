import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
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
import { FONT } from "@/ui/tokens";
import { Eye, EyeOff } from "@/ui/icons";

type Mode = "signin" | "signup";
type FocusField = "email" | "password" | null;

// Preto puro OLED + paleta dark. Tier 1 polish:
//  - tint sutil brand nos bg/border (em vez de white opacity puro) → coesão
//  - selectionColor/cursorColor brand → cada digitação reforça marca
//  - inputs underline-only (sem caixa) + linha verde animada crescendo L→R
const LOGIN_PALETTE = {
  bg: "#000000",
  text: "#ffffff",
  textSec: "rgba(255,255,255,0.72)",
  textMute: "rgba(255,255,255,0.40)",
  // Underline idle (cinza neutro frio) + foco brand.
  underlineIdle: "rgba(255,255,255,0.14)",
  brand: "#10B981",
  brandDeep: "#34D399",
};

const RISE_DURATION_MS = 520;
const STAGGER_MS = 110;
const FOCUS_TRANSITION_MS = 240;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<FocusField>(null);

  // Entrada coordenada (6 elementos sobem em cascata)
  const animValues = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0)),
  ).current;

  // Focus animations: linha brand cresce L→R quando input está focused
  const emailFocusAnim = useRef(new Animated.Value(0)).current;
  const pwdFocusAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.timing(emailFocusAnim, {
      toValue: focused === "email" ? 1 : 0,
      duration: FOCUS_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(pwdFocusAnim, {
      toValue: focused === "password" ? 1 : 0,
      duration: FOCUS_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, emailFocusAnim, pwdFocusAnim]);

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

  const styles = useMemo(() => makeStyles(), []);

  const riseStyle = (idx: number) => ({
    opacity: animValues[idx],
    transform: [
      {
        translateY: animValues[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
    ],
  });

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.logoWrap, riseStyle(0)]}>
            <Image
              source={require("../../assets/brand/logos/logo-laudousg-white.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="LaudoUSG"
            />
          </Animated.View>

          <Animated.Text style={[styles.tagline, riseStyle(1)]}>
            LaudoUSG
          </Animated.Text>

          <View style={styles.form}>
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

            <Animated.View style={[styles.field, riseStyle(2)]}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.underlineWrap}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  placeholderTextColor={LOGIN_PALETTE.textMute}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!busy}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  selectionColor={LOGIN_PALETTE.brand}
                  cursorColor={LOGIN_PALETTE.brand}
                  style={styles.input}
                />
                <View style={styles.underlineBase} />
                <Animated.View
                  style={[
                    styles.underlineFocus,
                    { transform: [{ scaleX: emailFocusAnim }] },
                  ]}
                />
              </View>
            </Animated.View>

            <Animated.View style={[styles.field, riseStyle(3)]}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.underlineWrap}>
                <View style={styles.inputRow}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="mínimo 6 caracteres"
                    placeholderTextColor={LOGIN_PALETTE.textMute}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    textContentType={mode === "signin" ? "password" : "newPassword"}
                    editable={!busy}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    selectionColor={LOGIN_PALETTE.brand}
                    cursorColor={LOGIN_PALETTE.brand}
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
                      <EyeOff size={18} color={LOGIN_PALETTE.textSec} />
                    ) : (
                      <Eye size={18} color={LOGIN_PALETTE.textSec} />
                    )}
                  </Pressable>
                </View>
                <View style={styles.underlineBase} />
                <Animated.View
                  style={[
                    styles.underlineFocus,
                    { transform: [{ scaleX: pwdFocusAnim }] },
                  ]}
                />
              </View>
            </Animated.View>

            <Animated.View style={riseStyle(4)}>
              <Pressable
                onPress={submit}
                disabled={!canSubmit}
                style={[styles.cta, { opacity: canSubmit ? 1 : 0.4 }]}
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
            </Animated.View>

            <Animated.View style={riseStyle(5)}>
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
                      Já tem conta? <Text style={styles.switchLink}>Entrar</Text>
                    </>
                  )}
                </Text>
              </Pressable>

              <Text style={styles.legal}>
                Ao continuar, você concorda com os termos de uso e política de
                privacidade.
              </Text>
            </Animated.View>
          </View>
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
    return "Senha fraca: use ao menos 6 caracteres, combinando letras e números.";
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

function makeStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: LOGIN_PALETTE.bg,
    },
    scroll: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 22,
    },
    logoWrap: {
      alignItems: "center",
      marginBottom: 14,
    },
    logo: {
      width: 220,
      height: 120,
    },
    tagline: {
      color: LOGIN_PALETTE.text,
      fontSize: 28,
      fontFamily: FONT.bold,
      letterSpacing: -0.4,
      marginBottom: 44,
      textAlign: "center",
    },
    form: {
      width: "100%",
      maxWidth: 420,
    },
    field: {
      marginBottom: 22,
    },
    label: {
      fontSize: 11,
      color: LOGIN_PALETTE.textMute,
      fontFamily: FONT.medium,
      marginBottom: 8,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    // Wrapper que segura o input + as duas underlines (idle + focused)
    underlineWrap: {
      position: "relative",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    input: {
      fontSize: 17,
      color: LOGIN_PALETTE.text,
      fontFamily: FONT.body,
      backgroundColor: "transparent",
      paddingVertical: 12,
      paddingHorizontal: 0,
    },
    // Linha idle (sempre visível) — base do underline
    underlineBase: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 1,
      backgroundColor: LOGIN_PALETTE.underlineIdle,
    },
    // Linha brand que cresce L→R com scaleX. transformOrigin: 'left' faz
    // ela emergir do canto esquerdo em vez do centro.
    underlineFocus: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      backgroundColor: LOGIN_PALETTE.brand,
      transformOrigin: "left center",
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
      backgroundColor: LOGIN_PALETTE.brand,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    ctaText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: FONT.semibold,
      letterSpacing: 0.3,
    },
    switchBtn: {
      alignItems: "center",
      paddingVertical: 14,
    },
    switchText: {
      fontSize: 14,
      color: LOGIN_PALETTE.textSec,
      fontFamily: FONT.body,
    },
    switchLink: {
      color: LOGIN_PALETTE.brandDeep,
      fontFamily: FONT.semibold,
    },
    legal: {
      fontSize: 11,
      color: LOGIN_PALETTE.textMute,
      textAlign: "center",
      fontFamily: FONT.body,
      lineHeight: 16,
      marginTop: 4,
    },
  });
}
