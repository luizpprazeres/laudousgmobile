import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminAuthError, requireAdmin } from "@/server/auth/requireAdmin";
import {
  auditStatus,
  formatDate,
  formatMs,
  formatUsd,
  getAuditRow,
  markdownForAudit,
  prettyJson,
  ragBlocks,
  sanityIssues,
  sanityVerdict,
  shortId,
  validatorIssues,
  validatorOk,
  type GenerationAuditRow,
} from "@/server/admin/audit";
import { CopyButton } from "../CopyButton";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function AuditDetailPage({ params }: PageProps) {
  const auth = await ensureAdmin();
  if (auth === "forbidden") return <Forbidden />;

  const { id } = await params;
  const row = await getAuditRow(id);
  if (!row) notFound();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/dissecador"
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Voltar
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Laudo #{shortId(row.id)}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">{row.category}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/audit/${row.id}/markdown`}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              Export as Claude prompt
            </a>
            <CopyButton text={markdownForAudit(row)} label="Copy markdown" />
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Summary row={row} />
            <Panel title="Input do médico">
              <Pre>{row.raw_input ?? ""}</Pre>
            </Panel>
            <Panel title="Output gerado">
              <Pre>{row.output_text ?? ""}</Pre>
            </Panel>
            <Panel title="Structured output">
              <JsonBlock value={row.structured_output} />
            </Panel>
            <Panel title="Validator result">
              <Validator value={row.validator_result} />
            </Panel>
            <Panel title="RAG blocks recuperados">
              <RagTable row={row} />
            </Panel>
            <Panel title="System message COMPLETO">
              <div className="mb-3 flex justify-end">
                <CopyButton text={row.system_message_full ?? ""} />
              </div>
              <Pre>{row.system_message_full ?? ""}</Pre>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="Pipeline stages" open>
              <StageBars row={row} />
            </Panel>
            <Panel title="Sanity result" open>
              <Sanity value={row.sanity_result} />
            </Panel>
            {row.error_code ? (
              <Panel title="Error" open>
                <dl className="space-y-3 text-sm">
                  <Info label="Código" value={row.error_code} />
                  <Info label="Stage" value={row.error_stage ?? "-"} />
                  <Info label="Mensagem" value={row.error_message ?? "-"} />
                </dl>
              </Panel>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Summary({ row }: { row: GenerationAuditRow }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumo</h2>
        <StatusBadge status={auditStatus(row)} />
      </div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Categoria" value={row.category} />
        <Info label="Gerado em" value={formatDate(row.created_at)} />
        <Info label="Prompt version" value={row.prompt_version} />
        <Info label="Contract hash" value={shortId(row.contract_hash, 12)} />
        <Info label="Modelo writer" value={row.model_writer ?? "-"} />
        <Info label="Duração total" value={formatMs(row.total_duration_ms)} />
        <Info
          label="Tokens"
          value={`${row.openai_input_tokens ?? "-"} / ${row.openai_output_tokens ?? "-"}`}
        />
        <Info label="Custo" value={formatUsd(row.openai_cost_usd)} />
      </dl>
    </section>
  );
}

function Panel({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 open:shadow-sm"
    >
      <summary className="cursor-pointer text-lg font-semibold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
        {title}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">
      <code>{children || "-"}</code>
    </pre>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <Pre>{prettyJson(value) || "-"}</Pre>;
}

function Validator({ value }: { value: unknown }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Info label="ok" value={String(validatorOk(value))} />
        <Info label="issues_count" value={String(validatorIssues(value).length)} />
      </dl>
      <JsonBlock value={validatorIssues(value)} />
    </div>
  );
}

function RagTable({ row }: { row: GenerationAuditRow }) {
  const blocks = ragBlocks(row.rag_blocks_retrieved);
  if (blocks.length === 0) return <p className="text-sm text-zinc-400">Nenhum bloco registrado.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-800 text-sm">
        <thead className="text-left text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">ID</th>
            <th className="px-4 py-2">Kind</th>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Priority</th>
            <th className="py-2 pl-4">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {blocks.map((block, index) => (
            <tr key={`${block.id ?? index}-${index}`}>
              <td className="py-2 pr-4 font-mono text-zinc-400">{shortId(block.id)}</td>
              <td className="px-4 py-2 text-zinc-300">{block.kind ?? "-"}</td>
              <td className="px-4 py-2 text-zinc-100">{block.title ?? "-"}</td>
              <td className="px-4 py-2 text-zinc-300">{block.priority ?? "-"}</td>
              <td className="py-2 pl-4 text-zinc-300">{block.score ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StageBars({ row }: { row: GenerationAuditRow }) {
  const stages = [
    ["Structurer", row.structurer_duration_ms],
    ["Validator", row.validator_duration_ms],
    ["RAG", row.rag_duration_ms],
    ["Writer", row.writer_duration_ms],
    ["Sanity", row.sanity_duration_ms],
  ] as const;
  const max = Math.max(...stages.map(([, value]) => value ?? 0), 1);

  return (
    <div className="space-y-3">
      {stages.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>{label}</span>
            <span>{formatMs(value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${Math.max(4, ((value ?? 0) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Sanity({ value }: { value: unknown }) {
  return (
    <div className="space-y-4">
      <Info label="verdict" value={sanityVerdict(value) ?? "-"} />
      <JsonBlock value={sanityIssues(value)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-zinc-200">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: "success" | "concerns" | "error" }) {
  const text =
    status === "success" ? "success" : status === "concerns" ? "concerns" : "error";
  const classes =
    status === "success"
      ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30"
      : status === "concerns"
        ? "bg-amber-400/10 text-amber-300 ring-amber-400/30"
        : "bg-red-400/10 text-red-300 ring-red-400/30";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {text}
    </span>
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
