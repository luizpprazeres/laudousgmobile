import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { openai } from "@/server/ai/openai";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * /api/transcribe — proxy batch para Whisper.
 *
 * MVP path: cliente envia áudio (multipart) e recebe transcript (Whisper batch).
 * Próxima sessão: WS upgrade + Deepgram Nova-3 streaming.
 *
 * Por que proxy: chaves de IA NUNCA devem sair do servidor.
 */
export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "invalid_multipart" }, 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return json({ error: "missing_audio", field: "audio" }, 400);
  }

  if (audio.size <= 0) {
    return json({ error: "empty_audio" }, 400);
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return json(
      {
        error: "audio_too_large",
        max_bytes: MAX_AUDIO_BYTES,
      },
      413,
    );
  }

  try {
    const transcription = await openai().audio.transcriptions.create(
      {
        file: audio,
        model: "whisper-1",
        language: "pt",
        prompt:
          "Transcrição em português do Brasil de ditado médico para laudo de ultrassonografia. Glossário comum: litíase renal, cálculo renal, esteatose hepática, hepatomegalia, vesícula biliar, colelitíase, cálices renais, pelve renal, hidronefrose, hiperecoica, hipoecoica, anecoica, isoecogênica, ecogenicidade, parenquimatosa, miométrio, endométrio, ovário, anexo, útero, próstata, testículo, escrotal, tireoide, parótida, submandibular, linfonodo, nódulo, cisto, FIGO, BI-RADS, ITB, Doppler colorido, arterial, venoso, MMII, sombra acústica, reforço acústico, direito, esquerdo, bilateral. Preserve medidas e pontuação.",
        response_format: "json",
      },
      { signal: req.signal },
    );

    return json({
      transcript: transcription.text?.trim() ?? "",
      language: "pt",
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return json({ error: "request_aborted" }, 499);
    }

    console.error("transcribe failed:", err);
    return json({ error: "transcription_failed" }, 502);
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
