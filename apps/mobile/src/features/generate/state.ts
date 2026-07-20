import type {
  GenerateSSEEvent,
  StructuredFindings,
  ClarifyQuestion,
  SanityResult,
} from "@/shared";
import type { MapaVenoso } from "@laudousg/schemes";

/**
 * Máquina de estado da tela Generate.
 *   idle → recording → transcribing → ready
 *                                   → generating
 *                                       → clarifying (Q&A inline)
 *                                       → done | error
 */
export type GenerateState =
  | { kind: "idle"; text: string }
  | { kind: "recording"; text: string }
  | { kind: "transcribing"; text: string }
  | { kind: "ready"; text: string }
  | {
      kind: "generating";
      text: string;
      reportId?: string;
      structured?: StructuredFindings;
      ragBlockIds?: string[];
      streamedText: string;
      sanity?: SanityResult;
    }
  | {
      kind: "clarifying";
      text: string;
      reportId: string;
      questions: ClarifyQuestion[];
      answers: Record<string, string>;
    }
  | {
      kind: "done";
      text: string;
      reportId: string;
      finalText: string;
      structured?: StructuredFindings;
      sanity?: SanityResult;
      // Esquema visual venoso (cartografia) — chega no evento SSE "scheme" APÓS
      // o done. Só o DESENHO; o texto do laudo é o finalText (writer).
      venousMap?: MapaVenoso;
      // Versão da arte-base p/ o render escolher asset/coords/motor:
      // "venoso-anterior-1" (vista única) | "venous-4view-1" (8 células).
      venousAssetVersion?: string;
    }
  | { kind: "error"; text: string; message: string };

export type GenerateAction =
  | { type: "EDIT_TEXT"; text: string }
  // Anexa bloco ao texto ATUAL (reducer calcula — evita race de closure com
  // inserts assíncronos de calculadoras/análise de imagem; review Dex1 04/07)
  | { type: "APPEND_TEXT"; text: string }
  | { type: "EDIT_FINAL"; text: string }
  | { type: "START_REC" }
  | { type: "STOP_REC" }
  | { type: "TRANSCRIPTION_DONE"; text: string }
  | { type: "GENERATE" }
  | { type: "SSE_EVENT"; event: GenerateSSEEvent }
  | { type: "ANSWER_CLARIFY"; questionId: string; answer: string }
  | { type: "RESUME_AFTER_CLARIFY" }
  | { type: "RESET" }
  | { type: "FAIL"; message: string };

export const initialGenerateState: GenerateState = { kind: "idle", text: "" };

export function generateReducer(
  state: GenerateState,
  action: GenerateAction,
): GenerateState {
  switch (action.type) {
    case "EDIT_TEXT":
      // done/error também aceitam edição: mexer nos achados depois do laudo
      // pronto INICIA UM NOVO CICLO (o laudo anterior fica no histórico) —
      // fluxo "novo laudo sem botão Novo" (pedido Luiz 06/07).
      if (
        state.kind === "idle" ||
        state.kind === "ready" ||
        state.kind === "done" ||
        state.kind === "error"
      ) {
        return {
          kind: action.text.trim().length > 0 ? "ready" : "idle",
          text: action.text,
        };
      }
      return state;

    case "APPEND_TEXT": {
      if (
        state.kind !== "idle" &&
        state.kind !== "ready" &&
        state.kind !== "done" &&
        state.kind !== "error"
      )
        return state;
      const base = state.text.trimEnd();
      const merged = base ? base + "\n\n" + action.text : action.text;
      return {
        kind: merged.trim().length > 0 ? "ready" : "idle",
        text: merged,
      };
    }

    case "EDIT_FINAL":
      // Edição inline do laudo final (paridade iOS: TextEditor + autosave).
      if (state.kind !== "done") return state;
      return { ...state, finalText: action.text };

    case "START_REC":
      return { kind: "recording", text: state.text };

    case "STOP_REC":
      return { kind: "transcribing", text: state.text };

    case "TRANSCRIPTION_DONE": {
      const merged = [state.text, action.text].filter(Boolean).join(" ").trim();
      return { kind: "ready", text: merged };
    }

    case "GENERATE":
      if (state.kind !== "ready") return state;
      return { kind: "generating", text: state.text, streamedText: "" };

    case "SSE_EVENT":
      return applySse(state, action.event);

    case "ANSWER_CLARIFY":
      if (state.kind !== "clarifying") return state;
      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: action.answer },
      };

    case "RESUME_AFTER_CLARIFY":
      if (state.kind !== "clarifying") return state;
      return { kind: "generating", text: state.text, streamedText: "" };

    case "RESET":
      return initialGenerateState;

    case "FAIL":
      return { kind: "error", text: state.text, message: action.message };
  }
}

function applySse(
  state: GenerateState,
  ev: GenerateSSEEvent,
): GenerateState {
  // O backend emite `done` ANTES de `sanity` (generate/route.ts:1027 vs 1052) —
  // aceita sanity também no done, senão o card nunca aparece (review Dex1).
  if (state.kind === "done") {
    if (ev.type === "sanity") return { ...state, sanity: ev.result };
    if (ev.type === "scheme")
      return {
        ...state,
        venousMap: ev.map as MapaVenoso,
        venousAssetVersion: ev.asset_version,
      };
    return state;
  }
  if (state.kind !== "generating") return state;

  switch (ev.type) {
    case "open":
      return { ...state, reportId: ev.report_id };
    case "structured":
      return { ...state, structured: ev.payload };
    case "rag":
      return { ...state, ragBlockIds: ev.blocks_used };
    case "token":
      return { ...state, streamedText: state.streamedText + ev.delta };
    case "clarify": {
      // Fix codex T7 MÉDIO #4: defesa contra clarify durante token streaming.
      // Backend NÃO deveria emitir clarify depois de tokens — se isso acontecer,
      // é erro de protocolo. Tratamos como erro pra não perder texto parcial
      // (que ficaria órfão no streamedText sem ser exibido).
      if (state.streamedText && state.streamedText.length > 0) {
        return {
          kind: "error",
          text: state.text,
          message:
            "Erro de protocolo: o servidor pediu esclarecimento depois de já ter começado a gerar o laudo. Tente novamente.",
        };
      }
      return {
        kind: "clarifying",
        text: state.text,
        reportId: state.reportId ?? "",
        questions: ev.questions,
        answers: {},
      };
    }
    case "done":
      return {
        kind: "done",
        text: state.text,
        reportId: ev.report_id,
        finalText: ev.final_text,
        structured: state.structured,
        sanity: state.sanity,
      };
    case "blocked":
      // Feature de bloqueio removida — backend não emite mais este evento,
      // mas o schema SSE ainda o tipa por legado. Tratamos como no-op.
      return state;
    case "error":
      return { kind: "error", text: state.text, message: ev.message };
    case "sanity":
      // Guarda o resultado pro card "N pontos a revisar" no done (paridade iOS).
      return { ...state, sanity: ev.result };
    case "scheme":
      // scheme chega APÓS o done (tratado no bloco kind==="done"); em
      // "generating" é inesperado → no-op.
      return state;
    case "validator":
    case "heartbeat":
    case "warning":
      // warning é informativo (ex: RAG_EMPTY). Backend já registrou em
      // generation_metadata. UI pode escutar via prop callback no futuro
      // — por ora não muda state.
      return state;
  }
}
