/**
 * Dados REAIS do Supabase, só leitura e só colunas da allowlist (colunas.ts).
 *
 * Hoje lê as tabelas-base com colunas não clínicas e agrega no servidor. Quando as views `admin_*`
 * de feat/admin-dados forem aplicadas (GO G3), troca-se só `buscarLinhas` — `montarReais` continua.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  agruparContagem,
  arred,
  contarPorDia,
  diaBRT,
  distintosPorDia,
  inicioDoDiaBRT,
  inicioPeriodo,
  percentil,
  periodosDaSerie,
} from "./agregar";
import { colunas, type TabelaPermitida } from "./colunas";
import { GO } from "./exemplo";
import {
  real,
  type CategoriaContagem,
  type CodigoErro,
  type CustoPeriodo,
  type DadosPainel,
  type ModeloCusto,
  type Periodo,
  type ResultadoGeracao,
  type UsuarioCusto,
} from "./tipos";

export interface LinhaPerfil { id: string; created_at: string; plan: string | null; role: string | null; onboarding_completed_at: string | null }
export interface LinhaLaudo { user_id: string | null; category_code: string | null; created_at: string }
export interface LinhaAudit {
  user_id: string | null;
  category: string | null;
  model_writer: string | null;
  openai_input_tokens: number | null;
  openai_output_tokens: number | null;
  openai_cost_usd: number | string | null;
  error_code: string | null;
  error_stage: string | null;
  created_at: string;
  total_duration_ms: number | null;
  structurer_duration_ms: number | null;
  writer_duration_ms: number | null;
}
export interface LinhaRun { outcome: string; created_at: string }
export interface LinhaAssinatura { environment: string | null; product_id: string | null; status: string | null; is_trial: boolean | null; expires_at: string | null }

export interface LinhasReais {
  perfis: LinhaPerfil[];
  laudos30: LinhaLaudo[];
  laudosTotal: number;
  categorias: { code: string; label: string }[];
  audit30: LinhaAudit[];
  auditErros: LinhaAudit[];
  runs30: LinhaRun[];
  runsTotal: { success: number; blocked: number; error: number };
  assinaturas: LinhaAssinatura[];
  feedback30: { verdict: string | null; created_at: string }[];
  eventosPorSurface: { surface: string; n: number }[];
}

const PAGINA = 1000;

async function todas<T>(sb: SupabaseClient, tabela: TabelaPermitida, filtro: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const q = filtro(sb.from(tabela).select(colunas(tabela))).range(de, de + PAGINA - 1);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase ${tabela}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGINA) break;
  }
  return out;
}

async function contar(sb: SupabaseClient, tabela: TabelaPermitida, filtro: (q: any) => any = (q) => q): Promise<number> {
  const { count, error } = await filtro(sb.from(tabela).select(colunas(tabela).split(",")[0], { count: "exact", head: true }));
  if (error) throw new Error(`Supabase ${tabela} (contagem): ${error.message}`);
  return count ?? 0;
}

export async function buscarLinhas(sb: SupabaseClient, dias: readonly string[]): Promise<LinhasReais> {
  const desde = inicioDoDiaBRT(dias[0] ?? "");
  const [perfis, laudos30, laudosTotal, categorias, audit30, auditErros, runs30, success, blocked, error, assinaturas, feedback30, web, ios, watch] =
    await Promise.all([
      todas<LinhaPerfil>(sb, "profiles", (q) => q),
      todas<LinhaLaudo>(sb, "reports", (q) => q.gte("created_at", desde)),
      contar(sb, "reports"),
      todas<{ code: string; label: string }>(sb, "categories", (q) => q),
      todas<LinhaAudit>(sb, "generation_audit", (q) => q.gte("created_at", desde)),
      todas<LinhaAudit>(sb, "generation_audit", (q) => q.not("error_code", "is", null).order("created_at", { ascending: false })),
      todas<LinhaRun>(sb, "generation_runs", (q) => q.gte("created_at", desde)),
      contar(sb, "generation_runs", (q) => q.eq("outcome", "success")),
      contar(sb, "generation_runs", (q) => q.eq("outcome", "blocked")),
      contar(sb, "generation_runs", (q) => q.eq("outcome", "error")),
      todas<LinhaAssinatura>(sb, "subscriptions", (q) => q),
      todas<{ verdict: string | null; created_at: string }>(sb, "user_feedback", (q) => q.gte("created_at", desde)),
      contar(sb, "product_events", (q) => q.eq("surface", "web")),
      contar(sb, "product_events", (q) => q.eq("surface", "ios")),
      contar(sb, "product_events", (q) => q.eq("surface", "watch")),
    ]);
  return {
    perfis,
    laudos30,
    laudosTotal,
    categorias,
    audit30,
    auditErros,
    runs30,
    runsTotal: { success, blocked, error },
    assinaturas,
    feedback30: feedback30 as { verdict: string | null; created_at: string }[],
    eventosPorSurface: [
      { surface: "web", n: web },
      { surface: "ios", n: ios },
      { surface: "watch", n: watch },
    ].filter((e) => e.n > 0),
  };
}

const num = (x: number | string | null | undefined): number | null => {
  if (x === null || x === undefined || x === "") return null;
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : null;
};

type Reais = {
  aquisicao: Pick<DadosPainel["aquisicao"], "contas_novas" | "onboarding_concluido" | "primeiro_laudo_novos">;
  uso: DadosPainel["uso"];
  assinaturas: Pick<DadosPainel["assinaturas"], "produto" | "estado_atual" | "plano_gravado">;
  custos: Pick<DadosPainel["custos"], "geracao_periodo" | "geracao_dia" | "por_modelo_30d" | "por_categoria_30d" | "por_usuario_30d">;
  saude: Pick<DadosPainel["saude"], "geracao" | "geracao_dia" | "codigos_erro" | "ultimos_erros" | "duracoes_30d">;
  /** user_id → "Usuário N" (ordem: mais laudos em 30 dias). Só no servidor. */
  pseudonimos: Map<string, string>;
  categorias: Record<string, string>;
};

const PERIODOS: Periodo[] = ["today", "d7", "d30"];

/** Agrega as linhas em métricas reais. Pura: recebe linhas, devolve o formato do painel. */
export function montarReais(l: LinhasReais, dias: readonly string[]): Reais {
  const desde = (p: Periodo) => inicioPeriodo(dias, p);
  const nomeCat = new Map(l.categorias.map((c) => [c.code, c.label]));

  // ---- contas
  const contasSerie = contarPorDia(l.perfis, dias, (p) => p.created_at);
  const novos = (p: Periodo) => l.perfis.filter((x) => diaBRT(x.created_at) >= desde(p));
  const usuariosComLaudo = new Map<string, string>(); // user → 1º dia com laudo na janela
  for (const r of l.laudos30) {
    if (!r.user_id) continue;
    const d = diaBRT(r.created_at);
    const atual = usuariosComLaudo.get(r.user_id);
    if (!atual || d < atual) usuariosComLaudo.set(r.user_id, d);
  }
  const primeiroLaudo = Object.fromEntries(
    PERIODOS.map((p) => [p, novos(p).filter((x) => usuariosComLaudo.has(x.id)).length]),
  ) as Record<Periodo, number>;

  // ---- laudos
  const laudosSerie = contarPorDia(l.laudos30, dias, (r) => r.created_at);
  const ativosSerie = distintosPorDia(l.laudos30, dias, (r) => r.created_at, (r) => r.user_id);
  const ativos = (p: Periodo) => new Set(l.laudos30.filter((r) => diaBRT(r.created_at) >= desde(p)).map((r) => r.user_id).filter(Boolean)).size;
  const porCategoria = (p: Periodo): CategoriaContagem[] =>
    Array.from(agruparContagem(l.laudos30.filter((r) => diaBRT(r.created_at) >= desde(p)), (r) => r.category_code ?? "(sem)"))
      .map(([code, n]) => ({ code, label: nomeCat.get(code) ?? code, n }))
      .sort((a, b) => b.n - a.n);

  // ---- custos
  const auditNo = (p: Periodo) => l.audit30.filter((a) => diaBRT(a.created_at) >= desde(p));
  const custoPeriodo = (p: Periodo): CustoPeriodo => {
    const rows = auditNo(p);
    const comPreco = rows.filter((a) => num(a.openai_cost_usd) !== null);
    const cost = comPreco.reduce((s, a) => s + (num(a.openai_cost_usd) ?? 0), 0);
    return {
      rows: rows.length,
      cost_usd: arred(cost),
      cost_null_rows: rows.length - comPreco.length,
      tin: rows.reduce((s, a) => s + (a.openai_input_tokens ?? 0), 0),
      tout: rows.reduce((s, a) => s + (a.openai_output_tokens ?? 0), 0),
      errors: rows.filter((a) => a.error_code).length,
      custo_por_laudo: comPreco.length ? cost / comPreco.length : null,
    };
  };
  const custoDia = contarPorDia(l.audit30, dias, (a) => a.created_at, (a) => num(a.openai_cost_usd) ?? 0).map((x) => arred(x));
  const porModelo: ModeloCusto[] = Array.from(
    l.audit30.reduce((m, a) => {
      const k = a.model_writer ?? "(sem)";
      const arr = m.get(k) ?? [];
      arr.push(a);
      return m.set(k, arr);
    }, new Map<string, LinhaAudit[]>()),
  )
    .map(([model, rows]) => {
      const precos = rows.map((a) => num(a.openai_cost_usd)).filter((x): x is number => x !== null);
      const cost = precos.length ? arred(precos.reduce((s, x) => s + x, 0)) : null;
      return {
        model,
        n: rows.length,
        avg_in: Math.round(rows.reduce((s, a) => s + (a.openai_input_tokens ?? 0), 0) / rows.length),
        avg_out: Math.round(rows.reduce((s, a) => s + (a.openai_output_tokens ?? 0), 0) / rows.length),
        cost,
        avg_cost: precos.length ? arred(precos.reduce((s, x) => s + x, 0) / precos.length, 5) : null,
        null_cost: rows.length - precos.length,
      };
    })
    .sort((a, b) => b.n - a.n);
  const porCat = Array.from(
    l.audit30.reduce((m, a) => {
      const k = a.category ?? "(sem)";
      const cur = m.get(k) ?? { n: 0, c: 0 };
      cur.n += 1;
      cur.c += num(a.openai_cost_usd) ?? 0;
      return m.set(k, cur);
    }, new Map<string, { n: number; c: number }>()),
  )
    .map(([k, v]) => [k, v.n, arred(v.c)] as [string, number, number])
    .sort((a, b) => b[2] - a[2]);
  const porUsuarioMapa = l.audit30.reduce((m, a) => {
    const k = a.user_id ?? "(sem)";
    const cur = m.get(k) ?? { n: 0, cost: 0, cats: new Set<string>(), errs: 0 };
    cur.n += 1;
    cur.cost += num(a.openai_cost_usd) ?? 0;
    if (a.category) cur.cats.add(a.category);
    if (a.error_code) cur.errs += 1;
    return m.set(k, cur);
  }, new Map<string, { n: number; cost: number; cats: Set<string>; errs: number }>());
  const ordenados = Array.from(porUsuarioMapa).sort((a, b) => b[1].n - a[1].n);
  const pseudonimos = new Map<string, string>();
  const porUsuario: UsuarioCusto[] = ordenados.map(([id, v], i) => {
    const rotulo = `Usuário ${i + 1}`;
    pseudonimos.set(id, rotulo);
    return { rotulo, n: v.n, cost: arred(v.cost), cats: v.cats.size, errs: v.errs };
  });

  // ---- saúde
  const runsNo = (p: Periodo) => l.runs30.filter((r) => diaBRT(r.created_at) >= desde(p));
  const resultado = (o: { success: number; blocked: number; error: number }): ResultadoGeracao => {
    const total = o.success + o.blocked + o.error;
    return { ...o, total, erro_pct: total ? (o.error / total) * 100 : 0, bloqueio_pct: total ? (o.blocked / total) * 100 : 0 };
  };
  const contaRuns = (rows: LinhaRun[]) => ({
    success: rows.filter((r) => r.outcome === "success").length,
    blocked: rows.filter((r) => r.outcome === "blocked").length,
    error: rows.filter((r) => r.outcome === "error").length,
  });
  const desde30 = inicioDoDiaBRT(dias[0] ?? "");
  const codigos: CodigoErro[] = Array.from(
    l.auditErros.reduce((m, a) => {
      const k = `${a.error_code}|${a.error_stage ?? "(sem)"}`;
      const cur = m.get(k) ?? { code: a.error_code ?? "?", stage: a.error_stage ?? "(sem)", n: 0, n30: 0, last_at: a.created_at };
      cur.n += 1;
      if (Date.parse(a.created_at) >= Date.parse(desde30)) cur.n30 += 1;
      if (Date.parse(a.created_at) > Date.parse(cur.last_at)) cur.last_at = a.created_at;
      return m.set(k, cur);
    }, new Map<string, CodigoErro>()).values(),
  ).sort((a, b) => b.n - a.n);

  // ---- assinaturas (estado atual)
  const prod = l.assinaturas.filter((s) => s.environment === "Production");
  const sandbox = Array.from(
    l.assinaturas
      .filter((s) => s.environment !== "Production")
      .reduce((m, s) => {
        const k = `${s.product_id}|${s.status}|${s.is_trial}`;
        const cur = m.get(k) ?? { product_id: s.product_id ?? "?", status: s.status ?? "?", is_trial: !!s.is_trial, n: 0 };
        cur.n += 1;
        return m.set(k, cur);
      }, new Map<string, { product_id: string; status: string; is_trial: boolean; n: number }>())
      .values(),
  );

  return {
    pseudonimos,
    categorias: Object.fromEntries(nomeCat),
    aquisicao: {
      contas_novas: real("profiles.created_at — contagem por dia (1 perfil por conta)", { ...periodosDaSerie(contasSerie), total: l.perfis.length }, {
        nota: "Não separa iOS de web hoje.",
        go_nota: GO.surface,
      }),
      onboarding_concluido: real("profiles.onboarding_completed_at — contagem", {
        total: l.perfis.filter((p) => p.onboarding_completed_at).length,
        de: l.perfis.length,
      }),
      primeiro_laudo_novos: real("reports × profiles — contas novas que já geraram laudo", primeiroLaudo, {
        nota: "Contas criadas no período que já geraram o 1º laudo.",
      }),
    },
    uso: {
      laudos: real("reports — contagem por dia (Brasília)", { ...periodosDaSerie(laudosSerie), total: l.laudosTotal }),
      usuarios_ativos: real("reports — usuários distintos", { serie: ativosSerie, today: ativos("today"), d7: ativos("d7"), d30: ativos("d30") }),
      laudos_por_categoria: real("reports × categories — contagem", { today: porCategoria("today"), d7: porCategoria("d7"), d30: porCategoria("d30") }),
      feedback_30d: real("user_feedback.verdict — contagem 30 dias", Object.fromEntries(agruparContagem(l.feedback30, (f) => f.verdict ?? "(sem)"))),
      eventos_produto: real("product_events — contagem por surface", l.eventosPorSurface, {
        nota: "O app iOS ainda não manda a superfície; tudo cai como web.",
      }),
    },
    assinaturas: {
      produto: real("App Store Connect (configuração do produto)", {
        id: "com.laudousg.LaudoUSG.pro.monthly",
        nome: "LaudoUSG Mensal",
        preco_brl: 129.9,
        teste_gratis_dias: 3,
      }),
      estado_atual: real(
        "public.subscriptions — contagem por ambiente/estado",
        {
          producao: {
            ativos: prod.filter((s) => s.status === "active" && !s.is_trial).length,
            em_teste: prod.filter((s) => s.status === "active" && s.is_trial).length,
            grace: prod.filter((s) => s.status === "grace").length,
            expirados: prod.filter((s) => s.status === "expired").length,
            reembolsados: prod.filter((s) => s.status === "refunded").length,
            linhas: prod.length,
          },
          sandbox,
        },
        prod.length ? {} : { nota: "Nenhuma assinatura de produção gravada até agora." },
      ),
      plano_gravado: real("profiles.plan — contagem", Object.fromEntries(agruparContagem(l.perfis, (p) => p.plan ?? "(sem)")), {
        nota: "Não é a verdade da Apple: inclui BETA_TESTER_EMAILS. Para assinantes, vale subscriptions.",
      }),
    },
    custos: {
      geracao_periodo: real(
        "generation_audit — soma de openai_cost_usd (estimado)",
        { today: custoPeriodo("today"), d7: custoPeriodo("d7"), d30: custoPeriodo("d30") },
        { nota: "Estimativa com tabela de preço fixa no código; modelos sem preço ficam nulos." },
      ),
      geracao_dia: real("generation_audit — custo por dia", { serie: custoDia }),
      por_modelo_30d: real("generation_audit — por model_writer", porModelo),
      por_categoria_30d: real("generation_audit — por category", porCat),
      por_usuario_30d: real("generation_audit — por user_id (pseudônimo)", porUsuario),
    },
    saude: {
      geracao: real("generation_runs.outcome — contagem", {
        today: resultado(contaRuns(runsNo("today"))),
        d7: resultado(contaRuns(runsNo("d7"))),
        d30: resultado(contaRuns(runsNo("d30"))),
        all: resultado(l.runsTotal),
      }),
      geracao_dia: real("generation_runs.outcome — por dia", {
        ok: contarPorDia(l.runs30.filter((r) => r.outcome === "success"), dias, (r) => r.created_at),
        blocked: contarPorDia(l.runs30.filter((r) => r.outcome === "blocked"), dias, (r) => r.created_at),
        error: contarPorDia(l.runs30.filter((r) => r.outcome === "error"), dias, (r) => r.created_at),
      }),
      codigos_erro: real("generation_audit.error_code/error_stage — contagem", codigos),
      ultimos_erros: real(
        "generation_audit — últimos 20 (sem conteúdo clínico)",
        l.auditErros.slice(0, 20).map((a) => ({
          at: a.created_at,
          code: a.error_code ?? "?",
          stage: a.error_stage ?? "(sem)",
          cat: a.category ?? "(sem)",
          model: a.model_writer ?? "(sem)",
          ms: a.total_duration_ms,
        })),
      ),
      duracoes_30d: real(
        "generation_audit — p50/p95 (ms)",
        {
          total_p50: percentil(l.audit30.map((a) => a.total_duration_ms), 0.5),
          total_p95: percentil(l.audit30.map((a) => a.total_duration_ms), 0.95),
          writer_p50: percentil(l.audit30.map((a) => a.writer_duration_ms), 0.5),
          writer_p95: percentil(l.audit30.map((a) => a.writer_duration_ms), 0.95),
          structurer_p50: percentil(l.audit30.map((a) => a.structurer_duration_ms), 0.5),
        },
        { nota: "structurer_duration_ms ainda não é gravado pelo pipeline (nulo)." },
      ),
    },
  };
}
