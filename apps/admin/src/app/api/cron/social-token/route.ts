import { criarCronToken } from "@/lib/social/cron";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = criarCronToken();
