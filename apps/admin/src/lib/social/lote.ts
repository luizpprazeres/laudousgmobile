/**
 * POST /admin/api/social/lote — ações do Quadro, em JSON (o Quadro chama por fetch).
 *
 *  { acao: "aprovar" | "rascunho", ids: [...] }     até 100 ids; cada um passa por social_set_status
 *                                                    (as mesmas regras do editor: imagem em todos os
 *                                                    slides, quantidade de slides, horário futuro)
 *  { acao: "mover", id, de, data, hora? }            novo dia mantendo a hora (ou a hora nova), só rascunho,
 *                                                    só futuro, só se o horário atual ainda for `de`
 *  { acao: "reordenar", id, ordem: [3,1,2,…] }       permutação completa dos slides, só rascunho
 *
 * Mesma porta das outras rotas: origem do POST + sessão + allowlist + papel admin (autorizarAdmin);
 * falhou → 404 sem tocar no banco. Corpo só `application/json` (um formulário de outro site não chega
 * aqui sem preflight) e até 16 KB.
 */
import type { ConfigServidor } from "../env";
import { idsDoLote, moverPara, ordemValida, podeMover, dataHoraValidas, type AcaoLote } from "./quadro";
import { autorizarAdmin, naoEncontrado, respostaJson, type Autorizado } from "./rotas";
import { repositorioLote, type RepositorioLote, type ResultadoAcao } from "./servidor";
import { ID_POST, LIMITES } from "./tipos";

export const LIMITE_CORPO_LOTE = 16 * 1024;
/** Quantos posts o lote processa ao mesmo tempo (cada um trava só a própria linha). */
const PARALELO = 4;

export interface DependenciasLote {
  autorizar: (req: Request) => Promise<Autorizado | null>;
  repo: (cfg: ConfigServidor) => RepositorioLote;
  agora: () => number;
}

const padrao: DependenciasLote = { autorizar: autorizarAdmin, repo: (cfg) => repositorioLote(cfg), agora: Date.now };

export interface ItemResultadoLote {
  id: string;
  resultado: ResultadoAcao;
}

/** Roda `f` para cada id com no máximo `n` ao mesmo tempo; mantém a ordem do pedido. */
async function emParalelo<T>(ids: string[], n: number, f: (id: string) => Promise<T>): Promise<T[]> {
  const saida = new Array<T>(ids.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < ids.length) {
      const i = proximo++;
      saida[i] = await f(ids[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, ids.length) }, trabalhador));
  return saida;
}

const ehObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

async function lerCorpo(req: Request): Promise<Record<string, unknown> | null> {
  const tipo = (req.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (tipo !== "application/json") return null;
  const n = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(n) && n > LIMITE_CORPO_LOTE) return null;
  let txt: string;
  try {
    txt = await req.text();
  } catch {
    return null;
  }
  if (txt.length > LIMITE_CORPO_LOTE) return null;
  try {
    const v = JSON.parse(txt) as unknown;
    return ehObj(v) ? v : null;
  } catch {
    return null;
  }
}

export function criarRotaLote(deps: Partial<DependenciasLote> = {}) {
  const d: DependenciasLote = { ...padrao, ...deps };
  return async (req: Request): Promise<Response> => {
    const a = await d.autorizar(req);
    if (!a) return naoEncontrado();
    const corpo = await lerCorpo(req);
    const invalido = () => respostaJson({ erro: "pedido" }, a, 400);
    if (!corpo) return invalido();
    const repo = d.repo(a.cfg);
    const acao = corpo.acao;

    if (acao === "aprovar" || acao === "rascunho") {
      const ids = idsDoLote(corpo.ids);
      if (!ids) return invalido();
      const para = (acao as AcaoLote) === "aprovar" ? "approved" : "draft";
      const resultados = await emParalelo(ids, PARALELO, async (id): Promise<ItemResultadoLote> => {
        try {
          return { id, resultado: await repo.mudarStatus(id, para) };
        } catch {
          return { id, resultado: "falha" };
        }
      });
      return respostaJson({ acao, total: ids.length, ok: resultados.filter((r) => r.resultado === "ok").length, resultados }, a);
    }

    if (acao === "mover") {
      const id = typeof corpo.id === "string" && ID_POST.test(corpo.id) ? corpo.id : null;
      const de = typeof corpo.de === "string" && !Number.isNaN(Date.parse(corpo.de)) ? corpo.de : null;
      const dh = dataHoraValidas(corpo.data, corpo.hora);
      if (!id || !de || !dh) return invalido();
      let para: string;
      try {
        para = moverPara(de, dh.data, dh.hora);
      } catch {
        return invalido();
      }
      // Status e "mudou" quem decide é o banco (com a linha travada); aqui só o que não precisa dele.
      const previa = podeMover({ status: "draft" }, para, d.agora());
      if (previa !== "ok") return respostaJson({ resultado: previa }, a);
      let resultado: ResultadoAcao;
      try {
        resultado = await repo.reagendar(id, de, para);
      } catch {
        resultado = "falha";
      }
      return respostaJson(resultado === "ok" ? { resultado, scheduled_at: para } : { resultado }, a);
    }

    if (acao === "reordenar") {
      const id = typeof corpo.id === "string" && ID_POST.test(corpo.id) ? corpo.id : null;
      const ordem = corpo.ordem;
      if (!id || !Array.isArray(ordem) || !ordemValida(ordem, ordem.length) || ordem.length > LIMITES.slides) return invalido();
      let resultado: ResultadoAcao;
      try {
        resultado = await repo.reordenar(id, ordem);
      } catch {
        resultado = "falha";
      }
      return respostaJson({ resultado }, a);
    }

    return invalido();
  };
}
