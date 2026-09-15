import { createHealthHandler } from "@/server/health/probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = createHealthHandler();
