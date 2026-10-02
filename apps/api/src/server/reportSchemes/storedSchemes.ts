/**
 * Esquemas visuais que o médico enviou à Sala, reabertos no histórico do laudo.
 *
 * O que o banco guarda hoje (`sala_schemas`) é só a IMAGEM enviada: PNG/PDF em
 * base64, rótulo e `report_id`. Nenhum dado estruturado do desenho (miomas
 * FIGO, MapaVenoso, marcadores de tireoide/mama) é persistido — por isso a
 * reabertura é somente leitura. Reabrir o EDITOR exige o contrato descrito em
 * `docs/parity/2026-10-02-historico-esquemas-persistencia.md`.
 */

export type StoredSchemeRow = {
  id: unknown;
  exam_type: unknown;
  exam_label: unknown;
  png_base64: unknown;
  updated_at: unknown;
};

export type StoredScheme = {
  id: string;
  exam_type: string;
  exam_label: string;
  png_base64: string;
  width: number;
  height: number;
  updated_at: string;
};

const PNG_SIGNATURE = "89504e470d0a1a0a";
const MAX_SIDE = 16_384;

/** Lê largura/altura do cabeçalho IHDR; `null` se não for um PNG íntegro. */
export function pngSize(base64: string): { width: number; height: number } | null {
  // 24 bytes = assinatura (8) + tamanho/tipo do chunk (8) + largura/altura (8).
  const head = Buffer.from(base64.slice(0, 44), "base64");
  if (head.length < 24) return null;
  if (head.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) return null;
  if (head.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  const width = head.readUInt32BE(16);
  const height = head.readUInt32BE(20);
  if (!width || !height || width > MAX_SIDE || height > MAX_SIDE) return null;
  return { width, height };
}

/** Falha fechado por linha: imagem ilegível não é exibida como se fosse esquema. */
export function toStoredSchemes(rows: StoredSchemeRow[]): StoredScheme[] {
  return rows
    .flatMap((row) => {
      if (typeof row.id !== "string" || typeof row.exam_type !== "string") return [];
      if (typeof row.png_base64 !== "string" || typeof row.updated_at !== "string") return [];
      const size = pngSize(row.png_base64);
      if (!size) return [];
      return [{
        id: row.id,
        exam_type: row.exam_type,
        exam_label: typeof row.exam_label === "string" && row.exam_label.trim() ? row.exam_label.trim() : row.exam_type,
        png_base64: row.png_base64,
        width: size.width,
        height: size.height,
        updated_at: row.updated_at,
      }];
    })
    .sort((a, b) => a.exam_type.localeCompare(b.exam_type));
}
