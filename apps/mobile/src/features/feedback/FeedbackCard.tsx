import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FONT, RADIUS, SPACING, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { ThumbDown, ThumbUp } from "@/ui/icons";
import { submitFeedback, type FeedbackVerdict } from "./feedback";

/**
 * Card de avaliação do laudo (paridade iOS feedbackCard, adaptado no critique
 * 04/07): ícones em vez de emoji e AMOSTRAGEM 1/5 — aparece no 1º laudo e a
 * cada 5 (decisão do Luiz: evitar fadiga no 40º laudo do dia).
 * 👍 envia direto; 👎 expande comentário opcional. Voto pode ser trocado.
 */

const SAMPLE_EVERY = 5;
const COUNTER_KEY = "laudousg.feedback_counter";

type Status = "idle" | "submitting" | "submitted" | "error";

export function FeedbackCard({
  reportId,
  categoryCode,
}: {
  reportId: string;
  categoryCode: string;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [comment, setComment] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  // Novo laudo → zera o card e decide amostragem (1º laudo e a cada 5).
  useEffect(() => {
    setVerdict(null);
    setStatus("idle");
    setComment("");
    setCommentOpen(false);
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(COUNTER_KEY);
        const count = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
        await AsyncStorage.setItem(COUNTER_KEY, String(count));
        if (active) setVisible(count % SAMPLE_EVERY === 1);
      } catch {
        if (active) setVisible(true); // sem contador confiável, mostra
      }
    })();
    return () => {
      active = false;
    };
  }, [reportId]);

  async function send(v: FeedbackVerdict, withComment?: string) {
    setVerdict(v);
    setStatus("submitting");
    try {
      await submitFeedback({
        reportId,
        categoryCode,
        verdict: v,
        comment: withComment,
      });
      setStatus("submitted");
    } catch {
      setStatus("error");
    }
  }

  function onThumbUp() {
    setCommentOpen(false);
    send("positive");
  }

  function onThumbDown() {
    // 👎 abre o comentário opcional; envia já o voto (comentário atualiza via upsert).
    setCommentOpen(true);
    send("negative", comment);
  }

  const busy = status === "submitting";

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Este laudo ajudou?</Text>
        <View style={styles.thumbRow}>
          <Pressable
            onPress={onThumbUp}
            disabled={busy}
            style={[styles.thumbBtn, verdict === "positive" && styles.thumbOn]}
            accessibilityRole="button"
            accessibilityLabel="Laudo bom"
          >
            <ThumbUp size={18} color={verdict === "positive" ? t.brandDeep : t.textSec} />
          </Pressable>
          <Pressable
            onPress={onThumbDown}
            disabled={busy}
            style={[
              styles.thumbBtn,
              verdict === "negative" && styles.thumbOnNeg,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Laudo com problemas"
          >
            <ThumbDown size={18} color={verdict === "negative" ? t.warningText : t.textSec} />
          </Pressable>
        </View>
      </View>

      {commentOpen ? (
        <View style={{ gap: SPACING.xs, marginTop: SPACING.xs }}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="O que faltou? (opcional)"
            placeholderTextColor={t.textMute}
            multiline
            style={styles.commentInput}
          />
          <Pressable
            onPress={() => send("negative", comment)}
            disabled={busy}
            style={styles.sendBtn}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Enviar feedback</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {status === "submitted" ? (
        <Text style={styles.statusOk}>Obrigado! Feedback registrado.</Text>
      ) : null}
      {status === "error" ? (
        <Text style={styles.statusErr}>
          Não foi possível enviar. Toque de novo para tentar outra vez.
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    card: {
      marginTop: SPACING.md,
      backgroundColor: t.card,
      borderRadius: RADIUS.xl,
      padding: SPACING.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACING.sm,
    },
    title: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
    thumbRow: {
      flexDirection: "row",
      gap: SPACING.xs,
    },
    thumbBtn: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.pill,
      backgroundColor: t.fill1,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbOn: {
      backgroundColor: t.brandLight,
    },
    thumbOnNeg: {
      backgroundColor: t.warningBg,
    },
    thumbIcon: {
      fontSize: 18,
    },
    commentInput: {
      minHeight: 72,
      backgroundColor: t.bg,
      borderRadius: RADIUS.lg,
      padding: SPACING.sm,
      color: t.text,
      fontFamily: FONT.body,
      fontSize: 14,
      textAlignVertical: "top",
    },
    sendBtn: {
      minHeight: 42,
      borderRadius: RADIUS.lg,
      backgroundColor: t.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnText: {
      color: "#fff",
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
    statusOk: {
      marginTop: SPACING.xs,
      color: t.brandDeep,
      fontFamily: FONT.medium,
      fontSize: 12.5,
    },
    statusErr: {
      marginTop: SPACING.xs,
      color: t.danger,
      fontFamily: FONT.medium,
      fontSize: 12.5,
    },
  });
}
