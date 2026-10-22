import {
  ANALYTICS,
  ErroApple,
  RELATORIOS,
  diaApple,
  parseAnalytics,
  parseSales,
  type RegistroApple,
  type TipoSales,
} from "./diario-parser";
import type { TransporteApple } from "./diario-http";
export interface LoteApple {
  source: "sales" | "analytics";
  report_key: string;
  day: string;
  status: "ok" | "pending" | "error";
  rows: RegistroApple[];
  report_name?: string;
  error_code?: string;
}
export interface LogApple {
  source: string;
  report_key: string;
  day: string;
  status: string;
  fetched_at: string;
}
export interface RepositorioApple {
  logs(): Promise<LogApple[]>;
  salvar(lote: LoteApple): Promise<void>;
}
export const INICIO_APPLE = "2026-10-21";
export const PEDIDO_ANALYTICS = "4ab5fd58-848c-4d3b-aca7-954580b77c5b";
const identificador = (v: string) => /^[a-zA-Z0-9-]{1,100}$/.test(v);
const codigo = (e: unknown) =>
  e instanceof ErroApple ? e.code : "fetch_failed";
export async function executarApple(op: {
  transporte: TransporteApple;
  repo: RepositorioApple;
  appId: string;
  vendor: string;
  requestId: string;
  agora: Date;
  deadline: number;
  clock?: () => number;
}) {
  const clock = op.clock ?? Date.now;
  const logs = await op.repo.logs();
  const done = new Set(
    logs
      .filter((l) => l.status === "ok")
      .map((l) => `${l.source}:${l.report_key}:${l.day}`),
  );
  let ok = 0,
    pending = 0,
    errors = 0;
  const tempo = () => clock() < op.deadline - 1500;
  async function tentar(
    lote: LoteApple,
    baixar: () => Promise<RegistroApple[] | null>,
  ) {
    if (done.has(`${lote.source}:${lote.report_key}:${lote.day}`)) return;
    try {
      const rows = await baixar();
      lote.rows = rows ?? [];
      lote.status = rows === null ? "pending" : "ok";
      if (rows === null) lote.error_code = "not_published";
    } catch (e) {
      lote.error_code = codigo(e);
      lote.status = lote.error_code === "http_404" ? "pending" : "error";
      if (lote.status === "pending") lote.error_code = "not_published";
    }
    await op.repo.salvar(lote);
    if (lote.status === "ok") ok++;
    else if (lote.status === "pending") pending++;
    else errors++;
  }
  // Analytics first: instances expire after 35 days. All pages and all segments of an
  // instance must succeed before the atomic replacement is recorded as complete.
  if (!tempo()) return { ok, pending, errors, budget_exhausted: true };
  if (!identificador(op.requestId)) throw new ErroApple("invalid_request_id");
  try {
    const reports = await op.transporte.lista(
      `/v1/analyticsReportRequests/${op.requestId}/reports?limit=200`,
    );
    for (const report of reports.filter((r) =>
      (ANALYTICS as readonly string[]).includes(r.attributes.name),
    )) {
      if (!tempo()) break;
      if (!identificador(report.id)) throw new ErroApple("invalid_report_id");
      const instances = await op.transporte.lista(
        `/v1/analyticsReports/${report.id}/instances?filter%5Bgranularity%5D=DAILY&limit=200`,
      );
      for (const instance of instances.sort((a, b) =>
        String(a.attributes.processingDate).localeCompare(
          String(b.attributes.processingDate),
        ),
      )) {
        if (!tempo()) break;
        if (instance.attributes.granularity !== "DAILY") continue;
        const day = diaApple(instance.attributes.processingDate);
        if (day < INICIO_APPLE || !identificador(instance.id)) continue;
        await tentar(
          {
            source: "analytics",
            report_key: instance.id,
            day,
            status: "pending",
            rows: [],
            report_name: report.attributes.name,
          },
          async () => {
            const segments = await op.transporte.lista(
              `/v1/analyticsReportInstances/${instance.id}/segments?limit=200`,
            );
            if (!segments.length) return null;
            const tsvs: string[] = [];
            let bytes = 0;
            for (const segment of segments) {
              if (!tempo()) throw new ErroApple("time_budget");
              const tsv = await op.transporte.segmento(segment);
              bytes += Buffer.byteLength(tsv);
              if (bytes > 20 * 1024 * 1024)
                throw new ErroApple("report_too_large");
              tsvs.push(tsv);
            }
            return parseAnalytics(
              report.attributes.name,
              tsvs,
              op.appId,
            ).filter((r) => String(r.day) >= INICIO_APPLE);
          },
        );
      }
    }
  } catch (e) {
    await op.repo.salvar({
      source: "analytics",
      report_key: "catalog",
      day: op.agora.toISOString().slice(0, 10),
      status: "error",
      rows: [],
      error_code: codigo(e),
    });
    errors++;
  }
  const yesterday = new Date(op.agora);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const last = yesterday.toISOString().slice(0, 10);
  const tasks: { tipo: TipoSales; day: string }[] = [];
  for (
    let d = INICIO_APPLE;
    d <= last;
    d = new Date(Date.parse(`${d}T12:00:00Z`) + 86400000)
      .toISOString()
      .slice(0, 10)
  ) {
    for (const tipo of Object.keys(RELATORIOS) as TipoSales[])
      if (!done.has(`sales:${tipo}:${d}`)) tasks.push({ tipo, day: d });
  }
  // Oldest unattempted/retried first: a repeatedly unpublished file cannot starve backlog.
  const attempted = new Map(
    logs.map((l) => [`${l.source}:${l.report_key}:${l.day}`, l.fetched_at]),
  );
  tasks.sort((a, b) =>
    (attempted.get(`sales:${a.tipo}:${a.day}`) ?? "").localeCompare(
      attempted.get(`sales:${b.tipo}:${b.day}`) ?? "",
    ),
  );
  for (const { tipo, day } of tasks) {
    if (!tempo()) break;
    await tentar(
      { source: "sales", report_key: tipo, day, status: "pending", rows: [] },
      async () => {
        const q = new URLSearchParams({
          "filter[frequency]": "DAILY",
          "filter[reportDate]": day,
          "filter[reportSubType]": "SUMMARY",
          "filter[reportType]": tipo,
          "filter[vendorNumber]": op.vendor,
          "filter[version]": RELATORIOS[tipo],
        });
        const r = await op.transporte.sales(q);
        if (r.status === 404) return null;
        if (r.status !== 200 || !r.tsv) throw new ErroApple(`http_${r.status}`);
        return parseSales(tipo, r.tsv, day, op.appId);
      },
    );
  }
  return { ok, pending, errors, budget_exhausted: !tempo() };
}
