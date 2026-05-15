import { pgEnum } from "drizzle-orm/pg-core";

export const profileRoleEnum = pgEnum("profile_role", ["user", "admin"]);

export const profilePlanEnum = pgEnum("profile_plan", [
  "free",
  "pro",
  "clinic",
]);

export const writingStyleCodeEnum = pgEnum("writing_style_code", [
  "CLASSICO_COMPLETO",
  "DIRETO_OBJETIVO",
  "DETALHADO_PROTOCOLAR",
]);

export const ragBlockKindEnum = pgEnum("rag_block_kind", [
  "modelo",
  "regra",
  "frase",
  "conclusao",
  "excecao",
  "comentario_tecnico",
  "exemplo",
]);

export const ragBlockStatusEnum = pgEnum("rag_block_status", [
  "draft",
  "validated",
  "archived",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "draft",
  "awaiting_clarify",
  "generated",
  "blocked",
  "published",
  "discarded",
]);

export const generationOutcomeEnum = pgEnum("generation_outcome", [
  "success",
  "clarify",
  "blocked",
  "error",
  "aborted",
]);

export const sanityVerdictEnum = pgEnum("sanity_verdict", [
  "ok",
  "warning",
  "critical",
]);

export const goldenStatusEnum = pgEnum("golden_status", [
  "active",
  "archived",
]);

export const learningSuggestionKindEnum = pgEnum("learning_suggestion_kind", [
  "nova_frase",
  "nova_regra",
  "nova_excecao",
  "ajuste_modelo",
  "ajuste_conclusao",
]);

export const learningSuggestionStatusEnum = pgEnum(
  "learning_suggestion_status",
  ["pending", "approved", "rejected", "merged"],
);
