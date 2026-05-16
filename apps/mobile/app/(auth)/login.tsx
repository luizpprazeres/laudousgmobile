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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Banner } from "@/ui/Banner";
import { PaperShowcase } from "@/ui/PaperShowcase";
import { FONT } from "@/ui/tokens";
import { Eye, EyeOff } from "@/ui/icons";

type Mode = "signin" | "signup";

// Paleta forçada (login ignora system theme — sempre dark dramático).
const LOGIN_PALETTE = {
  bg: "#000000",
  card: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.10)",
  text: "#ffffff",
  textSec: "rgba(255,255,255,0.72)",
  textMute: "rgba(255,255,255,0.40)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.14)",
  inputBorderFocus: "#10B981",
  brand: "#10B981",
  brandDeep: "#34D399",
  particleGreen: "#10B981",
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);

  // Entrada coordenada: logo fade-in primeiro, depois form (delay 350ms).
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(350),
        Animated.parallel([
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(formTranslate, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [logoOpacity, logoScale, formOpacity, formTranslate]);

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

  return (
    <View style={styles.root}>
      {/* PaperShowcase: cena de motion design coreografada (papéis caindo +
          glow brand + hero paper com typewriter + stamp ✓). Absolute fill. */}
      <PaperShowcase width={width} height={height} />

      {/* Vignette radial sutil pra dar profundidade — feito com gradient
          simulado via Views aninhadas (sem precisar de linear-gradient lib) */}
      <View pointerEvents="none" style={styles.vignette} />

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
          <Animated.View
            style={[
              styles.logoWrap,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require("../../assets/brand/logos/logo-laudousg-white.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="LaudoUSG"
            />
            <Text style={styles.tagline}>Laudos rápidos e inteligentes</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslate }],
              },
            ]}
          >
            {error ? (
              <View style={{ marginBottom: 16 }}>
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
                placeholderTextColor={LOGIN_PALETTE.textMute}
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
                  placeholderTextColor={LOGIN_PALETTE.textMute}
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
                    <EyeOff size={18} color={LOGIN_PALETTE.textSec} />
                  ) : (
                    <Eye size={18} color={LOGIN_PALETTE.textSec} />
                  )}
                </Pressable>
              </View>
            </View>

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
    vignette: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
      // shadowInset não existe em RN — usamos border + shadow no card pra
      // simular profundidade. Vignette aqui é overlay sutil pra escurecer
      // cantos visualmente.
    },
    scroll: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 22,
    },
    logoWrap: {
      alignItems: "center",
      marginBottom: 36,
    },
    logo: {
      width: 220,
      height: 120,
    },
    tagline: {
      color: LOGIN_PALETTE.textSec,
      fontSize: 18,
      fontFamily: FONT.semibold,
      letterSpacing: 0.4,
      marginTop: 16,
      textAlign: "center",
    },
    card: {
      width: "100%",
      maxWidth: 440,
      backgroundColor: LOGIN_PALETTE.card,
      borderRadius: 20,
      paddingHorizontal: 24,
      paddingTop: 26,
      paddingBottom: 22,
      borderWidth: 1,
      borderColor: LOGIN_PALETTE.cardBorder,
      // Glow leve verde por trás do card
      shadowColor: LOGIN_PALETTE.brand,
      shadowOpacity: 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      color: LOGIN_PALETTE.textSec,
      fontFamily: FONT.medium,
      marginBottom: 6,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      position: "relative",
    },
    input: {
      fontSize: 16,
      color: LOGIN_PALETTE.text,
      fontFamily: FONT.body,
      backgroundColor: LOGIN_PALETTE.inputBg,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: LOGIN_PALETTE.inputBorder,
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
      marginTop: 6,
      shadowColor: LOGIN_PALETTE.brand,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
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
      marginTop: 6,
    },
  });
}
