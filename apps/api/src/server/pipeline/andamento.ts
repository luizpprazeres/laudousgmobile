/**
 * W16B — andamento da geração na tela, em etapas reais com o tempo decorrido.
 *
 * O app iOS (desde o build com `stage`, 21/06) mostra o `label` de cada evento `stage` como a etapa atual e
 * os `stage: "achado"` como chips; nada de timer ou etapa fixa do lado dele. Então tudo o que a tela mostra
 * vem daqui, sem build novo:
 *
 *   1 recebido     logo depois do `open`             "Ditado recebido"
 *   2 lendo        a extração (o grosso da espera)   "Lendo o ditado…", depois "Lendo o ditado… 6 s", "… 9 s"
 *   3 montando     renderer + pós-geração            "Montando o laudo…"
 *   4 pronto       o `done` (com `timings`)
 *
 * Os campos novos (`step`, `steps`, `elapsed_ms` no `stage`; `timings` no `done`) são aditivos: o Decodable do
 * Swift e o Zod do RN ignoram campo extra. Os valores de `stage` continuam os do enum (o RN descarta valor novo).
 * Flag `PROGRESS_ETAPAS` (rota); desligada, a rota segue como antes (RENDERER_PROGRESS repassa o renderer).
 */
import type { GenerateSSEEvent } from "@laudousg/shared";

type StageRenderer = { stage: "interpretando" | "achado" | "calculando" | "montando"; label: string };
type Emit = (ev: GenerateSSEEvent) => void;

export const ANDAMENTO_PASSOS = 4;
/** O relógio só aparece depois disto, e anda neste passo (troca de label anima no app: não a cada segundo). */
export const RELOGIO_A_PARTIR_MS = 4_000;
export const RELOGIO_PASSO_MS = 3_000;

export type Tempos = {
  /** Do request ao primeiro evento do servidor. */
  recebido_ms: number;
  /** Início da leitura do ditado (extração ou writer dedicado). */
  lendo_ms: number | null;
  /** Fim da leitura: o laudo começou a ser montado. */
  montando_ms: number | null;
  /** Texto do laudo na tela (primeiro `token`). */
  texto_ms: number | null;
  total_ms: number;
};

export type Andamento = {
  readonly ativo: boolean;
  recebido(): void;
  /** Adaptador do `onProgress` do renderer. */
  progresso(e: StageRenderer): void;
  /** Primeiro texto do laudo emitido (para o relógio e os tempos). */
  texto(): void;
  /** Para o relógio e devolve os tempos (chamar no `done`). */
  fim(): Tempos;
  /** Para o relógio sem emitir nada (erro, abort, `finally`). */
  parar(): void;
};

const segundos = (ms: number) => Math.floor(ms / 1000);
const semReticencias = (s: string) => s.replace(/[.…]+\s*$/, "");

export function criarAndamento(opts: {
  emit: Emit;
  /** Date.now() do início do request. */
  t0: number;
  ativo: boolean;
  agora?: () => number;
  relogio?: { set: (fn: () => void, ms: number) => unknown; clear: (h: unknown) => void };
}): Andamento {
  const agora = opts.agora ?? Date.now;
  const relogio = opts.relogio ?? { set: (fn, ms) => setInterval(fn, ms), clear: (h) => clearInterval(h as NodeJS.Timeout) };
  const marcas: { recebido: number | null; lendo: number | null; montando: number | null; texto: number | null } = {
    recebido: null, lendo: null, montando: null, texto: null,
  };
  let timer: unknown = null;
  let rotuloLendo = "Lendo o ditado";
  let ultimoRotulo = "";

  const decorrido = () => agora() - opts.t0;
  const stage = (stageCode: StageRenderer["stage"], step: number, label: string) => {
    ultimoRotulo = label;
    opts.emit({ type: "stage", ts: new Date().toISOString(), stage: stageCode, label, step, steps: ANDAMENTO_PASSOS, elapsed_ms: decorrido() });
  };
  const pararRelogio = () => {
    if (timer !== null) relogio.clear(timer);
    timer = null;
  };
  const tique = () => {
    if (marcas.montando !== null || marcas.texto !== null) return pararRelogio();
    const ms = decorrido();
    if (ms < RELOGIO_A_PARTIR_MS) return;
    const label = `${rotuloLendo}… ${segundos(ms)} s`;
    if (label !== ultimoRotulo) stage("interpretando", 2, label);
  };

  return {
    ativo: opts.ativo,
    recebido() {
      if (!opts.ativo || marcas.recebido !== null) return;
      marcas.recebido = decorrido();
      stage("interpretando", 1, "Ditado recebido");
    },
    progresso(e) {
      if (!opts.ativo) return;
      if (e.stage === "achado") {
        opts.emit({ type: "stage", ts: new Date().toISOString(), stage: "achado", label: e.label, step: 2, steps: ANDAMENTO_PASSOS, elapsed_ms: decorrido() });
        return;
      }
      if (e.stage === "montando") {
        if (marcas.montando !== null) return;
        marcas.montando = decorrido();
        pararRelogio();
        stage("montando", 3, "Montando o laudo…");
        return;
      }
      // interpretando/calculando: a leitura do ditado (extração ou writer dedicado); o renderer manda o rótulo.
      if (marcas.montando !== null) return;
      if (/^Interpretando o ditado/i.test(e.label)) rotuloLendo = "Lendo o ditado";
      else rotuloLendo = semReticencias(e.label);
      if (marcas.lendo === null) marcas.lendo = decorrido();
      const ms = decorrido();
      stage(e.stage, 2, ms >= RELOGIO_A_PARTIR_MS ? `${rotuloLendo}… ${segundos(ms)} s` : `${rotuloLendo}…`);
      if (timer === null) timer = relogio.set(tique, RELOGIO_PASSO_MS);
    },
    texto() {
      if (!opts.ativo || marcas.texto !== null) return;
      marcas.texto = decorrido();
      pararRelogio();
    },
    fim() {
      pararRelogio();
      return {
        recebido_ms: marcas.recebido ?? 0,
        lendo_ms: marcas.lendo,
        montando_ms: marcas.montando,
        texto_ms: marcas.texto,
        total_ms: decorrido(),
      };
    },
    parar: pararRelogio,
  };
}

/** Linha de log sem PHI para medir em produção (Vercel logs). */
export function linhaDeTempos(t: Tempos): string {
  const s = (ms: number | null) => (ms === null ? "-" : `${(ms / 1000).toFixed(1)}s`);
  return `recebido ${s(t.recebido_ms)} · lendo ${s(t.lendo_ms)} · montando ${s(t.montando_ms)} · texto ${s(t.texto_ms)} · done ${s(t.total_ms)}`;
}
