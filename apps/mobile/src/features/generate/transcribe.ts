import { Audio } from "expo-av";
import { Platform } from "react-native";
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
  const res = await Audio.requestPermissionsAsync();
  if (!res.granted) {
    throw new Error(
      "Permissão de microfone negada. Abra Configurações do app e conceda acesso ao microfone para ditar.",
    );
  }
}

/**
 * Inicia uma gravação HIGH_QUALITY (m4a/aac em iOS+Android).
 * Retorna a instância — guarde em ref e passe para stopAndUpload.
 */
export async function startRecording(): Promise<Audio.Recording> {
  if (Platform.OS === "ios") {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  }
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  return recording;
}

/**
 * Para a gravação e faz upload para POST /api/transcribe.
 * Retorna { transcript, language? } do Whisper batch.
 *
 * Lança Error humanizado em qualquer falha (sem permissão, áudio vazio,
 * sem rede, 4xx/5xx do backend).
 */
export async function stopAndUpload(
  recording: Audio.Recording,
): Promise<TranscribeResult> {
  if (!API_URL) {
    throw new Error("Configuração ausente (EXPO_PUBLIC_API_URL).");
  }

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  if (!uri) {
    throw new Error("Gravação vazia — tente segurar o microfone por mais tempo.");
  }

  // Restaura modo de áudio padrão (silencia o "talking" no iOS).
  if (Platform.OS === "ios") {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
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
