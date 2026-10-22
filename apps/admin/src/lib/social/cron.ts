/**
 * Crons do Instagram (F3). Mesma proteção do cron da Apple: só com `Authorization: Bearer ${CRON_SECRET}`
 * (comparação em tempo constante); sem segredo ou com outro valor → 404, sem ler nada.
 *
 *  GET /admin/api/cron/social        a cada 5 min: publica os aprovados vencidos (até 6 h), por horário
 *  GET /admin/api/cron/social-token  diário: renova o token longo quando faltam menos de 15 dias
 *
 * A resposta JSON traz só ids de post e resultados; nunca token, legenda ou erro bruto.
 */
import { autorizadoCron } from "../asc/diario-servidor";
import { configServidor, type ConfigServidor } from "../env";
import { configInstagram, type ConfigInstagram } from "./config";
import { repositorioConta, type RepositorioConta } from "./conta";
import type { Buscar, OpcoesPublicacao } from "./instagram";
import { JANELA_AUTOMATICA_MS } from "./politica";
import { publicarPost, repositorioPublicacao, type RepositorioPublicacao, type ResultadoPublicacao } from "./publicacao";
import { executarRenovacao } from "./token";

/** Orçamento por execução (a rota tem maxDuration = 300). */
export const ORCAMENTO_CRON_MS = 240_000;
/** Só começa um post novo se sobrar pelo menos isto do orçamento. */
export const MINIMO_POR_POST_MS = 75_000;
/** Espera máxima do processamento por post (filhos + pai do carrossel). */
export const ESPERA_CRON_MS = 90_000;
export const MAX_POR_RODADA = 3;

export interface DependenciasFila {
  repo: RepositorioPublicacao;
  conta: RepositorioConta;
  chave: Buffer;
  buscar: Buscar;
  opcoes?: Omit<OpcoesPublicacao, "buscar" | "limiteMs">;
  agora?: () => number;
  orcamentoMs?: number;
  maxPorRodada?: number;
}

export interface ResumoFila {
  inicio: string;
  fila: number;
  posts: { id: string; resultado: ResultadoPublicacao }[];
  /** Posts selecionados que ficaram para a próxima rodada (orçamento ou parada). */
  adiados: number;
  parada?: ResultadoPublicacao;
}

/** Resultados que valem para a conta inteira: não adianta tentar o próximo post nesta rodada. */
const PARA_RODADA = new Set<ResultadoPublicacao>(["sem_conta", "token_vencido", "token_invalido", "limite"]);

export async function executarFila(d: DependenciasFila): Promise<ResumoFila> {
  const agora = d.agora ?? Date.now;
  const t0 = agora();
  const prazo = t0 + (d.orcamentoMs ?? ORCAMENTO_CRON_MS);
  const ate = new Date(t0).toISOString();
  const desde = new Date(t0 - JANELA_AUTOMATICA_MS).toISOString();
  const ids = await d.repo.fila(ate, desde, d.maxPorRodada ?? MAX_POR_RODADA);
  const resumo: ResumoFila = { inicio: ate, fila: ids.length, posts: [], adiados: 0 };
  for (const [i, id] of ids.entries()) {
    const resta = prazo - agora();
    if (resta < MINIMO_POR_POST_MS) {
      resumo.adiados = ids.length - i;
      break;
    }
    const r = await publicarPost(id, {
      repo: d.repo,
      conta: d.conta,
      chave: d.chave,
      modo: "cron",
      filtro: { ate, desde },
      opcoes: { ...d.opcoes, buscar: d.buscar, limiteMs: Math.min(ESPERA_CRON_MS, resta - 30_000) },
      agora,
    });
    resumo.posts.push({ id, resultado: r.resultado });
    if (PARA_RODADA.has(r.resultado)) {
      resumo.parada = r.resultado;
      resumo.adiados = ids.length - i - 1;
      break;
    }
  }
  return resumo;
}

export interface DependenciasCron {
  env?: Record<string, string | undefined>;
  servidor?: (env: Record<string, string | undefined>) => ConfigServidor | null;
  instagram?: (cfg: ConfigServidor, env: Record<string, string | undefined>) => ConfigInstagram | null;
  publicacao?: (cfg: ConfigServidor) => RepositorioPublicacao;
  conta?: (cfg: ConfigServidor) => RepositorioConta;
  buscar?: Buscar;
  opcoes?: Omit<OpcoesPublicacao, "buscar" | "limiteMs">;
  agora?: () => number;
}

const nada = () => new Response(null, { status: 404 });
const json = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: { "Cache-Control": "no-store" } });

function contexto(request: Request, op: DependenciasCron) {
  const env = op.env ?? process.env;
  if (!autorizadoCron(request.headers.get("authorization"), env.CRON_SECRET)) return null;
  const cfg = (op.servidor ?? configServidor)(env);
  const ig = cfg ? (op.instagram ?? ((c, e) => configInstagram(c.origemPublica, e)))(cfg, env) : null;
  return { cfg, ig };
}

export function criarCronSocial(op: DependenciasCron = {}) {
  return async (request: Request): Promise<Response> => {
    const c = contexto(request, op);
    if (!c) return nada();
    if (!c.cfg || !c.ig) return json({ error: "social_not_configured" }, 503);
    try {
      const resumo = await executarFila({
        repo: (op.publicacao ?? repositorioPublicacao)(c.cfg),
        conta: (op.conta ?? repositorioConta)(c.cfg),
        chave: c.ig.chave,
        buscar: op.buscar ?? ((url, init) => fetch(url, init)),
        opcoes: op.opcoes,
        agora: op.agora,
      });
      return json(resumo);
    } catch {
      console.warn("[social] cron_publicacao_falhou");
      return json({ error: "social_cron_failed" }, 503);
    }
  };
}

export function criarCronToken(op: DependenciasCron = {}) {
  return async (request: Request): Promise<Response> => {
    const c = contexto(request, op);
    if (!c) return nada();
    if (!c.cfg || !c.ig) return json({ error: "social_not_configured" }, 503);
    try {
      const r = await executarRenovacao({
        conta: (op.conta ?? repositorioConta)(c.cfg),
        chave: c.ig.chave,
        buscar: op.buscar ?? ((url, init) => fetch(url, init)),
        agora: op.agora,
      });
      return json(r);
    } catch {
      console.warn("[social] cron_token_falhou");
      return json({ error: "social_token_failed" }, 503);
    }
  };
}
