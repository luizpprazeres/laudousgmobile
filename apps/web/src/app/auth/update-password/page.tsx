'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import LaudoUSGLogo from '@/components/LaudoUSGLogo'

// Chegada via /auth/callback?next=/auth/update-password (link de recuperação de senha).
// O exchangeCodeForSession no callback já deixou uma sessão de recuperação ativa.
export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let supabase
    try {
      supabase = createClient()
    } catch {
      setError('Serviço indisponível.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(
        error.message.includes('at least')
          ? 'A senha deve ter pelo menos 6 caracteres.'
          : 'Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.'
      )
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => {
      router.push('/app')
      router.refresh()
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 w-full max-w-sm">
        <div className="text-center mb-7">
          <Link href="/" className="inline-block">
            <LaudoUSGLogo size="md" />
          </Link>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Defina uma nova senha</p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Senha atualizada</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecionando…</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
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
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
