// C3 — tracer das coords venosas por vista (8 células) sobre veias-8vistas-v2.png
// Estratégia: grade 2×4 (linha0=MID, linha1=MIE; cols L,A,M,P). Em cada célula,
// detecta pixels azuis (rede venosa #7FB6D8) e extrai a polilinha da VEIA DOMINANTE
// por varredura em y (mediana do x dos azuis por banda), restrita à maior banda
// vertical contígua. Emite coords + overlay vermelho para validação visual.
const fs = require("fs");
const { PNG } = require("pngjs");

const SRC = "/Users/luizprazeres/laudousgmobile-def/tmp-review/referencias-cartografia/veias-8vistas-v3.png";
const OUT_JSON = "/Users/luizprazeres/laudousgmobile-def/tmp-review/referencias-cartografia/coords-8vistas-v2.json";
const OUT_OVERLAY = "/Users/luizprazeres/laudousgmobile-def/tmp-review/referencias-cartografia/coords-overlay-v2.png";

const png = PNG.sync.read(fs.readFileSync(SRC));
const { width: W, height: H, data } = png;
console.log("img", W, H);

// --- grade das células ---
const COLS = ["lateral", "anterior", "medial", "posterior"];
const ROWS = ["direito", "esquerdo"]; // MID = direito, MIE = esquerdo
const colW = Math.floor(W / 4);
const rowH = Math.floor(H / 2);
// margem de topo para pular o rótulo de texto da célula (preto). ~110px na escala 3072.
const LABEL_PAD = 120;

function isBlue(r, g, b) {
  // #7FB6D8 ≈ (127,182,216). Veia azul clara, distinta do contorno preto e do branco.
  return b - r > 30 && b > 150 && g > 120 && r < 200;
}

// mediana simples
function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Extrai a polilinha da veia dominante numa célula (x0..x1, y0..y1).
// Passo 1: por linha y, colhe os x azuis. Passo 2: agrupa em clusters por linha
// e escolhe, ao longo do eixo y, o caminho mais longo/contínuo (a veia principal).
function traceCell(x0, x1, y0, y1) {
  const STEP = 12; // amostragem vertical
  const rows = [];
  for (let y = y0; y < y1; y += STEP) {
    const xs = [];
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      if (isBlue(data[i], data[i + 1], data[i + 2])) xs.push(x);
    }
    if (!xs.length) { rows.push(null); continue; }
    // clusteriza xs (gaps > 25px separam veias distintas)
    xs.sort((a, b) => a - b);
    const clusters = [];
    let cur = [xs[0]];
    for (let k = 1; k < xs.length; k++) {
      if (xs[k] - xs[k - 1] > 25) { clusters.push(cur); cur = []; }
      cur.push(xs[k]);
    }
    clusters.push(cur);
    // guarda os centros dos clusters desta linha
    rows.push({ y, centers: clusters.map((c) => Math.round(median(c))) });
  }
  // caminho dominante: começa do 1º cluster do topo com conteúdo; a cada linha
  // segue o center mais próximo do anterior (continuidade). Escolhe o cluster
  // inicial que gera o caminho MAIS LONGO (percorre mais linhas sem quebra).
  // caminho dominante com TOLERÂNCIA A LACUNAS: linhas vazias ou saltos grandes
  // não encerram o segmento na hora — toleramos até MAX_MISS bandas seguidas
  // (tributárias leves têm gaps). Para cada cluster-inicial testamos o caminho
  // e ficamos com o que cobre mais extensão vertical.
  const MAX_MISS = 10; // ~120px de gap tolerado
  let best = [];
  const firstIdx = rows.findIndex((r) => r);
  if (firstIdx < 0) return [];
  for (let si = firstIdx; si <= firstIdx + 2 && si < rows.length; si++) {
    if (!rows[si]) continue;
    for (const startC of rows[si].centers) {
      const path = [];
      let prev = startC, miss = 0;
      for (let ri = si; ri < rows.length; ri++) {
        const r = rows[ri];
        if (!r) { if (++miss > MAX_MISS) break; else continue; }
        let bc = null, bd = Infinity;
        for (const c of r.centers) { const d = Math.abs(c - prev); if (d < bd) { bd = d; bc = c; } }
        if (bc == null || bd > 55) { if (++miss > MAX_MISS) break; else continue; }
        miss = 0;
        path.push([bc, r.y]);
        prev = bc;
      }
      // extensão vertical coberta (não só nº de pontos)
      const span = path.length ? path[path.length - 1][1] - path[0][1] : 0;
      const bestSpan = best.length ? best[best.length - 1][1] - best[0][1] : 0;
      if (span > bestSpan) best = path;
    }
  }
  return best;
}

const result = { width: W, height: H, vistas: {} };
const overlay = new PNG({ width: W, height: H });
data.copy(overlay.data);

function drawDot(x, y, r = 5) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    if (dx * dx + dy * dy > r * r) continue;
    const i = (yy * W + xx) * 4;
    overlay.data[i] = 220; overlay.data[i + 1] = 30; overlay.data[i + 2] = 30; overlay.data[i + 3] = 255;
  }
}
function drawLine(a, b) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    drawDot(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), 2);
  }
}

// C3 v1: só os troncos safenos principais que traçam de forma confiável e
// carregam os estados clínicos. Cada vista → segmento nomeado (chave do schema).
// Anterior/Lateral (tributárias/varicosidades tênues) = v2 (cartografia fina).
const SEG_BY_VIEW = {
  medial: "safena_magna",
  posterior: "safena_parva",
  anterior: "safena_acessoria_anterior", // segmento real do schema (face anterior)
  lateral: "tributaria_lateral", // provisório: sem segmento no schema → recolor ignora até v2
};
for (let rr = 0; rr < 2; rr++) {
  for (let cc = 0; cc < 4; cc++) {
    const view = COLS[cc];
    const seg = SEG_BY_VIEW[view];
    if (!seg) continue; // pula anterior/lateral (v2)
    const x0 = cc * colW, x1 = (cc + 1) * colW;
    const y0 = rr * rowH + LABEL_PAD, y1 = (rr + 1) * rowH;
    const key = `${ROWS[rr]}__${view}`;
    const path = traceCell(x0, x1, y0, y1);
    result.vistas[key] = { [seg]: path };
    const span = path.length ? path[path.length - 1][1] - path[0][1] : 0;
    console.log(key, seg, "pts", path.length, "span", span);
    for (let k = 1; k < path.length; k++) drawLine(path[k - 1], path[k]);
    for (const p of path) drawDot(p[0], p[1], 4);
  }
}

fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));
fs.writeFileSync(OUT_OVERLAY, PNG.sync.write(overlay));
console.log("escrito:", OUT_JSON, OUT_OVERLAY);
