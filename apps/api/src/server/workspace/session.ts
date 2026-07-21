import { getServiceClient } from '@/server/supabaseService'

export const WORKSPACE_SESSION_TTL_MS = 10 * 60 * 60 * 1000
export const WORKSPACE_CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/

export type WorkspaceSessionRow = {
  id: string
  user_id: string
  pairing_code: string
  expires_at: string
  paired_at: string | null
  device_label: string | null
  ended_at: string | null
  created_at: string
}

export function normalizeWorkspaceCode(value: string) {
  return value.replace(/[\s\-_]/g, '').toUpperCase()
}

export function isWorkspaceSessionActive(session: WorkspaceSessionRow) {
  return !session.ended_at && new Date(session.expires_at).getTime() > Date.now()
}

export async function findWorkspaceSessionById(id: string) {
  const service = getServiceClient()
  const { data, error } = await service
    .from('workspace_sessions')
    .select('id, user_id, pairing_code, expires_at, paired_at, device_label, ended_at, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as WorkspaceSessionRow | null
}

export function publicWorkspaceSession(session: WorkspaceSessionRow) {
  return {
    id: session.id,
    code: session.pairing_code,
    expiresAt: session.expires_at,
    pairedAt: session.paired_at,
    deviceLabel: session.device_label,
    active: isWorkspaceSessionActive(session),
  }
}
