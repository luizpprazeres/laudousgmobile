/**
 * Junta tudo o que o painel mostra: reais (Supabase + App Store Connect), tabelas da fase 2 quando
 * existirem, e exemplos marcados onde ainda não há fonte. Só no servidor, depois de exigirAdmin().
 */
import { credenciaisDoEnv } from "../asc/cliente";
import { relatoriosConfigurados } from "../asc/relatorios";
import { lerTestflight } from "../asc/testflight";
import { emCache } from "../cache";
import type { ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";
import { diaBRT, janelaDias } from "./agregar";
import { gerarExemplos } from "./exemplo";
import { buscarFase2, montarNotificacoes, montarUso } from "./fonte-fase2";
import { buscarLinhas, montarReais } from "./fonte-supabase";
import type { DadosPainel, ResultadoFonte, TestflightDados } from "./tipos";

const MIN = 60_000;

async function testflight(cfg: ConfigServidor): Promise<ResultadoFonte<TestflightDados>> {
  const cred = credenciaisDoEnv("ASC");
  if (!cred) return { ok: false, motivo: "Chave do App Store Connect (App Manager) não configurada no servidor (GO G8)." };
  try {
    const dados = await emCache(`asc:testflight:${cfg.ascAppId}`, 10 * MIN, () => lerTestflight(cred, cfg.ascAppId));
    return { ok: true, dados };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "Falha ao consultar o App Store Connect." };
  }
}

export async function carregarPainel(cfg: ConfigServidor, agora = new Date()): Promise<DadosPainel> {
  const hoje = diaBRT(agora);
  const dias = janelaDias(hoje, 30);
  const sb = clienteServico(cfg);

  const [linhas, fase2, tf] = await Promise.all([
    emCache(`sb:linhas:${hoje}`, MIN, () => buscarLinhas(sb, dias)),
    emCache(`sb:fase2:${hoje}`, MIN, () => buscarFase2(sb, dias)),
    testflight(cfg),
  ]);
  const r = montarReais(linhas, dias);
  const ex = gerarExemplos(dias);
  const uso = fase2.uso ? montarUso(fase2.uso, r.pseudonimos) : {};
  const notif = fase2.notif ? montarNotificacoes(fase2.notif, dias, fase2.tentativas ?? []) : {};
  const avisos: string[] = [];
  if (!fase2.uso) avisos.push("Tabela ai_usage_events ainda não existe no banco (GO G3).");
  if (!fase2.notif) avisos.push("Tabela iap_notifications ainda não existe no banco (GO G3).");

  return {
    meta: { gerado_em: agora.toISOString(), hoje, dias, fuso: "America/Sao_Paulo", categorias: r.categorias },
    aquisicao: { ...ex.aquisicao, ...r.aquisicao },
    uso: r.uso,
    assinaturas: {
      ...r.assinaturas,
      kpis: ex.assinaturas.kpis,
      eventos_dia: notif.eventos ?? ex.assinaturas.eventos_dia,
      linha_do_tempo: ex.assinaturas.linha_do_tempo,
      notificacoes_apple: notif.notificacoes ?? ex.assinaturas.notificacoes_apple,
    },
    custos: {
      ...r.custos,
      outras_rotas_por_usuario_30d: uso.outras ?? ex.custos.outras_rotas_por_usuario_30d,
      deepgram_por_usuario_30d: uso.deepgram ?? ex.custos.deepgram_por_usuario_30d,
      fatura_mes: ex.custos.fatura_mes,
    },
    saude: {
      ...r.saude,
      outras_rotas_30d: uso.rotas ?? ex.saude.outras_rotas_30d,
      crashes_app_loja: ex.saude.crashes_app_loja,
    },
    testflight: tf,
    instalacoes_apple: relatoriosConfigurados()
      ? { status: "configurado", motivo: "Chave de relatórios presente; falta o job diário que grava apple_sales_daily (E4, depende de G3)." }
      : { status: "aguardando_go", motivo: "G1 (chave Sales and Reports + vendor number)" },
    avisos,
  };
}
