import type { NextRequest } from "next/server";
import { emailPermitido } from "@/lib/auth/acesso";
import { ipDaRequisicao, permitirTentativa } from "@/lib/auth/limite";
import { contextoPost, irPara, naoEncontrado } from "@/lib/auth/rotas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = contextoPost(req);
  if (!ctx) return naoEncontrado();
  const { data } = await ctx.sessao.auth.getUser();
  if (!data.user) return irPara(req, "/login");
  if (!emailPermitido(data.user.email, ctx.cfg.allowlist)) return naoEncontrado();
  if (!permitirTentativa(`mfa:${data.user.id}`, 5)) return irPara(req, "/mfa?erro=limite");

  const form = await req.formData();
  const factorId = String(form.get("factorId") ?? "");
  const codigo = String(form.get("codigo") ?? "").replace(/\D/g, "");
  if (!factorId || codigo.length !== 6) return irPara(req, "/mfa?erro=1");

  // O fator precisa ser TOTP desta mesma conta.
  const fatores = await ctx.sessao.auth.mfa.listFactors();
  const fator = fatores.data?.all.find((f) => f.id === factorId && f.factor_type === "totp");
  if (!fator) return irPara(req, "/mfa?erro=1");

  const { error } = await ctx.sessao.auth.mfa.challengeAndVerify({ factorId, code: codigo });
  if (error) return irPara(req, "/mfa?erro=1");
  return irPara(req, "/", ctx.carregadora);
}
