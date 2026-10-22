/** Agregações puras (sem rede). Dias sempre no fuso de Brasília. */
import type { Periodo, SerieComPeriodos } from "./tipos";

export const FUSO = "America/Sao_Paulo";
const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** ISO/Date → "AAAA-MM-DD" no fuso de Brasília. */
export function diaBRT(instante: string | Date): string {
  const d = typeof instante === "string" ? new Date(instante) : instante;
  return fmtDia.format(d);
}

/** Os N dias-calendário até `hoje` (inclusive), em ordem. */
export function janelaDias(hoje: string, n = 30): string[] {
  const base = new Date(`${hoje}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - (n - 1) + i);
    return d.toISOString().slice(0, 10);
  });
}

/**
 * Início (00:00 em Brasília) do dia, como ISO UTC. O Brasil não tem horário de verão desde 2019,
 * então o deslocamento é fixo em -03:00.
 */
export function inicioDoDiaBRT(dia: string): string {
  return new Date(`${dia}T00:00:00-03:00`).toISOString();
}

export function somar(a: readonly number[]): number {
  return a.reduce((x, y) => x + y, 0);
}

export function periodosDaSerie(serie: number[]): SerieComPeriodos {
  return { serie, today: serie[serie.length - 1] ?? 0, d7: somar(serie.slice(-7)), d30: somar(serie) };
}

export function noPeriodo(serie: readonly number[], p: Periodo): number {
  if (p === "today") return serie[serie.length - 1] ?? 0;
  if (p === "d7") return somar(serie.slice(-7));
  return somar(serie);
}

/** Índice do primeiro dia de cada período dentro da janela de 30 dias. */
export function inicioPeriodo(dias: readonly string[], p: Periodo): string {
  const k = p === "today" ? 1 : p === "d7" ? 7 : dias.length;
  return dias[dias.length - k] ?? dias[0] ?? "";
}

export function contarPorDia<T>(linhas: readonly T[], dias: readonly string[], dataDe: (l: T) => string, peso?: (l: T) => number): number[] {
  const idx = new Map(dias.map((d, i) => [d, i]));
  const out = dias.map(() => 0);
  for (const l of linhas) {
    const i = idx.get(diaBRT(dataDe(l)));
    if (i !== undefined) out[i] = (out[i] ?? 0) + (peso ? peso(l) : 1);
  }
  return out;
}

export function distintosPorDia<T>(linhas: readonly T[], dias: readonly string[], dataDe: (l: T) => string, chave: (l: T) => string | null): number[] {
  const idx = new Map(dias.map((d, i) => [d, i]));
  const sets = dias.map(() => new Set<string>());
  for (const l of linhas) {
    const i = idx.get(diaBRT(dataDe(l)));
    const k = chave(l);
    if (i !== undefined && k) sets[i]?.add(k);
  }
  return sets.map((s) => s.size);
}

export function distintosDesde<T>(linhas: readonly T[], desdeDia: string, dataDe: (l: T) => string, chave: (l: T) => string | null): number {
  const s = new Set<string>();
  for (const l of linhas) {
    const k = chave(l);
    if (k && diaBRT(dataDe(l)) >= desdeDia) s.add(k);
  }
  return s.size;
}

/** Percentil contínuo (mesma definição do percentile_cont do Postgres). */
export function percentil(valores: readonly (number | null | undefined)[], p: number): number | null {
  const v = valores.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = v[lo] ?? 0;
  const b = v[hi] ?? a;
  return a + (b - a) * (pos - lo);
}

export function arred(x: number, casas = 4): number {
  const f = 10 ** casas;
  return Math.round(x * f) / f;
}

export function agruparContagem<T>(linhas: readonly T[], chave: (l: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of linhas) {
    const k = chave(l);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
