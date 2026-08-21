import { z } from "zod";

export const ProfileRoleSchema = z.enum(["user", "admin"]);
export type ProfileRole = z.infer<typeof ProfileRoleSchema>;

export const ProfilePlanSchema = z.enum(["free", "essencial", "pro", "clinic"]);
export type ProfilePlan = z.infer<typeof ProfilePlanSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: ProfileRoleSchema,
  plan: ProfilePlanSchema,
  default_writing_style_id: z.string().uuid().nullable(),
  crm: z.string().nullable(),
  /** Sigla da unidade federativa do registro — sempre maiúscula. */
  uf: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * As 27 unidades federativas. Lista fechada de propósito: o CRM é identificação
 * profissional que sai impressa no laudo, e "SO" em vez de "SP" é o tipo de
 * erro que ninguém relê depois de salvar uma vez.
 */
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const UfSchema = z.enum(UFS);

export type Profile = z.infer<typeof ProfileSchema>;
