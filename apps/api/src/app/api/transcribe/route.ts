import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { openai } from "@/server/ai/openai";
import { ALL_MEDICAL_ASR_KEYTERMS } from "@/server/asr/medicalGlossary";
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
// (cookbook oficial). GOTCHA descoberto em produção 05/07: prompt com
// FRASES COMPLETAS de laudo era ECOADO pelo modelo em áudio silencioso
// ("Tireoide com nódulo isoecogênico" repetido no app do Luiz). Por isso:
// (1) o prompt é um GLOSSÁRIO de termos (echo vira lista distinta, fácil
// de detectar), e (2) stripPromptEcho() remove qualquer trecho longo do
// transcript que seja cópia literal do prompt.
// Limite: 224 tokens (whisper-1 ignora silenciosamente o excedente).
const LEGACY_WHISPER_KEYTERMS = [
  "esteatose hepática",
  "hepatomegalia",
  "colecistite",
  "litíase renal",
  "hidronefrose",
  "pelve renal",
  "cálices",
  "ureter",
  "isoecogênico",
  "sombra acústica posterior",
  "reforço acústico",
  "anteversoflexão",
  "miométrio",
  "endométrio",
  "ovários",
  "anexos",
  "tireoide",
  "próstata",
  "testículos",
  "bolsa escrotal",
  "linfonodos",
  "índice de resistividade",
  "artéria umbilical",
  "MMII",
  "trombose venosa profunda",
  "medindo 1,8 x 1,2 cm",
  "bilateral",
  "à direita",
  "à esquerda",
] as const;

const MEDICAL_STYLE_PROMPT = `Glossário: ${[
  ...new Set([...LEGACY_WHISPER_KEYTERMS, ...ALL_MEDICAL_ASR_KEYTERMS]),
].join(", ")}.`;

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

// Normaliza para comparação de echo: minúsculas, sem acentos, espaço único
// e NÚMEROS viram "#" — o modelo ecoa o prompt VARIANDO os dígitos (caso
// real 06/07: glossário "medindo 1,8 x 1,2 cm" ecoado como "medindo 18 x
// 12 cm"), então o match precisa ser cego a números.
function normalizeForEcho(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0-9]+([.,][0-9]+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

const PROMPT_NORMALIZED = normalizeForEcho(MEDICAL_STYLE_PROMPT);

// Remove (a) frases que são cópia literal do prompt (echo em silêncio) e
// (b) repetições consecutivas da mesma frase (loop clássico do Whisper).
// Limiares conservadores: ditado real curto ("esteatose hepática") tem <25
// chars e NÃO é removido; echo real vem em sequências longas.
function stripPromptEchoAndLoops(text: string): {
  clean: string;
  removed: number;
} {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  const kept: string[] = [];
  let removed = 0;
  let prevNorm = "";
  for (const sentence of sentences) {
    const norm = normalizeForEcho(sentence.replace(/[.!?]+$/, ""));
    if (norm.length >= 25 && PROMPT_NORMALIZED.includes(norm)) {
      removed++; // echo literal do prompt
      continue;
    }
    if (norm.length >= 15 && norm === prevNorm) {
      removed++; // frase idêntica consecutiva = loop
      continue;
    }
    prevNorm = norm;
    kept.push(sentence);
  }
  return { clean: kept.join(" ").trim(), removed };
}

function stripAsrHallucinations(text: string): {
  clean: string;
  removed: number;
} {
  const echo = stripPromptEchoAndLoops(text);
  let removed = echo.removed;
  let clean = echo.clean;
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
