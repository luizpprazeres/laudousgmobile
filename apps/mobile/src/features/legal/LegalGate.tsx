import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { LEGAL_DOCUMENTS, type LegalDocId } from "@/legal/documents";
import { BrandSplash } from "@/ui/BrandSplash";
import { MarkdownLite } from "@/ui/MarkdownLite";
import { Sheet } from "@/ui/Sheet";
import { PrimaryButton } from "@/ui/Button";
import { FONT, RADIUS, SPACING, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import {
  fetchLegalAcceptance,
  hasCachedAcceptance,
  needsLegalAcceptance,
  recordLegalAcceptance,
  setCachedAccepted,
} from "./acceptance";

/**
 * Gate de aceite legal — port do DisclaimerAcceptModal do iOS.
 *
 * Root-level (_layout), acima de TODAS as rotas. Estados:
 *  - hidden: sem sessão, ou aceite confirmado (cache local OU leitura remota).
 *  - checking: sessão ativa sem cache — BLOQUEIA (splash) até decidir.
 *  - blocked: precisa aceitar (3 checkboxes) OU leitura falhou sem cache
 *    (fail-closed, review Dex1+Dex2: sem aceite confirmado não se abre a
 *    ferramenta clínica; banner de conexão + Tentar novamente).
 *
 * Cache por usuário (AsyncStorage) evita re-checagem bloqueante a cada start;
 * a leitura remota re-sincroniza em background (versões novas reabrem o gate).
 */

type GateState = "hidden" | "checking" | "blocked";
type DocMeta = { id: LegalDocId; title: string; version: string };

export function LegalGate() {
  const insets = useSafeAreaInsets();
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [state, setState] = useState<GateState>("hidden");
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [checks, setChecks] = useState<Record<LegalDocId, boolean>>({
    terms: false,
    privacy: false,
    disclaimer: false,
  });
  const [openDoc, setOpenDoc] = useState<LegalDocId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Invalida avaliações em voo quando a sessão muda (race do review Dex1).
  const runRef = useRef(0);

  const evaluate = useCallback(async (uid: string) => {
    const run = ++runRef.current;
    const cached = await hasCachedAcceptance(uid);
    if (runRef.current !== run) return;

    // Sem confirmação local → bloqueia enquanto verifica (fail-closed).
    if (!cached) setState("checking");
    setFetchFailed(false);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const acceptance = await fetchLegalAcceptance(uid);
        if (runRef.current !== run) return;
        if (needsLegalAcceptance(acceptance)) {
          setState("blocked");
        } else {
          await setCachedAccepted(uid);
          if (runRef.current !== run) return;
          setState("hidden");
        }
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        if (runRef.current !== run) return;
      }
    }
    if (runRef.current !== run) return;
    if (cached) {
      // Aceite atual já confirmado antes neste device — não bloqueia offline.
      setState("hidden");
    } else {
      setFetchFailed(true);
      setState("blocked");
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) evaluate(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        runRef.current++; // descarta avaliações em voo
        setState("hidden");
        setChecks({ terms: false, privacy: false, disclaimer: false });
        setError(null);
        setFetchFailed(false);
      } else if (event === "SIGNED_IN") {
        evaluate(uid);
      }
    });
    return () => {
      active = false;
      runRef.current++;
      sub.subscription.unsubscribe();
    };
  }, [evaluate]);

  const allChecked = checks.terms && checks.privacy && checks.disclaimer;
  const docs: DocMeta[] = LEGAL_DOCUMENTS.map((d) => ({
    id: d.id,
    title: d.title,
    version: d.version,
  }));
  const openDocument = LEGAL_DOCUMENTS.find((d) => d.id === openDoc) ?? null;

  const accept = async () => {
    if (!userId || !allChecked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordLegalAcceptance(userId); // lança se 0 linhas atualizadas
      setState("hidden");
    } catch {
      setError(
        "Não foi possível registrar o aceite. Verifique a conexão e tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const retryFetch = () => {
    if (userId) evaluate(userId);
  };

  const exit = async () => {
    await supabase.auth.signOut();
  };

  if (state === "hidden") return null;

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={() => undefined}>
      {state === "checking" ? (
        <BrandSplash />
      ) : (
        <View style={styles.root}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: SPACING.lg,
              paddingTop: insets.top + SPACING.xl,
              paddingBottom: SPACING.xl + insets.bottom,
              gap: SPACING.sm,
            }}
          >
            <Text style={styles.title}>Antes de começar</Text>
            <Text style={styles.subtitle}>
              O LaudoUSG é uma ferramenta de apoio à redação de laudos para médicos.
              Leia e aceite os documentos abaixo para usar o app.
            </Text>

            {fetchFailed ? (
              <View style={styles.warnBanner}>
                <Text style={styles.warnText}>
                  Não foi possível verificar seu aceite (sem conexão?). Você pode
                  aceitar abaixo ou tentar verificar novamente.
                </Text>
                <Pressable onPress={retryFetch} accessibilityRole="button">
                  <Text style={styles.warnAction}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ gap: SPACING.xs, marginTop: SPACING.sm }}>
              {docs.map((doc) => (
                <Pressable
                  key={doc.id}
                  style={styles.docCard}
                  onPress={() => setOpenDoc(doc.id)}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    <Text style={styles.docVersion}>Versão {doc.version}</Text>
                  </View>
                  <Text style={styles.docChevron}>›</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ gap: SPACING.xs, marginTop: SPACING.sm }}>
              {docs.map((doc) => (
                <Pressable
                  key={doc.id}
                  style={styles.checkRow}
                  onPress={() => setChecks((c) => ({ ...c, [doc.id]: !c[doc.id] }))}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: checks[doc.id] }}
                >
                  <View style={[styles.checkbox, checks[doc.id] && styles.checkboxOn]}>
                    {checks[doc.id] ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkLabel}>
                    Li e aceito{" "}
                    {doc.id === "disclaimer" ? "o" : doc.id === "privacy" ? "a" : "os"}{" "}
                    <Text style={{ fontFamily: FONT.semibold }}>{doc.title}</Text>
                  </Text>
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={{ marginTop: SPACING.md, gap: SPACING.xs }}>
              <PrimaryButton
                title="Entendi e aceito"
                disabled={!allChecked}
                loading={submitting}
                onPress={accept}
              />
              <Pressable onPress={exit} style={styles.exitBtn} accessibilityRole="button">
                <Text style={styles.exitText}>Sair</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Sheet já embute ScrollView — conteúdo vai direto. */}
          <Sheet
            open={openDoc !== null}
            onClose={() => setOpenDoc(null)}
            title={openDocument?.title}
            height={Math.round(Dimensions.get("window").height * 0.85)}
          >
            <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl }}>
              {openDocument ? <MarkdownLite markdown={openDocument.body} /> : null}
            </View>
          </Sheet>
        </View>
      )}
    </Modal>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.bg,
    },
    title: {
      color: t.text,
      fontFamily: FONT.displayBold,
      fontSize: 28,
    },
    subtitle: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 14,
      lineHeight: 21,
    },
    warnBanner: {
      backgroundColor: t.warningBg,
      borderRadius: RADIUS.lg,
      padding: SPACING.sm,
      gap: SPACING.xxs,
      marginTop: SPACING.xs,
    },
    warnText: {
      color: t.warningText,
      fontFamily: FONT.medium,
      fontSize: 13,
      lineHeight: 19,
    },
    warnAction: {
      color: t.warningText,
      fontFamily: FONT.bold,
      fontSize: 13,
      textDecorationLine: "underline",
    },
    docCard: {
      backgroundColor: t.card,
      borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    docTitle: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 15,
    },
    docVersion: {
      color: t.textMute,
      fontFamily: FONT.body,
      fontSize: 12,
      marginTop: 2,
    },
    docChevron: {
      color: t.textMute,
      fontSize: 24,
      fontFamily: FONT.body,
    },
    checkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.xxs,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.md,
      borderWidth: 2,
      borderColor: t.textGhost,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.card,
    },
    checkboxOn: {
      backgroundColor: t.brand,
      borderColor: t.brand,
    },
    checkmark: {
      color: "#fff",
      fontSize: 14,
      fontFamily: FONT.bold,
      lineHeight: 16,
    },
    checkLabel: {
      color: t.text,
      fontFamily: FONT.body,
      fontSize: 14,
      flex: 1,
      lineHeight: 20,
    },
    error: {
      color: t.danger,
      fontFamily: FONT.medium,
      fontSize: 13,
      marginTop: SPACING.xs,
    },
    exitBtn: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    exitText: {
      color: t.textSec,
      fontFamily: FONT.semibold,
      fontSize: 15,
    },
  });
}
