import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Stack, router } from "expo-router";
import { C, FONT } from "@/ui/tokens";
import { generateSalaPairing, revokeSalaPairing, type SalaPairing } from "@/lib/api";

export default function SalaScreen() {
  const [pairing, setPairing] = useState<SalaPairing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSalaPairing();
      setPairing(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      setError(msg);
      console.error("[mobile] sala pairing failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRevoke = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await revokeSalaPairing();
      setPairing(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (!pairing) return;
    await Clipboard.setStringAsync(pairing.salaShortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [pairing]);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Sala do Auxiliar",
          headerBackTitle: "Voltar",
          headerStyle: { backgroundColor: C.card },
          headerTintColor: C.brand,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {!pairing ? (
          <View style={styles.empty}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>👤</Text>
            </View>
            <Text style={styles.title}>Sessão de turno com o auxiliar</Text>
            <Text style={styles.subtitle}>
              Gere a sessão no início do turno. O auxiliar digita o código UMA VEZ em sala.laudousg.com
              e fica conectado pelo resto do dia. Cada laudo que você enviar aparece automaticamente lá.
            </Text>
            <Pressable
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Gerar código de pareamento</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.paired}>
            <Text style={styles.codeLabel}>Código do auxiliar</Text>
            <Text style={styles.code}>{pairing.code}</Text>
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>Como o auxiliar entra</Text>
              {[
                "O auxiliar abre sala.laudousg.com uma vez (em qualquer navegador)",
                `Digita o código ${pairing.code}`,
                "Fica conectado pelo resto do dia",
                "Cada laudo que você gerar aparece automaticamente lá",
              ].map((step, i) => (
                <View key={i} style={styles.instructionRow}>
                  <Text style={styles.instructionNumber}>{i + 1}.</Text>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.secondaryButton} onPress={handleCopyUrl}>
              <Text style={styles.secondaryButtonText}>
                {copied ? "✓ URL copiada" : "Copiar URL (sala.laudousg.com)"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.dangerButton, loading && styles.disabledButton]}
              onPress={handleRevoke}
              disabled={loading}
            >
              <Text style={styles.dangerButtonText}>
                {loading ? "Revogando..." : "Revogar sessão"}
              </Text>
            </Pressable>
          </View>
        )}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  empty: {
    alignItems: "center",
    paddingTop: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontFamily: FONT.semibold,
    fontSize: 20,
    color: C.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FONT.body,
    fontSize: 15,
    color: C.text2,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: C.brand,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 280,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontFamily: FONT.semibold,
    fontSize: 16,
  },
  paired: {
    paddingTop: 16,
  },
  codeLabel: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: C.textSec,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 8,
  },
  code: {
    fontFamily: FONT.black,
    fontSize: 64,
    color: C.brand,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 32,
  },
  instructions: {
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontFamily: FONT.semibold,
    fontSize: 14,
    color: C.text,
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  instructionNumber: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: C.brand,
    marginRight: 8,
    minWidth: 18,
  },
  instructionText: {
    fontFamily: FONT.body,
    fontSize: 14,
    color: C.text2,
    flex: 1,
    lineHeight: 20,
  },
  secondaryButton: {
    backgroundColor: C.brandLight,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: C.brand,
    fontFamily: FONT.semibold,
    fontSize: 15,
  },
  dangerButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: C.danger,
    fontFamily: FONT.medium,
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: "rgba(255,59,48,0.1)",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: C.danger,
    fontFamily: FONT.medium,
    fontSize: 14,
  },
});
