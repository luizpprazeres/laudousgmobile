import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { openai } from "@/server/ai/openai";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// Modelo de ASR env-gated: default whisper-1 (comportamento atual).
// TRANSCRIBE_MODEL=gpt-4o-mini-transcribe na Vercel para pilotar o modelo
// novo (WER menor, mais rápido; suporta prompt mas NÃO language/temperature).
const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL ?? "whisper-1";

// Whisper NÃO segue instruções no prompt — ele imita o ESTILO do texto
// (cookbook oficial). Então o prompt é um trecho de ditado-exemplo com o
// vocabulário da casa e o estilo de medida/pontuação que queremos.
// Limite: 224 tokens (whisper-1 ignora silenciosamente o excedente).
const MEDICAL_STYLE_PROMPT =
  "Fígado com esteatose hepática leve, hepatomegalia discreta. Vesícula biliar com colelitíase, sem colecistite. Litíase renal à direita, cálculo no terço médio do ureter, hidronefrose leve, pelve renal e cálices preservados. Nódulo hipoecoico, sólido, medindo 1,8 x 1,2 cm, com sombra acústica posterior e reforço acústico. Ecogenicidade e ecotextura preservadas. Útero em anteversoflexão, miométrio homogêneo, endométrio medindo 0,8 cm, ovários e anexos sem alterações. Tireoide com nódulo isoecogênico, TI-RADS 3. Mama com BI-RADS 2. Próstata, testículos e bolsa escrotal sem alterações. Linfonodos de aspecto habitual. Doppler colorido com índice de resistividade normal, artéria umbilical, MMII, veia safena magna sem refluxo, sem trombose venosa profunda, bilateral, à direita, à esquerda.";

// Alucinações conhecidas do Whisper em trechos de silêncio (viés do corpus
// de legendas de vídeo — gh openai/whisper#928). Nunca fariam parte de um
// ditado de laudo, então é seguro remover.
const ASR_HALLUCINATION_PATTERNS: RegExp[] = [
  /legend\w*\s+(feitas?\s+)?(pela\s+)?comunidade\s+amara\.?org\S*/gi,
  /(tradu[çc][ãa]o|legendad\w+|legendas?)\s+(por|pela|de)\s+[^.\n]{0,40}amara\.?org\S*/gi,
  /amara\.?org\S*/gi,
  /obrigad[oa]\s+por\s+assistir\w*/gi,
  /n[ãa]o\s+(se\s+)?esque[çc]am?\s+de\s+(se\s+)?inscrever[^.\n]{0,40}/gi,
  /inscreva-se\s+no\s+canal[^.\n]{0,40}/gi,
  /curta\s+e\s+compartilhe[^.\n]{0,40}/gi,
  /at[ée]\s+o\s+pr[óo]ximo\s+v[íi]deo\w*/gi,
];

function stripAsrHallucinations(text: string): {
  clean: string;
  removed: number;
} {
  let removed = 0;
  let clean = text;
  for (const pattern of ASR_HALLUCINATION_PATTERNS) {
    clean = clean.replace(pattern, () => {
      removed++;
      return " ";
    });
  }
  // Sobras de pontuação/espaço onde as frases foram removidas.
  clean = clean
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;!?])/g, "$1")
    .replace(/([.,;!?])\s*[.,;!?]+/g, "$1")
    .replace(/^[\s.,;!?]+/, "")
    .trim();
  return { clean, removed };
}

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
    const isWhisper = TRANSCRIBE_MODEL === "whisper-1";
    const transcription = await openai().audio.transcriptions.create(
      {
        file: audio,
        model: TRANSCRIBE_MODEL,
        prompt: MEDICAL_STYLE_PROMPT,
        response_format: "json",
        // language/temperature só existem no whisper-1; os gpt-4o-transcribe
        // detectam idioma sozinhos (o prompt em pt-BR ancora o idioma).
        ...(isWhisper ? { language: "pt", temperature: 0 } : {}),
      },
      { signal: req.signal },
    );

    const raw = transcription.text?.trim() ?? "";
    const { clean, removed } = stripAsrHallucinations(raw);
    if (removed > 0) {
      console.log(
        `[transcribe] ${removed} frase(s) de alucinação ASR removida(s)`,
        { model: TRANSCRIBE_MODEL, rawLength: raw.length, cleanLength: clean.length },
      );
    }

    return json({
      transcript: clean,
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
