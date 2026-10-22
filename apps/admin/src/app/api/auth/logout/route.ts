import type { NextRequest } from "next/server";
import { contextoPost, irPara, naoEncontrado } from "@/lib/auth/rotas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = contextoPost(req);
  if (!ctx) return naoEncontrado();
  await ctx.sessao.auth.signOut();
  return irPara(req, "/login", ctx.carregadora);
}
