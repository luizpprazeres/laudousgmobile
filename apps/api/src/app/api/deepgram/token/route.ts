import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { medicalAsrKeytermsForCategory } from "@/server/asr/medicalGlossary";
import { env } from "@/server/env";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/deepgram/token — gera um TOKEN TEMPORÁRIO do Deepgram (JWT, TTL curto)
 * pra o cliente nativo conectar DIRETO no WebSocket de streaming
 * (wss://api.deepgram.com/v1/listen) sem que a project API key saia do servidor.
 *
 * O Vercel é serverless e não segura WebSocket persistente — por isso NÃO há
 * proxy de áudio: o backend só emite o token, e o iOS faz o streaming direto.
 * O token só precisa ser válido na conexão inicial do WS (depois fica aberto).
 *
 * Doc: POST https://api.deepgram.com/v1/auth/grant
 *   Header  Authorization: Token <DEEPGRAM_API_KEY>
 *   Body    { "ttl_seconds": 60 }   (default 30, máx 3600)
 *   Resp    { "access_token": "<jwt>", "expires_in": 60 }
 */
function activeKeyterms(category: string | null): string[] {
  return env().DEEPGRAM_KEYTERMS_ENABLED === "true"
    ? medicalAsrKeytermsForCategory(category)
    : [];
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  const category = new URL(req.url).searchParams.get("category");

  // FAST-PATH: a conta não suporta /auth/grant (403). Pula a ida ao Deepgram e
  // devolve a key direta na hora — corta ~0,3-0,5s do início da gravação.
  if (
    env().DEEPGRAM_SKIP_GRANT === "true" &&
    env().DEEPGRAM_ALLOW_DIRECT_KEY === "true"
  ) {
    return json({
      token: env().DEEPGRAM_API_KEY,
      scheme: "Token",
      temporary: false,
      expires_in: 0,
      model: env().DEEPGRAM_MODEL,
      language: env().DEEPGRAM_LANGUAGE,
      keyterms: activeKeyterms(category),
    });
  }

  let resp: Response;
  try {
    resp = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${env().DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      // 60s dá folga pra conexão em LTE instável; bem abaixo do máx (3600).
      body: JSON.stringify({ ttl_seconds: 60 }),
    });
  } catch (e) {
    console.error("[deepgram/token] fetch falhou:", e);
    return json({ error: "deepgram_unreachable" }, 502);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error(
      "[deepgram/token] grant falhou:",
      resp.status,
      detail.slice(0, 300),
    );
    // FALLBACK PROTÓTIPO: a conta Deepgram ainda não tem permissão de gerar
    // token temporário (/auth/grant 403). Pra DESTRAVAR O TESTE DE FLUIDEZ,
    // devolvemos a própria API key (esquema "Token") quando permitido por env.
    // ⚠️ NÃO É SEGURO PRA PRODUÇÃO — a key trafega pro cliente. Remover/desligar
    // (DEEPGRAM_ALLOW_DIRECT_KEY=false) assim que o token temporário funcionar.
    if (env().DEEPGRAM_ALLOW_DIRECT_KEY === "true") {
      return json({
        token: env().DEEPGRAM_API_KEY,
        scheme: "Token",
        temporary: false,
        expires_in: 0,
        model: env().DEEPGRAM_MODEL,
        language: env().DEEPGRAM_LANGUAGE,
        keyterms: activeKeyterms(category),
      });
    }
    return json({ error: "deepgram_grant_failed", status: resp.status }, 502);
  }

  const data = (await resp.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    return json({ error: "deepgram_no_token" }, 502);
  }

  // Token temporário (caminho seguro): esquema "Bearer".
  return json({
    token: data.access_token,
    scheme: "Bearer",
    temporary: true,
    expires_in: data.expires_in ?? 60,
    model: env().DEEPGRAM_MODEL,
    language: env().DEEPGRAM_LANGUAGE,
    keyterms: activeKeyterms(category),
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
