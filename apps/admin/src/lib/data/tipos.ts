/**
 * Contrato dos dados do painel — o mesmo formato do snapshot do protótipo aprovado
 * (docs/admin/prototipo/dados.json). Toda métrica diz se é REAL (com a fonte) ou EXEMPLO
 * (com o GO que falta). Nunca há número sem essa marca.
 */

export type Periodo = "today" | "d7" | "d30";
export const PERIODOS: readonly Periodo[] = ["today", "d7", "d30"];

export interface MetricaReal<T> {
  origem: "real";
  fonte: string;
  nota?: string;
  go_nota?: string;
  v: T;
}
export interface MetricaExemplo<T> {
  origem: "exemplo";
  go: string;
  fonte_futura: string;
  nota?: string;
  v: T;
}
export type Metrica<T> = MetricaReal<T> | MetricaExemplo<T>;

export const real = <T>(fonte: string, v: T, extra: { nota?: string; go_nota?: string } = {}): MetricaReal<T> => ({
  origem: "real",
  fonte,
  ...extra,
  v,
});
export const exemplo = <T>(go: string, fonte_futura: string, v: T, extra: { nota?: string } = {}): MetricaExemplo<T> => ({
  origem: "exemplo",
  go,
  fonte_futura,
  ...extra,
  v,
});

export interface SerieComPeriodos {
  indisponivel?: Partial<Record<Periodo, boolean>>;
  serie: number[];
  today: number;
  d7: number;
  d30: number;
}

export interface CategoriaContagem {
  code: string;
  label: string;
  n: number;
}

export interface CustoPeriodo {
  rows: number;
  cost_usd: number;
  cost_null_rows: number;
  tin: number;
  tout: number;
  errors: number;
  custo_por_laudo: number | null;
}

export interface ResultadoGeracao {
  success: number;
  blocked: number;
  error: number;
  total: number;
  erro_pct: number;
  bloqueio_pct: number;
}

export interface ErroRecente {
  at: string;
  code: string;
  stage: string;
  cat: string;
  model: string;
  ms: number | null;
}

export interface CodigoErro {
  code: string;
  stage: string;
  n: number;
  n30: number;
  last_at: string;
}

export interface ModeloCusto {
  model: string;
  n: number;
  avg_in: number;
  avg_out: number;
  cost: number | null;
  avg_cost: number | null;
  null_cost: number;
}

export interface UsuarioCusto {
  rotulo: string;
  n: number;
  cost: number;
  cats: number;
  errs: number;
}

export interface TestflightDados {
  app: { id: string; name: string };
  versoes_loja: { versao: string; estado: string; criada: string }[];
  grupos: { nome: string; interno: boolean; link_publico: boolean; criado: string; testadores: number }[];
  testadores: {
    iniciais: string;
    convite: string | null;
    estado: string | null;
    grupos: string[];
    sessoes_30d: number;
    crashes_30d: number;
    feedbacks_30d: number;
  }[];
  uso: { d30: { sessoes: number; crashes: number }; d7: { sessoes: number; crashes: number } };
  builds: {
    build: string;
    versao: string | null;
    enviado: string;
    estado: string;
    expirado: boolean;
    instalacoes: number;
    sessoes: number;
    crashes: number;
  }[];
  feedback: { crash: number | null; screenshot: number | null };
  chamadas: { path: string; status: number }[];
  coletado_em: string;
}

export type ResultadoFonte<T> = { ok: true; dados: T } | { ok: false; motivo: string };

export interface DadosPainel {
  meta: { gerado_em: string; hoje: string; dias: string[]; fuso: string; categorias: Record<string, string> };
  aquisicao: {
    reinstalacoes?: Metrica<SerieComPeriodos>;
    qr_aberturas?: Metrica<SerieComPeriodos>;
    apple_dias?: Metrica<{ day: string; primeiras: number | null; reinstalacoes: number | null }[]>;
    apple_origens?: Metrica<[string, number][]>;
    visitas_landing: Metrica<SerieComPeriodos>;
    cliques_loja: Metrica<SerieComPeriodos>;
    cliques_por_cta: Metrica<{ ctas: string[]; today: number[]; d7: number[]; d30: number[] }>;
    visitas_pagina_loja: Metrica<SerieComPeriodos>;
    instalacoes: Metrica<SerieComPeriodos>;
    origem_instalacoes: Metrica<{ origens: [string, number][] }>;
    contas_novas: Metrica<SerieComPeriodos & { total: number }>;
    onboarding_concluido: Metrica<{ total: number; de: number }>;
    primeiro_laudo_novos: Metrica<Record<Periodo, number>>;
  };
  uso: {
    laudos: Metrica<SerieComPeriodos & { total: number }>;
    usuarios_ativos: Metrica<SerieComPeriodos>;
    laudos_por_categoria: Metrica<Record<Periodo, CategoriaContagem[]>>;
    feedback_30d: Metrica<Record<string, number>>;
    eventos_produto: Metrica<{ surface: string; n: number }[]>;
  };
  assinaturas: {
    conciliacao_apple?: Metrica<{ day: string; paid: number; trials: number; grace: number; billing_retry: number; eventos: number | null }>;
    produto: Metrica<{ id: string; nome: string; preco_brl: number; teste_gratis_dias: number }>;
    estado_atual: Metrica<{
      producao: { ativos: number; em_teste: number; grace: number; expirados: number; reembolsados: number; linhas: number };
      sandbox: { product_id: string; status: string; is_trial: boolean; n: number }[];
    }>;
    plano_gravado: Metrica<Record<string, number>>;
    kpis: Metrica<{
      ativos_pagos: number;
      em_teste: number;
      cancelando: number;
      expirados: number;
      reembolsos: number;
      conversao_teste_pago_pct: number | null;
    }>;
    eventos_dia: Metrica<{ testes: number[]; pagos: number[]; cancelamentos: number[] }>;
    linha_do_tempo: Metrica<{ quem: string; eventos: [string, string][] }[]>;
    notificacoes_apple: Metrica<{ recebidas_30d: number; aplicadas: number; sem_dono: number; ignoradas_teste: number; ultima: string }>;
  };
  custos: {
    geracao_periodo: Metrica<Record<Periodo, CustoPeriodo>>;
    geracao_dia: Metrica<{ serie: number[] }>;
    por_modelo_30d: Metrica<ModeloCusto[]>;
    por_categoria_30d: Metrica<[string, number, number][]>;
    por_usuario_30d: Metrica<UsuarioCusto[]>;
    outras_rotas_por_usuario_30d: Metrica<{ rotulo: string; transcricao: number; consultor: number; visao: number; edicao: number }[]>;
    deepgram_por_usuario_30d: Metrica<{ rotulo: string; minutos: number; custo: number }[]>;
    fatura_mes: Metrica<{ openai: number; anthropic: number; deepgram: number; mes: string }>;
  };
  saude: {
    geracao: Metrica<Record<Periodo | "all", ResultadoGeracao>>;
    geracao_dia: Metrica<{ ok: number[]; blocked: number[]; error: number[] }>;
    codigos_erro: Metrica<CodigoErro[]>;
    ultimos_erros: Metrica<ErroRecente[]>;
    duracoes_30d: Metrica<{ total_p50: number | null; total_p95: number | null; writer_p50: number | null; writer_p95: number | null; structurer_p50: number | null }>;
    outras_rotas_30d: Metrica<{ rota: string; chamadas: number; erros: number }[]>;
    crashes_app_loja: Metrica<Record<Periodo, number>>;
  };
  testflight: ResultadoFonte<TestflightDados>;
  instalacoes_apple: { status: "aguardando_go" | "configurado"; motivo: string };
  avisos: string[];
}
