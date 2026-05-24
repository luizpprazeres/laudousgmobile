import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Sheet } from "@/ui/Sheet";
import { C, FONT } from "@/ui/tokens";
import { AlertTriangle, CheckCircle, Send } from "@/ui/icons";
import {
  generateSalaPairing,
  revokeSalaPairing,
  type SalaPairing,
} from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

const COPY_RESET_MS = 1500;

function formatCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

function remainingLabel(expiresAt: string, now: number): string {
  const exp = Date.parse(expiresAt);
  if (Number.isNaN(exp)) return "";
  const remaining = Math.max(0, Math.floor((exp - now) / 1000));
  if (remaining <= 0) return "Expirado — gere outro";
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  if (hours > 0) return `Válido por mais ${hours}h ${minutes}min`;
  return `Válido por mais ${minutes}min`;
}

export function SalaPairingSheet({ open, onClose }: Props) {
  const [pairing, setPairing] = useState<SalaPairing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didCopyURL, setDidCopyURL] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // ticker pra atualizar contador do tempo restante
  useEffect(() => {
    if (!open || !pairing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, pairing]);

  // reset estado ao fechar
  useEffect(() => {
    if (!open) {
      setError(null);
      setDidCopyURL(false);
    }
  }, [open]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateSalaPairing();
      setPairing(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[mobile] sala pair generate failed:", msg);
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => undefined,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyURL = async () => {
    if (!pairing) return;
    await Clipboard.setStringAsync(pairing.salaShortUrl);
    setDidCopyURL(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    setTimeout(() => setDidCopyURL(false), COPY_RESET_MS);
  };

  const handleRevoke = async () => {
    try {
      await revokeSalaPairing();
      setPairing(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => undefined,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[mobile] sala revoke failed:", msg);
      setError(msg);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Sala do Auxiliar" height={620}>
      <View style={styles.container}>
        {isLoading && !pairing ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.brand} />
            <Text style={styles.muted}>Gerando código…</Text>
          </View>
        ) : pairing ? (
          <>
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>CÓDIGO DA SALA</Text>
              <Text style={styles.code}>{formatCode(pairing.code)}</Text>
              <Text style={styles.codeMeta}>
                {remainingLabel(pairing.expiresAt, now)}
              </Text>
            </View>

            <View style={styles.instructionsCard}>
              <Text style={styles.sectionLabel}>COMO FUNCIONA</Text>
              <Text style={styles.instructions}>
                Gere a sessão no início do turno. O auxiliar digita o código UMA
                VEZ em sala.laudousg.com e fica conectado pelo resto do dia.
                Cada laudo que você enviar aparece automaticamente lá.
              </Text>
            </View>

            <Pressable
              onPress={handleCopyURL}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              {didCopyURL ? (
                <CheckCircle size={16} color={C.brand} />
              ) : (
                <Send size={16} color={C.text} />
              )}
              <Text style={styles.secondaryBtnText}>
                {didCopyURL
                  ? "URL copiada"
                  : "Copiar URL (sala.laudousg.com)"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleRevoke}
              style={({ pressed }) => [
                styles.dangerBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.dangerBtnText}>Revogar sessão</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>
                Sessão de turno com o auxiliar
              </Text>
              <Text style={styles.introBody}>
                Gere a sessão no início do turno. O auxiliar digita o código UMA
                VEZ em sala.laudousg.com e fica conectado pelo resto do dia.
                Cada laudo que você enviar aparece automaticamente lá.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <AlertTriangle size={16} color={C.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleGenerate}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || isLoading) && { opacity: 0.7 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Gerar código de pareamento
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  center: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 60,
  },
  muted: {
    color: C.text2,
    fontFamily: FONT.body,
    fontSize: 14,
  },
  introCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
    gap: 8,
  },
  introTitle: {
    color: C.text,
    fontFamily: FONT.semibold,
    fontSize: 16,
  },
  introBody: {
    color: C.text2,
    fontFamily: FONT.body,
    fontSize: 14,
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: C.brandLight,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.25)",
  },
  codeLabel: {
    color: C.brandDeep,
    fontFamily: FONT.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  code: {
    color: C.brandDeep,
    fontFamily: FONT.black,
    fontSize: 44,
    letterSpacing: 4,
  },
  codeMeta: {
    color: C.text2,
    fontFamily: FONT.medium,
    fontSize: 12,
  },
  instructionsCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
    gap: 6,
  },
  sectionLabel: {
    color: C.textSec,
    fontFamily: FONT.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  instructions: {
    color: C.text2,
    fontFamily: FONT.body,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryBtn: {
    backgroundColor: C.brand,
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: FONT.semibold,
    fontSize: 16,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
  },
  secondaryBtnText: {
    color: C.text,
    fontFamily: FONT.medium,
    fontSize: 14,
  },
  dangerBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: {
    color: C.danger,
    fontFamily: FONT.medium,
    fontSize: 14,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,59,48,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    color: C.danger,
    fontFamily: FONT.medium,
    fontSize: 13,
  },
});
