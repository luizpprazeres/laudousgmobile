import { criarRotasLanding } from "@/lib/landing/rotas";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = criarRotasLanding().collect;
