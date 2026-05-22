export type RagBlockSummary = {
  id: string;
  kind: string;
  title: string;
  priority: number;
};

export type SSEEvent =
  | { type: "open"; ts: string; report_id: string }
  | { type: "structured"; ts: string; payload: unknown }
  | { type: "validator"; ts: string; result: { ok: boolean; issues?: unknown[]; questions?: unknown[] } }
  | { type: "clarify"; ts: string; questions: unknown[] }
  | { type: "rag"; ts: string; blocks_used?: string[]; blocks_summary?: RagBlockSummary[] }
  | { type: "warning"; ts: string; code: string; message?: string }
  | { type: "token"; ts: string; delta: string }
  | { type: "sanity"; ts: string; result: { issues?: unknown[] } }
  | { type: "done"; ts: string; report_id: string; final_text: string }
  | { type: "error"; ts: string; code: string; message: string };

export type GenerateRequest = {
  raw_input: string;
  category_hint?: string;
  writing_style_code?: string;
};
