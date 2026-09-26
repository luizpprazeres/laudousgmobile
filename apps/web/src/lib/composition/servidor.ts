/**
 * O proxy da composição até o `apps/api` — só de servidor.
 *
 * Mesmas duas autenticações do cliente do catálogo: o médico (sessão, conferida
 * na rota) e o serviço (`CATALOG_SERVICE_TOKEN`, que nunca chega ao navegador).
 * Mesmo fail-closed: sem configuração ou sem resposta, não há laudo — não há
 * motor local para cair.
 */
import 'server-only'

export type RespostaComposicao =
  | { ok: true; status: number; corpo: unknown }
  | { ok: false; status: number; erro: string }

export async function comporNoServico(pedido: unknown): Promise<RespostaComposicao> {
  const base = process.env.CATALOG_API_URL?.trim()
  const token = process.env.CATALOG_SERVICE_TOKEN?.trim()
  if (!base || !token) return { ok: false, status: 503, erro: 'composição indisponível: serviço não configurado' }

  let resposta: Response
  try {
    resposta = await fetch(`${base.replace(/\/+$/, '')}/api/compositions/render`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 503, erro: 'composição indisponível: sem resposta do serviço' }
  }
  // O corpo do upstream atravessa inteiro, inclusive 400/409/422 com o eco e
  // os conflitos nomeados — é o que a tela usa para dizer o que não combina.
  const corpo = await resposta.json().catch(() => null)
  return { ok: true, status: resposta.status, corpo }
}
