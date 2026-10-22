import { EVENTOS_ASSINATURA } from "./diario-eventos";
/** Official schemas: Sales SUMMARY 1_0; Subscription/Event SUMMARY 1_3;
 * Analytics Standard, tab-delimited gzip. Only fixed aggregate dimensions survive. */
export const RELATORIOS = {
  SALES: "1_0",
  SUBSCRIPTION: "1_3",
  SUBSCRIPTION_EVENT: "1_3",
} as const;
export type TipoSales = keyof typeof RELATORIOS;
export const ANALYTICS = [
  "App Store Discovery and Engagement Standard",
  "App Store Downloads Standard",
  "App Sessions Standard",
  "App Crashes",
] as const;
export type RegistroApple = Record<string, string | number | null>;
export class ErroApple extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const falha = (): never => {
  throw new ErroApple("invalid_report");
};
const normal = (s: string) => s.replace(/\u00a0/g, " ").trim();
export function linhasTsv(
  tsv: string,
  obrigatorias: string[],
): Record<string, string>[] {
  const lines = tsv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const cols = (lines.shift() ?? "").split("\t").map(normal);
  if (
    obrigatorias.some((c) => !cols.includes(c)) ||
    new Set(cols).size !== cols.length
  )
    falha();
  if (lines.length > 150_000) throw new ErroApple("report_too_large");
  return lines.map((l) => {
    const values = l.split("\t");
    if (values.length !== cols.length) falha();
    return Object.fromEntries(cols.map((c, i) => [c, normal(values[i] ?? "")]));
  });
}
export function diaApple(s: string): string {
  const v = /^\d{2}\/\d{2}\/\d{4}$/.test(s)
    ? `${s.slice(6)}-${s.slice(0, 2)}-${s.slice(3, 5)}`
    : s;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) !== v
  )
    falha();
  return v;
}
const numero = (v: string | undefined, inteiro = true): number => {
  if (!v || !/^-?\d+(?:\.\d+)?$/.test(v)) return falha();
  const n = Number(v);
  if (!Number.isFinite(n) || (inteiro && !Number.isSafeInteger(n))) falha();
  return n;
};
const dimensao = (v: string | undefined, re: RegExp, fallback = "") =>
  v && re.test(v) ? v : fallback;
const dispositivo = (v: string | undefined) =>
  [
    "iPhone",
    "iPad",
    "iPod touch",
    "Desktop",
    "Apple TV",
    "Apple Vision",
    "Apple Vision Pro",
    "Mac",
  ].includes(v ?? "")
    ? v!
    : "other";
const pais = (v?: string) => dimensao(v, /^[A-Z]{2,3}$/);
const versao = (v?: string) => dimensao(v, /^[0-9][0-9a-zA-Z._-]{0,31}$/);
const produto = (v?: string) => dimensao(v, /^\d{1,20}$/) || falha();
/** Group after discarding names, SKU, subscriber fields, referrers and free-form dimensions. */
function agregar(rows: RegistroApple[], metricas: string[]): RegistroApple[] {
  const groups = new Map<string, RegistroApple>();
  for (const row of rows) {
    const key = JSON.stringify(
      Object.entries(row).filter(([k]) => !metricas.includes(k)),
    );
    const prev = groups.get(key);
    if (!prev) groups.set(key, { ...row });
    else
      for (const k of metricas)
        prev[k] =
          prev[k] === null || row[k] === null
            ? null
            : Number(prev[k]) + Number(row[k]);
  }
  return [...groups.values()];
}
export function parseSales(
  tipo: TipoSales,
  tsv: string,
  day: string,
  appId: string,
): RegistroApple[] {
  diaApple(day);
  if (tipo === "SALES")
    return agregar(
      linhasTsv(tsv, [
        "Apple Identifier",
        "Product Type Identifier",
        "Units",
        "Country Code",
        "Device",
        "Version",
      ])
        .filter((r) => r["Apple Identifier"] === appId)
        .map((r) => {
          const units = numero(r.Units);
          return {
            day,
            product_type:
              dimensao(r["Product Type Identifier"], /^[A-Z0-9]{1,8}$/) ||
              falha(),
            country: pais(r["Country Code"]),
            device: dispositivo(r.Device),
            app_version: versao(r.Version),
            currency: dimensao(r["Currency of Proceeds"], /^[A-Z]{3}$/),
            units,
            proceeds: r["Developer Proceeds"]
              ? numero(r["Developer Proceeds"], false) * units
              : null,
          };
        }),
      ["units", "proceeds"],
    );
  if (tipo === "SUBSCRIPTION") {
    const rows = linhasTsv(tsv, [
      "App Apple ID",
      "Subscription Apple ID",
      "Country",
      "Device",
      "Active Standard Price Subscriptions",
      "Active Free Trial Introductory Offer Subscriptions",
      "Billing Retry",
      "Grace Period",
    ]);
    return agregar(
      rows
        .filter((r) => r["App Apple ID"] === appId)
        .map((r) => {
          // All offer counters in the official 1_3 schema; never count Subscribers (suppressed <4).
          let paid = numero(r["Active Standard Price Subscriptions"]),
            trials = 0;
          for (const [k, v] of Object.entries(r)) {
            if (/Free Trial.*(?:Subscriptions|Offers)$/.test(k))
              trials += numero(v);
            else if (
              /(?:Pay Up Front|Pay [Aa]s You Go).*(?:Subscriptions|Offers)$/.test(
                k,
              )
            )
              paid += numero(v);
          }
          return {
            day,
            product_id: produto(r["Subscription Apple ID"]),
            country: pais(r.Country),
            device: dispositivo(r.Device),
            paid,
            trials,
            billing_retry: numero(r["Billing Retry"]),
            grace: numero(r["Grace Period"]),
          };
        }),
      ["paid", "trials", "billing_retry", "grace"],
    );
  }
  return agregar(
    linhasTsv(tsv, [
      "Event Date",
      "Event",
      "App Apple ID",
      "Subscription Apple ID",
      "Quantity",
      "Country",
      "Device",
    ])
      .filter((r) => r["App Apple ID"] === appId)
      .map((r) => ({
        day: diaApple(r["Event Date"]!),
        product_id: produto(r["Subscription Apple ID"]),
        event: EVENTOS_ASSINATURA.has(r.Event ?? "") ? r.Event! : "Other",
        country: pais(r.Country),
        device: dispositivo(r.Device),
        quantity: numero(r.Quantity),
      }))
      .filter((r) => r.day === day),
    ["quantity"],
  );
}
const source = (s?: string) =>
  [
    "App Store search",
    "App Store browse",
    "App referrer",
    "Web referrer",
    "App Clip",
    "Notification",
    "Unavailable",
    "Institutional purchase",
  ].includes(s ?? "")
    ? s!
    : "Other";
const event = (s?: string) =>
  [
    "Impression",
    "Page view",
    "Tap",
    "First-time Download",
    "Redownload",
    "Manual update",
    "Auto-update",
    "Restore",
  ].includes(s ?? "")
    ? s!
    : "Other";
export function parseAnalytics(
  report: string,
  tsvs: string[],
  appId: string,
): RegistroApple[] {
  if (!(ANALYTICS as readonly string[]).includes(report)) falha();
  const metricas =
    report === "App Crashes"
      ? ["Crashes"]
      : report === "App Sessions Standard"
        ? ["Sessions", "Total Session Duration"]
        : ["Counts"];
  const rows = tsvs.flatMap((tsv) =>
    linhasTsv(
      tsv,
      ["Date", "App Apple Identifier", "Device", "App Version"]
        .filter((c) => !(report.includes("Discovery") && c === "App Version"))
        .concat(metricas),
    ),
  );
  return agregar(
    rows
      .filter((r) => r["App Apple Identifier"] === appId)
      .map((r) => ({
        day: diaApple(r.Date!),
        report_name: report,
        country: pais(r.Territory),
        device: dispositivo(r.Device),
        app_version: versao(r["App Version"]),
        source_type: source(r["Source Type"]),
        event: event(r.Event ?? r["Download Type"]),
        page_type: dimensao(
          r["Page Type"],
          /^(?:Product page|No page|In-[Aa]pp event|Store sheet|Notification|App version history|App privacy|Developer page|App accessibility|Media view)$/,
          "Other",
        ),
        counts: numero(r[metricas[0]!]!),
        duration_seconds:
          report === "App Sessions Standard"
            ? numero(r["Total Session Duration"])
            : null,
      })),
    ["counts", "duration_seconds"],
  );
}
