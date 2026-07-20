import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { CheckCircle, Send } from "@/ui/icons";
import {
  pairWorkspaceCompanion,
  sendWorkspaceCompanionInput,
  type WorkspaceCompanionInputKind,
  type WorkspaceCompanionSession,
} from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  categoryCode: string;
};

const STORAGE_KEY = "laudousg.workspace-companion.session.v1";

function normalizeCode(value: string) {
  return value.replace(/[\s\-_]/g, "").toUpperCase().slice(0, 6);
}

function sessionIsActive(session: WorkspaceCompanionSession) {
  return session.active && Date.parse(session.expiresAt) > Date.now();
}

function remainingLabel(expiresAt: string) {
  const remaining = Math.max(0, Date.parse(expiresAt) - Date.now());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}min restantes` : `${minutes}min restantes`;
}

function eventId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function ComputerCompanionSheet({ open, onClose, categoryCode }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [code, setCode] = useState("");
  const [session, setSession] = useState<WorkspaceCompanionSession | null>(null);
  const [kind, setKind] = useState<WorkspaceCompanionInputKind>("text");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!alive || !stored) return;
      try {
        const parsed = JSON.parse(stored) as WorkspaceCompanionSession;
        if (sessionIsActive(parsed)) setSession(parsed);
        else void AsyncStorage.removeItem(STORAGE_KEY);
      } catch {
        void AsyncStorage.removeItem(STORAGE_KEY);
      }
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const connect = async () => {
    const normalized = normalizeCode(code);
    if (normalized.length !== 6) {
      setError("Digite o código de 6 caracteres mostrado no computador.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const paired = await pairWorkspaceCompanion(
        normalized,
        Platform.OS === "ios" ? "iPhone" : "Android",
      );
      setSession(paired);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(paired));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível conectar.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const content = text.trim();
    if (!session || !sessionIsActive(session)) {
      setSession(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
      setError("A sessão terminou. Gere outro código no computador.");
      return;
    }
    if (!content) {
      setError("Digite o texto ou as medidas antes de enviar.");
      return;
    }
    setBusy(true);
    setSent(false);
    setError(null);
    try {
      await sendWorkspaceCompanionInput({
        sessionId: session.id,
        clientEventId: eventId(),
        kind,
        text: content,
        categoryCode,
      });
      setText("");
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setTimeout(() => setSent(false), 1800);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível enviar.";
      if (message.includes("409")) {
        setSession(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
        setError("A sessão foi encerrada no computador. Faça um novo pareamento.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setSession(null);
    setCode("");
    setText("");
    setError(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Conectar ao computador" height={680}>
      <View style={styles.container}>
        {session ? (
          <>
            <View style={styles.connectedCard}>
              <CheckCircle size={18} color={t.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedTitle}>Computador conectado</Text>
                <Text style={styles.connectedMeta}>{remainingLabel(session.expiresAt)}</Text>
              </View>
              <Pressable onPress={() => void disconnect()}>
                <Text style={styles.disconnect}>Desconectar</Text>
              </Pressable>
            </View>

            <View style={styles.kindRow}>
              {(["text", "measurements"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setKind(option)}
                  style={[styles.kindButton, kind === option && styles.kindButtonActive]}
                >
                  <Text style={[styles.kindText, kind === option && styles.kindTextActive]}>
                    {option === "text" ? "Texto" : "Medidas"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              placeholder={kind === "text" ? "Ex.: fígado aumentado, com esteatose leve…" : "Ex.: útero 7,2 × 4,1 × 3,8 cm…"}
              placeholderTextColor={t.textGhost}
              style={styles.input}
            />

            <Text style={styles.helper}>
              O conteúdo chegará como um cartão no laudo aberto e só será inserido após confirmação no computador.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={() => void send()}
              disabled={busy}
              style={({ pressed }) => [styles.primaryButton, (pressed || busy) && { opacity: 0.7 }]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : sent ? <CheckCircle size={18} color="#fff" /> : <Send size={18} color="#fff" />}
              <Text style={styles.primaryButtonText}>{sent ? "Enviado" : "Enviar ao computador"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Use o celular como entrada do laudo</Text>
              <Text style={styles.introBody}>
                No computador, abra a aba Celular e toque em Parear. Digite abaixo o código exibido. A conexão dura até 10 horas.
              </Text>
            </View>

            <TextInput
              value={code}
              onChangeText={(value) => setCode(normalizeCode(value))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              placeholder="CÓDIGO"
              placeholderTextColor={t.textGhost}
              style={styles.codeInput}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={() => void connect()}
              disabled={busy}
              style={({ pressed }) => [styles.primaryButton, (pressed || busy) && { opacity: 0.7 }]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : null}
              <Text style={styles.primaryButtonText}>Conectar</Text>
            </Pressable>
          </>
        )}
      </View>
    </Sheet>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    container: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 32, gap: 14 },
    introCard: { backgroundColor: t.card, borderRadius: 18, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: t.separator, gap: 8 },
    introTitle: { color: t.text, fontFamily: FONT.semibold, fontSize: 16 },
    introBody: { color: t.text2, fontFamily: FONT.body, fontSize: 14, lineHeight: 20 },
    codeInput: { height: 68, borderRadius: 18, borderWidth: 1, borderColor: t.brand, backgroundColor: t.brandLight, color: t.brandDeep, fontFamily: FONT.black, fontSize: 30, letterSpacing: 8, textAlign: "center" },
    connectedCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, backgroundColor: t.brandLight, borderWidth: 1, borderColor: "rgba(5,150,105,0.22)", padding: 14 },
    connectedTitle: { color: t.brandDeep, fontFamily: FONT.semibold, fontSize: 14 },
    connectedMeta: { color: t.text2, fontFamily: FONT.body, fontSize: 12, marginTop: 2 },
    disconnect: { color: t.text2, fontFamily: FONT.semibold, fontSize: 12 },
    kindRow: { flexDirection: "row", gap: 8 },
    kindButton: { flex: 1, alignItems: "center", borderRadius: 999, paddingVertical: 9, backgroundColor: t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: t.separator },
    kindButtonActive: { backgroundColor: t.text },
    kindText: { color: t.text2, fontFamily: FONT.semibold, fontSize: 13 },
    kindTextActive: { color: t.bg },
    input: { minHeight: 170, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: t.separator, backgroundColor: t.card, color: t.text, fontFamily: FONT.body, fontSize: 16, lineHeight: 22, padding: 16 },
    helper: { color: t.text2, fontFamily: FONT.body, fontSize: 12, lineHeight: 17 },
    error: { color: t.danger, fontFamily: FONT.medium, fontSize: 12, lineHeight: 17 },
    primaryButton: { minHeight: 50, borderRadius: 999, backgroundColor: t.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
    primaryButtonText: { color: "#fff", fontFamily: FONT.bold, fontSize: 15 },
  });
}
