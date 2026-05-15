import type { GenerateSSEEvent } from "@laudousg/shared";

/**
 * Helper de SSE para Next.js App Router.
 *
 * Recomendações do codex já incorporadas:
 *  - runtime "nodejs" (definir na route.ts)
 *  - heartbeat a cada 15s para manter conexão viva atrás de proxies
 *  - respeitar AbortSignal do request (cliente fechou? abortar OpenAI)
 *  - persistência parcial em generation_runs no caller, antes do done
 */

const enc = new TextEncoder();

export type SseEmitter = {
  emit: (ev: GenerateSSEEvent) => void;
  close: () => void;
};

export type SseRunner = (emit: SseEmitter, signal: AbortSignal) => Promise<void>;

const HEARTBEAT_MS = 15_000;

export function sseResponse(runner: SseRunner): Response {
  // ac fica fora do start() pra que cancel() consiga abortar quando o
  // cliente fecha a conexão (fix codex review T4-#1).
  const ac = new AbortController();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const emit = (ev: GenerateSSEEvent) => {
        const line = `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
        safeEnqueue(enc.encode(line));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      // heartbeat: comentário SSE (não dispara handler no cliente)
      const heartbeat = setInterval(() => {
        if (closed) return;
        safeEnqueue(enc.encode(`: hb ${Date.now()}\n\n`));
      }, HEARTBEAT_MS);

      try {
        await runner({ emit, close }, ac.signal);
      } catch (err) {
        // AbortError vem do próprio ac.abort() em cancel() — não emitir como erro
        if ((err as Error).name === "AbortError") {
          // nada — cliente já desconectou, controller pode estar fechado
        } else {
          emit({
            type: "error",
            ts: new Date().toISOString(),
            code: "PIPELINE_FAILURE",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        clearInterval(heartbeat);
        close();
      }
    },
    cancel() {
      // Cliente fechou a conexão. Propaga aborto pro runner que está aguardando
      // OpenAI/Supabase — caso contrário OpenAI continua streaming e queimando
      // tokens depois do app abandonar a tela.
      closed = true;
      ac.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no", // desliga buffering do nginx/proxies
    },
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}
