import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  AlphaType,
  Canvas,
  ColorType,
  Image as SkiaImage,
  ImageFormat,
  Skia,
  useCanvasRef,
  useImage,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  recolorVenousPixels,
  type MapaVenoso,
  type VenousCoords,
} from "@laudousg/schemes";
import { pushSchemaToSala } from "@/lib/api";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

const BASE_IMAGE = require("../../../assets/venous/venoso-lineart-veias.png");
const COORDS = require("../../../assets/venous/venoso-lineart-veias-coords.json") as VenousCoords;

const EXAM_TYPE = "VENOSO_MMII";
const EXAM_LABEL = "Doppler Venoso MMII";
const SOURCE_WIDTH = COORDS.width ?? 944;
const SOURCE_HEIGHT = COORDS.height ?? 1666;
const SOURCE_ASPECT = SOURCE_WIDTH / SOURCE_HEIGHT;

type Props = {
  map: MapaVenoso;
  reportId: string;
};

type RenderedImage =
  | { image: SkImage; error: null; changedPixels: number }
  | { image: null; error: string; changedPixels: 0 };

export function VenousSchemeView({ map, reportId }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { width: windowWidth } = useWindowDimensions();
  const canvasRef = useCanvasRef();
  const baseImage = useImage(BASE_IMAGE);
  const [sending, setSending] = useState(false);
  const [sentLabel, setSentLabel] = useState<string | null>(null);

  const rendered = useMemo<RenderedImage>(() => {
    if (!baseImage) {
      return { image: null, error: "Carregando imagem-base…", changedPixels: 0 };
    }

    const imageInfo = {
      width: baseImage.width(),
      height: baseImage.height(),
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };
    const rawPixels = baseImage
      .makeNonTextureImage()
      .readPixels(0, 0, imageInfo);

    if (!rawPixels || rawPixels instanceof Float32Array) {
      return {
        image: null,
        error: "Não foi possível ler os pixels do esquema venoso.",
        changedPixels: 0,
      };
    }

    const pixels = new Uint8Array(rawPixels);
    const changedPixels = recolorVenousPixels(
      pixels,
      imageInfo.width,
      imageInfo.height,
      map,
      COORDS,
    );
    const image = Skia.Image.MakeImage(
      imageInfo,
      Skia.Data.fromBytes(pixels),
      imageInfo.width * 4,
    );

    if (!image) {
      return {
        image: null,
        error: "Não foi possível montar o PNG do esquema venoso.",
        changedPixels: 0,
      };
    }
    return { image, error: null, changedPixels };
  }, [baseImage, map]);

  const previewWidth = Math.min(Math.max(windowWidth - 64, 220), 340);
  const previewHeight = Math.round(previewWidth / SOURCE_ASPECT);
  const canSend = !!rendered.image && !sending;

  async function sendToSala() {
    if (!rendered.image || sending) return;
    setSending(true);
    setSentLabel(null);
    try {
      const png = rendered.image.encodeToBase64(ImageFormat.PNG);
      const result = await pushSchemaToSala({
        reportId,
        examType: EXAM_TYPE,
        examLabel: EXAM_LABEL,
        png,
      });
      setSentLabel(result.replaced ? "Esquema atualizado na sala" : "Esquema enviado à sala");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao enviar esquema.";
      Alert.alert("Não foi possível enviar", message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cartografia venosa</Text>
          <Text style={styles.subtitle}>
            {rendered.image
              ? rendered.changedPixels > 0
                ? "Mapa recolorido pelo achado estruturado"
                : "Mapa sem alteração patológica detectada"
              : rendered.error}
          </Text>
        </View>
      </View>

      <View style={styles.previewWrap}>
        {rendered.image ? (
          <Canvas
            ref={canvasRef}
            style={{ width: previewWidth, height: previewHeight }}
          >
            <SkiaImage
              image={rendered.image}
              x={0}
              y={0}
              width={previewWidth}
              height={previewHeight}
              fit="contain"
            />
          </Canvas>
        ) : (
          <View
            style={[
              styles.loading,
              { width: previewWidth, height: Math.min(previewHeight, 360) },
            ]}
          >
            <ActivityIndicator color={t.brand} />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={sendToSala}
          disabled={!canSend}
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          accessibilityRole="button"
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>Enviar à sala</Text>
          )}
        </Pressable>
        {sentLabel ? <Text style={styles.sentText}>{sentLabel}</Text> : null}
      </View>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    card: {
      marginTop: 18,
      marginBottom: 18,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.separator,
      backgroundColor: t.card,
      padding: 14,
      gap: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    title: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 15,
    },
    subtitle: {
      marginTop: 3,
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 12.5,
    },
    previewWrap: {
      alignItems: "center",
      overflow: "hidden",
      borderRadius: 10,
      backgroundColor: "#fff",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.sep2,
      paddingVertical: 10,
    },
    loading: {
      alignItems: "center",
      justifyContent: "center",
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    sendBtn: {
      minHeight: 40,
      borderRadius: 10,
      backgroundColor: t.brand,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: {
      opacity: 0.55,
    },
    sendBtnText: {
      color: "#fff",
      fontFamily: FONT.semibold,
      fontSize: 13.5,
    },
    sentText: {
      color: t.textSec,
      fontFamily: FONT.medium,
      fontSize: 12.5,
    },
  });
}
