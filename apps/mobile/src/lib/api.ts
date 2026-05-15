import {
  GenerateRequestSchema,
  GenerateSSEEventSchema,
  GenerationRunSchema,
  ReportSchema,
  type GenerateRequest,
  type GenerateSSEEvent,
  type GenerationRun,
  type Report,
} from "@laudousg/shared";
import { z } from "zod";
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

const ReportDetailResponseSchema = z.object({
  report: ReportSchema,
  latest_run: GenerationRunSchema.nullable(),
  rag_blocks: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.string(),
      title: z.string(),
      priority: z.number().int(),
    }),
  ),
});

export type ReportDetail = {
  report: Report;
  latest_run: GenerationRun | null;
  rag_blocks: Array<{
    id: string;
    kind: string;
    title: string;
    priority: number;
  }>;
};

export async function getReport(id: string): Promise<ReportDetail> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/api/reports/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`buscar laudo falhou: ${res.status} ${detail}`);
  }

  return ReportDetailResponseSchema.parse(await res.json());
}

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
