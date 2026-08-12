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
  buildVenousAnnotations4,
  recolorVenousPixels,
  recolorVenousPixels4,
  VENOUS_4VIEW_COORDS,
  type MapaVenoso,
  type VenousCoords,
} from "@laudousg/schemes";
import { pushSchemaToSala } from "@/lib/api";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

// Vista ÚNICA (anterior) — asset + coords + callouts em pílula (produção atual).
const BASE_IMAGE = require("../../../assets/venous/venoso-lineart-veias.png");
const COORDS = require("../../../assets/venous/venoso-lineart-veias-coords.json") as VenousCoords;
// 4 VISTAS (8 células) — asset novo; coords vêm do pacote (@laudousg/schemes).
const BASE_IMAGE_4VIEW = require("../../../assets/venous/venous-4view.png");
const FONT_BOLD = require("../../../assets/fonts/Inter_700Bold.ttf");
const FONT_REGULAR = require("../../../assets/fonts/Inter_400Regular.ttf");
// Fonte manuscrita (Caveat, OFL) para as anotações C5 — estilo D3.
const FONT_HANDWRITING = require("../../../assets/fonts/Caveat.ttf");

const EXAM_TYPE = "VENOSO_MMII";
const EXAM_LABEL = "Doppler Venoso MMII";
const LABEL_FONT_SIZE = 30;
const SUB_FONT_SIZE = 26;
const LEGEND_FONT_SIZE = 24;
const ANN_FONT_SIZE = 64; // anotações C5 cursivas (espaço da arte 2048×3072; Caveat)
const ANN_COLOR = "#7a1f2b"; // vinho discreto (medida manuscrita)

/** asset_version que aciona o render de 4 vistas (recolorVenousPixels4). */
function is4ViewAsset(assetVersion?: string): boolean {
  return (assetVersion ?? "").startsWith("venous-4view");
}

type Props = {
  map: MapaVenoso;
  reportId: string;
  /** Do evento SSE "scheme"; decide vista única vs 4 vistas. */
  assetVersion?: string;
};

type RenderedImage =
  | { image: SkImage; error: null; changedPixels: number }
  | { image: null; error: string; changedPixels: 0 };

export function VenousSchemeView({ map, reportId, assetVersion }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { width: windowWidth } = useWindowDimensions();
  const canvasRef = useCanvasRef();
  const is4View = is4ViewAsset(assetVersion);
  const baseImage = useImage(is4View ? BASE_IMAGE_4VIEW : BASE_IMAGE);
  const labelFont = useFont(FONT_BOLD, LABEL_FONT_SIZE);
  const subFont = useFont(FONT_REGULAR, SUB_FONT_SIZE);
  const legendFont = useFont(FONT_REGULAR, LEGEND_FONT_SIZE);
  // Anotações manuscritas (C5) — fonte cursiva Caveat, maior (a arte 2048px reduz
  // muito no preview; legível no PNG exportado).
  const annFont = useFont(FONT_HANDWRITING, ANN_FONT_SIZE);
  const [sending, setSending] = useState(false);
  const [sentLabel, setSentLabel] = useState<string | null>(null);

  const sourceWidth = is4View ? VENOUS_4VIEW_COORDS.width : COORDS.width ?? 944;
  const sourceHeight = is4View ? VENOUS_4VIEW_COORDS.height : COORDS.height ?? 1666;
  const sourceAspect = sourceWidth / sourceHeight;

  const rendered = useMemo<RenderedImage>(() => {
    if (!baseImage || !labelFont || !subFont || !legendFont || !annFont) {
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
    // 4 vistas usa o motor de 8 células (recolorVenousPixels4) + coords do pacote;
    // vista única mantém o recolor + callouts em pílula de produção.
    const changedPixels = is4View
      ? recolorVenousPixels4(
          pixels,
          imageInfo.width,
          imageInfo.height,
          map,
          VENOUS_4VIEW_COORDS,
        )
      : recolorVenousPixels(
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

    // 4 vistas: anotações manuscritas (C5) ao lado do vaso, sem callouts em pílula.
    // Vista única: callouts como hoje.
    const image = is4View
      ? drawAnnotationsImage(
          recoloredImage,
          imageInfo.width,
          imageInfo.height,
          map,
          annFont,
        )
      : drawCalloutsImage(
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
        error: "Não foi possível desenhar as anotações do esquema venoso.",
        changedPixels: 0,
      };
    }

    return { image, error: null, changedPixels };
  }, [baseImage, labelFont, legendFont, map, subFont, annFont, is4View]);

  const previewWidth = Math.min(Math.max(windowWidth - 64, 220), 340);
  const previewHeight = Math.round(previewWidth / sourceAspect);
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

/**
 * Desenha as anotações manuscritas (C5) sobre o recolor de 4 vistas: cada medida
 * na margem da célula + traço-guia até o vaso. Layout vem de `buildVenousAnnotations4`
 * (compartilhado com iOS). `side` decide o alinhamento (esquerda = alinhado à
 * direita terminando em textPos; direita = alinhado à esquerda começando em textPos).
 */
function drawAnnotationsImage(
  recoloredImage: SkImage,
  width: number,
  height: number,
  map: MapaVenoso,
  annFont: SkFont,
): SkImage | null {
  const surfaceFactory = Skia.Surface as unknown as {
    MakeOffscreen?: (width: number, height: number) => ReturnType<typeof Skia.Surface.Make> | null;
    Make?: (width: number, height: number) => ReturnType<typeof Skia.Surface.Make> | null;
  };
  // Preferir a surface CPU-backed (Make): recolor e export já são CPU, então
  // evitamos a ida GPU→CPU e o contexto EGL que deixavam o preview branco no
  // Android. MakeOffscreen (GPU) fica só como fallback.
  const surface =
    surfaceFactory.Make?.(width, height) ??
    surfaceFactory.MakeOffscreen?.(width, height);
  if (!surface) return null;

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("white"));
  canvas.drawImage(recoloredImage, 0, 0);

  const layout = buildVenousAnnotations4(map, VENOUS_4VIEW_COORDS);

  const linePaint = Skia.Paint();
  linePaint.setColor(Skia.Color(ANN_COLOR));
  linePaint.setStrokeWidth(3);
  linePaint.setAntiAlias(true);

  const dotPaint = Skia.Paint();
  dotPaint.setColor(Skia.Color(ANN_COLOR));
  dotPaint.setAntiAlias(true);

  const textPaint = Skia.Paint();
  textPaint.setColor(Skia.Color(ANN_COLOR));
  textPaint.setAntiAlias(true);

  const baselineShift = ANN_FONT_SIZE / 3; // centra o texto verticalmente na âncora

  for (const label of layout.labels) {
    const [ax, ay] = label.anchor;
    const [tx, ty] = label.textPos;
    canvas.drawLine(ax, ay, tx, ty, linePaint);
    canvas.drawCircle(ax, ay, 6, dotPaint);
    const textWidth = annFont.measureText(label.texto).width;
    // side "left" = texto termina em tx (alinhado à direita); "right" = começa em tx.
    const drawX = label.side === "left" ? tx - textWidth : tx;
    canvas.drawText(label.texto, drawX, ty + baselineShift, textPaint, annFont);
  }

  // flush + snapshot CPU: garante que o desenho foi materializado e que a imagem
  // sobrevive ao cross-context do preview e do export (encodeToBase64). Sem cópia
  // CPU válida, retornamos null (erro explícito) em vez de reintroduzir a textura
  // que deixava o Canvas branco no Android.
  surface.flush();
  return surface.makeImageSnapshot().makeNonTextureImage();
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
  // Preferir a surface CPU-backed (Make): recolor e export já são CPU, então
  // evitamos a ida GPU→CPU e o contexto EGL que deixavam o preview branco no
  // Android. MakeOffscreen (GPU) fica só como fallback.
  const surface =
    surfaceFactory.Make?.(width, height) ??
    surfaceFactory.MakeOffscreen?.(width, height);
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
  surface.flush();
  return surface.makeImageSnapshot().makeNonTextureImage();
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
