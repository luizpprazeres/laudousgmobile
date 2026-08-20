/**
 * Gate vivo do caminho SEGURO de autenticação Deepgram.
 *
 * Falha se a key não consegue emitir o JWT temporário que os clientes devem
 * receber. Não imprime a key nem o JWT.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env src/server/asr/__tests__/deepgram-saude.manual.ts
 *
 * Em produção, rode com as envs de produção num job protegido. Um arquivo que
 * ninguém agenda continua sendo diagnóstico, não monitor.
 */

async function main() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key || key.length < 20) {
    console.error("✗ DEEPGRAM_API_KEY ausente ou inválida");
    process.exit(1);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 60 }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      access_token?: unknown;
      expires_in?: unknown;
      err_code?: unknown;
      err_msg?: unknown;
    };

    if (!response.ok) {
      console.error(
        `✗ Deepgram /v1/auth/grant HTTP ${response.status}`,
        JSON.stringify({
          err_code: payload.err_code ?? null,
          err_msg: payload.err_msg ?? null,
        }),
      );
      process.exit(1);
    }

    if (typeof payload.access_token !== "string" || payload.access_token.length < 20) {
      console.error("✗ Deepgram grant respondeu sem access_token válido");
      process.exit(1);
    }

    console.log(
      "✓ Deepgram grant saudável",
      JSON.stringify({ http: response.status, expires_in: payload.expires_in ?? null }),
    );
  } catch (error) {
    console.error(
      "✗ Deepgram grant inalcançável",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

void main();
