import { Audio, InterruptionModeAndroid } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type TranscribeResult = {
  transcript: string;
  language?: string;
};

/**
 * Pede permissão de microfone (idempotente — chamar antes de gravar).
 * Lança Error humanizado se negada.
 */
export async function ensureMicPermission(): Promise<void> {
  // Checa primeiro: se já concedida ("Ao usar o app"), NUNCA mostra diálogo de
  // novo — o Android lembra a escolha. Só re-pergunta se o usuário escolheu
  // "Somente desta vez" (expira ao fechar) ou nunca respondeu.
  const current = await Audio.getPermissionsAsync();
  if (current.granted) return;
  if (!current.canAskAgain) {
    throw new Error(
      "O microfone está bloqueado para o LaudoUSG. Abra Configurações → Apps → LaudoUSG → Permissões → Microfone e escolha \"Permitir ao usar o app\" (fica salvo para sempre).",
    );
  }
  const res = await Audio.requestPermissionsAsync();
  if (!res.granted) {
    throw new Error(
      res.canAskAgain
        ? "Permissão de microfone negada. Toque no microfone de novo e escolha \"Permitir ao usar o app\" para não perguntar mais."
        : "O microfone está bloqueado. Configurações → Apps → LaudoUSG → Permissões → Microfone → \"Permitir ao usar o app\".",
    );
  }
}

// ── Áudio pendente (recuperável): o arquivo gravado só é "esquecido" após
// transcrição bem-sucedida. Queda de internet/erro do Whisper NÃO perde o
// ditado — dá pra tentar de novo, inclusive depois de fechar o app. ──
const PENDING_AUDIO_KEY = "laudousg.pending_audio";

export type PendingAudio = { uri: string; savedAt: string };

export async function savePendingAudio(uri: string): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PENDING_AUDIO_KEY,
      JSON.stringify({ uri, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* melhor-esforço */
  }
}

export async function getPendingAudio(): Promise<PendingAudio | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_AUDIO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAudio;
    if (!parsed?.uri) return null;
    // Expira em 48h: o SO pode limpar o cache de áudio a qualquer momento —
    // melhor não oferecer recuperação de um arquivo que provavelmente já era.
    const age = Date.now() - new Date(parsed.savedAt ?? 0).getTime();
    if (!Number.isFinite(age) || age > 48 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(PENDING_AUDIO_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingAudio(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_AUDIO_KEY);
  } catch {
    /* idem */
  }
}

/**
 * Inicia uma gravação HIGH_QUALITY (m4a/aac em iOS+Android).
 * Retorna a instância — guarde em ref e passe para stopAndUpload.
 *
 * onLevel (opcional): recebe o nível de áudio REAL (0..1, via metering) a cada
 * ~120ms — alimenta o waveform do RecordingOverlay (feedback de captura, P0
 * do critique 04/07: ditar sem evidência de que o mic ouve é vale de ansiedade).
 */
export async function startRecording(
  onLevel?: (level01: number, durationMillis: number) => void,
): Promise<Audio.Recording> {
  // Audio focus exclusivo (DoNotMix): pausa a música/podcast do médico ao
  // começar a gravar e devolve ao parar — comportamento profissional padrão
  // dos apps de gravação Android. No iOS também habilita a captura.
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: false,
  });
  const { recording } = await Audio.Recording.createAsync(
    { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
    onLevel
      ? (status) => {
          if (status.isRecording && typeof status.metering === "number") {
            // metering vem em dBFS (silêncio ≈ -60..-160; fala ≈ -30..-5).
            const level = Math.min(1, Math.max(0, (status.metering + 50) / 45));
            onLevel(level, status.durationMillis ?? 0);
          }
        }
      : undefined,
    120,
  );
  return recording;
}

/** Para a gravação e devolve o URI do arquivo (sem enviar). */
export async function stopRecording(recording: Audio.Recording): Promise<string> {
  try {
    await recording.stopAndUnloadAsync();
  } finally {
    // Devolve o audio focus no Android (a música do médico volta a tocar) e
    // silencia o "talking" no iOS — mesmo se o stop falhar (P2 Dex1 05/07).
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
      () => undefined,
    );
  }
  const uri = recording.getURI();
  if (!uri) {
    throw new Error("Gravação vazia — tente segurar o microfone por mais tempo.");
  }
  return uri;
}

/** Envia um arquivo de áudio já gravado para o Whisper. Pode ser re-tentado. */
export async function uploadAudio(uri: string): Promise<TranscribeResult> {
  if (!API_URL) {
    throw new Error("Configuração ausente (EXPO_PUBLIC_API_URL).");
  }

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    throw new Error("Sessão expirada. Entre novamente para continuar ditando.");
  }

  const form = new FormData();
  // O type/name conferem com o preset HIGH_QUALITY (m4a/aac em iOS+Android).
  // Em RN o FormData aceita { uri, name, type } no lugar de Blob.
  form.append("audio", {
    uri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/transcribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // NÃO setar Content-Type manualmente — fetch monta com boundary
        // correto pra multipart/form-data.
        Accept: "application/json",
      },
      body: form,
    });
  } catch (e) {
    throw new Error(
      "Sem conexão com o servidor. Confira sua rede e tente de novo.",
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body?.error === "string" ? body.error : "";
    } catch {
      /* ignore parse errors */
    }
    throw new Error(humanizeStatus(res.status, detail));
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new Error("Resposta inválida do servidor de transcrição.");
  }

  const transcript =
    payload && typeof payload === "object" && "transcript" in payload
      ? String((payload as { transcript: unknown }).transcript ?? "")
      : "";
  const language =
    payload && typeof payload === "object" && "language" in payload
      ? String((payload as { language: unknown }).language ?? "")
      : undefined;

  if (!transcript.trim()) {
    throw new Error(
      "Não consegui ouvir nada. Aproxime o microfone e fale mais alto.",
    );
  }
  return { transcript, language };
}

/** Compat: para + envia (onboarding usa). Fluxo principal usa stop/upload separados. */
export async function stopAndUpload(
  recording: Audio.Recording,
): Promise<TranscribeResult> {
  const uri = await stopRecording(recording);
  return uploadAudio(uri);
}

function humanizeStatus(status: number, detail?: string): string {
  if (status === 401 || status === 403) {
    return "Sessão expirada. Entre novamente para continuar ditando.";
  }
  if (status === 413) {
    return "Áudio muito longo. Grave em pedaços menores.";
  }
  if (status === 415) {
    return "Formato de áudio não suportado neste dispositivo.";
  }
  if (status === 429) {
    return "Muitas transcrições seguidas. Aguarde alguns segundos.";
  }
  if (status >= 500) {
    return "Servidor de transcrição indisponível. Tente de novo em instantes.";
  }
  return detail || `Transcrição falhou (HTTP ${status}).`;
}
