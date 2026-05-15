import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getDbClient, schema } from "@laudousg/db";
export { OPTIONS } from "@/server/cors";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AnalyticsResponseSchema = z.object({
  total_reports: z.number().int(),
  reports_last_7d: z.number().int(),
  reports_last_30d: z.number().int(),
  avg_latency_ms: z.number().int().nullable(),
  top_categories: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      count: z.number().int(),
    }),
  ),
  total_cost_usd: z.number(),
  edits_ratio: z.number(),
});

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const db = getDbClient();
  const [summary] = await db.execute(sql`
    select
      count(*)::int as total_reports,
      count(*) filter (where r.created_at >= now() - interval '7 days')::int as reports_last_7d,
      count(*) filter (where r.created_at >= now() - interval '30 days')::int as reports_last_30d,
      round(avg(gr.latency_ms_total))::int as avg_latency_ms,
      coalesce(sum(gr.cost_usd), 0)::float8 as total_cost_usd,
      case
        when count(*) filter (where r.generated_output is not null) = 0 then 0
        else (
          count(*) filter (
            where r.final_output is not null
              and r.generated_output is not null
              and r.final_output <> r.generated_output
          )::float8
          / count(*) filter (where r.generated_output is not null)::float8
        )
      end as edits_ratio
    from ${schema.reports} r
    left join ${schema.generationRuns} gr on gr.report_id = r.id
    where r.user_id = ${user.id}::uuid
  `);

  const topRows = await db.execute(sql`
    select
      r.category_code as code,
      coalesce(c.label, r.category_code) as label,
      count(*)::int as count
    from ${schema.reports} r
    left join ${schema.categories} c on c.code = r.category_code
    where r.user_id = ${user.id}::uuid
    group by r.category_code, c.label
    order by count(*) desc, r.category_code asc
    limit 5
  `);

  const response = AnalyticsResponseSchema.parse({
    total_reports: toInt(summary?.total_reports),
    reports_last_7d: toInt(summary?.reports_last_7d),
    reports_last_30d: toInt(summary?.reports_last_30d),
    avg_latency_ms:
      summary?.avg_latency_ms === null || summary?.avg_latency_ms === undefined
        ? null
        : toInt(summary.avg_latency_ms),
    top_categories: topRows.map((row) => ({
      code: String(row.code),
      label: String(row.label),
      count: toInt(row.count),
    })),
    total_cost_usd: toNumber(summary?.total_cost_usd),
    edits_ratio: toNumber(summary?.edits_ratio),
  });

  return json(response);
}

function toInt(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
