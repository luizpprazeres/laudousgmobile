export const dynamic = 'force-dynamic'

const TOKEN_SEGURO = /^[a-zA-Z0-9_-]{1,64}$/
const REFERENCIA_SEGURA = /^[A-Z0-9]{10}$/

function tokenSeguro(value: unknown, fallback: string): string {
  return typeof value === 'string' && TOKEN_SEGURO.test(value) ? value : fallback
}

/**
 * Recebe somente o diagnóstico técnico do cadastro.
 *
 * Email, senha, mensagem crua do Supabase e metadata do usuário não fazem
 * parte do contrato. A referência permite localizar a falha nos logs da web
 * sem transformar o log num segundo cadastro de usuários.
 */
export async function POST(request: Request): Promise<Response> {
  const tamanho = Number(request.headers.get('content-length') ?? 0)
  if (tamanho > 1024) return Response.json({ error: 'payload muito grande' }, { status: 413 })

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return Response.json({ error: 'origem recusada' }, { status: 403 })
  }

  const texto = await request.text()
  if (texto.length > 1024) return Response.json({ error: 'payload muito grande' }, { status: 413 })

  let body: unknown = null
  try {
    body = JSON.parse(texto)
  } catch {
    body = null
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'json inválido' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const reference = typeof raw.reference === 'string' && REFERENCIA_SEGURA.test(raw.reference)
    ? raw.reference
    : null
  if (!reference) return Response.json({ error: 'referência inválida' }, { status: 400 })

  const status = typeof raw.status === 'number' && Number.isInteger(raw.status) && raw.status >= 0 && raw.status <= 599
    ? raw.status
    : null

  console.error('[signup] falha de cadastro', {
    reference,
    code: tokenSeguro(raw.code, 'unknown_signup_error'),
    name: tokenSeguro(raw.name, 'AuthError'),
    status,
  })

  return new Response(null, { status: 204 })
}
