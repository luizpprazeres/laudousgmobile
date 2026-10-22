/**
 * Relatórios de vendas da Apple (salesReports SALES/SUMMARY, diário) — dependem do GO G1:
 * chave "Sales and Reports" (ASC_REPORTS_*) e o vendor number (ASC_VENDOR_NUMBER).
 * Sem isso, o painel mostra "Aguardando GO: G1" e não chama a Apple.
 *
 * ATENÇÃO: o parser foi escrito pela documentação da Apple e testado com um arquivo de exemplo;
 * ainda não rodou contra a resposta real (falta a chave). Conferir no primeiro dia após o G1.
 */
import { gunzipSync } from "node:zlib";
import { ascGet, credenciaisDoEnv } from "./cliente";

/** Product Type Identifier da Apple: 1/1F/1T = primeira instalação; 3/3F/3T = reinstalação; 7/7F/7T = atualização. */
const PRIMEIRA = new Set(["1", "1F", "1T"]);
const REINSTALACAO = new Set(["3", "3F", "3T"]);

export interface VendasDia {
  dia: string;
  primeiras: number;
  reinstalacoes: number;
  porPais: Record<string, number>;
}

/** Interpreta o TSV do SALES/SUMMARY (cabeçalho na 1ª linha). Função pura. */
export function interpretarVendasTsv(tsv: string, dia: string, appleId?: string): VendasDia {
  const [cab, ...linhas] = tsv.trim().split(/\r?\n/);
  const cols = (cab ?? "").split("\t");
  const i = (nome: string) => cols.indexOf(nome);
  const iTipo = i("Product Type Identifier");
  const iUnid = i("Units");
  const iPais = i("Country Code");
  const iApple = i("Apple Identifier");
  const out: VendasDia = { dia, primeiras: 0, reinstalacoes: 0, porPais: {} };
  if (iTipo < 0 || iUnid < 0) return out;
  for (const l of linhas) {
    const c = l.split("\t");
    if (appleId && iApple >= 0 && c[iApple] !== appleId) continue;
    const tipo = c[iTipo] ?? "";
    const u = Number(c[iUnid] ?? 0) || 0;
    if (PRIMEIRA.has(tipo)) {
      out.primeiras += u;
      const pais = iPais >= 0 ? (c[iPais] ?? "?") : "?";
      out.porPais[pais] = (out.porPais[pais] ?? 0) + u;
    } else if (REINSTALACAO.has(tipo)) out.reinstalacoes += u;
  }
  return out;
}

export type EstadoRelatorios = { status: "aguardando_go"; motivo: string } | { status: "ok"; dias: VendasDia[] } | { status: "erro"; motivo: string };

export function relatoriosConfigurados(env: Record<string, string | undefined> = process.env): boolean {
  return !!(env.ASC_VENDOR_NUMBER && credenciaisDoEnv("ASC_REPORTS", env));
}

/** Baixa o SUMMARY de um dia (AAAA-MM-DD). Só chamado depois do G1. */
export async function baixarVendasDia(dia: string, appleId: string): Promise<EstadoRelatorios> {
  const cred = credenciaisDoEnv("ASC_REPORTS");
  const vendor = process.env.ASC_VENDOR_NUMBER;
  if (!cred || !vendor) return { status: "aguardando_go", motivo: "G1 (chave Sales and Reports + vendor number)" };
  const q = new URLSearchParams({
    "filter[frequency]": "DAILY",
    "filter[reportDate]": dia,
    "filter[reportSubType]": "SUMMARY",
    "filter[reportType]": "SALES",
    "filter[vendorNumber]": vendor,
    "filter[version]": "1_0",
  });
  const r = await ascGet(cred, `/v1/salesReports?${q.toString()}`, { binario: true });
  if (r.status === 404) return { status: "ok", dias: [{ dia, primeiras: 0, reinstalacoes: 0, porPais: {} }] };
  if (r.status >= 300 || !r.bruto) return { status: "erro", motivo: `salesReports respondeu ${r.status}` };
  const tsv = gunzipSync(Buffer.from(r.bruto)).toString("utf8");
  return { status: "ok", dias: [interpretarVendasTsv(tsv, dia, appleId)] };
}
