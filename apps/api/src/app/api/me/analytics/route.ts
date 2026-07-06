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
  // Produção diária (fuso do médico, América/São Paulo): acompanhar o dia
  // corrente e o fechado de ontem (pedido Luiz 06/07).
  reports_today: z.number().int(),
  reports_yesterday: z.number().int(),
  avg_latency_ms: z.number().int().nullable(),
  top_categories: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      count: z.number().int(),
    }),
  ),
  // Top 5 patologias extraídas das CONCLUSÕES dos últimos laudos.
  top_pathologies: z.array(
    z.object({
      label: z.string(),
      count: z.number().int(),
    }),
  ),
  // Mantidos por compatibilidade (iOS decodifica estes campos). O Android
  // não exibe mais o custo (assinante não precisa — pedido Luiz 06/07).
  total_cost_usd: z.number(),
  edits_ratio: z.number(),
});

// Padrões de patologias (sobre texto normalizado: minúsculas, sem acento).
// Contagem por LAUDO (não por ocorrência), só na seção CONCLUSÃO e pulando
// linhas negativas ("sem evidência…").
const PATHOLOGY_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "Esteatose hepática", re: /esteatose/ },
  { label: "Colelitíase", re: /colelitiase|litiase biliar|calculo[^.\n]{0,25}vesicula/ },
  { label: "Colecistectomia prévia", re: /colecistectomia/ },
  { label: "Cisto renal", re: /cisto[^.\n]{0,30}(renal|rim )/ },
  { label: "Litíase renal", re: /litiase renal|nefrolitiase|calculo[^.\n]{0,25}(renal|rim |ureter|calice|piel)/ },
  { label: "Hidronefrose", re: /hidronefrose/ },
  { label: "Cisto hepático", re: /cisto[^.\n]{0,25}(hepatic|figado)/ },
  { label: "Hemangioma hepático", re: /hemangioma/ },
  { label: "Hepatomegalia", re: /hepatomegalia/ },
  { label: "Esplenomegalia", re: /esplenomegalia/ },
  { label: "Nódulo tireoidiano", re: /nodulo[^.\n]{0,35}tireoid|tireoide[^.\n]{0,35}nodulo|ti-?rads\s*[2-5]/ },
  { label: "Tireoidite", re: /tireoidite/ },
  { label: "Bócio", re: /bocio/ },
  { label: "Nódulo mamário", re: /nodulo[^.\n]{0,30}mam|bi-?rads\s*[3-5]/ },
  { label: "Cisto mamário", re: /cisto[^.\n]{0,25}mam/ },
  { label: "Mioma uterino", re: /\bmioma|leiomioma/ },
  { label: "Cisto ovariano/anexial", re: /cisto[^.\n]{0,35}(ovari|anexial)/ },
  { label: "Ovários policísticos", re: /ovarios? policistic|\bsop\b/ },
  { label: "Endometrioma", re: /endometrioma/ },
  { label: "Adenomiose", re: /adenomiose/ },
  { label: "Pólipo endometrial", re: /polipo endometrial/ },
  { label: "Hiperplasia prostática", re: /hiperplasia prostatica|prostata[^.\n]{0,35}aumentad/ },
  { label: "Varicocele", re: /varicocele/ },
  { label: "Hidrocele", re: /hidrocele/ },
  { label: "Hérnia inguinal", re: /hernia inguinal/ },
  { label: "Hérnia umbilical", re: /hernia umbilical/ },
  { label: "Lipoma", re: /lipoma/ },
  { label: "Tendinopatia", re: /tendinopatia|tendinose/ },
  { label: "Derrame articular", re: /derrame articular/ },
  { label: "Cisto de Baker", re: /cisto de baker/ },
  { label: "Trombose venosa", re: /trombose venosa|\btvp\b/ },
  { label: "Insuficiência venosa", re: /insuficiencia venosa|refluxo[^.\n]{0,30}(safena|venos)/ },
  { label: "Ateromatose", re: /ateromatose|placa[^.\n]{0,25}aterom/ },
  { label: "Linfonodomegalia", re: /linfonodomegalia|linfonod[^.\n]{0,35}aumentad/ },
  { label: "Oligoâmnio", re: /oligoamnio|oligodramnio/ },
  { label: "Polidrâmnio", re: /polidramnio/ },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Extrai patologias afirmadas na CONCLUSÃO de um laudo (1 por patologia). */
function pathologiesInReport(texto: string): Set<string> {
  const found = new Set<string>();
  const norm = normalize(texto);
  // Só a conclusão: é onde a patologia é afirmada (o corpo descreve tudo,
  // inclusive negativos). Sem conclusão detectável, pula o laudo.
  const idx = norm.indexOf("conclusao");
  if (idx < 0) return found;
  const conclusao = norm.slice(idx);
  const lines = conclusao.split(/\n+/);
  for (const line of lines) {
    // Linhas negativas não afirmam patologia.
    if (/sem evidencia|sem alteracoes|sem sinais|dentro d[oa]s? (limites|padroes)|aspecto habitual|normais\b/.test(line)) {
      continue;
    }
    for (const p of PATHOLOGY_PATTERNS) {
      if (!found.has(p.label) && p.re.test(line)) found.add(p.label);
    }
  }
  return found;
}

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const db = getDbClient();
  const [summary] = await db.execute(sql`
    select
      count(*)::int as total_reports,
      count(*) filter (where r.created_at >= now() - interval '7 days')::int as reports_last_7d,
      count(*) filter (where r.created_at >= now() - interval '30 days')::int as reports_last_30d,
      count(*) filter (
        where (r.created_at at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date
      )::int as reports_today,
      count(*) filter (
        where (r.created_at at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date - 1
      )::int as reports_yesterday,
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

  // Patologias: conclusões dos últimos 300 laudos, extração determinística.
  const textRows = await db.execute(sql`
    select coalesce(r.final_output, r.generated_output) as texto
    from ${schema.reports} r
    where r.user_id = ${user.id}::uuid
      and coalesce(r.final_output, r.generated_output) is not null
    order by r.created_at desc
    limit 300
  `);
  const pathologyCounts = new Map<string, number>();
  for (const row of textRows) {
    for (const label of pathologiesInReport(String(row.texto ?? ""))) {
      pathologyCounts.set(label, (pathologyCounts.get(label) ?? 0) + 1);
    }
  }
  const topPathologies = [...pathologyCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const response = AnalyticsResponseSchema.parse({
    total_reports: toInt(summary?.total_reports),
    reports_last_7d: toInt(summary?.reports_last_7d),
    reports_last_30d: toInt(summary?.reports_last_30d),
    reports_today: toInt(summary?.reports_today),
    reports_yesterday: toInt(summary?.reports_yesterday),
    avg_latency_ms:
      summary?.avg_latency_ms === null || summary?.avg_latency_ms === undefined
        ? null
        : toInt(summary.avg_latency_ms),
    top_categories: topRows.map((row) => ({
      code: String(row.code),
      label: String(row.label),
      count: toInt(row.count),
    })),
    top_pathologies: topPathologies,
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
