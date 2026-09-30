import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Canvas, Image as SkiaImage, ImageFormat, PaintStyle, Skia, useFont, useImage, type SkCanvas, type SkFont, type SkImage } from "@shopify/react-native-skia";
import { pushSchemaToSala } from "@/lib/api";
import { useColorTokens } from "@/ui/useColorTokens";
import { BREAST_VIEW, THYROID_VIEW, breastPoint, nextMarkerId, thyroidPoints, validMarkers, type VisualCategory, type VisualMarker } from "./visualSchemeState";

const THYROID_FRONTAL = require("../../../assets/schemes/thyroid/frontal-v2.png");
const THYROID_TRANSVERSE = require("../../../assets/schemes/thyroid/transverse-v2.png");
const BREAST_FRONTAL = require("../../../assets/schemes/breast/frontal-v5.png");
const FONT = require("../../../assets/fonts/Inter_700Bold.ttf");

type Props = { category: VisualCategory; reportId: string; markers: VisualMarker[]; onChange: (markers: VisualMarker[]) => void };
type Choice = { value: string; label: string };

function Choices({ choices, value, onPick }: { choices: Choice[]; value: string; onPick: (value: string) => void }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 4 }}>
    {choices.map((choice) => <Pressable key={choice.value} onPress={() => onPick(choice.value)} accessibilityRole="button" accessibilityState={{ selected: choice.value === value }} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: choice.value === value ? "#047857" : "#CBD5E1", backgroundColor: choice.value === value ? "#D1FAE5" : "#fff" }}>
      <Text style={{ color: "#111827", fontSize: 13 }}>{choice.label}</Text>
    </Pressable>)}
  </View>;
}

function paint(color: string, stroke = false) {
  const p = Skia.Paint();
  p.setColor(Skia.Color(color));
  p.setAntiAlias(true);
  if (stroke) { p.setStyle(PaintStyle.Stroke); p.setStrokeWidth(3); }
  return p;
}

function drawMarker(canvas: SkCanvas, x: number, y: number, marker: VisualMarker, index: number, font: SkFont) {
  const breast = marker.kind === "breast";
  const r = breast ? 25 : 10;
  const kind = marker.type;
  const black = paint("#111827");
  const white = paint("#fff");
  const outline = paint("#111827", true);
  if (kind === "calcification") {
    const path = Skia.Path.Make();
    path.moveTo(x, y - r); path.lineTo(x + r, y); path.lineTo(x, y + r); path.lineTo(x - r, y); path.close();
    canvas.drawPath(path, black);
  } else if (kind === "solid_lobulated" || kind === "solid_spiculated") {
    const path = Skia.Path.Make();
    const count = kind === "solid_spiculated" ? 32 : 48;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const radius = kind === "solid_spiculated" ? r * (i % 2 === 0 ? 1.4 : 0.8) : r * (1 + 0.2 * Math.sin(4 * angle));
      const px = x + radius * Math.cos(angle), py = y + radius * Math.sin(angle);
      if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
    }
    path.close(); canvas.drawPath(path, black);
  } else if (kind === "cyst" || kind === "cystic") {
    canvas.drawCircle(x, y, r, white); canvas.drawCircle(x, y, r, outline);
  } else {
    canvas.drawCircle(x, y, r, black);
  }
  canvas.drawText(String(index + 1), x - (breast ? 8 : 4), y - r - (breast ? 14 : 8), black, font);
}

function drawAsset(canvas: SkCanvas, image: SkImage, x: number, y: number, width: number, height: number) {
  canvas.drawImageRect(image, Skia.XYWHRect(0, 0, image.width(), image.height()), Skia.XYWHRect(x, y, width, height), Skia.Paint());
}

function renderScheme(category: VisualCategory, markers: VisualMarker[], frontal: SkImage | null, transverse: SkImage | null, breast: SkImage | null, font: SkFont | null): SkImage | null {
  if (!font || (category === "TIREOIDE" && (!frontal || !transverse)) || (category === "MAMARIA" && !breast)) return null;
  const size = category === "TIREOIDE" ? THYROID_VIEW : BREAST_VIEW;
  const surface = Skia.Surface.Make(size.width, size.height) ?? Skia.Surface.MakeOffscreen(size.width, size.height);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("white"));
  if (category === "TIREOIDE") {
    drawAsset(canvas, frontal!, 30, 38, 340, 330);
    drawAsset(canvas, transverse!, 395, 65, 340, 226);
    const ink = paint("#111827");
    canvas.drawText("VISTA FRONTAL", 145, 28, ink, font);
    canvas.drawText("VISTA TRANSVERSA", 490, 28, ink, font);
    canvas.drawText("LOBO DIREITO", 95, 386, ink, font);
    canvas.drawText("LOBO ESQUERDO", 210, 386, ink, font);
    canvas.drawText("DIREITO", 455, 315, ink, font);
    canvas.drawText("ESQUERDO", 610, 315, ink, font);
  } else drawAsset(canvas, breast!, 0, 0, BREAST_VIEW.width, BREAST_VIEW.anatomyHeight);
  markers.forEach((marker, index) => {
    if (marker.kind === "thyroid") {
      thyroidPoints(marker).forEach(({ x, y }) => drawMarker(canvas, x, y, marker, index, font));
    } else {
      const { x, y } = breastPoint(marker);
      drawMarker(canvas, x, y, marker, index, font);
    }
  });
  surface.flush();
  return surface.makeImageSnapshot().makeNonTextureImage();
}

export function AnatomicalSchemeView({ category, reportId, markers, onChange }: Props) {
  const t = useColorTokens();
  const { width: windowWidth } = useWindowDimensions();
  const frontal = useImage(THYROID_FRONTAL);
  const transverse = useImage(THYROID_TRANSVERSE);
  const breast = useImage(BREAST_FRONTAL);
  const font = useFont(FONT, category === "TIREOIDE" ? 13 : 27);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const valid = validMarkers(category, markers);
  const image = useMemo(() => valid ? renderScheme(category, valid, frontal, transverse, breast, font) : null, [category, valid === null ? null : JSON.stringify(valid), frontal, transverse, breast, font]);
  const selected = valid?.find((marker) => marker.id === selectedId) ?? valid?.[valid.length - 1];
  const size = category === "TIREOIDE" ? THYROID_VIEW : BREAST_VIEW;
  const previewWidth = Math.min(windowWidth - 48, category === "TIREOIDE" ? 520 : 520);
  const previewHeight = Math.round(previewWidth * size.height / size.width);

  function add() {
    if (!valid || valid.length >= 20) return;
    const id = nextMarkerId(valid);
    const marker: VisualMarker = category === "TIREOIDE"
      ? { id, kind: "thyroid", side: "direito", third: "medio", type: "solid" }
      : { id, kind: "breast", side: "direita", type: "solid", hour: 12, nippleDistanceCm: 3 };
    onChange([...valid, marker]); setSelectedId(id); setStatus("");
  }

  function change(patch: Partial<VisualMarker>) {
    if (!valid || !selected) return;
    const next = valid.map((marker) => marker.id === selected.id ? { ...marker, ...patch } as VisualMarker : marker);
    if (validMarkers(category, next)) { onChange(next); setStatus(""); }
  }

  async function send() {
    if (!image || !valid?.length || sending) return;
    setSending(true); setStatus("");
    try {
      const result = await pushSchemaToSala({ reportId, examType: category === "TIREOIDE" ? "TIREOIDE" : "MAMA", examLabel: category === "TIREOIDE" ? "Esquema de tireoide" : "Esquema de mamas e axilas", png: image.encodeToBase64(ImageFormat.PNG) });
      setStatus(result.replaced ? "Esquema atualizado na Sala." : "Esquema enviado à Sala.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível enviar o esquema.");
    } finally { setSending(false); }
  }

  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.fill2, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: t.text, fontWeight: "600" }}>{label}</Text></Pressable>;

  return <View style={{ borderRadius: 14, backgroundColor: t.card, padding: 14, marginVertical: 12 }}>
    <Text style={{ color: t.text, fontWeight: "700", fontSize: 17 }}>{category === "TIREOIDE" ? "Esquema de tireoide" : "Esquema de mamas e axilas"}</Text>
    <Text style={{ color: t.textSec, fontSize: 12, marginTop: 4 }}>Marcação visual manual. Não altera o texto do laudo; confira tipo e posição antes de enviar.</Text>
    <View style={{ marginTop: 12 }}>{button(open ? "Ocultar esquema" : "Abrir esquema", () => setOpen(!open))}</View>
    {open ? <View style={{ marginTop: 12, gap: 10 }}>
      {image ? <Canvas style={{ width: previewWidth, height: previewHeight }}><SkiaImage image={image} x={0} y={0} width={previewWidth} height={previewHeight} fit="contain" /></Canvas> : <View style={{ height: 100, justifyContent: "center" }}><ActivityIndicator color={t.brand} /><Text style={{ color: t.textSec }}>Preparando base anatômica…</Text></View>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{button("Adicionar marcador", add, !valid || valid.length >= 20)}{selected ? button("Remover marcador", () => { onChange(valid!.filter((marker) => marker.id !== selected.id)); setSelectedId(null); setStatus(""); }) : null}</View>
      {valid?.length ? <Choices choices={valid.map((marker, index) => ({ value: String(marker.id), label: String(index + 1) }))} value={String(selected?.id ?? "")} onPick={(value) => setSelectedId(Number(value))} /> : <Text style={{ color: t.textSec }}>Sem marcadores. Adicione apenas achados que você conferiu.</Text>}
      {selected?.kind === "thyroid" ? <View>
        <Text style={{ color: t.text, fontWeight: "600" }}>Lobo</Text>
        <Choices choices={[{ value: "direito", label: "Direito" }, { value: "esquerdo", label: "Esquerdo" }, { value: "istmo", label: "Istmo" }]} value={selected.side} onPick={(side) => change({ side: side as typeof selected.side, third: side === "istmo" ? null : selected.third ?? "medio" })} />
        {selected.side !== "istmo" ? <><Text style={{ color: t.text, fontWeight: "600" }}>Terço</Text><Choices choices={[{ value: "superior", label: "Superior" }, { value: "medio", label: "Médio" }, { value: "inferior", label: "Inferior" }]} value={selected.third ?? "medio"} onPick={(third) => change({ third: third as "superior" | "medio" | "inferior" })} /></> : null}
        <Text style={{ color: t.text, fontWeight: "600" }}>Símbolo</Text>
        <Choices choices={[{ value: "solid", label: "Sólido" }, { value: "cystic", label: "Cístico" }, { value: "calcification", label: "Calcificação" }]} value={selected.type} onPick={(type) => change({ type: type as typeof selected.type })} />
      </View> : null}
      {selected?.kind === "breast" ? <View>
        <Text style={{ color: t.text, fontWeight: "600" }}>Mama</Text>
        <Choices choices={[{ value: "direita", label: "Direita" }, { value: "esquerda", label: "Esquerda" }]} value={selected.side} onPick={(side) => change({ side: side as typeof selected.side })} />
        <Text style={{ color: t.text, fontWeight: "600" }}>Símbolo</Text>
        <Choices choices={[{ value: "solid", label: "Nódulo" }, { value: "cyst", label: "Cisto" }, { value: "solid_lobulated", label: "Lobulado" }, { value: "solid_spiculated", label: "Espiculado" }, { value: "calcification", label: "Calcificação" }]} value={selected.type} onPick={(type) => change({ type: type as typeof selected.type })} />
        <Text style={{ color: t.text, fontWeight: "600" }}>Posição: {selected.hour} h · {selected.nippleDistanceCm.toFixed(1).replace(".", ",")} cm do mamilo</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>{button("− 1 h", () => change({ hour: selected.hour === 1 ? 12 : selected.hour - 1 }))}{button("+ 1 h", () => change({ hour: selected.hour === 12 ? 1 : selected.hour + 1 }))}{button("− 0,5 cm", () => change({ nippleDistanceCm: Math.max(0, selected.nippleDistanceCm - 0.5) }))}{button("+ 0,5 cm", () => change({ nippleDistanceCm: Math.min(6, selected.nippleDistanceCm + 0.5) }))}</View>
      </View> : null}
      {button(sending ? "Enviando…" : "Enviar esquema à Sala", () => Alert.alert("Conferir esquema", "Este desenho é independente do texto do laudo. Confirme os marcadores antes de enviar à Sala.", [{ text: "Cancelar", style: "cancel" }, { text: "Enviar", onPress: () => { void send(); } }]), !image || !valid?.length || sending)}
      {status ? <Text accessibilityRole="alert" style={{ color: t.textSec }}>{status}</Text> : null}
    </View> : null}
  </View>;
}
