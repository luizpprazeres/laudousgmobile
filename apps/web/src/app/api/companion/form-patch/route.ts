import { createClient } from '@/lib/supabase/server'
import { handleCompanionFormPatchProxy } from '@/lib/companionFormPatchProxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function configuredApiBase() {
  return [process.env.CATALOG_API_URL, process.env.NEXT_PUBLIC_API_URL]
    .map((value) => value?.trim().replace(/\/+$/, ''))
    .find(Boolean)
}

async function authenticateFromCookie() {
  const supabase = await createClient()
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ])
  const token = sessionData.session?.access_token
  return { authenticated: Boolean(userData.user && token), ...(token ? { token } : {}) }
}

export async function POST(request: Request) {
  return handleCompanionFormPatchProxy(request, {
    authenticate: authenticateFromCookie,
    apiBase: configuredApiBase,
    fetchImpl: fetch,
  })
}
