import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { colunas } from "../data/colunas";
import { credenciaisDoEnv } from "./cliente";
import { transporteApple } from "./diario-http";
import {
  executarApple,
  INICIO_APPLE,
  PEDIDO_ANALYTICS,
  type LogApple,
  type RepositorioApple,
} from "./diario-job";
export function autorizadoCron(
  header: string | null,
  segredo: string | undefined,
): boolean {
  if (!segredo || !header) return false;
  const esperado = Buffer.from(`Bearer ${segredo}`),
    recebido = Buffer.from(header);
  return (
    esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
  );
}
export function repositorioApple(
  env: Record<string, string | undefined>,
  deadline: number,
): RepositorioApple {
  const sb = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const signal = () =>
    AbortSignal.timeout(Math.max(1, Math.min(4000, deadline - Date.now())));
  return {
    async logs() {
      const out: LogApple[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await sb
          .from("apple_fetch_log")
          .select(colunas("apple_fetch_log"))
          .gte("day", INICIO_APPLE)
          .order("day")
          .order("source")
          .order("report_key")
          .range(de, de + 999)
          .abortSignal(signal());
        if (error) throw new Error("apple_db_read_failed");
        out.push(...((data ?? []) as unknown as LogApple[]));
        if (!data || data.length < 1000) return out;
      }
    },
    async salvar(lote) {
      const { error } = await sb
        .rpc("apple_store_batch", {
          p_source: lote.source,
          p_report_key: lote.report_key,
          p_day: lote.day,
          p_status: lote.status,
          p_rows: lote.rows,
          p_report_name: lote.report_name ?? "",
          p_error_code: lote.error_code ?? null,
        })
        .abortSignal(signal());
      if (error) throw new Error("apple_db_write_failed");
    },
  };
}
export function criarCronApple(
  op: {
    env?: Record<string, string | undefined>;
    executar?: () => Promise<unknown>;
  } = {},
) {
  return async (request: Request): Promise<Response> => {
    const env = op.env ?? process.env;
    if (!autorizadoCron(request.headers.get("authorization"), env.CRON_SECRET))
      return new Response(null, { status: 404 });
    try {
      if (op.executar) return Response.json(await op.executar());
      const cred = credenciaisDoEnv("ASC_REPORTS", env);
      if (
        !cred ||
        !env.ASC_VENDOR_NUMBER ||
        !env.SUPABASE_URL ||
        !env.SUPABASE_SERVICE_ROLE_KEY
      )
        return Response.json(
          { error: "apple_not_configured" },
          { status: 503 },
        );
      const deadline = Date.now() + 50_000;
      const result = await executarApple({
        transporte: transporteApple(cred, deadline),
        repo: repositorioApple(env, deadline),
        vendor: env.ASC_VENDOR_NUMBER,
        appId: env.ASC_APP_ID ?? "6770609540",
        requestId: env.ASC_ANALYTICS_REQUEST_ID ?? PEDIDO_ANALYTICS,
        agora: new Date(),
        deadline,
      });
      return Response.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      console.warn("[apple] collection_failed");
      return Response.json(
        { error: "apple_collection_failed" },
        { status: 503 },
      );
    }
  };
}
