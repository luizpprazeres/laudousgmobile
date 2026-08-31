export type AuthErrorLike = { code?: string; message?: string; name?: string }

const LOGIN_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou senha incorretos.',
  email_not_confirmed: 'Email não confirmado. Verifique sua caixa de entrada ou reenvie a confirmação.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  request_timeout: 'O login demorou mais do que o esperado. Tente novamente.',
  network_error: 'Não foi possível falar com o serviço de login. Verifique sua conexão.',
}

const LEGACY_LOGIN_CODES: Array<[RegExp, string]> = [
  [/invalid login credentials|user not found/i, 'invalid_credentials'],
  [/email not confirmed/i, 'email_not_confirmed'],
  [/rate limit/i, 'over_request_rate_limit'],
]

export function loginErrorCode(error: AuthErrorLike): string {
  return error.code?.trim()
    || LEGACY_LOGIN_CODES.find(([pattern]) => pattern.test(error.message ?? ''))?.[1]
    || 'unknown_login_error'
}

export function loginErrorMessage(error: AuthErrorLike): string {
  return LOGIN_MESSAGES[loginErrorCode(error)] ?? 'Não foi possível entrar. Tente novamente.'
}

/** Aceita somente caminhos internos; `//site-externo` também é recusado. */
export function safeAuthRedirect(value: string | null | undefined, fallback = '/app/gerar'): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  try {
    const parsed = new URL(value, 'https://laudousg.com.br')
    return parsed.origin === 'https://laudousg.com.br' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback
  } catch {
    return fallback
  }
}
