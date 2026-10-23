/**
 * Allowlist de colunas que o painel pode ler — e a lista de colunas PROIBIDAS (texto clínico ou
 * dado pessoal). Toda leitura do banco passa por `colunas(tabela)`; um teste garante que nenhuma
 * coluna proibida entra aqui, e outro varre as views `admin_*` das migrações.
 */

export const COLUNAS_PROIBIDAS = [
  // texto clínico / conteúdo do laudo
  "raw_input",
  "consolidated_transcript",
  "structured_findings",
  "generated_output",
  "final_output",
  "output_text",
  "system_message_full",
  "structured_output",
  "structured_input",
  "validator_result",
  "rag_blocks_retrieved",
  "rag_blocks_skipped",
  "rag_blocks_used",
  "rag_query_text",
  "sanity_result",
  "sanity_output",
  "generation_metadata",
  "error_message",
  "comment",
  "metadata",
  "payload",
  "transcript",
  "content",
  "text",
  // dado pessoal
  "email",
  "name",
  "crm",
  "phone",
] as const;

const PROIBIDAS = new Set<string>(COLUNAS_PROIBIDAS);

export const SELECOES = {
  landing_daily: ["day", "path", "event", "src", "ref_host", "utm_source", "utm_campaign", "device", "count"],
  apple_sales_daily: ["day", "product_type", "country", "device", "app_version", "currency", "units", "proceeds"],
  apple_subscription_daily: ["day", "product_id", "country", "device", "paid", "trials", "billing_retry", "grace"],
  apple_subscription_events_daily: ["day", "product_id", "event", "country", "device", "quantity"],
  apple_analytics_daily: ["day", "report_name", "processing_date", "country", "device", "app_version", "source_type", "event", "page_type", "counts", "duration_seconds"],
  apple_fetch_log: ["source", "report_key", "day", "status", "rows", "fetched_at", "error_code"],
  profiles: ["id", "created_at", "plan", "role", "onboarding_completed_at"],
  reports: ["user_id", "category_code", "created_at"],
  categories: ["code", "label"],
  generation_audit: [
    "user_id",
    "category",
    "model_writer",
    "openai_input_tokens",
    "openai_output_tokens",
    "openai_cost_usd",
    "error_code",
    "error_stage",
    "created_at",
    "total_duration_ms",
    "structurer_duration_ms",
    "writer_duration_ms",
  ],
  generation_runs: ["outcome", "created_at"],
  subscriptions: ["environment", "product_id", "status", "is_trial", "expires_at", "user_id"],
  // Convites (story cortesias, migração 20261023120000). Nome e e-mail vêm do Supabase Auth, não daqui.
  cortesias: ["id", "user_id", "tier", "origem", "inicio", "fim", "revogada_em", "created_at"],
  user_feedback: ["verdict", "created_at"],
  product_events: ["surface"],
  // Tabelas da FASE 2 (feat/admin-dados, migração 20261022010003). Só existem depois do GO G3.
  ai_usage_events: [
    "created_at",
    "user_id",
    "route",
    "stage",
    "provider",
    "model",
    "input_tokens",
    "cached_input_tokens",
    "output_tokens",
    "audio_seconds",
    "cost_usd",
    "measurement",
    "ok",
    "error_code",
    "surface",
  ],
  iap_notifications: [
    "notification_uuid",
    "received_at",
    "notification_type",
    "subtype",
    "environment",
    "product_id",
    "offer_type",
    "auto_renew_status",
    "user_id",
  ],
  iap_notification_attempts: ["notification_uuid", "received_at", "result"],
  // Instagram F1 (migração 20261022212039_admin_social).
  social_posts: [
    "id",
    "scheduled_at",
    "format",
    "caption",
    "hashtags",
    "alt_text",
    "status",
    "manual",
    "interaction",
    "pillar",
    "angle",
    "title",
    "notes",
    "attempts",
    "last_error",
    "permalink",
    "published_at",
    "updated_at",
    // F3 (migração 20261022225129_admin_social_f3): instante em que o media_publish foi pedido.
    "publish_requested_at",
  ],
  social_media_items: ["post_id", "position", "storage_path", "public_url", "slide_text", "visual_brief", "alt_text"],
  // Instagram F2: só as colunas da tela. O envelope do token (token_ciphertext) fica fora da allowlist
  // e só é lido por lib/social/conta.ts (lerComToken), para publicar.
  // F3: datas e motivo da renovação automática (sem token).
  social_accounts: [
    "ig_user_id",
    "username",
    "token_expires_at",
    "connected_at",
    "token_issued_at",
    "token_refreshed_at",
    "token_refresh_failed_at",
    "token_refresh_error",
  ],
} as const satisfies Record<string, readonly string[]>;

export type TabelaPermitida = keyof typeof SELECOES;

export function colunaProibida(coluna: string): boolean {
  const c = coluna.trim().toLowerCase();
  return PROIBIDAS.has(c);
}

/** Lista de colunas para `.select()`; lança erro se alguém incluir coluna proibida. */
export function colunas(tabela: TabelaPermitida): string {
  const lista = SELECOES[tabela] as readonly string[];
  const ruins = lista.filter(colunaProibida);
  if (ruins.length) throw new Error(`Coluna proibida no painel (${tabela}): ${ruins.join(", ")}`);
  return lista.join(",");
}

/**
 * Verifica o SQL de uma migração: toda `create [or replace] view admin_*` não pode expor coluna
 * proibida (nem `select *`). Devolve os problemas encontrados.
 */
export function auditarViewsAdmin(sql: string): { view: string; problema: string }[] {
  const problemas: { view: string; problema: string }[] = [];
  const re = /create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?(admin_[a-z0-9_]+)([\s\S]*?);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const view = m[1] ?? "?";
    const corpo = (m[2] ?? "").replace(/--[^\n]*/g, " ");
    if (/select\s+\*/i.test(corpo) || /\.\*/.test(corpo)) problemas.push({ view, problema: "usa select *" });
    const tokens = corpo.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
    for (const t of new Set(tokens)) {
      if (PROIBIDAS.has(t) && !["text", "content"].includes(t)) problemas.push({ view, problema: `cita a coluna ${t}` });
    }
  }
  return problemas;
}
