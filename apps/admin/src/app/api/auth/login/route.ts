import type { NextRequest } from "next/server";
import { emailPermitido, normalizarEmail } from "@/lib/auth/acesso";
import { ipDaRequisicao, permitirTentativa } from "@/lib/auth/limite";
import { contextoPost, irPara, naoEncontrado } from "@/lib/auth/rotas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = contextoPost(req);
  if (!ctx) return naoEncontrado();
  if (!permitirTentativa(`login:${ipDaRequisicao(req)}`)) return irPara(req, "/login?erro=limite");

  const form = await req.formData();
  const email = normalizarEmail(String(form.get("email") ?? ""));
  const senha = String(form.get("senha") ?? "");
  // E-mail fora da allowlist: mesma resposta de senha errada, e nem consulta o Supabase.
  if (!emailPermitido(email, ctx.cfg.allowlist) || !senha) return irPara(req, "/login?erro=1");

  const { error } = await ctx.sessao.auth.signInWithPassword({ email, password: senha });
  if (error) return irPara(req, "/login?erro=1");
  return irPara(req, ctx.cfg.exigirMfa ? "/mfa" : "/", ctx.carregadora);
}
