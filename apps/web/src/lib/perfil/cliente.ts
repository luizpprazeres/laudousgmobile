/**
 * O PERFIL — o cliente de servidor que fala com a rota canônica do médico.
 *
 * O mesmo desenho do cliente da Biblioteca, e pelo mesmo motivo: `/api/me/profile`
 * no `apps/api` é a rota que o iOS já usa, e ter a web escrevendo direto na
 * tabela criaria um segundo autor das mesmas colunas — com uma segunda ideia do
 * que é um CRM válido. A URL da API e a sessão ficam no servidor; o navegador
 * conversa só com o próprio domínio.
 */

import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type Resposta =
  | { ok: true; status: number; corpo: unknown }
  | { ok: false; status: number; erro: string }

function baseDaApi(): string | null {
  const b = process.env.CATALOG_API_URL?.trim()
  return b ? b.replace(/\/+$/, '') : null
}

async function tokenDoMedico(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function chamar(init?: RequestInit): Promise<Resposta> {
  const base = baseDaApi()
  if (!base) {
    return { ok: false, status: 503, erro: 'Perfil indisponível: serviço não configurado.' }
  }
  const jwt = await tokenDoMedico()
  if (!jwt) return { ok: false, status: 401, erro: 'Sessão expirada. Entre de novo.' }

  let resposta: Response
  try {
    resposta = await fetch(`${base}/api/me/profile`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 503, erro: 'Perfil indisponível: sem resposta do serviço.' }
  }

  const corpo = await resposta.json().catch(() => null)
  /**
   * O status ATRAVESSA. O 400 de `crm_e_uf_juntos` e o 403 de `plan_read_only`
   * dizem exatamente o que a tela precisa mostrar; trocar por "erro ao salvar"
   * apagaria a única informação útil.
   */
  return { ok: true, status: resposta.status, corpo }
}

export function lerPerfil() {
  return chamar()
}

/** Só o que o médico pode mudar. Plano, papel e e-mail não passam por aqui. */
export function salvarPerfil(patch: {
  name?: string | null
  crm?: string | null
  uf?: string | null
}) {
  return chamar({ method: 'PATCH', body: JSON.stringify(patch) })
}
