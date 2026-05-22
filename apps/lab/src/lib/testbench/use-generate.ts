"use client";

import { useCallback, useRef, useState } from "react";
import type { GenerateRequest, RagBlockSummary, SSEEvent } from "./sse-types";

export type GenerationStatus = "idle" | "running" | "done" | "error";

export type GenerationState = {
  status: GenerationStatus;
  text: string;
  reportId: string | null;
  retrieved: RagBlockSummary[];
  warning: { code: string; message?: string } | null;
  error: { code: string; message: string } | null;
  sanityIssuesCount: number;
  startedAt: number | null;
  finishedAt: number | null;
  firstTokenAt: number | null;
};

const INITIAL: GenerationState = {
  status: "idle",
  text: "",
  reportId: null,
  retrieved: [],
  warning: null,
  error: null,
  sanityIssuesCount: 0,
  startedAt: null,
  finishedAt: null,
  firstTokenAt: null,
};

function parseEventBlock(block: string): SSEEvent | null {
  const dataLines = block
    .split("\n")
    .filter((l) => l.startsWith("data: "))
    .map((l) => l.slice(6));
  if (dataLines.length === 0) return null;
  const payload = dataLines.join("\n");
  try {
    return JSON.parse(payload) as SSEEvent;
  } catch {
    return null;
  }
}

export function useGenerate() {
  const [state, setState] = useState<GenerationState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const run = useCallback(async (req: GenerateRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL, status: "running", startedAt: Date.now() });

    let res: Response;
    try {
      res = await fetch("/api/testbench/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({ ...s, status: "error", error: { code: "NETWORK", message: (err as Error).message } }));
      return;
    }

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      setState((s) => ({
        ...s,
        status: "error",
        error: { code: `HTTP_${res.status}`, message: detail.slice(0, 200) || res.statusText },
      }));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const event = parseEventBlock(part);
          if (!event) continue;
          setState((s) => applyEvent(s, event));
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setState((s) => ({
          ...s,
          status: "error",
          error: { code: "STREAM", message: (err as Error).message },
        }));
      }
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => (s.status === "running" ? { ...s, status: "idle" } : s));
  }, []);

  return { state, run, reset, cancel };
}

function applyEvent(state: GenerationState, event: SSEEvent): GenerationState {
  switch (event.type) {
    case "open":
      return { ...state, reportId: event.report_id };
    case "rag":
      return { ...state, retrieved: event.blocks_summary ?? [] };
    case "warning":
      return { ...state, warning: { code: event.code, message: event.message } };
    case "token": {
      const next = state.text + event.delta;
      return {
        ...state,
        text: next,
        firstTokenAt: state.firstTokenAt ?? Date.now(),
      };
    }
    case "sanity":
      return { ...state, sanityIssuesCount: event.result.issues?.length ?? 0 };
    case "done":
      return {
        ...state,
        status: "done",
        text: event.final_text || state.text,
        reportId: event.report_id,
        finishedAt: Date.now(),
      };
    case "error":
      return {
        ...state,
        status: "error",
        error: { code: event.code, message: event.message },
        finishedAt: Date.now(),
      };
    default:
      return state;
  }
}
