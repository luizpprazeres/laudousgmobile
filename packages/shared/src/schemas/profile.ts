import { z } from "zod";

export const ProfileRoleSchema = z.enum(["user", "admin"]);
export type ProfileRole = z.infer<typeof ProfileRoleSchema>;

export const ProfilePlanSchema = z.enum(["free", "pro", "clinic"]);
export type ProfilePlan = z.infer<typeof ProfilePlanSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: ProfileRoleSchema,
  plan: ProfilePlanSchema,
  default_writing_style_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;
