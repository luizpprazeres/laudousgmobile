'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'
import {
  apresentarErroDeCadastro,
  criarReferenciaDeCadastro,
  type SignupErrorLike,
} from '@/lib/auth/signupErrors'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/app/gerar'
  // plan vem de /precos (?plan=essencial|profissional) — usado no checkout (S5).
  const plan = searchParams.get('plan')
  const next = plan ? `${redirectTo}?plan=${plan}` : redirectTo
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const mostrarFalha = (authError: SignupErrorLike) => {
    const apresentacao = apresentarErroDeCadastro(authError)
    const reference = criarReferenciaDeCadastro()

    // Best effort: a falha continua visível ao médico mesmo se o log estiver indisponível.
    void fetch('/api/auth/signup-diagnostic', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reference,
        code: apresentacao.code,
        name: authError.name ?? 'AuthError',
        status: authError.status ?? null,
      }),
    }).catch(() => undefined)

    setError(
      apresentacao.mostrarReferencia
        ? `${apresentacao.message} Informe o código ${reference} ao suporte.`
        : apresentacao.message,
    )
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let supabase
    try {
      supabase = createClient()
    } catch {
      mostrarFalha({ code: 'client_configuration_error', name: 'ClientConfigurationError' })
      return
    }

    let resposta
    try {
      resposta = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
    } catch (error) {
      mostrarFalha({
        code: 'network_error',
        name: error instanceof Error ? error.name : 'NetworkError',
      })
      return
    }

    const { data, error } = resposta

    if (!error && data.session) {
      router.push(next)
      router.refresh()
      return
    }

    if (error) {
      mostrarFalha(error)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 w-full max-w-sm text-center">
          <Mail className="w-12 h-12 text-emerald-500 mb-4 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Verifique seu email</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link para ativar
            sua conta e começar a usar o LaudoUSG.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
          >
            ← Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 w-full max-w-sm">
        <div className="text-center mb-7">
          <Link href="/" className="inline-block">
            <LaudoUSGLogo size="md" />
          </Link>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Crie sua conta gratuita</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Criando conta...' : 'Criar conta grátis'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          Já tem conta?{' '}
          <Link
            href={`/login?redirect=${redirectTo}`}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
