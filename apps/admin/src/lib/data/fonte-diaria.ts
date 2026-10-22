import type { SupabaseClient } from "@supabase/supabase-js";
import { INICIO_APPLE, type LogApple } from "../asc/diario-job";
import type { RegistroApple } from "../asc/diario-parser";
import { noPeriodo, periodosDaSerie } from "./agregar";
import { colunas, type TabelaPermitida } from "./colunas";
import {
  real,
  type DadosPainel,
  type Periodo,
  type SerieComPeriodos,
} from "./tipos";
export interface LinhaLanding {
  day: string;
  event: string;
  src: string;
  count: number;
}
export interface FonteDiaria {
  landing: LinhaLanding[] | null;
  sales: RegistroApple[] | null;
  subscriptions: RegistroApple[] | null;
  events: RegistroApple[] | null;
  analytics: RegistroApple[] | null;
  logs: LogApple[] | null;
}
async function ler<T>(
  sb: SupabaseClient,
  tabela: TabelaPermitida,
  desde: string,
): Promise<T[] | null> {
  const out: T[] = [];
  for (let de = 0; ; de += 1000) {
    // Each source is optional before its migration; fail closed to example on read failure.
    const { data, error } = await sb
      .from(tabela)
      .select(colunas(tabela))
      .gte("day", desde)
      .order("day")
      .range(de, de + 999);
    if (error) return null;
    out.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < 1000) return out;
  }
}
export async function buscarDiaria(
  sb: SupabaseClient,
  dias: readonly string[],
): Promise<FonteDiaria> {
  const from = dias[0] ?? INICIO_APPLE;
  const [landing, sales, subscriptions, events, analytics, logs] =
    await Promise.all([
      ler<LinhaLanding>(sb, "landing_daily", from),
      ler<RegistroApple>(sb, "apple_sales_daily", from),
      ler<RegistroApple>(sb, "apple_subscription_daily", from),
      ler<RegistroApple>(sb, "apple_subscription_events_daily", from),
      ler<RegistroApple>(sb, "apple_analytics_daily", from),
      ler<LogApple>(sb, "apple_fetch_log", from),
    ]);
  return { landing, sales, subscriptions, events, analytics, logs };
}
const n = (v: unknown) => Number(v ?? 0);
export function valorSerie(s: SerieComPeriodos, p: Periodo): number | null {
  return s.indisponivel?.[p] ? null : s[p];
}
export function montarDiaria(f: FonteDiaria, dias: readonly string[]) {
  const aquisicao: Partial<DadosPainel["aquisicao"]> = {};
  const assinaturas: Partial<DadosPainel["assinaturas"]> = {};
  const hoje = dias.at(-1)!;
  if (f.landing?.length) {
    const serie = (event: string, src?: string) =>
      periodosDaSerie(
        dias.map((day) =>
          f
            .landing!.filter(
              (r) =>
                r.day === day &&
                r.event === event &&
                (src === undefined || r.src === src),
            )
            .reduce((s, r) => s + n(r.count), 0),
        ),
      );
    aquisicao.visitas_landing = real(
      "landing_daily · eventos view",
      serie("view"),
    );
    aquisicao.cliques_loja = real(
      "landing_daily · eventos baixar",
      serie("baixar"),
    );
    aquisicao.qr_aberturas = real(
      "landing_daily · eventos qr_open",
      serie("qr_open"),
    );
    const ctas = [
      ...new Set(
        f.landing.filter((r) => r.event === "baixar").map((r) => r.src),
      ),
    ].sort();
    aquisicao.cliques_por_cta = real("landing_daily · baixar por src", {
      ctas,
      today: ctas.map((s) => serie("baixar", s).today),
      d7: ctas.map((s) => serie("baixar", s).d7),
      d30: ctas.map((s) => serie("baixar", s).d30),
    });
  }
  if (f.sales?.length) {
    const publicados = new Set(
      f.logs
        ?.filter(
          (l) =>
            l.source === "sales" &&
            l.report_key === "SALES" &&
            l.status === "ok",
        )
        .map((l) => l.day),
    );
    const valores = (types: string[]) =>
      dias.map((day) =>
        f
          .sales!.filter(
            (r) => r.day === day && types.includes(String(r.product_type)),
          )
          .reduce((s, r) => s + n(r.units), 0),
      );
    const montar = (types: string[]) => {
      const serie = valores(types),
        out = periodosDaSerie(serie);
      out.indisponivel = {};
      for (const p of ["today", "d7", "d30"] as const) {
        const alvo = (
          p === "today" ? dias.slice(-1) : p === "d7" ? dias.slice(-7) : dias
        ).filter((d) => d >= INICIO_APPLE && (p === "today" || d < hoje));
        out.indisponivel[p] =
          !alvo.length || alvo.some((d) => !publicados.has(d));
        out[p] = noPeriodo(serie, p);
      }
      return out;
    };
    const first = montar(["1", "1F", "1T"]),
      again = montar(["3", "3F", "3T"]);
    const nota =
      "Dia do relatório Apple; períodos de 7/30 dias até ontem. — = relatório pendente; não significa zero.";
    aquisicao.instalacoes = real(
      "apple_sales_daily · primeiras instalações",
      first,
      { nota },
    );
    aquisicao.reinstalacoes = real("apple_sales_daily · reinstalações", again, {
      nota,
    });
    aquisicao.apple_dias = real(
      "apple_sales_daily + apple_fetch_log",
      dias
        .filter((day) => day >= INICIO_APPLE)
        .map((day) => ({
          day,
          primeiras: publicados.has(day)
            ? first.serie[dias.indexOf(day)]!
            : null,
          reinstalacoes: publicados.has(day)
            ? again.serie[dias.indexOf(day)]!
            : null,
        })),
      { nota },
    );
  }
  if (f.analytics?.length) {
    const downloads = f.analytics.filter(
      (r) =>
        r.report_name === "App Store Downloads Standard" &&
        r.event === "First-time Download",
    );
    if (downloads.length) {
      const origens = new Map<string, number>();
      for (const r of downloads)
        origens.set(
          String(r.source_type),
          (origens.get(String(r.source_type)) ?? 0) + n(r.counts),
        );
      aquisicao.apple_origens = real(
        "apple_analytics_daily · Downloads Standard",
        [...origens],
        {
          nota: "Somente linhas publicadas; ausências e limiar de privacidade não equivalem a zero. Contagens Analytics, sem misturar com Sales.",
        },
      );
    }
    const pages = f.analytics.filter(
      (r) =>
        r.report_name === "App Store Discovery and Engagement Standard" &&
        r.event === "Page view" &&
        r.page_type === "Product page",
    );
    if (pages.length) {
      const serie = periodosDaSerie(
        dias.map((day) =>
          pages
            .filter((r) => r.day === day)
            .reduce((s, r) => s + n(r.counts), 0),
        ),
      );
      serie.indisponivel = {};
      const publicados = new Set(pages.map(r => String(r.day)));
      for (const p of ["today", "d7", "d30"] as const) {
        const alvo = (p === "today" ? dias.slice(-1) : p === "d7" ? dias.slice(-7) : dias)
          .filter(day => day >= INICIO_APPLE && (p === "today" || day < hoje));
        serie.indisponivel[p] = !alvo.length || alvo.some(day => !publicados.has(day));
      }
      aquisicao.visitas_pagina_loja = real(
        "apple_analytics_daily · visualizações de produto publicadas",
        serie,
        {
          nota: "Contagem parcial das linhas publicadas. A Apple pode omitir dados por privacidade (<5 usuários); ausência não é zero.",
        },
      );
    }
  }
  if (f.subscriptions?.length) {
    const day = f.subscriptions
      .map((r) => String(r.day))
      .sort()
      .at(-1)!;
    const rows = f.subscriptions.filter((r) => r.day === day);
    const total = (k: string) => rows.reduce((s, r) => s + n(r[k]), 0);
    const ev = f.events?.filter((r) => r.day === day);
    assinaturas.conciliacao_apple = real(
      "apple_subscription_daily + apple_subscription_events_daily",
      {
        day,
        paid: total("paid"),
        trials: total("trials"),
        grace: total("grace"),
        billing_retry: total("billing_retry"),
        eventos: f.logs?.some(
          (l) =>
            l.source === "sales" &&
            l.report_key === "SUBSCRIPTION_EVENT" &&
            l.day === day &&
            l.status === "ok",
        )
          ? (ev ?? []).reduce((s, r) => s + n(r.quantity), 0)
          : null,
      },
      {
        nota: "Foto diária Apple versus estado atual do webhook. Horários e escopo diferem; divergência não prova perda de assinatura.",
      },
    );
  }
  return { aquisicao, assinaturas };
}
