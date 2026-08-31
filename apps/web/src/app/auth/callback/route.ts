import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeAuthRedirect } from '@/lib/auth/authPresentation'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeAuthRedirect(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // next pode conter querystring (ex.: /precos?plan=essencial) — concatena com segurança.
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // A confirmação do email pode ter sido concluída pelo Supabase mesmo quando
  // a troca PKCE falha (por exemplo, link aberto em outro navegador/dispositivo).
  // Nesse caso o usuário só precisa entrar com a senha recém-criada.
  if (code) {
    return NextResponse.redirect(`${origin}/login?error=confirmacao_sem_sessao`)
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
