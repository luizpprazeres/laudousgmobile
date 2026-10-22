/** Datas no fuso de São Paulo — funções puras (Intl), sem depender do fuso do servidor. */
import { FUSO } from "./tipos";

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "2026-10-26" válido (sem 30/02). */
export function dataValida(data: string): boolean {
  const m = DATA.exec(data);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.toISOString().slice(0, 10) === data;
}

export const horaValida = (hora: string) => HORA.test(hora);

const formatadores = new Map<string, Intl.DateTimeFormat>();
function formatador(fuso: string): Intl.DateTimeFormat {
  let f = formatadores.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: fuso, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    formatadores.set(fuso, f);
  }
  return f;
}

/** Partes do relógio de parede no fuso para um instante. */
function partes(ms: number, fuso: string) {
  const p = Object.fromEntries(formatador(fuso).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { ano: +p.year!, mes: +p.month!, dia: +p.day!, hora: +p.hour!, minuto: +p.minute!, segundo: +p.second! };
}

/** Diferença (ms) entre o relógio do fuso e o UTC naquele instante. */
function deslocamento(ms: number, fuso: string): number {
  const p = partes(ms, fuso);
  return Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - Math.floor(ms / 1000) * 1000;
}

/** "2026-10-26" + "12:15" no fuso → ISO UTC ("2026-10-26T15:15:00.000Z"). Lança com data/hora inválida. */
export function instanteNoFuso(data: string, hora: string, fuso = FUSO): string {
  if (!dataValida(data) || !horaValida(hora)) throw new Error(`data/hora inválida: ${data} ${hora}`);
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  const [h, mi] = hora.split(":").map(Number) as [number, number];
  const parede = Date.UTC(a, m - 1, d, h, mi);
  let ms = parede - deslocamento(parede, fuso);
  ms = parede - deslocamento(ms, fuso); // segunda passada acerta a troca de horário, se voltar a existir
  return new Date(ms).toISOString();
}

/** ISO → { data: "2026-10-26", hora: "12:15" } no fuso. */
export function noFuso(iso: string, fuso = FUSO): { data: string; hora: string } {
  const p = partes(new Date(iso).getTime(), fuso);
  const z = (n: number) => String(n).padStart(2, "0");
  return { data: `${p.ano}-${z(p.mes)}-${z(p.dia)}`, hora: `${z(p.hora)}:${z(p.minuto)}` };
}

/** Dia de hoje no fuso. */
export const hojeNoFuso = (agora = new Date(), fuso = FUSO) => noFuso(agora.toISOString(), fuso).data;

/** Soma dias a uma data civil (sem fuso). */
export function somarDias(data: string, n: number): string {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = segunda … 6 = domingo. */
export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

export type Visao = "semana" | "mes";

/** Dias exibidos (semanas inteiras, de segunda a domingo) e o intervalo [inicio, fim) em UTC. */
export function intervaloCalendario(visao: Visao, ref: string, fuso = FUSO): { dias: string[]; inicio: string; fim: string } {
  let primeiro: string;
  let total: number;
  if (visao === "semana") {
    primeiro = somarDias(ref, -diaDaSemana(ref));
    total = 7;
  } else {
    const um = `${ref.slice(0, 8)}01`;
    const ultimo = somarDias(somarDias(um, 32).slice(0, 8) + "01", -1);
    primeiro = somarDias(um, -diaDaSemana(um));
    const depois = somarDias(ultimo, 6 - diaDaSemana(ultimo));
    total = Math.round((Date.parse(depois) - Date.parse(primeiro)) / 86_400_000) + 1;
  }
  const dias = Array.from({ length: total }, (_, i) => somarDias(primeiro, i));
  return { dias, inicio: instanteNoFuso(dias[0]!, "00:00", fuso), fim: instanteNoFuso(somarDias(dias[dias.length - 1]!, 1), "00:00", fuso) };
}

/** Referência da navegação: anterior/próxima semana ou mês. */
export function navegar(visao: Visao, ref: string, passo: -1 | 1): string {
  if (visao === "semana") return somarDias(ref, 7 * passo);
  const [a, m] = ref.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(a, m - 1 + passo, 1)).toISOString().slice(0, 10);
}
