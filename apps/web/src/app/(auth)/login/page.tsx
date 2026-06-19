'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const redirectTo = searchParams.get('redirect') ?? '/app'
  const [error, setError] = useState(
    searchParams.get('error') === 'link_invalido'
      ? 'O link expirou ou é inválido. Solicite um novo.'
      : ''
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let supabase
    try {
      supabase = createClient()
    } catch {
      setError('Serviço indisponível: variáveis de ambiente não configuradas no servidor.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const AUTH_ERROR_MESSAGES: Record<string, string> = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
        'User not found': 'Nenhuma conta encontrada com este email.',
        over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        signup_disabled: 'Login temporariamente indisponível.',
      }
      const friendlyMessage =
        AUTH_ERROR_MESSAGES[error.message] ??
        Object.entries(AUTH_ERROR_MESSAGES).find(([key]) => error.message.includes(key))?.[1] ??
        'Ocorreu um erro. Tente novamente.'
      setError(friendlyMessage)
      setLoading(false)
      return
    }

    window.location.href = redirectTo
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 w-full max-w-sm">
      <div className="text-center mb-7">
        <Link href="/" className="inline-block">
          <LaudoUSGLogo size="md" />
        </Link>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Faça login para continuar</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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
              autoComplete="current-password"
              placeholder="••••••••"
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
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm mt-4">
        <Link
          href="/forgot-password"
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
        >
          Esqueceu sua senha?
        </Link>
      </p>

      <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4">
        Não tem conta?{' '}
        <Link
          href={`/signup?redirect=${redirectTo}`}
          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
        >
          Criar conta grátis
        </Link>
      </p>
      <p className="text-center text-xs text-gray-300 dark:text-gray-600 mt-5 leading-relaxed">
        Plano gratuito: 10 laudos vitalício · Essencial R$ 99,00/mês · Profissional R$ 169,90/mês
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 w-full max-w-sm h-80" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
