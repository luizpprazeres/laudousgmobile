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
  PaintStyle,
  Skia,
  useCanvasRef,
  useFont,
  useImage,
  type SkCanvas,
  type SkFont,
  type SkImage,
} from "@shopify/react-native-skia";
import {
  buildVenousCallouts,
  recolorVenousPixels,
  type MapaVenoso,
  type VenousCoords,
} from "@laudousg/schemes";
import { pushSchemaToSala } from "@/lib/api";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

const BASE_IMAGE = require("../../../assets/venous/venoso-lineart-veias.png");
const COORDS = require("../../../assets/venous/venoso-lineart-veias-coords.json") as VenousCoords;
const FONT_BOLD = require("../../../assets/fonts/Inter_700Bold.ttf");
const FONT_REGULAR = require("../../../assets/fonts/Inter_400Regular.ttf");

const EXAM_TYPE = "VENOSO_MMII";
const EXAM_LABEL = "Doppler Venoso MMII";
const SOURCE_WIDTH = COORDS.width ?? 944;
const SOURCE_HEIGHT = COORDS.height ?? 1666;
const SOURCE_ASPECT = SOURCE_WIDTH / SOURCE_HEIGHT;
const LABEL_FONT_SIZE = 30;
const SUB_FONT_SIZE = 26;
const LEGEND_FONT_SIZE = 24;

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
  const labelFont = useFont(FONT_BOLD, LABEL_FONT_SIZE);
  const subFont = useFont(FONT_REGULAR, SUB_FONT_SIZE);
  const legendFont = useFont(FONT_REGULAR, LEGEND_FONT_SIZE);
  const [sending, setSending] = useState(false);
  const [sentLabel, setSentLabel] = useState<string | null>(null);

  const rendered = useMemo<RenderedImage>(() => {
    if (!baseImage || !labelFont || !subFont || !legendFont) {
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
    const recoloredImage = Skia.Image.MakeImage(
      imageInfo,
      Skia.Data.fromBytes(pixels),
      imageInfo.width * 4,
    );

    if (!recoloredImage) {
      return {
        image: null,
        error: "Não foi possível montar o PNG do esquema venoso.",
        changedPixels: 0,
      };
    }

    const image = drawCalloutsImage(
      recoloredImage,
      imageInfo.width,
      imageInfo.height,
      map,
      labelFont,
      subFont,
      legendFont,
    );

    if (!image) {
      return {
        image: null,
        error: "Não foi possível desenhar os callouts do esquema venoso.",
        changedPixels: 0,
      };
    }

    return { image, error: null, changedPixels };
  }, [baseImage, labelFont, legendFont, map, subFont]);

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

function drawCalloutsImage(
  recoloredImage: SkImage,
  width: number,
  height: number,
  map: MapaVenoso,
  labelFont: SkFont,
  subFont: SkFont,
  legendFont: SkFont,
): SkImage | null {
  const surfaceFactory = Skia.Surface as unknown as {
    MakeOffscreen?: (width: number, height: number) => ReturnType<typeof Skia.Surface.Make> | null;
    Make?: (width: number, height: number) => ReturnType<typeof Skia.Surface.Make> | null;
  };
  const surface =
    surfaceFactory.MakeOffscreen?.(width, height) ??
    surfaceFactory.Make?.(width, height);
  if (!surface) return null;

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("white"));
  canvas.drawImage(recoloredImage, 0, 0);

  const layout = buildVenousCallouts(map, COORDS);
  const fillPaint = Skia.Paint();
  fillPaint.setColor(Skia.Color("white"));
  fillPaint.setAlphaf(0.96);

  const shadowPaint = Skia.Paint();
  shadowPaint.setColor(Skia.Color("black"));
  shadowPaint.setAlphaf(0.1);

  const borderPaint = Skia.Paint();
  borderPaint.setColor(Skia.Color("#D0D5DD"));
  borderPaint.setStyle(PaintStyle.Stroke);
  borderPaint.setStrokeWidth(1);

  const subPaint = Skia.Paint();
  subPaint.setColor(Skia.Color("#667085"));

  for (const card of layout.cards) {
    const { rect, color } = card;
    const accent = rgb(color);
    const accentPaint = Skia.Paint();
    accentPaint.setColor(Skia.Color(accent));
    accentPaint.setStrokeWidth(3);
    accentPaint.setAntiAlias(true);

    const labelPaint = Skia.Paint();
    labelPaint.setColor(Skia.Color(accent));
    labelPaint.setAntiAlias(true);

    const shadowRect = Skia.RRectXY(
      Skia.XYWHRect(rect.x, rect.y + 4, rect.w, rect.h),
      16,
      16,
    );
    const pillRect = Skia.RRectXY(
      Skia.XYWHRect(rect.x, rect.y, rect.w, rect.h),
      16,
      16,
    );
    canvas.drawRRect(shadowRect, shadowPaint);
    canvas.drawRRect(pillRect, fillPaint);
    canvas.drawRRect(pillRect, borderPaint);

    const midY = rect.y + rect.h / 2;
    const edgeX = card.side === "left" ? rect.x + rect.w : rect.x;
    canvas.drawLine(edgeX, midY, card.anchor[0], card.anchor[1], accentPaint);
    canvas.drawCircle(card.anchor[0], card.anchor[1], 5, accentPaint);

    const textX = rect.x + 14;
    const maxTextWidth = rect.w - 28;
    canvas.drawText(
      fitText(card.label, labelFont, maxTextWidth),
      textX,
      rect.y + 38,
      labelPaint,
      labelFont,
    );
    if (card.sub) {
      canvas.drawText(
        fitText(card.sub, subFont, maxTextWidth),
        textX,
        rect.y + 72,
        subPaint,
        subFont,
      );
    }
  }

  drawLegend(canvas, layout.legend, width, height, legendFont);
  return surface.makeImageSnapshot();
}

function drawLegend(
  canvas: SkCanvas,
  legend: ReturnType<typeof buildVenousCallouts>["legend"],
  width: number,
  height: number,
  font: SkFont,
) {
  if (legend.length === 0) return;
  const itemGap = 30;
  const square = 18;
  const textGap = 8;
  const itemWidths = legend.map(
    (item) => square + textGap + measureText(item.label, font),
  );
  const totalWidth =
    itemWidths.reduce((sum, itemWidth) => sum + itemWidth, 0) +
    itemGap * Math.max(0, legend.length - 1);
  let x = Math.max(12, (width - totalWidth) / 2);
  const y = height - 48;

  const textPaint = Skia.Paint();
  textPaint.setColor(Skia.Color("#667085"));
  textPaint.setAntiAlias(true);

  for (let index = 0; index < legend.length; index += 1) {
    const item = legend[index]!;
    const colorPaint = Skia.Paint();
    colorPaint.setColor(Skia.Color(rgb(item.color)));
    colorPaint.setAntiAlias(true);
    canvas.drawRect(Skia.XYWHRect(x, y - square + 4, square, square), colorPaint);
    canvas.drawText(item.label, x + square + textGap, y, textPaint, font);
    x += itemWidths[index]! + itemGap;
  }
}

function rgb(color: [number, number, number]) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function fitText(text: string, font: SkFont, maxWidth: number) {
  if (measureText(text, font) <= maxWidth) return text;
  const ellipsis = "…";
  let candidate = text;
  while (candidate.length > 1) {
    candidate = candidate.slice(0, -1);
    if (measureText(`${candidate}${ellipsis}`, font) <= maxWidth) {
      return `${candidate}${ellipsis}`;
    }
  }
  return ellipsis;
}

function measureText(text: string, font: SkFont) {
  const measured = font.measureText(text);
  return measured.width;
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
