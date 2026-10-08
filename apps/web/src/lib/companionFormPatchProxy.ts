import {
  parseCompanionFormPatchRequest,
  parseCompanionFormPatchResponse,
} from './companionFormPatch'

export type CompanionFormPatchProxyDependencies = {
  authenticate: () => Promise<{ authenticated: boolean; token?: string }>
  apiBase: () => string | undefined
  fetchImpl: typeof fetch
}

export async function handleCompanionFormPatchProxy(
  request: Request,
  dependencies: CompanionFormPatchProxyDependencies,
): Promise<Response> {
  const auth = await dependencies.authenticate()
  if (!auth.authenticated || !auth.token) {
    return Response.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })
  }
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return Response.json({ error: 'Envie o pedido em JSON.' }, { status: 415 })
  }

  const raw = await request.text().catch(() => '')
  if (Buffer.byteLength(raw, 'utf8') > 16 * 1024) {
    return Response.json({ error: 'Texto grande demais.' }, { status: 413 })
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  const body = parseCompanionFormPatchRequest(json)
  if (!body) return Response.json({ error: 'Pedido de análise inválido.' }, { status: 400 })

  const base = dependencies.apiBase()
  if (!base) return Response.json({ error: 'Serviço de análise não configurado.' }, { status: 503 })

  let upstream: Response
  try {
    upstream = await dependencies.fetchImpl(`${base}/api/companion/form-patch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: request.signal,
    })
  } catch {
    return Response.json({ error: 'Serviço de análise indisponível.' }, { status: 503 })
  }

  const responseText = await upstream.text()
  if (!upstream.ok) {
    return new Response(responseText, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    })
  }
  let responseJson: unknown
  try {
    responseJson = JSON.parse(responseText)
  } catch {
    return Response.json({ error: 'O serviço retornou uma resposta inválida.' }, { status: 502 })
  }
  const parsed = parseCompanionFormPatchResponse(responseJson)
  if (!parsed) return Response.json({ error: 'O serviço retornou uma resposta inválida.' }, { status: 502 })
  return Response.json(parsed, { headers: { 'cache-control': 'no-store' } })
}
