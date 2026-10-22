/**
 * Números de EXEMPLO para os cartões cuja fonte ainda não existe. Mesma semente e mesmo desenho do
 * protótipo aprovado. Cada métrica sai marcada como origem "exemplo" com o GO que falta.
 */
import { periodosDaSerie, somar } from "./agregar";
import { exemplo, type DadosPainel } from "./tipos";

export const GO = {
  landing: "G6 (frase da política) + G3 (tabela landing_daily)",
  loja: "G1 + G2 (chave Sales and Reports e pedido ONGOING da Analytics)",
  instal: "G1 (chave Sales and Reports + vendor number)",
  assin: "G3 (tabela iap_notifications) — ou G1 (SUBSCRIPTION_EVENT)",
  uso: "G3 (tabela ai_usage_events)",
  deepgram: "G3 + G5 (segundos de áudio do Deepgram)",
  fatura: "G5 (chaves de admin OpenAI/Anthropic)",
  crashLoja: "G1 (relatório de Crashes da Analytics)",
  surface: "G4 (separar iOS de web)",
} as const;

/** "G6 (…) + G3 (…)" → "G6 + G3"; "G3 (…) — ou G1 (…)" → "G3 ou G1". */
export function goCurto(go: string): string {
  const sem = go.replace(/\([^)]*\)/g, "");
  const ids = sem.match(/G\d+/g) ?? [go];
  return ids.join(/\bou\b/.test(sem) ? " ou " : " + ");
}

function gerador(semente: number) {
  let s = semente;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

type Exemplos = {
  aquisicao: Pick<
    DadosPainel["aquisicao"],
    "visitas_landing" | "cliques_loja" | "cliques_por_cta" | "visitas_pagina_loja" | "instalacoes" | "origem_instalacoes"
  >;
  assinaturas: Pick<DadosPainel["assinaturas"], "kpis" | "eventos_dia" | "linha_do_tempo" | "notificacoes_apple">;
  custos: Pick<DadosPainel["custos"], "outras_rotas_por_usuario_30d" | "deepgram_por_usuario_30d" | "fatura_mes">;
  saude: Pick<DadosPainel["saude"], "outras_rotas_30d" | "crashes_app_loja">;
};

export function gerarExemplos(dias: readonly string[]): Exemplos {
  const rnd = gerador(20261021);
  const n = dias.length;
  const visitas = dias.map((_, i) => Math.round(i < n - 5 ? 5 + rnd() * 6 : 14 + rnd() * 12));
  const ctas = ["Botão principal (hero)", "Cabeçalho", "Seção de preço", "Rodapé", "QR code"];
  const peso = [0.46, 0.14, 0.16, 0.08, 0.16];
  const cliques = visitas.map((v) => Math.round(v * (0.11 + rnd() * 0.06)));
  const porCta = (total: number) => {
    const out = peso.map((p) => Math.floor(total * p));
    out[0] = (out[0] ?? 0) + total - somar(out);
    return out;
  };
  const visitasLoja = cliques.map((c) => Math.round(c * (0.7 + rnd() * 0.25)));
  const instalacoes = visitasLoja.map((v) => Math.round(v * (0.18 + rnd() * 0.2)));
  const testes = dias.map((_, i) => (i >= n - 5 && rnd() > 0.45 ? 1 : 0));
  const pagos = dias.map((_, i) => (i >= n - 2 && rnd() > 0.5 ? 1 : 0));
  const cancelamentos = dias.map(() => 0);
  if (somar(testes) === 0) testes[n - 4] = 1;
  if (somar(pagos) === 0) pagos[n - 1] = 1;
  cancelamentos[n - 2] = 1;
  const d = (k: number) => {
    const iso = dias[Math.max(0, Math.min(n - 1, n - 1 + k))] ?? "";
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  };

  return {
    aquisicao: {
      visitas_landing: exemplo(GO.landing, "contador próprio agregado (sem cookie, sem IP)", periodosDaSerie(visitas)),
      cliques_loja: exemplo(GO.landing, "contador próprio agregado", periodosDaSerie(cliques)),
      cliques_por_cta: exemplo(GO.landing, "contador próprio agregado", {
        ctas,
        today: porCta(cliques[n - 1] ?? 0),
        d7: porCta(somar(cliques.slice(-7))),
        d30: porCta(somar(cliques)),
      }),
      visitas_pagina_loja: exemplo(GO.loja, "Apple Analytics Reports (App Store Discovery and Engagement)", periodosDaSerie(visitasLoja)),
      instalacoes: exemplo(GO.instal, "Apple salesReports SALES/SUMMARY (dia seguinte)", periodosDaSerie(instalacoes)),
      origem_instalacoes: exemplo(GO.loja, "Apple Analytics Reports (App Downloads), limiar de 5", {
        origens: [
          ["app.laudousg.com.br (ct=landing-*)", 0.55],
          ["Busca na App Store", 0.3],
          ["Navegação na loja", 0.1],
          ["Outros / sem origem", 0.05],
        ],
      }),
    },
    assinaturas: {
      kpis: exemplo(GO.assin, "iap_notifications (histórico) + SUBSCRIPTION_EVENT da Apple", {
        ativos_pagos: 1,
        em_teste: 2,
        cancelando: 1,
        expirados: 1,
        reembolsos: 0,
        conversao_teste_pago_pct: 33,
      }),
      eventos_dia: exemplo(GO.assin, "iap_notifications", { testes, pagos, cancelamentos }),
      linha_do_tempo: exemplo(GO.assin, "iap_notifications", [
        { quem: "Assinante A", eventos: [[d(-3), "Teste grátis iniciado"], [d(0), "Virou pago (R$ 129,90)"]] },
        { quem: "Assinante B", eventos: [[d(-2), "Teste grátis iniciado"], [d(-1), "Desligou a renovação"], [d(1), "Expira o teste"]] },
        { quem: "Assinante C", eventos: [[d(-1), "Teste grátis iniciado"]] },
      ]),
      notificacoes_apple: exemplo(GO.assin, "iap_notifications.result", {
        recebidas_30d: 9,
        aplicadas: 8,
        sem_dono: 1,
        ignoradas_teste: 0,
        ultima: `${d(0)} 14:02`,
      }),
    },
    custos: {
      outras_rotas_por_usuario_30d: exemplo(GO.uso, "ai_usage_events (transcrição, Consultor, visão, edição)", [
        { rotulo: "Usuário 1", transcricao: 0.41, consultor: 0.18, visao: 0.04, edicao: 0.06 },
        { rotulo: "Usuário 2", transcricao: 0.03, consultor: 0.01, visao: 0, edicao: 0.01 },
      ]),
      deepgram_por_usuario_30d: exemplo(GO.deepgram, "ai_usage_events.audio_seconds (enviado pelo app)", [
        { rotulo: "Usuário 1", minutos: 214, custo: 0.92 },
        { rotulo: "Usuário 2", minutos: 12, custo: 0.05 },
      ]),
      fatura_mes: exemplo(GO.fatura, "OpenAI Costs API + Anthropic Cost Report", { openai: 3.12, anthropic: 4.85, deepgram: 1.1, mes: "mês atual" }),
    },
    saude: {
      outras_rotas_30d: exemplo(GO.uso, "ai_usage_events.ok / error_code", [
        { rota: "transcribe", chamadas: 318, erros: 3 },
        { rota: "deepgram/token", chamadas: 142, erros: 0 },
        { rota: "consultant", chamadas: 37, erros: 1 },
        { rota: "analyze-image", chamadas: 12, erros: 0 },
        { rota: "edit", chamadas: 64, erros: 2 },
      ]),
      crashes_app_loja: exemplo(GO.crashLoja, "Apple Analytics Reports (Crashes)", { today: 0, d7: 0, d30: 0 }),
    },
  };
}
