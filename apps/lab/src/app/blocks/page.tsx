import { BlocksClient } from "@/components/blocks/BlocksClient";
import { listCategories, rootExists, type BlockStatus } from "@/lib/knowledge/fs";

export const dynamic = "force-dynamic";

type StatusFilter = BlockStatus | "all";

const VALID_STATUS: StatusFilter[] = ["all", "published", "draft", "deprecated"];

function parseStatusParam(value: string | string[] | undefined): StatusFilter {
  if (typeof value !== "string") return "all";
  return (VALID_STATUS as string[]).includes(value) ? (value as StatusFilter) : "all";
}

function parseStringParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

export default async function BlocksPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string | string[];
    cat?: string | string[];
    path?: string | string[];
  }>;
}) {
  const root = rootExists();
  if (!root.ok) {
    return (
      <div className="px-6 py-12 lg:px-10">
        <p className="font-mono text-[11px] uppercase tracking-widest text-rose-700">filesystem indisponível</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-stone-900">Editor de Blocks</h1>
        <p className="mt-2 max-w-xl text-sm text-stone-600">
          O diretório <code className="font-mono text-xs">{root.path}</code> não está acessível. Isso é esperado em prod (Vercel) — rode o Lab em dev local pra editar markdown.
        </p>
      </div>
    );
  }

  const sp = (await searchParams) ?? {};
  const initialStatusFilter = parseStatusParam(sp.status);
  const initialExpandedCategory = parseStringParam(sp.cat) ?? undefined;
  const initialPath = parseStringParam(sp.path);

  const categories = listCategories();

  return (
    <BlocksClient
      categories={categories}
      writable={root.writable}
      rootPath={root.path}
      initialPath={initialPath}
      initialStatusFilter={initialStatusFilter}
      initialExpandedCategory={initialExpandedCategory}
    />
  );
}
