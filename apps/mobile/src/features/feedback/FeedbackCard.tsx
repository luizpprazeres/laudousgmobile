import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { C, FONT, RADIUS, SPACING } from "@/ui/tokens";
import { submitFeedback, type FeedbackVerdict } from "./feedback";

/**
 * Card de avaliação do laudo (paridade iOS feedbackCard):
 * 👍 envia direto; 👎 expande comentário opcional "O que faltou?".
 * Estados idle/submitting/submitted/error; voto pode ser trocado.
 * Light fixo (C) como o resto do generate — migra no dark mode universal.
 */

type Status = "idle" | "submitting" | "submitted" | "error";

export function FeedbackCard({
  reportId,
  categoryCode,
}: {
  reportId: string;
  categoryCode: string;
}) {
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [comment, setComment] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);

  // Novo laudo → zera o card.
  useEffect(() => {
    setVerdict(null);
    setStatus("idle");
    setComment("");
    setCommentOpen(false);
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
            <Text style={styles.thumbIcon}>👍</Text>
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
            <Text style={styles.thumbIcon}>👎</Text>
          </Pressable>
        </View>
      </View>

      {commentOpen ? (
        <View style={{ gap: SPACING.xs, marginTop: SPACING.xs }}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="O que faltou? (opcional)"
            placeholderTextColor={C.textMute}
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

const styles = StyleSheet.create({
  card: {
    marginTop: SPACING.md,
    backgroundColor: C.card,
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
    color: C.text,
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
    backgroundColor: C.fill1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbOn: {
    backgroundColor: C.brandLight,
  },
  thumbOnNeg: {
    backgroundColor: C.warningBg,
  },
  thumbIcon: {
    fontSize: 18,
  },
  commentInput: {
    minHeight: 72,
    backgroundColor: C.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    color: C.text,
    fontFamily: FONT.body,
    fontSize: 14,
    textAlignVertical: "top",
  },
  sendBtn: {
    minHeight: 42,
    borderRadius: RADIUS.lg,
    backgroundColor: C.brand,
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
    color: C.brandDeep,
    fontFamily: FONT.medium,
    fontSize: 12.5,
  },
  statusErr: {
    marginTop: SPACING.xs,
    color: C.danger,
    fontFamily: FONT.medium,
    fontSize: 12.5,
  },
});
