import "server-only";
import { createServerSupabaseClient } from "./server";

/**
 * O que o médico corrigiu à mão — cockpit (docs/projeto-modelos/06-lab-cockpit.md).
 *
 * `reports.generated_output` é a saída da IA; `reports.final_output` só existe
 * quando o médico editou e salvou. O diff entre os dois é o sinal de qualidade
 * mais honesto do sistema: não é opinião nem heurística, é o que um médico
 * achou que precisava mudar antes de assinar.
 *
 * Havia 585 laudos assim e nenhuma tela os lia.
 *
 * Acesso por service role — `reports` tem RLS own-row, e o cockpit precisa ver
 * todas as contas.
 */

export type CorrecaoLinha = {
  id: string;
  categoria: string;
  quando: string;
  medico: string | null;
  /** Diferença de tamanho: positivo = o médico acrescentou. */
  delta: number;
  tamanhoGerado: number;
  /** Proporção de linhas alteradas — mede o esforço, não o tamanho. */
  linhasAlteradas: number;
  totalLinhas: number;
};

export type CorrecaoDetalhe = CorrecaoLinha & {
  gerado: string;
  final: string;
  rawInput: string | null;
};

export type ResumoCategoria = {
  categoria: string;
  laudos: number;
  editados: number;
  pct: number;
  /** Mediana seria melhor, mas o volume por categoria é pequeno. */
  deltaAbsMedio: number;
};

const DATA_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
});

/** Conta linhas que mudaram — aproximação barata, suficiente para ordenar. */
function contarLinhasAlteradas(a: string, b: string): { alteradas: number; total: number } {
  const la = a.split("\n");
  const lb = b.split("\n");
  const setB = new Set(lb);
  const alteradas = la.filter((l) => l.trim() !== "" && !setB.has(l)).length;
  const novas = lb.filter((l) => l.trim() !== "" && !new Set(la).has(l)).length;
  return { alteradas: Math.max(alteradas, novas), total: Math.max(la.length, lb.length) };
}

async function nomesDosMedicos(ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const supa = createServerSupabaseClient();
  const { data } = await supa.from("profiles").select("id,name,email").in("id", unicos);
  return new Map((data ?? []).map((p) => [p.id as string, (p.name as string) || (p.email as string)]));
}

export async function listarCorrecoes(f: {
  categoria?: string; medicoId?: string; pagina?: number; porPagina?: number;
} = {}): Promise<{ linhas: CorrecaoLinha[]; total: number; pagina: number; porPagina: number }> {
  const supa = createServerSupabaseClient();
  const pagina = Math.max(1, f.pagina ?? 1);
  const porPagina = Math.min(100, Math.max(10, f.porPagina ?? 40));
  const de = (pagina - 1) * porPagina;

  let q = supa
    .from("reports")
    .select("id,category_code,user_id,updated_at,generated_output,final_output", { count: "exact" })
    .not("final_output", "is", null)
    .not("generated_output", "is", null);

  if (f.categoria) q = q.eq("category_code", f.categoria);
  if (f.medicoId) q = q.eq("user_id", f.medicoId);

  const { data, error, count } = await q
    .order("updated_at", { ascending: false })
    .range(de, de + porPagina - 1);
  if (error) throw new Error(`listarCorrecoes: ${error.message}`);

  // O PostgREST não compara duas colunas entre si, então o `count` inclui as
  // linhas em que `final_output` foi salvo idêntico ao gerado (o médico abriu e
  // salvou sem mudar nada). Medido: 4 casos em 589 — a contagem é aproximada
  // por essa margem, e o descarte abaixo garante que a LISTA só traga edições
  // de verdade.
  const brutas = (data ?? []).filter(
    (r) => (r.final_output as string) !== (r.generated_output as string),
  );
  const medicos = await nomesDosMedicos(brutas.map((r) => (r.user_id as string) ?? ""));

  const linhas = brutas.map((r) => {
    const g = r.generated_output as string;
    const fi = r.final_output as string;
    const { alteradas, total } = contarLinhasAlteradas(g, fi);
    return {
      id: r.id as string,
      categoria: r.category_code as string,
      quando: DATA_FMT.format(new Date(r.updated_at as string)),
      medico: r.user_id ? (medicos.get(r.user_id as string) ?? null) : null,
      delta: fi.length - g.length,
      tamanhoGerado: g.length,
      linhasAlteradas: alteradas,
      totalLinhas: total,
    };
  });

  return { linhas, total: count ?? linhas.length, pagina, porPagina };
}

export async function getCorrecao(id: string): Promise<CorrecaoDetalhe | null> {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("reports")
    .select("id,category_code,user_id,updated_at,generated_output,final_output,raw_input")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getCorrecao: ${error.message}`);
  if (!data || !data.final_output || !data.generated_output) return null;

  const g = data.generated_output as string;
  const fi = data.final_output as string;
  const medicos = await nomesDosMedicos([(data.user_id as string) ?? ""]);
  const { alteradas, total } = contarLinhasAlteradas(g, fi);

  return {
    id: data.id as string,
    categoria: data.category_code as string,
    quando: DATA_FMT.format(new Date(data.updated_at as string)),
    medico: data.user_id ? (medicos.get(data.user_id as string) ?? null) : null,
    delta: fi.length - g.length,
    tamanhoGerado: g.length,
    linhasAlteradas: alteradas,
    totalLinhas: total,
    gerado: g,
    final: fi,
    rawInput: (data.raw_input as string) ?? null,
  };
}

/**
 * Taxa de edição por categoria — onde o modelo mais precisa de ajuste.
 *
 * Feito com uma RPC seria mais barato, mas o volume (alguns milhares de linhas)
 * cabe em memória e evita criar função no banco só para o painel.
 */
export async function resumoPorCategoria(): Promise<ResumoCategoria[]> {
  const supa = createServerSupabaseClient();
  const { data, error } = await supa
    .from("reports")
    .select("category_code,generated_output,final_output")
    .not("generated_output", "is", null)
    .limit(20000);
  if (error) throw new Error(`resumoPorCategoria: ${error.message}`);

  const acc = new Map<string, { laudos: number; editados: number; somaDelta: number }>();
  for (const r of data ?? []) {
    const cat = r.category_code as string;
    const g = r.generated_output as string;
    const fi = r.final_output as string | null;
    const cur = acc.get(cat) ?? { laudos: 0, editados: 0, somaDelta: 0 };
    cur.laudos += 1;
    if (fi && fi !== g) {
      cur.editados += 1;
      cur.somaDelta += Math.abs(fi.length - g.length);
    }
    acc.set(cat, cur);
  }

  return [...acc.entries()]
    .filter(([, v]) => v.editados > 0)
    .map(([categoria, v]) => ({
      categoria,
      laudos: v.laudos,
      editados: v.editados,
      pct: Math.round((1000 * v.editados) / v.laudos) / 10,
      deltaAbsMedio: Math.round(v.somaDelta / v.editados),
    }))
    .sort((a, b) => b.editados - a.editados);
}

export async function opcoesCorrecoes(): Promise<{
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
