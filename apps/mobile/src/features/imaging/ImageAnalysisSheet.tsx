import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Sheet } from "@/ui/Sheet";
import { FONT, RADIUS, SPACING, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import {
  analyzeImages,
  canAnalyzeCategory,
  formatBiometric,
  type ImagingCategory,
} from "./imageAnalysis";

/**
 * Análise de imagem de USG (port do ImageAnalysisSheet iOS, v1 = galeria):
 * escolhe até 3 imagens → extrai biometria/Doppler via /api/analyze-image →
 * insere o bloco formatado nos achados. Câmera fica para a v2 (anotado).
 */

const MAX_IMAGES = 3;

type Picked = { uri: string; base64: string };

export function ImageAnalysisSheet({
  open,
  onClose,
  categoryId,
  onInsert,
  sharedUris,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  onInsert: (text: string) => void;
  /** Imagens vindas do share do sistema (WhatsApp/galeria → LaudoUSG).
   *  Quando presentes, são carregadas automaticamente ao abrir. */
  sharedUris?: string[];
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [images, setImages] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supported = canAnalyzeCategory(categoryId);

  // Carrega as imagens compartilhadas (share intent) quando o sheet abre.
  // Lê o arquivo do cache como base64 — mesma validação de tamanho do picker.
  useEffect(() => {
    if (!open || !sharedUris || sharedUris.length === 0) return;
    let alive = true;
    (async () => {
      const picked: Picked[] = [];
      let rejected = 0;
      for (const raw of sharedUris.slice(0, MAX_IMAGES)) {
        const uri = raw.startsWith("file://") || raw.startsWith("content://")
          ? raw
          : `file://${raw}`;
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (base64.length > MAX_BASE64_BYTES) {
            rejected++;
            continue;
          }
          picked.push({ uri, base64 });
        } catch {
          rejected++;
        }
      }
      if (!alive) return;
      if (rejected > 0) {
        setError(
          rejected === 1
            ? "1 imagem compartilhada não pôde ser usada (muito grande ou ilegível)."
            : `${rejected} imagens compartilhadas não puderam ser usadas.`,
        );
      }
      setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sharedUris]);

  // Limite do backend: ~5 MB por imagem (~7 MB em base64). Validar ANTES de
  // subir — sem isso o médico espera minutos para tomar 413 (review Dex1).
  const MAX_BASE64_BYTES = 7_000_000;

  async function pick() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.7,
      base64: true,
      exif: false,
    });
    if (result.canceled) return;
    const picked: Picked[] = [];
    let rejected = 0;
    for (const a of result.assets) {
      if (!a.base64) continue;
      if (a.base64.length > MAX_BASE64_BYTES) {
        rejected++;
        continue;
      }
      picked.push({ uri: a.uri, base64: a.base64 });
    }
    if (rejected > 0) {
      setError(
        rejected === 1
          ? "1 imagem passou de 5 MB e foi descartada — use a foto direto da tela do aparelho."
          : `${rejected} imagens passaram de 5 MB e foram descartadas — use fotos direto da tela do aparelho.`,
      );
    }
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  }

  function removeAt(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function analyze() {
    if (!supported || images.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setProgress(`Analisando 1 de ${images.length}…`);
    try {
      const results = await analyzeImages(
        images.map((i) => i.base64),
        categoryId as ImagingCategory,
        (done, total) =>
          setProgress(
            done < total ? `Analisando ${done + 1} de ${total}…` : "Formatando…",
          ),
      );
      const text = formatBiometric(results, categoryId as ImagingCategory);
      if (!text.trim()) {
        setError(
          "Não encontrei medidas nas imagens. Use fotos da tela do aparelho com a biometria visível.",
        );
        return;
      }
      onInsert(text + "\n\n");
      setImages([]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao analisar as imagens.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Analisar imagem de USG" height={480}>
      <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.sm }}>
        <Text style={styles.help}>
          Envie até {MAX_IMAGES} fotos da tela do aparelho (biometria, Doppler).
          As medidas extraídas entram direto nos achados.
        </Text>

        {!supported ? (
          <Text style={styles.error}>
            Disponível para Obstétrica, Doppler obstétrico e Morfológico.
          </Text>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: SPACING.xs }}>
            {images.map((img, i) => (
              <View key={img.uri} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
                <Pressable
                  onPress={() => removeAt(i)}
                  style={styles.thumbRemove}
                  hitSlop={8}
                  accessibilityLabel="Remover imagem"
                >
                  <Text style={styles.thumbRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {images.length < MAX_IMAGES && supported ? (
              <Pressable onPress={pick} style={styles.addBox} disabled={busy}>
                <Text style={styles.addPlus}>+</Text>
                <Text style={styles.addLabel}>Galeria</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={analyze}
          disabled={!supported || images.length === 0 || busy}
          style={[
            styles.analyzeBtn,
            (!supported || images.length === 0 || busy) && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
        >
          {busy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.analyzeText}>{progress ?? "Analisando…"}</Text>
            </View>
          ) : (
            <Text style={styles.analyzeText}>Analisar e inserir</Text>
          )}
        </Pressable>

        <Text style={styles.footnote}>
          Pode levar até 40 s por imagem. Não use fotos com dados do paciente.
        </Text>
      </View>
    </Sheet>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    help: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 13.5,
      lineHeight: 19,
    },
    thumbWrap: {
      position: "relative",
    },
    thumb: {
      width: 92,
      height: 92,
      borderRadius: RADIUS.lg,
      backgroundColor: t.fill1,
    },
    thumbRemove: {
      position: "absolute",
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.text,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbRemoveText: {
      color: t.bg,
      fontSize: 11,
      fontFamily: FONT.bold,
    },
    addBox: {
      width: 92,
      height: 92,
      borderRadius: RADIUS.lg,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: t.textGhost,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    addPlus: {
      color: t.textSec,
      fontSize: 22,
      fontFamily: FONT.semibold,
      lineHeight: 24,
    },
    addLabel: {
      color: t.textMute,
      fontSize: 11.5,
      fontFamily: FONT.medium,
    },
    analyzeBtn: {
      minHeight: 46,
      borderRadius: RADIUS.xl,
      backgroundColor: t.brand,
      alignItems: "center",
      justifyContent: "center",
      marginTop: SPACING.xs,
    },
    analyzeText: {
      color: "#fff",
      fontFamily: FONT.semibold,
      fontSize: 15,
    },
    error: {
      color: t.danger,
      fontFamily: FONT.medium,
      fontSize: 13,
    },
    footnote: {
      color: t.textMute,
      fontFamily: FONT.body,
      fontSize: 11.5,
      textAlign: "center",
    },
  });
}
