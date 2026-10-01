import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Canvas,
  Image as SkiaImage,
  ImageFormat,
  PaintStyle,
  Skia,
  useFont,
  type SkCanvas,
  type SkFont,
  type SkImage,
} from "@shopify/react-native-skia";
import { pushSchemaToSala } from "@/lib/api";
import { useColorTokens } from "@/ui/useColorTokens";
import { createMyomaSalaPayload } from "./myomaSchemePayload";
import {
  canSendMyomaScheme,
  canonicalAxialPoint,
  canonicalSagittalPoint,
  FIGO_CATEGORIES,
  FIGO_FAMILY_COLORS,
  MYOMA_ECHO_LABELS,
  MYOMA_LOCATION_LABELS,
  myomaPointFromExportTouch,
  myomaFamily,
  newMyomaFinding,
  parseMyomaFindings,
  validMyomaFindings,
  type MyomaEcho,
  type MyomaFinding,
  type MyomaLocation,
} from "@laudousg/schemes/myoma";

const FONT = require("../../../assets/fonts/Inter_700Bold.ttf");
const EXPORT_WIDTH = 820;
const EXPORT_HEIGHT = 560;

function paint(color: string, stroke = false, width = 2) {
  const result = Skia.Paint();
  result.setColor(Skia.Color(color));
  result.setAntiAlias(true);
  if (stroke) {
    result.setStyle(PaintStyle.Stroke);
    result.setStrokeWidth(width);
  }
  return result;
}

function drawLabel(canvas: SkCanvas, text: string, x: number, y: number, font: SkFont, color = "#334155") {
  canvas.drawText(text, x, y, paint(color), font);
}

function drawFinding(canvas: SkCanvas, finding: MyomaFinding, x: number, y: number, scale: number, font: SkFont) {
  const radius = Math.max(11, Math.min(24, 9 + (finding.sizeMaxMm ?? 18) * 0.25)) * scale;
  const color = finding.figoConfirmed ? FIGO_FAMILY_COLORS[myomaFamily(finding.figo)] : "#64748B";
  canvas.drawCircle(x, y, radius, paint(color));
  canvas.drawCircle(x, y, radius, paint("#FFFFFF", true, 2));
  const label = finding.figoConfirmed ? String(finding.figo) : "?";
  const width = font.measureText(label).width;
  canvas.drawText(label, x - width / 2, y + 5, paint("#FFFFFF"), font);
  if (!finding.figoConfirmed) {
    canvas.drawCircle(x + radius * 0.72, y - radius * 0.72, 6, paint("#B91C1C"));
  }
}

function drawSagittal(canvas: SkCanvas, findings: MyomaFinding[], font: SkFont) {
  const ox = 44;
  const oy = 78;
  const sx = 320 / 420;
  const sy = 355 / 520;
  const map = (x: number, y: number) => ({ x: ox + x * sx, y: oy + y * sy });

  const uterus = Skia.Path.Make();
  const start = map(210, 46);
  uterus.moveTo(start.x, start.y);
  let p = map(92, 166), c1 = map(150, 46), c2 = map(96, 86);
  uterus.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(120, 286); c1 = map(90, 214); c2 = map(104, 250);
  uterus.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(176, 408); c1 = map(150, 352); c2 = map(168, 372);
  uterus.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(176, 470); uterus.lineTo(p.x, p.y);
  p = map(244, 470); c1 = map(176, 486); c2 = map(244, 486);
  uterus.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(244, 408); uterus.lineTo(p.x, p.y);
  p = map(300, 286); c1 = map(252, 372); c2 = map(270, 352);
  uterus.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(328, 166); c1 = map(316, 250); c2 = map(330, 214);
  uterus.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  c1 = map(324, 86); c2 = map(270, 46);
  uterus.cubicTo(c1.x, c1.y, c2.x, c2.y, start.x, start.y);
  uterus.close();
  canvas.drawPath(uterus, paint("#FBF7EE"));
  canvas.drawPath(uterus, paint("#B9A98C", true, 2));

  const cavity = Skia.Path.Make();
  p = map(178, 116); cavity.moveTo(p.x, p.y);
  p = map(242, 116); c1 = map(196, 104); c2 = map(224, 104);
  cavity.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(218, 226); c1 = map(248, 146); c2 = map(220, 205);
  cavity.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(210, 450); c1 = map(214, 290); c2 = map(216, 410);
  cavity.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(202, 226); c1 = map(204, 410); c2 = map(206, 290);
  cavity.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  p = map(178, 116); c1 = map(200, 205); c2 = map(172, 146);
  cavity.cubicTo(c1.x, c1.y, c2.x, c2.y, p.x, p.y);
  cavity.close();
  canvas.drawPath(cavity, paint("#E7F4EE"));
  canvas.drawPath(cavity, paint("#0F9B6E", true, 1.5));

  findings.forEach((finding) => {
    const point = finding.sagittalPoint ?? canonicalSagittalPoint(finding.figo);
    const screen = map(point.x, point.y);
    drawFinding(canvas, finding, screen.x, screen.y, 0.75, font);
  });
}

function drawAxial(canvas: SkCanvas, findings: MyomaFinding[], font: SkFont) {
  const ox = 430;
  const oy = 105;
  const sx = 330 / 560;
  const sy = 300 / 400;
  canvas.drawOval(Skia.XYWHRect(ox + 80 * sx, oy + 50 * sy, 400 * sx, 300 * sy), paint("#FBF7EE"));
  canvas.drawOval(Skia.XYWHRect(ox + 80 * sx, oy + 50 * sy, 400 * sx, 300 * sy), paint("#B9A98C", true, 2));

  const cavity = Skia.Path.Make();
  cavity.moveTo(ox + 192 * sx, oy + 196 * sy);
  cavity.cubicTo(ox + 236 * sx, oy + 188 * sy, ox + 324 * sx, oy + 188 * sy, ox + 368 * sx, oy + 196 * sy);
  cavity.cubicTo(ox + 324 * sx, oy + 212 * sy, ox + 236 * sx, oy + 212 * sy, ox + 192 * sx, oy + 196 * sy);
  cavity.close();
  canvas.drawPath(cavity, paint("#E7F4EE"));
  canvas.drawPath(cavity, paint("#0F9B6E", true, 1.5));

  findings.forEach((finding) => {
    const point = finding.axialPoint ?? canonicalAxialPoint(finding.location);
    drawFinding(canvas, finding, ox + point.x * sx, oy + point.y * sy, 0.75, font);
  });
}

function renderMyomaScheme(findings: MyomaFinding[], font: SkFont | null): SkImage | null {
  if (!font || !findings.length) return null;
  const surface = Skia.Surface.Make(EXPORT_WIDTH, EXPORT_HEIGHT) ?? Skia.Surface.MakeOffscreen(EXPORT_WIDTH, EXPORT_HEIGHT);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("#FFFFFF"));
  drawLabel(canvas, "ESQUEMA DE MIOMAS — FIGO 0–8", 28, 38, font, "#0A6E4E");
  drawLabel(canvas, "LONGITUDINAL", 142, 68, font);
  drawLabel(canvas, "TRANSVERSAL", 548, 68, font);
  canvas.drawRect(Skia.XYWHRect(24, 76, 362, 380), paint("#FAF8F4"));
  canvas.drawRect(Skia.XYWHRect(24, 76, 362, 380), paint("#E3DDD1", true, 1));
  canvas.drawRect(Skia.XYWHRect(410, 76, 386, 380), paint("#FAF8F4"));
  canvas.drawRect(Skia.XYWHRect(410, 76, 386, 380), paint("#E3DDD1", true, 1));
  drawSagittal(canvas, findings, font);
  drawAxial(canvas, findings, font);

  let legendX = 28;
  for (const family of ["submucoso", "intramural", "subseroso", "outros"] as const) {
    canvas.drawCircle(legendX + 7, 490, 7, paint(FIGO_FAMILY_COLORS[family]));
    const label = family === "submucoso" ? "FIGO 0–2 Submucosos" : family === "intramural" ? "FIGO 3–4 Intramurais" : family === "subseroso" ? "FIGO 5–7 Subserosos" : "FIGO 8 Outros";
    drawLabel(canvas, label, legendX + 20, 495, font);
    legendX += family === "submucoso" ? 205 : family === "intramural" ? 190 : 205;
  }
  drawLabel(canvas, "Esquema didático — posição aproximada. Não substitui o laudo.", 28, 535, font, "#64748B");
  surface.flush();
  return surface.makeImageSnapshot().makeNonTextureImage();
}

type Choice = { value: string; label: string };
function Choices({ choices, value, onPick }: { choices: Choice[]; value: string; onPick: (value: string) => void }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 5 }}>
    {choices.map((choice) => <Pressable key={choice.value} onPress={() => onPick(choice.value)} accessibilityRole="button" accessibilityState={{ selected: value === choice.value }} style={{ minHeight: 42, justifyContent: "center", paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: value === choice.value ? "#047857" : "#CBD5E1", backgroundColor: value === choice.value ? "#D1FAE5" : "#FFFFFF" }}>
      <Text style={{ color: "#111827", fontSize: 12 }}>{choice.label}</Text>
    </Pressable>)}
  </View>;
}

export function MyomaSchemeView({ reportId, reportText }: { reportId: string; reportText: string }) {
  const t = useColorTokens();
  const { width: windowWidth } = useWindowDimensions();
  const font = useFont(FONT, 13);
  const [open, setOpen] = useState(false);
  const [findings, setFindings] = useState<MyomaFinding[]>(() => parseMyomaFindings(reportText));
  const [selectedId, setSelectedId] = useState<string | null>(() => findings[0]?.id ?? null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const parsed = parseMyomaFindings(reportText);
    setFindings(parsed);
    setSelectedId(parsed[0]?.id ?? null);
    setStatus("");
  }, [reportId, reportText]);

  const valid = validMyomaFindings(findings);
  const stableFindings = valid ? JSON.stringify(valid) : "invalid";
  const image = useMemo(() => valid ? renderMyomaScheme(valid, font) : null, [stableFindings, font]);
  const selected = valid?.find((finding) => finding.id === selectedId) ?? valid?.[0];
  const previewWidth = Math.min(windowWidth - 48, 560);
  const previewHeight = Math.round(previewWidth * EXPORT_HEIGHT / EXPORT_WIDTH);
  const readyToSend = canSendMyomaScheme(findings) && !!image;

  function add() {
    if (findings.length >= 20) return;
    const finding = newMyomaFinding();
    setFindings([...findings, finding]);
    setSelectedId(finding.id);
    setStatus("");
  }

  function change(patch: Partial<MyomaFinding>) {
    if (!selected) return;
    const selectedId = selected.id;
    setFindings((current) => current.map((finding) => finding.id === selectedId ? { ...finding, ...patch } : finding));
    setStatus("");
  }

  function moveSelectedOnDrawing(locationX: number, locationY: number) {
    if (!selected) return;
    const exportX = locationX * EXPORT_WIDTH / previewWidth;
    const exportY = locationY * EXPORT_HEIGHT / previewHeight;
    const target = myomaPointFromExportTouch(exportX, exportY);
    if (target?.plane === "sagittal") change({ sagittalPoint: target.point });
    if (target?.plane === "axial") change({ axialPoint: target.point });
  }

  const drawingPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !!selected,
    onMoveShouldSetPanResponder: () => !!selected,
    onPanResponderGrant: (event) => moveSelectedOnDrawing(event.nativeEvent.locationX, event.nativeEvent.locationY),
    onPanResponderMove: (event) => moveSelectedOnDrawing(event.nativeEvent.locationX, event.nativeEvent.locationY),
  }), [selected?.id, previewWidth, previewHeight]);

  async function send() {
    if (!image || !readyToSend || sending) return;
    const payload = createMyomaSalaPayload({
      reportId,
      findings,
      png: image.encodeToBase64(ImageFormat.PNG),
    });
    if (!payload) {
      setStatus("Confirme a classificação FIGO de todos os nódulos antes de enviar.");
      return;
    }
    setSending(true);
    setStatus("");
    try {
      const result = await pushSchemaToSala(payload);
      setStatus(result.replaced ? "Esquema atualizado na Sala." : "Esquema enviado à Sala.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível enviar o esquema.");
    } finally {
      setSending(false);
    }
  }

  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.fill2, opacity: disabled ? 0.45 : 1 }}><Text style={{ color: t.text, fontWeight: "600" }}>{label}</Text></Pressable>;

  return <View style={{ borderRadius: 14, backgroundColor: t.card, padding: 14, marginVertical: 12 }}>
    <Text style={{ color: t.text, fontWeight: "700", fontSize: 17 }}>Esquema de miomas</Text>
    <Text style={{ color: t.textSec, fontSize: 12, marginTop: 4 }}>Editor FIGO manual. O desenho não altera o laudo e só pode ser enviado após você confirmar a categoria de cada nódulo.</Text>
    <View style={{ marginTop: 12 }}>{button(open ? "Ocultar esquema" : "Abrir esquema", () => { setOpen(!open); if (!open && findings.length === 0) add(); })}</View>
    {open ? <View style={{ marginTop: 12, gap: 10 }}>
      {image ? <View
        accessibilityLabel="Desenho de miomas. Toque ou arraste para reposicionar o nódulo selecionado."
        {...drawingPanResponder.panHandlers}
        style={{ width: previewWidth, height: previewHeight }}
      ><Canvas pointerEvents="none" style={{ width: previewWidth, height: previewHeight }}><SkiaImage image={image} x={0} y={0} width={previewWidth} height={previewHeight} fit="contain" /></Canvas></View> : <View style={{ minHeight: 120, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={t.brand} /><Text style={{ color: t.textSec }}>Preparando esquema…</Text></View>}
      {selected ? <Text style={{ color: t.textSec, fontSize: 12 }}>Toque ou arraste no corte longitudinal ou transversal para corrigir manualmente a posição do nódulo selecionado.</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{button("Adicionar nódulo", add, findings.length >= 20)}{selected ? button("Remover nódulo", () => { const next = findings.filter((finding) => finding.id !== selected.id); setFindings(next); setSelectedId(next[0]?.id ?? null); setStatus(""); }) : null}</View>
      {valid?.length ? <Choices choices={valid.map((finding, index) => ({ value: finding.id, label: `${index + 1}${finding.figoConfirmed ? "" : " · revisar FIGO"}` }))} value={selected?.id ?? ""} onPick={setSelectedId} /> : null}
      {selected ? <View style={{ gap: 4 }}>
        <Text style={{ color: t.text, fontWeight: "600" }}>Categoria FIGO — confirme manualmente</Text>
        <Choices choices={FIGO_CATEGORIES.map((category) => ({ value: String(category.figo), label: `${category.figo} · ${category.title}` }))} value={selected.figoConfirmed ? String(selected.figo) : ""} onPick={(value) => change({ figo: Number(value), figoConfirmed: true })} />
        {!selected.figoConfirmed ? <Text accessibilityRole="alert" style={{ color: "#B45309", fontSize: 12 }}>A classificação não foi inferida do texto. Escolha a categoria FIGO após conferir o laudo.</Text> : null}
        <Text style={{ color: t.text, fontWeight: "600" }}>Localização</Text>
        <Choices choices={(Object.keys(MYOMA_LOCATION_LABELS) as MyomaLocation[]).map((value) => ({ value, label: MYOMA_LOCATION_LABELS[value] }))} value={selected.location} onPick={(value) => change({ location: value as MyomaLocation })} />
        <View style={{ alignItems: "flex-start" }}>{button("Restaurar posições sugeridas", () => change({ sagittalPoint: null, axialPoint: null }))}</View>
        <Text style={{ color: t.text, fontWeight: "600" }}>Maior eixo (mm)</Text>
        <TextInput value={selected.sizeMaxMm?.toString().replace(".", ",") ?? ""} onChangeText={(value) => { const parsed = Number(value.replace(",", ".")); change({ sizeMaxMm: Number.isFinite(parsed) && parsed > 0 ? parsed : null }); }} keyboardType="decimal-pad" placeholder="Ex.: 23" placeholderTextColor={t.textMute} style={{ minHeight: 44, borderWidth: 1, borderColor: t.separator, borderRadius: 10, color: t.text, paddingHorizontal: 12, backgroundColor: t.bg }} />
        <Text style={{ color: t.text, fontWeight: "600" }}>Ecotextura</Text>
        <Choices choices={[{ value: "", label: "Não informada" }, ...(Object.keys(MYOMA_ECHO_LABELS) as MyomaEcho[]).map((value) => ({ value, label: MYOMA_ECHO_LABELS[value] }))]} value={selected.echo ?? ""} onPick={(value) => change({ echo: value ? value as MyomaEcho : null })} />
      </View> : null}
      {button(sending ? "Enviando…" : "Enviar esquema à Sala", () => Alert.alert("Conferir esquema", "Confirme a categoria FIGO e a posição de todos os nódulos antes de enviar.", [{ text: "Cancelar", style: "cancel" }, { text: "Enviar", onPress: () => { void send(); } }]), !readyToSend || sending)}
      {!readyToSend && findings.length ? <Text accessibilityRole="alert" style={{ color: "#B45309", fontSize: 12 }}>Confirme a categoria FIGO de todos os nódulos para liberar o envio.</Text> : null}
      {status ? <Text accessibilityRole="alert" style={{ color: t.textSec }}>{status}</Text> : null}
    </View> : null}
  </View>;
}
