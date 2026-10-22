import { rotasInstagram } from "@/lib/social/instancia";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Container + espera do processamento (até ~40 s) + publish: cabe com folga em 60 s.
export const maxDuration = 60;
export const POST = rotasInstagram.publicar;
