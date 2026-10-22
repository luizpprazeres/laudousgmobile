import { criarCronSocial } from "@/lib/social/cron";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Até 3 posts por rodada, orçamento de 240 s (ORCAMENTO_CRON_MS) dentro deste limite.
export const maxDuration = 300;
export const GET = criarCronSocial();
