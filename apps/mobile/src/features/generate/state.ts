import type {
  GenerateSSEEvent,
  StructuredFindings,
  ClarifyQuestion,
  SanityResult,
} from "@laudousg/shared";

/**
 * Máquina de estado da tela Generate.
 *   idle → recording → transcribing → ready
 *                                   → generating
 *                                       → clarifying (Q&A inline)
 *                                       → done | blocked | error
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
    }
  | {
      kind: "blocked";
      text: string;
      reportId: string;
      sanity: SanityResult;
      reason: string;
    }
  | { kind: "error"; text: string; message: string };

export type GenerateAction =
  | { type: "EDIT_TEXT"; text: string }
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
      if (state.kind === "idle" || state.kind === "ready") {
        return {
          kind: action.text.trim().length > 0 ? "ready" : "idle",
          text: action.text,
        };
      }
      return state;

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
    case "clarify":
      return {
        kind: "clarifying",
        text: state.text,
        reportId: state.reportId ?? "",
        questions: ev.questions,
        answers: {},
      };
    case "done":
      return {
        kind: "done",
        text: state.text,
        reportId: ev.report_id,
        finalText: ev.final_text,
        structured: state.structured,
      };
    case "blocked":
      return {
        kind: "blocked",
        text: state.text,
        reportId: ev.report_id,
        sanity: ev.sanity,
        reason: ev.reason,
      };
    case "error":
      return { kind: "error", text: state.text, message: ev.message };
    case "validator":
    case "sanity":
    case "heartbeat":
      return state;
  }
}
