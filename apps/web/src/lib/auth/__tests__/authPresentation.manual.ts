import { loginErrorCode, loginErrorMessage, safeAuthRedirect } from '../authPresentation'

function equal(received: unknown, expected: unknown, description: string) {
  if (received !== expected) throw new Error(`${description}: esperado ${JSON.stringify(expected)}, recebeu ${JSON.stringify(received)}`)
}

equal(loginErrorCode({ code: 'email_not_confirmed', message: 'texto variável' }), 'email_not_confirmed', 'prioriza código estável')
equal(loginErrorMessage({ message: 'Invalid login credentials' }), 'Email ou senha incorretos.', 'compatibilidade com mensagem antiga')
equal(loginErrorMessage({ name: 'TypeError' }), 'Não foi possível entrar. Tente novamente.', 'erro desconhecido não vaza detalhe')
equal(safeAuthRedirect('/app/gerar?categoria=OBSTETRICA'), '/app/gerar?categoria=OBSTETRICA', 'mantém destino interno')
equal(safeAuthRedirect('//site-externo.example'), '/app/gerar', 'recusa URL protocol-relative')
equal(safeAuthRedirect('https://site-externo.example'), '/app/gerar', 'recusa URL absoluta')
equal(safeAuthRedirect('/\\site-externo.example'), '/app/gerar', 'recusa barra invertida ambígua')

console.log('authPresentation.manual: 7/7 verificações passaram')
