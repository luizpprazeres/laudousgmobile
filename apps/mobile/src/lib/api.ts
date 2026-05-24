import {
  GenerateRequestSchema,
  GenerateSSEEventSchema,
  GenerationRunSchema,
  ProfileSchema,
  ReportSchema,
  type GenerateRequest,
  type GenerateSSEEvent,
  type GenerationRun,
  type Profile,
  type Report,
} from "@/shared";
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

const AnalyticsResponseSchema = z.object({
  total_reports: z.number().int(),
  reports_last_7d: z.number().int(),
  reports_last_30d: z.number().int(),
  avg_latency_ms: z.number().int().nullable(),
  top_categories: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      count: z.number().int(),
    }),
  ),
  total_cost_usd: z.number(),
  edits_ratio: z.number(),
});

export type MeAnalytics = z.infer<typeof AnalyticsResponseSchema>;

const ProfileResponseSchema = z.object({
  profile: ProfileSchema,
});

export type UpdateProfileInput = {
  name?: string | null;
  default_writing_style_id?: string | null;
};

async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
}

async function readJsonOrThrow(res: Response, label: string) {
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`${label} falhou: ${res.status} ${detail}`);
  }
  return res.json();
}

export async function getReport(id: string): Promise<ReportDetail> {
  const res = await authedFetch(`/api/reports/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  return ReportDetailResponseSchema.parse(
    await readJsonOrThrow(res, "buscar laudo"),
  );
}

export async function getMeAnalytics(): Promise<MeAnalytics> {
  const res = await authedFetch("/api/me/analytics", {
    method: "GET",
    headers: { accept: "application/json" },
  });
  return AnalyticsResponseSchema.parse(
    await readJsonOrThrow(res, "buscar analytics"),
  );
}

export async function getMeProfile(): Promise<Profile> {
  const res = await authedFetch("/api/me/profile", {
    method: "GET",
    headers: { accept: "application/json" },
  });
  return ProfileResponseSchema.parse(
    await readJsonOrThrow(res, "buscar perfil"),
  ).profile;
}

export async function updateMeProfile(input: UpdateProfileInput): Promise<Profile> {
  const res = await authedFetch("/api/me/profile", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(input),
  });
  return ProfileResponseSchema.parse(
    await readJsonOrThrow(res, "salvar perfil"),
  ).profile;
}

// ============================================
// Sala do Auxiliar — pareamento + push automático
// ============================================

export type SalaPairing = {
  code: string;
  expiresAt: string;
  salaUrl: string;
  salaShortUrl: string;
};

const SalaPairingSchema = z.object({
  code: z.string(),
  expiresAt: z.string(),
  salaUrl: z.string().url(),
  salaShortUrl: z.string().url(),
});

export async function generateSalaPairing(): Promise<SalaPairing> {
  const res = await authedFetch("/api/sala/pair/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: "{}",
  });
  return SalaPairingSchema.parse(await readJsonOrThrow(res, "gerar pareamento da sala"));
}

export async function revokeSalaPairing(): Promise<number> {
  const res = await authedFetch("/api/sala/revoke", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: "{}",
  });
  const data = (await readJsonOrThrow(res, "revogar pareamento da sala")) as { revoked?: number };
  return data.revoked ?? 0;
}

export async function pushReportToSala(reportId: string): Promise<void> {
  const res = await authedFetch("/api/sala/push", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ reportId }),
  });
  if (!res.ok) {
    // Push é fire-and-forget — log mas não bloqueia geração de laudo
    console.warn(`[mobile] push pra sala falhou: ${res.status}`);
  }
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
