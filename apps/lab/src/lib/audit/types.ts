/**
 * Tipos da auditoria — cockpit (docs/projeto-modelos/06-lab-cockpit.md).
 *
 * Vieram de `lib/mock/audit.ts`, que era um arquivo de fixtures. Passam a viver
 * aqui porque a auditoria deixou de ser mock: lê `generation_audit` de verdade,
 * de todas as contas.
 *
 * O que saiu, em relação à versão antiga, e por quê:
 *  - `similarity` — o retriever vetorial foi aposentado (ADR-0004);
 *    `bundleLoader.ts:289` grava `similarity: null`. Medido: nulo em 458 de 532
 *    linhas nos últimos 30 dias. Exibir isso era mostrar sempre zero.
 *  - `blocksSkipped` / `skipped` — `route.ts:726` declara a lista vazia e nunca
 *    a preenche. Medido: 0 linhas com conteúdo em 30 dias.
 */

export type AuditStatus = "ok" | "warning" | "error";

export type AuditCompactBlock = {
  kind: string;
  priority: number;
  slug: string;
  /** Faixa de prioridade do bloco. Não é relevância — não existe mais score. */
  tier: "universal" | "contextual" | "optional";
};

export type AuditRow = {
  id: string;
  shortId: string;
  category: string;
  /** Data e hora completas — a auditoria cobre meses, não só hoje. */
  quando: string;
  time: string;
  durationMs: number;
  blocksUsed: number;
  status: AuditStatus;
  badge?: string;
  inputPreview: string;
  /** Quem gerou. O cockpit acompanha todas as contas. */
  medico: string | null;
  modelo: string | null;
  custoUsd: number | null;
  /** Liga com `reports` — é por aí que se chega à correção manual do médico. */
  reportId: string | null;
  issues: { tipo: string; severidade: "critical" | "warning" }[];
  /** O alerta mais grave, já ordenado — é o que vira etiqueta. */
  piorIssue: string | null;
};

/** Colunas da migration 0023 — opcionais: a query cai no fallback sem elas. */
export type AuditModeloDB = {
  model_catalog_id?: string | null;
  model_catalog_versao?: number | null;
  model_customization_versao?: number | null;
};

export type AuditDetail = AuditRow & {
  pipeline: string;
  promptVersion: string;
  contract: string;
  writingStyle: string;
  inputFull: string;
  outputText: string | null;
  systemMessage: string | null;
  /** Achados tipados da geração — é o que permite atribuir procedência. */
  structuredOutput: unknown;
  retrieved: AuditCompactBlock[];
  tokensIn: number | null;
  tokensOut: number | null;
  /**
   * Qual MODELO DE LAUDO montou o texto (migration 0023) — não confundir com
   * `modelo`, que é o modelo de IA (model_writer). `null` aqui significa que a
   * query caiu no fallback: o banco ainda não tem as colunas. Presente com
   * `catalogId: null` significa outra coisa — o laudo não passou pelo catálogo.
   */
  modeloCatalogo: {
    catalogId: string | null;
    catalogVersao: number | null;
    customizacaoVersao: number | null;
  } | null;
  warning?: { title: string; message: string };
};

export type AuditFiltros = {
  categoria?: string;
  medicoId?: string;
  status?: AuditStatus;
  de?: string;
  ate?: string;
  busca?: string;
  /** Filtra por TIPO de alerta do sanity (ex.: achado_inventado). */
  tipoIssue?: string;
  /** Só gerações com pelo menos um alerta crítico. */
  soCriticos?: boolean;
  pagina?: number;
  porPagina?: number;
};

export type AuditPagina = {
  linhas: AuditRow[];
  total: number;
  pagina: number;
  porPagina: number;
};
