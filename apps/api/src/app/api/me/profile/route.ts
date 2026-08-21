import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getDbClient, schema } from "@laudousg/db";
export { OPTIONS } from "@/server/cors";
import { ProfileSchema, UfSchema } from "@laudousg/shared";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { isBetaTester } from "@/server/iap/betaWhitelist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  default_writing_style_id: z.string().uuid().nullable().optional(),
  /**
   * Só dígitos, 4 a 10. O CRM sai impresso no laudo como identificação
   * profissional: aceitar "CRM 12345-SP" aqui faria a tela imprimir o prefixo
   * duas vezes, e a UF em dois lugares que podem discordar. Guarda-se o número
   * puro, e a UF no campo dela.
   */
  crm: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "o CRM é só o número, de 4 a 10 dígitos")
    .nullable()
    .optional(),
  uf: UfSchema.nullable().optional(),
  plan: z.enum(["free", "essencial", "pro", "clinic"]).optional(),
});

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const profile = await loadProfile(user.id);
  if (!profile) return json({ error: "profile_not_found" }, 404);

  return json({ profile, assinatura: await loadAssinatura(user.id) });
}

export async function PATCH(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.format() }, 400);
  }
  if (parsed.data.plan !== undefined) {
    return forbidden("plan_read_only");
  }
  /**
   * CRM e UF andam JUNTOS. Um número de conselho sem estado não identifica
   * ninguém — o mesmo número existe em 27 conselhos. Guardar metade seria
   * guardar uma identificação que não identifica, e ela vai para o laudo.
   */
  const crmDepois =
    "crm" in parsed.data ? (parsed.data.crm ?? null) : undefined;
  const ufDepois = "uf" in parsed.data ? (parsed.data.uf ?? null) : undefined;
  if (crmDepois !== undefined || ufDepois !== undefined) {
    const atual = await loadProfile(user.id);
    const crmFinal = crmDepois !== undefined ? crmDepois : (atual?.crm ?? null);
    const ufFinal = ufDepois !== undefined ? ufDepois : (atual?.uf ?? null);
    if ((crmFinal === null) !== (ufFinal === null)) {
      return json({ error: "crm_e_uf_juntos" }, 400);
    }
  }

  const db = getDbClient();
  const patch: Partial<typeof schema.profiles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if ("name" in parsed.data) patch.name = parsed.data.name ?? null;
  if ("crm" in parsed.data) patch.crm = parsed.data.crm ?? null;
  if ("uf" in parsed.data) patch.uf = parsed.data.uf ?? null;
  if ("default_writing_style_id" in parsed.data) {
    const styleId = parsed.data.default_writing_style_id ?? null;
    if (styleId) {
      // Saneamento writing styles: só aceita fixar estilo ATIVO (Clássico/Objetivo).
      const [style] = await db
        .select({ id: schema.writingStyles.id, active: schema.writingStyles.active })
        .from(schema.writingStyles)
        .where(eq(schema.writingStyles.id, styleId))
        .limit(1);
      if (!style) return json({ error: "invalid_writing_style" }, 400);
      if (!style.active) return json({ error: "writing_style_inactive" }, 400);
    }
    patch.defaultWritingStyleId = styleId;
  }

  await db
    .update(schema.profiles)
    .set(patch)
    .where(eq(schema.profiles.id, user.id));

  const profile = await loadProfile(user.id);
  if (!profile) return json({ error: "profile_not_found" }, 404);

  return json({ profile });
}

async function loadProfile(userId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);

  if (!row) return null;
  // Beta whitelist override: testers e Apple Reviewer veem plan='pro' sem tocar
  // no DB. Lista controlada por env BETA_TESTER_EMAILS (CSV).
  const effectivePlan = isBetaTester(row.email) ? "pro" : row.plan;
  return ProfileSchema.parse({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: effectivePlan,
    default_writing_style_id: row.defaultWritingStyleId,
    crm: row.crm,
    uf: row.uf,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  });
}

/**
 * A ASSINATURA DA APP STORE, quando existe — e é ela que desfaz uma ambiguidade
 * real no nome do plano.
 *
 * `profiles.plan` é escrito por dois canais que nomeiam os níveis de formas
 * diferentes: a AbacatePay grava `pro` para quem assinou o **Essencial** do
 * site, e a Apple grava `pro` para o tier **Pro** dela. O mesmo valor, dois
 * significados. Sem saber a origem, qualquer rótulo que a tela mostre tem
 * chance de estar errado para metade dos assinantes.
 *
 * Existir linha aqui quer dizer App Store; não existir, o site. Só assinatura
 * ativa conta — uma expirada não descreve o plano de hoje.
 *
 * ⚠️ NUNCA derruba o perfil. A tabela `subscriptions` está declarada no schema
 * do Drizzle mas **não existe neste banco** — descoberto em 21/08 quando a
 * primeira versão desta função deixou `/api/me/profile` respondendo 500 em
 * produção, na rota que o iOS usa. O perfil é o dado essencial; a assinatura é
 * enriquecimento. Enriquecimento que quebra o essencial é defeito de desenho,
 * não azar.
 *
 * Aqui `null` também é a resposta CORRETA, não um remendo: sem tabela não há
 * assinatura da App Store registrada, e o rótulo do plano cai na nomenclatura
 * do site — que é de onde vieram todos os planos deste banco.
 */
async function loadAssinatura(userId: string) {
  try {
    return await buscarAssinatura(userId);
  } catch (erro) {
    console.warn(
      JSON.stringify({
        evento: "ASSINATURA_INDISPONIVEL",
        motivo: erro instanceof Error ? erro.message : String(erro),
        efeito: "perfil devolvido sem assinatura; rótulo do plano usa o nome do site",
      }),
    );
    return null;
  }
}

async function buscarAssinatura(userId: string) {
  const db = getDbClient();
  const [row] = await db
    .select({
      tier: schema.subscriptions.tier,
      period: schema.subscriptions.period,
      expiresAt: schema.subscriptions.expiresAt,
      isTrial: schema.subscriptions.isTrial,
      status: schema.subscriptions.status,
    })
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.status, "active"),
      ),
    )
    .orderBy(desc(schema.subscriptions.expiresAt))
    .limit(1);

  if (!row) return null;
  return {
    origem: "apple" as const,
    tier: row.tier,
    period: row.period,
    expires_at: row.expiresAt.toISOString(),
    is_trial: row.isTrial,
    status: row.status,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
