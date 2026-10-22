/**
 * Tabelas da FASE 2 (branch feat/admin-dados, migração 20261022010003_admin_fase2_dados.sql):
 * `ai_usage_events`, `iap_notifications` e `iap_notification_attempts`. Nomes de rota iguais aos
 * de `withUsageRequest(...)` no backend: generate, transcribe, consultant, analyze-image, edit, deepgram/token.
 * Só existem no banco depois do GO G3. Enquanto não existirem (ou estiverem vazias), cada leitura
 * devolve `null` e o painel mantém o cartão de EXEMPLO com o selo "Aguardando GO".
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { arred, contarPorDia, diaBRT, inicioDoDiaBRT } from "./agregar";
import { colunas, type TabelaPermitida } from "./colunas";
import { real, type DadosPainel } from "./tipos";

export interface LinhaUso {
  created_at: string;
  user_id: string | null;
  route: string;
  stage: string | null;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  output_tokens: number | null;
  audio_seconds: number | string | null;
  cost_usd: number | string | null;
  measurement: "priced" | "unpriced" | "unmeasured" | null;
  ok: boolean;
  error_code: string | null;
  surface: string | null;
}

export interface LinhaNotificacao {
  notification_uuid: string;
  received_at: string;
  notification_type: string;
  subtype: string | null;
  environment: string;
  product_id: string | null;
  offer_type: number | null;
  auto_renew_status: number | null;
  user_id: string | null;
}

/** Resultado de cada entrega (append-only): test, ignored, unassigned, applied, stale, rejected, error. */
export interface LinhaTentativa {
  notification_uuid: string;
  received_at: string;
  result: string;
}

/** Erros do PostgREST/Postgres que significam "a tabela ainda não existe". */
export function tabelaAusente(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST205" || err.code === "42P01" || /does not exist|schema cache/i.test(err.message ?? "");
}

async function lerSeExistir<T>(sb: SupabaseClient, tabela: TabelaPermitida, desde: string, campoData: string): Promise<T[] | null> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(tabela).select(colunas(tabela)).gte(campoData, desde).range(de, de + 999);
    if (error) {
      if (tabelaAusente(error)) return null;
      throw new Error(`Supabase ${tabela}: ${error.message}`);
    }
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const n = (x: number | string | null | undefined) => {
  const v = typeof x === "number" ? x : Number(x ?? NaN);
  return Number.isFinite(v) ? v : 0;
};

const ROTAS_CUSTO = { transcricao: ["transcribe"], consultor: ["consultant"], visao: ["analyze-image"], edicao: ["edit"] } as const;
const ROTA_DEEPGRAM = "deepgram/token";
/** A geração já aparece por generation_runs/generation_audit; a tabela de rotas mostra as demais. */
const ROTA_GERACAO = "generate";

/** Monta as métricas de uso por rota a partir de ai_usage_events (pura). */
export function montarUso(linhas: LinhaUso[], pseudonimos: Map<string, string>): Partial<{
  outras: DadosPainel["custos"]["outras_rotas_por_usuario_30d"];
  deepgram: DadosPainel["custos"]["deepgram_por_usuario_30d"];
  rotas: DadosPainel["saude"]["outras_rotas_30d"];
}> {
  if (!linhas.length) return {};
  const rotulo = (id: string | null) => {
    if (!id) return "(sem usuário)";
    let r = pseudonimos.get(id);
    if (!r) {
      r = `Usuário ${pseudonimos.size + 1}`;
      pseudonimos.set(id, r);
    }
    return r;
  };
  const porUsuario = new Map<string, { transcricao: number; consultor: number; visao: number; edicao: number; dgSeg: number; dgCusto: number }>();
  const porRota = new Map<string, { chamadas: number; erros: number }>();
  for (const l of linhas) {
    const u = rotulo(l.user_id);
    const cur = porUsuario.get(u) ?? { transcricao: 0, consultor: 0, visao: 0, edicao: 0, dgSeg: 0, dgCusto: 0 };
    for (const [campo, rotas] of Object.entries(ROTAS_CUSTO) as [keyof typeof ROTAS_CUSTO, readonly string[]][]) {
      if (rotas.includes(l.route)) cur[campo] += n(l.cost_usd);
    }
    if (l.route === ROTA_DEEPGRAM) {
      cur.dgSeg += n(l.audio_seconds);
      cur.dgCusto += n(l.cost_usd);
    }
    porUsuario.set(u, cur);
    if (l.route === ROTA_GERACAO) continue;
    const r = porRota.get(l.route) ?? { chamadas: 0, erros: 0 };
    r.chamadas += 1;
    if (!l.ok) r.erros += 1;
    porRota.set(l.route, r);
  }
  const fonte = "ai_usage_events — soma de cost_usd por rota (estimado)";
  return {
    outras: real(
      fonte,
      Array.from(porUsuario).map(([r, v]) => ({
        rotulo: r,
        transcricao: arred(v.transcricao),
        consultor: arred(v.consultor),
        visao: arred(v.visao),
        edicao: arred(v.edicao),
      })),
    ),
    deepgram: real(
      "ai_usage_events — rota deepgram/token (audio_seconds)",
      Array.from(porUsuario).map(([r, v]) => ({ rotulo: r, minutos: Math.round(v.dgSeg / 60), custo: arred(v.dgCusto) })),
    ),
    rotas: real("ai_usage_events.ok / error_code", Array.from(porRota).map(([rota, v]) => ({ rota, ...v }))),
  };
}

/** Quantas notificações tiveram ao menos uma entrega com um destes resultados. */
function comResultado(tentativas: LinhaTentativa[], resultados: string[]): number {
  return new Set(tentativas.filter((t) => resultados.includes(t.result)).map((t) => t.notification_uuid)).size;
}

/** Histórico de assinatura a partir de iap_notifications (pura). Só ambiente de produção. */
export function montarNotificacoes(
  linhas: LinhaNotificacao[],
  dias: readonly string[],
  tentativas: LinhaTentativa[] = [],
): Partial<{ eventos: DadosPainel["assinaturas"]["eventos_dia"]; notificacoes: DadosPainel["assinaturas"]["notificacoes_apple"] }> {
  if (!linhas.length) return {};
  const prod = linhas.filter((l) => l.environment === "Production");
  // Tipos da App Store Server Notifications V2. offerType 1 = oferta introdutória (teste grátis).
  const teste = (l: LinhaNotificacao) => l.notification_type === "SUBSCRIBED" && l.offer_type === 1;
  const pago = (l: LinhaNotificacao) =>
    (l.notification_type === "SUBSCRIBED" && l.offer_type !== 1) || (l.notification_type === "DID_RENEW" && l.subtype !== "BILLING_RECOVERY");
  const cancelou = (l: LinhaNotificacao) => l.notification_type === "DID_CHANGE_RENEWAL_STATUS" && l.subtype === "AUTO_RENEW_DISABLED";
  const ultima = linhas.reduce((m, l) => (Date.parse(l.received_at) > Date.parse(m) ? l.received_at : m), linhas[0]?.received_at ?? "");
  return {
    eventos: real("iap_notifications — eventos por dia (produção)", {
      testes: contarPorDia(prod.filter(teste), dias, (l) => l.received_at),
      pagos: contarPorDia(prod.filter(pago), dias, (l) => l.received_at),
      cancelamentos: contarPorDia(prod.filter(cancelou), dias, (l) => l.received_at),
    }),
    notificacoes: real("iap_notifications + iap_notification_attempts.result — 30 dias", {
      recebidas_30d: linhas.length,
      aplicadas: comResultado(tentativas, ["applied"]),
      sem_dono: comResultado(tentativas, ["unassigned"]),
      ignoradas_teste: comResultado(tentativas, ["test", "ignored"]),
      ultima: `${diaBRT(ultima).slice(8, 10)}/${diaBRT(ultima).slice(5, 7)}`,
    }),
  };
}

export async function buscarFase2(sb: SupabaseClient, dias: readonly string[]) {
  const desde = inicioDoDiaBRT(dias[0] ?? "");
  const [uso, notif, tentativas] = await Promise.all([
    lerSeExistir<LinhaUso>(sb, "ai_usage_events", desde, "created_at"),
    lerSeExistir<LinhaNotificacao>(sb, "iap_notifications", desde, "received_at"),
    lerSeExistir<LinhaTentativa>(sb, "iap_notification_attempts", desde, "received_at"),
  ]);
  return { uso, notif, tentativas };
}
