import { EditReportRequestSchema } from "@laudousg/shared";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { env } from "@/server/env";
import { editReport } from "@/server/pipeline/editReport";
import {
  loadReportForEdit,
  updateReportAfterEdit,
} from "@/server/db/reportsRepo";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  if (env().EDIT_INCREMENTAL !== "true") {
    return json({ error: "edit_incremental_disabled" }, 404);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = EditReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid_body", issues: parsed.error.format() },
      400,
    );
  }

  const input = parsed.data;
  const report = await loadReportForEdit({
    reportId: input.report_id,
    userId: user.id,
  });
  if (!report) return json({ error: "report_not_found" }, 404);

  // A edição parte SEMPRE do conteúdo armazenado do report — nunca de um
  // texto-base vindo do cliente (evita sobrescrever o laudo; review Dex1).
  const baseText = report.finalOutput ?? report.generatedOutput;
  if (!baseText?.trim()) return json({ error: "report_without_output" }, 409);

  const result = await editReport({
    baseText,
    instruction: input.instruction,
    category: report.categoryCode,
    signal: req.signal,
  });

  if (result.accepted) {
    const metadata = buildEditMetadata({
      previous: report.generationMetadata,
      instruction: input.instruction,
      category: report.categoryCode,
      changedLines: result.changedLines,
    });
    const updated = await updateReportAfterEdit({
      reportId: report.id,
      userId: user.id,
      finalOutput: result.editedText,
      metadata,
    });
    if (!updated) return json({ error: "report_not_found" }, 404);
  }

  return json({
    edited_text: result.editedText,
    changed_lines: result.changedLines,
    accepted: result.accepted,
    reason: result.reason,
  });
}

function buildEditMetadata(args: {
  previous: Record<string, unknown> | null;
  instruction: string;
  category: string;
  changedLines: unknown;
}) {
  const previousEdits = Array.isArray(args.previous?.incremental_edits)
    ? args.previous.incremental_edits
    : [];

  return {
    ...(args.previous ?? {}),
    incremental_edits: [
      ...previousEdits,
      {
        ts: new Date().toISOString(),
        category: args.category,
        instruction: args.instruction,
        changed_lines: args.changedLines,
      },
    ],
  };
}
