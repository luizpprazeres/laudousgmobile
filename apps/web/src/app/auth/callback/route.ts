import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app/gerar'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // next pode conter querystring (ex.: /precos?plan=essencial) — concatena com segurança.
      const dest = next.startsWith('/') ? next : '/app/gerar'
      return NextResponse.redirect(`${origin}${dest}`)
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
