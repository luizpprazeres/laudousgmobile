import "server-only";
import type {
  AuditCompactBlock,
  AuditDetail,
  AuditFiltros,
  AuditPagina,
  AuditRow,
  AuditStatus,
} from "@/lib/audit/types";
import { createServerSupabaseClient } from "./server";

/**
 * Auditoria de TODAS as contas — cockpit (docs/projeto-modelos/06-lab-cockpit.md).
 *
 * Duas correções em relação à versão anterior:
 *
 *  1. `deriveStatus` marcava "error" quando `rag_blocks_retrieved` vinha vazio.
 *     Medido no banco: 74 de 532 gerações (14 %) não têm blocos e são
 *     SAUDÁVEIS — é o normal em LIVRE/TESTE e nas categorias com renderer
 *     programático, que montam o laudo em código. O lab acusava erro em 1 de
 *     cada 7 laudos bons. Agora vale a regra do dissecador
 *     (`apps/api/src/server/admin/audit.ts:90-95`): erro é `error_code`;
 *     atenção é veredito do sanity.
 *
 *  2. Saíram as métricas do retriever vetorial, que não existem mais
 *     (ver `lib/audit/types.ts`).
 *
 * Acesso via service role: é o que permite ver as gerações de todas as contas,
 * atravessando a RLS de `generation_audit`.
 */

const DATA_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "2-digit",
  hour: "2-digit", minute: "2-digit",
});
const HORA_FMT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

const COLUNAS_LISTA =
  "id, category, writing_style_id, user_id, report_id, raw_input, created_at, " +
  "total_duration_ms, error_code, error_message, rag_blocks_retrieved, sanity_result, " +
  "model_writer, openai_cost_usd";

const COLUNAS_DETALHE =
  `${COLUNAS_LISTA}, output_text, system_message_full, prompt_version, pipeline_version, ` +
  "contract_hash, openai_input_tokens, openai_output_tokens, model_structurer";

type SanityIssue = { type?: string; severity?: string; detail?: string };
type SanityResult = { verdict?: string; issues?: SanityIssue[] } | null;

/**
 * Gravidade dos tipos de alerta, do mais para o menos consequente.
 *
 * Medido em 300 gerações: `medida_divergente` sozinho é 79 % dos 1281 alertas.
 * Mostrar só "3 alertas" faz o sinal desaparecer no ruído — o que interessa é
 * QUAL alerta. Um `achado_inventado` importa muito mais que dez divergências
 * de medida.
 */
const GRAVIDADE: string[] = [
  "achado_inventado",
  "achado_omitido",
  "lateralidade_divergente",
  "comando_ignorado",
  "conclusao_inconsistente",
  "categoria_divergente",
  "data_divergente",
  "metacomando_residual",
  "formato_quebrado",
  "medida_divergente",
  "outro",
];

/** O alerta mais grave da geração — é ele que vira etiqueta na lista. */
function issueMaisGrave(s: SanityResult): SanityIssue | undefined {
  const issues = s?.issues ?? [];
  if (issues.length === 0) return undefined;
  return [...issues].sort((a, b) => {
    const sev = (x?: string) => (x === "critical" ? 0 : 1);
    if (sev(a.severity) !== sev(b.severity)) return sev(a.severity) - sev(b.severity);
    const g = (x?: string) => {
      const i = GRAVIDADE.indexOf(x ?? "outro");
      return i === -1 ? GRAVIDADE.length : i;
    };
    return g(a.type) - g(b.type);
  })[0];
}

type AuditRowDB = {
  id: string;
  category: string;
  writing_style_id: string | null;
  user_id: string | null;
  report_id: string | null;
  raw_input: string | null;
  created_at: string;
  total_duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  rag_blocks_retrieved: unknown[] | null;
  sanity_result: SanityResult;
  model_writer: string | null;
  openai_cost_usd: number | string | null;
};

type AuditDetailDB = AuditRowDB & {
  output_text: string | null;
  system_message_full: string | null;
  prompt_version: string | null;
  pipeline_version: string | null;
  contract_hash: string | null;
  openai_input_tokens: number | null;
  openai_output_tokens: number | null;
  model_structurer: string | null;
};

type RawRagBlock = { id?: string; kind?: string; title?: string; priority?: number };

/**
 * Regra do dissecador: erro é erro de execução; atenção é o sanity apontando
 * algo. Ausência de blocos NÃO é problema — é o normal no renderer.
 */
function deriveStatus(row: Pick<AuditRowDB, "error_code" | "sanity_result">): AuditStatus {
  if (row.error_code) return "error";
  const s = row.sanity_result;
  if (s?.verdict && s.verdict !== "ok") return "warning";
  if ((s?.issues?.length ?? 0) > 0) return "warning";
  return "ok";
}

function deriveBadge(row: AuditRowDB): string | undefined {
  if (row.error_code) return row.error_code.toLowerCase();
  const pior = issueMaisGrave(row.sanity_result);
  if (!pior) {
    const v = row.sanity_result?.verdict;
    return v && v !== "ok" ? v : undefined;
  }
  const n = row.sanity_result?.issues?.length ?? 0;
  const tipo = (pior.type ?? "alerta").replace(/_/g, " ");
  return n > 1 ? `${tipo} +${n - 1}` : tipo;
}

function compactBlock(raw: RawRagBlock): AuditCompactBlock {
  const priority = typeof raw.priority === "number" ? raw.priority : 0;
  return {
    kind: raw.kind ?? "—",
    priority,
    slug: raw.title ?? raw.id ?? "—",
    tier: priority >= 90 ? "universal" : priority >= 75 ? "contextual" : "optional",
  };
}

function rowFromDB(r: AuditRowDB, medicos: Map<string, string>): AuditRow {
  const d = new Date(r.created_at);
  return {
    id: r.id,
    shortId: r.id.slice(0, 8),
    category: r.category,
    quando: DATA_FMT.format(d),
    time: HORA_FMT.format(d),
    durationMs: r.total_duration_ms ?? 0,
    blocksUsed: r.rag_blocks_retrieved?.length ?? 0,
    status: deriveStatus(r),
    badge: deriveBadge(r),
    inputPreview: (r.raw_input ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    medico: r.user_id ? (medicos.get(r.user_id) ?? r.user_id.slice(0, 8)) : null,
    modelo: r.model_writer,
    custoUsd: r.openai_cost_usd === null ? null : Number(r.openai_cost_usd),
    reportId: r.report_id,
    issues: (r.sanity_result?.issues ?? []).map((i) => ({
      tipo: i.type ?? "outro",
      severidade: i.severity === "critical" ? "critical" : "warning",
    })),
    piorIssue: issueMaisGrave(r.sanity_result)?.type ?? null,
  };
}

function deriveWarning(d: AuditDetailDB): { title: string; message: string } | undefined {
  if (d.error_code) {
    return { title: `Erro: ${d.error_code}`, message: d.error_message ?? "Sem mensagem detalhada." };
  }
  const n = d.sanity_result?.issues?.length ?? 0;
  if (n > 0) {
    return {
      title: `${n} ${n === 1 ? "ponto" : "pontos"} a revisar no sanity`,
      message: "Veja o laudo gerado e o ditado lado a lado.",
    };
  }
  return undefined;
}

/** Nomes dos médicos, para não mostrar UUID na tela. */
async function carregarMedicos(ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const supa = createServerSupabaseClient();
  const { data } = await supa.from("profiles").select("id,name,email").in("id", unicos);
  return new Map((data ?? []).map((p) => [p.id as string, (p.name as string) || (p.email as string)]));
}

/** Estilos vêm do banco — a versão anterior tinha 4 UUIDs hardcoded. */
async function carregarEstilos(): Promise<Map<string, string>> {
  const supa = createServerSupabaseClient();
  const { data } = await supa.from("writing_styles").select("id,code");
  return new Map((data ?? []).map((s) => [s.id as string, s.code as string]));
}

export async function listarAuditoria(f: AuditFiltros = {}): Promise<AuditPagina> {
  const supa = createServerSupabaseClient();
  const pagina = Math.max(1, f.pagina ?? 1);
  const porPagina = Math.min(200, Math.max(10, f.porPagina ?? 50));
  const de = (pagina - 1) * porPagina;

  let q = supa.from("generation_audit").select(COLUNAS_LISTA, { count: "exact" });

  if (f.categoria) q = q.eq("category", f.categoria);
  if (f.medicoId) q = q.eq("user_id", f.medicoId);
  if (f.de) q = q.gte("created_at", f.de);
  if (f.ate) q = q.lte("created_at", `${f.ate}T23:59:59`);
  if (f.busca) q = q.ilike("raw_input", `%${f.busca}%`);
  // Só "error" é filtrável no banco; "warning"/"ok" dependem do jsonb do sanity
  // e são filtrados depois, em memória.
  if (f.status === "error") q = q.not("error_code", "is", null);
  // Filtro por TIPO de alerta no BANCO (containment de jsonb), não em memória —
  // senão a contagem e a paginação passariam a mentir, porque só filtrariam
  // dentro da página já carregada.
  if (f.tipoIssue) {
    q = q.contains("sanity_result", { issues: [{ type: f.tipoIssue }] });
  }
  if (f.soCriticos) {
    q = q.contains("sanity_result", { issues: [{ severity: "critical" }] });
  }

  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(de, de + porPagina - 1);
  if (error) throw new Error(`listarAuditoria: ${error.message}`);

  const brutas = (data ?? []) as unknown as AuditRowDB[];
  const medicos = await carregarMedicos(brutas.map((r) => r.user_id ?? ""));

  const linhas = brutas.map((r) => rowFromDB(r, medicos));

  // `warning`/`ok` continuam em memória: dependem de combinar verdict e issues,
  // e valem só como recorte grosseiro. Quando isso importa, o filtro por TIPO
  // (acima, no banco) é o que serve — e esse mantém a contagem honesta.
  const filtradas =
    f.status === "warning" || f.status === "ok"
      ? linhas.filter((l) => l.status === f.status)
      : linhas;
  const totalHonesto = filtradas.length === linhas.length ? (count ?? linhas.length) : filtradas.length;

  return { linhas: filtradas, total: totalHonesto, pagina, porPagina };
}

export async function getAuditDetail(id: string): Promise<AuditDetail | null> {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("generation_audit")
    .select(COLUNAS_DETALHE)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getAuditDetail: ${error.message}`);
  if (!data) return null;

  const d = data as unknown as AuditDetailDB;
  const [medicos, estilos] = await Promise.all([
    carregarMedicos([d.user_id ?? ""]),
    carregarEstilos(),
  ]);
  const base = rowFromDB(d, medicos);
  const retrieved = (d.rag_blocks_retrieved ?? []) as RawRagBlock[];

  return {
    ...base,
    pipeline: d.pipeline_version ?? "—",
    promptVersion: d.prompt_version ?? "—",
    contract: d.contract_hash ? `${d.contract_hash.slice(0, 5)}…${d.contract_hash.slice(-3)}` : "—",
    writingStyle: d.writing_style_id ? (estilos.get(d.writing_style_id) ?? "—") : "—",
    inputFull: d.raw_input ?? "",
    outputText: d.output_text,
    systemMessage: d.system_message_full,
    retrieved: retrieved.map(compactBlock),
    tokensIn: d.openai_input_tokens,
    tokensOut: d.openai_output_tokens,
    warning: deriveWarning(d),
  };
}

/** Opções dos filtros — vêm do que existe na auditoria, não de um enum. */
export async function getOpcoesFiltro(): Promise<{
  categorias: string[];
  medicos: { id: string; nome: string }[];
}> {
  const supa = createServerSupabaseClient();
  const [{ data: cats }, { data: perfis }] = await Promise.all([
    supa.from("categories").select("code").order("code"),
    supa.from("profiles").select("id,name,email").order("email"),
  ]);
  return {
    categorias: (cats ?? []).map((c) => c.code as string),
    medicos: (perfis ?? []).map((p) => ({
      id: p.id as string,
      nome: (p.name as string) || (p.email as string),
    })),
  };
}

export async function getAuditCounts(): Promise<{
  today: number; total7d: number; totalAll: number; comErro7d: number;
}> {
  const supa = createServerSupabaseClient();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const seteDias = new Date();
  seteDias.setDate(seteDias.getDate() - 7);

  const [t, s, a, e] = await Promise.all([
    supa.from("generation_audit").select("id", { count: "exact", head: true }).gte("created_at", hoje.toISOString()),
    supa.from("generation_audit").select("id", { count: "exact", head: true }).gte("created_at", seteDias.toISOString()),
    supa.from("generation_audit").select("id", { count: "exact", head: true }),
    supa.from("generation_audit").select("id", { count: "exact", head: true })
      .gte("created_at", seteDias.toISOString()).not("error_code", "is", null),
  ]);

  return {
    today: t.count ?? 0,
    total7d: s.count ?? 0,
    totalAll: a.count ?? 0,
    comErro7d: e.count ?? 0,
  };
}
