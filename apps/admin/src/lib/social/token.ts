/**
 * Renovação diária do token longo do Instagram (cron /admin/api/cron/social-token).
 * Regras (documentação da Meta, 22/10/2026): só renova token longo, ainda válido e com 24 h ou mais;
 * o novo vale 60 dias. Aqui: renova quando faltam menos de 15 dias. Falha nunca apaga o token salvo:
 * só registra data e motivo curto (sem token) para o painel avisar.
 */
import { cifrar, decifrar } from "./cifra";
import type { ContaComToken, RepositorioConta } from "./conta";
import { ErroInstagram, IDADE_MINIMA_RENOVACAO_MS, limpar, renovarToken, type Buscar } from "./instagram";

export const RENOVAR_ANTES_MS = 15 * 86400_000;
export const AVISO_VENCIMENTO_MS = 7 * 86400_000;

export type DecisaoRenovacao = "renovar" | "cedo" | "novo_demais" | "vencido";

export function decidirRenovacao(c: Pick<ContaComToken, "expiraEm" | "emitidoEm">, agora: number): DecisaoRenovacao {
  const expira = c.expiraEm ? Date.parse(c.expiraEm) : NaN;
  if (Number.isFinite(expira) && expira <= agora) return "vencido";
  if (Number.isFinite(expira) && expira - agora >= RENOVAR_ANTES_MS) return "cedo";
  // Validade desconhecida ou faltando menos de 15 dias: renova se o token tiver 24 h ou mais.
  const emitido = c.emitidoEm ? Date.parse(c.emitidoEm) : NaN;
  if (!Number.isFinite(emitido) || agora - emitido < IDADE_MINIMA_RENOVACAO_MS) return "novo_demais";
  return "renovar";
}

export type ResultadoRenovacao = DecisaoRenovacao | "renovado" | "sem_conta" | "token_invalido" | "falhou" | "concorrente";

export interface DependenciasRenovacao {
  conta: RepositorioConta;
  chave: Buffer;
  buscar: Buscar;
  agora?: () => number;
}

/** Nunca devolve nem registra o token; o resultado vai para a resposta JSON do cron. */
export async function executarRenovacao(d: DependenciasRenovacao): Promise<{ resultado: ResultadoRenovacao; expiraEm?: string | null }> {
  const agora = d.agora ?? Date.now;
  const conta = await d.conta.lerComToken();
  if (!conta) return { resultado: "sem_conta" };
  const decisao = decidirRenovacao(conta, agora());
  if (decisao !== "renovar") return { resultado: decisao, expiraEm: conta.expiraEm };
  const quando = () => new Date(agora()).toISOString();
  const registrar = async (msg: string) => {
    try {
      await d.conta.falhaRenovacao(conta.igUserId, msg.slice(0, 300), quando());
    } catch {
      console.warn("[social] renovacao_falha_nao_gravou");
    }
  };

  let token: string;
  try {
    token = decifrar(conta.tokenCifrado, d.chave);
  } catch {
    await registrar("O token salvo não abre com a chave atual (SOCIAL_TOKEN_KEY mudou?). Reconecte a conta.");
    return { resultado: "token_invalido", expiraEm: conta.expiraEm };
  }

  let novo: { token: string; expiraEm: string | null };
  try {
    novo = await renovarToken(token, d.buscar, agora());
  } catch (e) {
    const base = e instanceof ErroInstagram ? e.message : "erro interno na renovação";
    await registrar(limpar(`Renovação recusada: ${base}`, [token]));
    return { resultado: "falhou", expiraEm: conta.expiraEm };
  }

  let ok: boolean;
  try {
    ok = await d.conta.renovado({ igUserId: conta.igUserId, anterior: conta.tokenCifrado, tokenCifrado: cifrar(novo.token, d.chave), expiraEm: novo.expiraEm, quando: quando() });
  } catch {
    await registrar("O Instagram renovou, mas o banco não gravou o token novo; o anterior continua salvo.");
    return { resultado: "falhou", expiraEm: conta.expiraEm };
  }
  if (!ok) return { resultado: "concorrente", expiraEm: conta.expiraEm };
  return { resultado: "renovado", expiraEm: novo.expiraEm };
}

/** Aviso do painel: vence em menos de 7 dias, já venceu, ou a última renovação falhou. */
export function avisoToken(c: { token_expires_at: string | null; token_refresh_failed_at?: string | null; token_refresh_error?: string | null } | null | undefined, agora: number): { vencido: boolean; venceLogo: boolean; diasRestantes: number | null; falhou: boolean } {
  const expira = c?.token_expires_at ? Date.parse(c.token_expires_at) : NaN;
  const resta = Number.isFinite(expira) ? expira - agora : NaN;
  return {
    vencido: Number.isFinite(resta) && resta <= 0,
    venceLogo: Number.isFinite(resta) && resta > 0 && resta < AVISO_VENCIMENTO_MS,
    diasRestantes: Number.isFinite(resta) ? Math.max(0, Math.ceil(resta / 86400_000)) : null,
    falhou: !!c?.token_refresh_failed_at,
  };
}
