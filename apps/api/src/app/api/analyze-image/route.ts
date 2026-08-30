import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import { analyzeImage, type AnalyzeImageResult } from "@/server/vision/client";
import type { Category, ImagingModule } from "@/server/vision/types";
import { SUPPORTED_IMAGING_CATEGORIES } from "@/server/vision/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vision API pode levar 20-40s quando há leitura Doppler especializada. Dá folga.
export const maxDuration = 90;

const MAX_BATCH = 5;
// ~5 MB original = ~7 MB em base64
const MAX_BASE64_BYTES = 7_000_000;

type SingleInput = {
  imageBase64: string;
  category: Category;
  gemelar?: boolean;
  modules?: ImagingModule[];
};

async function analyzeImageWithRetry(
  params: SingleInput,
  maxRetries = 1,
): Promise<AnalyzeImageResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeImage(params);
    } catch (err: unknown) {
      lastError = err;
      const e = err as { status?: number; code?: string; message?: string };
      const isTransient =
        e?.status === 503 ||
        e?.code === "ETIMEDOUT" ||
        e?.message?.includes("fetch failed") ||
        e?.message?.includes("network");
      if (!isTransient || attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isValidCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    SUPPORTED_IMAGING_CATEGORIES.includes(value as Category)
  );
}

function isValidModules(value: unknown): value is ImagingModule[] {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((module) => module === "DOPPLER_OBSTETRICO"))
  );
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // MODO BATCH
  if (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { images?: unknown }).images)
  ) {
    const images = (body as { images: unknown[] }).images;

    if (images.length > MAX_BATCH) {
      return json(
        { error: `Máximo de ${MAX_BATCH} imagens por requisição.` },
        400,
      );
    }

    for (const img of images) {
      if (!img || typeof img !== "object") {
        return json({ error: "invalid_image_entry" }, 400);
      }
      const entry = img as { imageBase64?: unknown; category?: unknown; modules?: unknown };
      if (typeof entry.imageBase64 !== "string" || !entry.imageBase64) {
        return json({ error: "imageBase64 obrigatório em cada imagem." }, 400);
      }
      if (!isValidCategory(entry.category)) {
        return json(
          { error: `category inválida. Aceitos: ${SUPPORTED_IMAGING_CATEGORIES.join(", ")}` },
          400,
        );
      }
      if (!isValidModules(entry.modules)) {
        return json({ error: "modules inválidos." }, 400);
      }
      if (entry.imageBase64.length > MAX_BASE64_BYTES) {
        return json({ error: "Imagem muito grande. Tamanho máximo: 5 MB." }, 413);
      }
    }

    const typedImages = images as SingleInput[];
    const settled = await Promise.allSettled(
      typedImages.map((img, index) =>
        analyzeImageWithRetry({
          imageBase64: img.imageBase64,
          category: img.category,
          gemelar: img.gemelar,
          modules: img.modules,
        })
          .then(({ data, model }) => ({
            success: true as const,
            data,
            model,
            index,
          }))
          .catch((err: unknown) => ({
            success: false as const,
            error: err instanceof Error ? err.message : "Erro ao analisar imagem.",
            index,
          })),
      ),
    );

    const results = settled.map((r) =>
      r.status === "fulfilled" ? r.value : r.reason,
    );

    return json({ success: true, results });
  }

  // MODO SINGLE
  const single = body as Partial<SingleInput>;

  if (!single.imageBase64 || !single.category) {
    return json(
      { error: "Campos obrigatórios ausentes: imageBase64 e category" },
      400,
    );
  }

  if (!isValidCategory(single.category)) {
    return json(
      { error: `category inválida. Aceitos: ${SUPPORTED_IMAGING_CATEGORIES.join(", ")}` },
      400,
    );
  }
  if (!isValidModules(single.modules)) {
    return json({ error: "modules inválidos." }, 400);
  }

  if (single.imageBase64.length > MAX_BASE64_BYTES) {
    return json({ error: "Imagem muito grande. Tamanho máximo: 5 MB." }, 413);
  }

  try {
    const { data, model } = await analyzeImageWithRetry({
      imageBase64: single.imageBase64,
      category: single.category,
      gemelar: single.gemelar,
      modules: single.modules,
    });

    // Detecta resposta vazia
    const isEmpty =
      !data ||
      Object.keys(data).length === 0 ||
      Object.values(data).every((v) => !v);
    if (isEmpty) {
      return json({
        success: true,
        data: {},
        model,
        empty: true,
        message: "Nenhum dado biométrico identificado na imagem.",
      });
    }

    return json({ success: true, data, model });
  } catch (err: unknown) {
    console.error("[/api/analyze-image]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao analisar imagem. Tente novamente.";
    return json({ success: false, error: message }, 500);
  }
}
