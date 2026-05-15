import {
  GenerateRequestSchema,
  GenerateSSEEventSchema,
  type GenerateRequest,
  type GenerateSSEEvent,
} from "@laudousg/shared";
import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL ausente. Ver .env.example.");
}

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("não autenticado");
  return token;
}

export type MockScenario = "happy" | "clarify" | "blocked" | "error" | "slow";

/**
 * Faz POST /api/generate e itera sobre os eventos SSE.
 *
 * React Native NÃO tem EventSource nativo — usamos fetch com leitura
 * incremental do body como ReadableStream + parser SSE manual.
 *
 * @param mockScenario  se setado, chama /api/generate/mock (sem custo de IA)
 */
export async function* generateReportStream(
  request: GenerateRequest,
  signal?: AbortSignal,
  mockScenario?: MockScenario,
): AsyncGenerator<GenerateSSEEvent, void, void> {
  // valida o request antes de enviar (cliente)
  GenerateRequestSchema.parse(request);

  const token = await getAccessToken();
  const path = mockScenario ? "/api/generate/mock" : "/api/generate";
  const body = mockScenario
    ? { ...request, mock_scenario: mockScenario }
    : request;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`generate falhou: ${res.status} ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: eventos separados por \n\n
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      // Pula heartbeats (linhas começando com ":")
      if (raw.startsWith(":")) continue;

      // Linhas: "event: foo" + "data: {json}"
      const dataLine = raw
        .split("\n")
        .find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      const json = dataLine.slice(6);
      try {
        const ev = GenerateSSEEventSchema.parse(JSON.parse(json));
        yield ev;
      } catch (e) {
        console.warn("evento SSE inválido:", json, e);
      }
    }
  }
}
