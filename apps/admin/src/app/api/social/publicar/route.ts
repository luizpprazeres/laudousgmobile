import { rotasInstagram } from "@/lib/social/instancia";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Containers (até 20 no carrossel) + espera do processamento (até ~80 s) + publish.
export const maxDuration = 120;
export const POST = rotasInstagram.publicar;
