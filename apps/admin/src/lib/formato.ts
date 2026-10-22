/** Formatação pt-BR (mesma do protótipo). */
import type { Periodo } from "./data/tipos";

const nf0 = new Intl.NumberFormat("pt-BR");
export const int = (n: number | null | undefined) => (n == null ? "—" : nf0.format(Math.round(n)));
export function pct(x: number | null | undefined, casas = 1): string {
  if (x == null) return "—";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(x) + "%";
}
export function usd(x: number | null | undefined, casas?: number): string {
  if (x == null) return "—";
  const d = casas ?? (Math.abs(x) < 0.1 ? 4 : 2);
  return "US$ " + new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
}
export const brl = (x: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(x);
export const seg = (ms: number | null | undefined) =>
  ms == null ? "—" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ms / 1000) + " s";
export const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function dataHoraCurta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
export const PER: Record<Periodo, string> = { today: "hoje", d7: "últimos 7 dias", d30: "últimos 30 dias" };
export const PER_CURTO: Record<Periodo, string> = { today: "hoje", d7: "7 dias", d30: "30 dias" };
export function lerPeriodo(v: string | string[] | undefined): Periodo {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "today" || s === "d7" || s === "d30" ? s : "d30";
}
const ROTULO: Record<string, string> = {
  READY_FOR_SALE: "À venda", WAITING_FOR_REVIEW: "Aguardando revisão", IN_REVIEW: "Em revisão", PREPARE_FOR_SUBMISSION: "Em preparo",
  INSTALLED: "Instalado", ACCEPTED: "Aceito", INVITED: "Convidado", NOT_INVITED: "Não convidado", REVOKED: "Revogado",
  VALID: "Válido", PROCESSING: "Processando", INVALID: "Inválido", FAILED: "Falhou", EMAIL: "E-mail", PUBLIC_LINK: "Link público",
  expired: "expirado", active: "ativo", refunded: "reembolsado", grace: "carência",
};
export const rot = (s: string | null | undefined) => (s ? (ROTULO[s] ?? s) : "—");

/** Nome da categoria pela tabela categories; sem nome, "ABDOMEN_TOTAL_DOPPLER" → "Abdomen total doppler". */
export function nomeCategoria(code: string, mapa: Record<string, string>): string {
  return mapa[code] ?? code.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
