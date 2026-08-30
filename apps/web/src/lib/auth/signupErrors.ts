export type SignupErrorLike = {
  code?: string
  message?: string
  name?: string
  status?: number
}

export type SignupErrorPresentation = {
  code: string
  message: string
  mostrarReferencia: boolean
}

const MENSAGENS_POR_CODIGO: Record<string, Omit<SignupErrorPresentation, 'code'>> = {
  user_already_exists: {
    message: 'Não foi possível criar uma nova conta com este email. Tente entrar ou recuperar a senha.',
    mostrarReferencia: false,
  },
  email_exists: {
    message: 'Não foi possível criar uma nova conta com este email. Tente entrar ou recuperar a senha.',
    mostrarReferencia: false,
  },
  weak_password: {
    message: 'Use uma senha com pelo menos 8 caracteres.',
    mostrarReferencia: false,
  },
  signup_disabled: {
    message: 'O cadastro está temporariamente indisponível.',
    mostrarReferencia: true,
  },
  email_provider_disabled: {
    message: 'O cadastro por email está temporariamente indisponível.',
    mostrarReferencia: true,
  },
  over_email_send_rate_limit: {
    message: 'Muitas tentativas para este email. Aguarde alguns minutos e tente novamente.',
    mostrarReferencia: false,
  },
  over_request_rate_limit: {
    message: 'Muitas tentativas neste momento. Aguarde alguns minutos e tente novamente.',
    mostrarReferencia: false,
  },
  email_address_invalid: {
    message: 'Digite um endereço de email válido.',
    mostrarReferencia: false,
  },
  email_address_not_authorized: {
    message: 'Não conseguimos enviar o email de confirmação.',
    mostrarReferencia: true,
  },
  validation_failed: {
    message: 'Confira o email e a senha e tente novamente.',
    mostrarReferencia: false,
  },
  request_timeout: {
    message: 'O cadastro demorou mais do que o esperado. Tente novamente.',
    mostrarReferencia: true,
  },
  unexpected_failure: {
    message: 'O serviço de cadastro apresentou uma falha.',
    mostrarReferencia: true,
  },
  network_error: {
    message: 'Não foi possível falar com o serviço de cadastro. Verifique a conexão e tente novamente.',
    mostrarReferencia: true,
  },
  client_configuration_error: {
    message: 'O serviço de cadastro está indisponível.',
    mostrarReferencia: true,
  },
}

const CODIGOS_LEGADOS_POR_MENSAGEM: [RegExp, string][] = [
  [/already registered/i, 'user_already_exists'],
  [/at least \d+ characters/i, 'weak_password'],
  [/signup.*disabled/i, 'signup_disabled'],
  [/email.*rate limit/i, 'over_email_send_rate_limit'],
]

export function apresentarErroDeCadastro(error: SignupErrorLike): SignupErrorPresentation {
  const legado = CODIGOS_LEGADOS_POR_MENSAGEM.find(([padrao]) => padrao.test(error.message ?? ''))?.[1]
  const code = error.code?.trim() || legado || 'unknown_signup_error'
  const conhecido = MENSAGENS_POR_CODIGO[code]

  return conhecido
    ? { code, ...conhecido }
    : {
        code,
        message: 'Não foi possível criar a conta. Tente novamente.',
        mostrarReferencia: true,
      }
}

export function criarReferenciaDeCadastro(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()
}
