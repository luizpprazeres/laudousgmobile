/**
 * Regras de tempo do agendador (F3) — puras, testáveis, usadas pelo cron e pelo painel.
 *  - o cron só publica sozinho o que venceu há no máximo 6 h (depois disso: "Atrasado", decisão manual);
 *  - stories manuais aparecem na faixa "Para publicar à mão agora" por 2 h a partir do horário;
 *  - "Publicando" há mais de 10 min = preso (a função caiu no meio); o editor oferece destravar;
 *  - 3 tentativas antes de virar falha.
 */
import type { LinhaPost } from "./tipos";

export const MAX_TENTATIVAS = 3;
export const JANELA_AUTOMATICA_MS = 6 * 3600_000;
export const JANELA_MANUAL_MS = 2 * 3600_000;
export const PRESO_MS = 10 * 60_000;

type Tempo = Pick<LinhaPost, "status" | "manual" | "scheduled_at">;

/** Aprovado automático cujo horário passou há mais de 6 h: o cron não publica mais. */
export function atrasado(p: Tempo, agora: number): boolean {
  return p.status === "approved" && !p.manual && Date.parse(p.scheduled_at) < agora - JANELA_AUTOMATICA_MS;
}

/** Story (ou post) manual aprovado cujo horário chegou, dentro da janela de 2 h. */
export function manualAgora(p: Tempo, agora: number): boolean {
  const t = Date.parse(p.scheduled_at);
  return p.status === "approved" && p.manual && t <= agora && t >= agora - JANELA_MANUAL_MS;
}

/** Em "publishing" sem mudança há mais de 10 min (updated_at é tocado a cada UPDATE). */
export function preso(p: Pick<LinhaPost, "status" | "updated_at">, agora: number): boolean {
  return p.status === "publishing" && Date.parse(p.updated_at) <= agora - PRESO_MS;
}

/** Instante-limite para destravar: só linhas sem mudança desde então. */
export const limitePreso = (agora: number) => new Date(agora - PRESO_MS).toISOString();

export interface Selo {
  rotulo: string;
  classe: "neutral" | "real" | "warn" | "ok" | "err" | "exm";
  /** Texto do title (motivo da falha, tentativa, orientação). */
  dica?: string;
}

/** Selo do calendário: Rascunho, Agendado, Atrasado, Manual, Publicando, Publicado, Falhou. */
export function seloPost(p: Pick<LinhaPost, "status" | "manual" | "scheduled_at" | "updated_at" | "attempts" | "last_error" | "permalink">, agora: number): Selo {
  switch (p.status) {
    case "draft":
      return { rotulo: "Rascunho", classe: "neutral" };
    case "approved":
      if (p.manual) return { rotulo: "Manual", classe: "exm", dica: "Sticker interativo: publique pelo app do Instagram na hora marcada e marque como publicado." };
      if (atrasado(p, agora)) return { rotulo: "Atrasado", classe: "warn", dica: "Passou mais de 6 h do horário: o envio automático não publica. Publique agora ou volte para rascunho." };
      return {
        rotulo: "Agendado",
        classe: "real",
        dica: p.attempts > 0 && p.last_error ? p.last_error : "O envio automático publica no horário (verifica a cada 5 min).",
      };
    case "publishing":
      return { rotulo: "Publicando", classe: "warn", dica: preso(p, agora) ? "Parado há mais de 10 min: abra o post para destravar." : undefined };
    case "published":
      return { rotulo: "Publicado", classe: "ok", dica: p.permalink ?? "Publicado (sem link registrado)." };
    case "failed":
      return { rotulo: "Falhou", classe: "err", dica: p.last_error ?? "Falhou sem motivo registrado." };
  }
}

/** Link do Instagram colado à mão: só https em instagram.com, curto. */
export function linkInstagram(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (t.length > 300) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" || !/^(www\.)?instagram\.com$/.test(u.hostname) || u.username || u.password || u.port) return null;
    return u.toString();
  } catch {
    return null;
  }
}
