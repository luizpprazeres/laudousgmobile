import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuthError, requireAdmin } from "@/server/auth/requireAdmin";
import {
  AUDIT_PAGE_SIZE,
  auditStatus,
  formatDate,
  formatMs,
  formatUsd,
  listAuditCategories,
  listAuditRows,
} from "@/server/admin/audit";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function DissecadorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const auth = await ensureAdmin();
  if (auth === "forbidden") return <Forbidden />;

  const page = positiveInt(value(params.page), 1);
  const filters = {
    category: value(params.category),
    errorsOnly: value(params.errors_only) === "true",
    from: value(params.from),
    to: value(params.to),
    page,
  };

  const [categories, result] = await Promise.all([
    listAuditCategories(),
    listAuditRows(filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / AUDIT_PAGE_SIZE));

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Dissecador de Laudos
            </h1>
          </div>
          <p className="text-sm text-zinc-400">{result.total} gerações auditadas</p>
        </header>

        <form className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 md:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase text-zinc-400">Categoria</span>
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase text-zinc-400">De</span>
            <input
              type="date"
              name="from"
              defaultValue={filters.from ?? ""}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase text-zinc-400">Até</span>
            <input
              type="date"
              name="to"
              defaultValue={filters.to ?? ""}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>

          <label className="flex items-end gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 md:mt-5">
            <input
              type="checkbox"
              name="errors_only"
              value="true"
              defaultChecked={filters.errorsOnly}
              className="h-4 w-4 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
            />
            Só erros
          </label>

          <div className="flex items-end gap-2">
            <button className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300">
              Filtrar
            </button>
            <Link
              href="/dissecador"
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Limpar
            </Link>
          </div>
        </form>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-zinc-950/60 text-left text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3">Duração</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">Custo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {result.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium text-zinc-100">{row.category}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatMs(row.total_duration_ms)}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {row.openai_input_tokens ?? "-"} / {row.openai_output_tokens ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{formatUsd(row.openai_cost_usd)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={auditStatus(row)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dissecador/${row.id}`}
                        className="font-medium text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
                {result.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                      Nenhum audit encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <nav className="flex items-center justify-between text-sm text-zinc-300">
          <PageLink page={page - 1} disabled={page <= 1} params={params}>
            Anterior
          </PageLink>
          <span>
            Página {page} de {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} params={params}>
            Próxima
          </PageLink>
        </nav>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: "success" | "concerns" | "error" }) {
  const label = status === "success" ? "✓" : status === "concerns" ? "⚠" : "❌";
  const classes =
    status === "success"
      ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30"
      : status === "concerns"
        ? "bg-amber-400/10 text-amber-300 ring-amber-400/30"
        : "bg-red-400/10 text-red-300 ring-red-400/30";
  return (
    <span className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {label}
    </span>
  );
}

function PageLink({
  page,
  disabled,
  params,
  children,
}: {
  page: number;
  disabled: boolean;
  params: Record<string, string | string[] | undefined>;
  children: React.ReactNode;
}) {
  if (disabled) return <span className="text-zinc-600">{children}</span>;
  const next = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const current = value(raw);
    if (current && key !== "page") next.set(key, current);
  }
  next.set("page", String(page));
  return (
    <Link
      href={`/dissecador?${next.toString()}`}
      className="rounded-md border border-zinc-700 px-3 py-2 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      {children}
    </Link>
  );
}

async function ensureAdmin() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 401) redirect("/login");
    if (error instanceof AdminAuthError && error.status === 403) return "forbidden";
    throw error;
  }
}

function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
        <p className="text-sm font-medium text-red-300">403</p>
        <h1 className="mt-2 text-2xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-zinc-400">Esta área é exclusiva para administradores.</p>
      </div>
    </main>
  );
}

function value(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw || undefined;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
