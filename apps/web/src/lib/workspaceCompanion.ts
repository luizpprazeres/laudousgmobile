import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export type WorkspaceSession = {
  id: string
  code: string
  expiresAt: string
  pairedAt: string | null
  deviceLabel: string | null
  active: boolean
}

export type WorkspaceInput = {
  id: string
  sessionId: string
  kind: 'text' | 'measurements'
  categoryCode: string | null
  text: string
  status: 'pending'
  createdAt: string
}

async function authedWorkspaceFetch(path: string, init: RequestInit = {}) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL ausente.')
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Faça login novamente.')

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  })
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${label} falhou: ${response.status} ${detail}`)
  }
  return response.json() as Promise<T>
}

export async function getWorkspaceSession() {
  const response = await authedWorkspaceFetch('/api/workspace/session')
  return readJson<{ session: WorkspaceSession | null }>(response, 'buscar sessão do celular')
}

export async function createWorkspaceSession() {
  const response = await authedWorkspaceFetch('/api/workspace/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  return readJson<{ session: WorkspaceSession }>(response, 'criar sessão do celular')
}

export async function endWorkspaceSession() {
  const response = await authedWorkspaceFetch('/api/workspace/session', { method: 'DELETE' })
  await readJson<{ ok: true }>(response, 'encerrar sessão do celular')
}

export async function listWorkspaceInputs(sessionId: string) {
  const response = await authedWorkspaceFetch(`/api/workspace/inputs?sessionId=${encodeURIComponent(sessionId)}`)
  return readJson<{ inputs: WorkspaceInput[] }>(response, 'receber dados do celular')
}

export async function resolveWorkspaceInput(id: string, status: 'applied' | 'dismissed') {
  const response = await authedWorkspaceFetch(`/api/workspace/inputs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  await readJson<{ ok: true }>(response, 'resolver dado do celular')
}
