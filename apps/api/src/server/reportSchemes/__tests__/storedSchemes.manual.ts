import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { REPORT_SCHEMES_MAX_BYTES, budgetStoredSchemes, pngSize, toStoredSchemes, type StoredScheme } from "../storedSchemes";

/** PNG mínimo e válido (RGB, branco), gerado aqui — sem dado de paciente. */
function png(width: number, height: number): string {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height, 0xff);
  for (let y = 0; y < height; y++) raw[y * (width * 3 + 1)] = 0;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]).toString("base64");
}

const myoma = png(820, 560);
assert.deepEqual(pngSize(myoma), { width: 820, height: 560 }, "lê dimensões do PNG canônico de miomas");
assert.equal(pngSize(""), null);
assert.equal(pngSize(Buffer.from("%PDF-1.7 não é png nem esquema").toString("base64")), null, "PDF/lixo não vira imagem");
assert.equal(pngSize(png(1, 1).slice(0, 20)), null, "base64 truncado falha fechado");

const rows = toStoredSchemes([
  { id: "b", exam_type: "VENOSO_MMII", exam_label: "Cartografia venosa", png_base64: png(40, 60), updated_at: "2026-10-02T10:00:00.000Z" },
  { id: "a", exam_type: "MIOMAS", exam_label: "  ", png_base64: myoma, updated_at: "2026-10-02T09:00:00.000Z" },
  { id: "x", exam_type: "MAMA", exam_label: "Mamas", png_base64: "isto não é png", updated_at: "2026-10-02T09:00:00.000Z" },
  { id: 7, exam_type: "TIREOIDE", exam_label: "Tireoide", png_base64: myoma, updated_at: "2026-10-02T09:00:00.000Z" },
]);
assert.deepEqual(rows.map((row) => row.id), ["a", "b"], "linhas inválidas somem; ordem estável por tipo");
assert.equal(rows[0]!.exam_label, "MIOMAS", "rótulo vazio cai no tipo, nunca em texto inventado");
assert.deepEqual({ w: rows[1]!.width, h: rows[1]!.height }, { w: 40, h: 60 });
assert.equal(rows[0]!.png_base64, myoma, "imagem devolvida byte a byte, sem reprocessar");

// Orçamento da resposta: nunca passa de 4,5 MB e nunca some sem aviso.
const VERCEL_LIMIT = 4_500_000;
assert.ok(REPORT_SCHEMES_MAX_BYTES + 1_000 < VERCEL_LIMIT, "orçamento + envelope abaixo do limite da Vercel");
const heavy = (id: string, examType: string, chars: number): StoredScheme => ({
  id, exam_type: examType, exam_label: examType, png_base64: myoma + "A".repeat(chars), width: 820, height: 560, updated_at: "2026-10-02T09:00:00.000Z",
});
const maxPush = 2_800_000; // MAX_B64 aceito em push-schema
const twoBig = budgetStoredSchemes([heavy("m", "MIOMAS", maxPush), heavy("v", "VENOSO_MMII", maxPush), heavy("t", "TIREOIDE", 1_000)]);
assert.deepEqual(twoBig.schemes.map((item) => item.id), ["m", "t"], "o que não cabe é pulado; o menor seguinte ainda entra");
assert.deepEqual({ truncated: twoBig.truncated, omitted: twoBig.omitted }, { truncated: true, omitted: 1 });
const body = Buffer.byteLength(JSON.stringify(twoBig), "utf8");
assert.ok(body <= VERCEL_LIMIT, `corpo final ${body} bytes`);

const single = budgetStoredSchemes([heavy("g", "MAMA", 50)], 100);
assert.deepEqual({ n: single.schemes.length, truncated: single.truncated, omitted: single.omitted }, { n: 0, truncated: true, omitted: 1 }, "esquema único grande demais: sinalizado, não vira lista vazia muda");

const fits = budgetStoredSchemes(rows);
assert.deepEqual({ n: fits.schemes.length, truncated: fits.truncated, omitted: fits.omitted }, { n: 2, truncated: false, omitted: 0 });
assert.deepEqual(budgetStoredSchemes([]), { schemes: [], truncated: false, omitted: 0 });
console.log("stored report schemes: OK");
