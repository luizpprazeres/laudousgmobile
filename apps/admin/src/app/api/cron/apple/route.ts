import { criarCronApple } from "@/lib/asc/diario-servidor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = criarCronApple();
