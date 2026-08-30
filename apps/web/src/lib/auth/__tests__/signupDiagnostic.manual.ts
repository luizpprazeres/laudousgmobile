import { POST } from '../../../app/api/auth/signup-diagnostic/route'

function igual(recebido: unknown, esperado: unknown, descricao: string) {
  if (recebido !== esperado) {
    throw new Error(`${descricao}: esperado ${JSON.stringify(esperado)}, recebeu ${JSON.stringify(recebido)}`)
  }
}

const original = console.error
const logs: unknown[][] = []
async function rodar() {
  console.error = (...args: unknown[]) => logs.push(args)

  try {
    const resposta = await POST(new Request('https://laudousg.com.br/api/auth/signup-diagnostic', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify({
      reference: 'A1B2C3D4E5',
      code: 'unexpected_failure',
      name: 'AuthApiError',
      status: 500,
      email: 'nao-pode-ir-para-o-log@example.com',
      password: 'nao-pode-ir-para-o-log',
      message: 'mensagem crua não pode ir para o log',
    }),
    }))
    igual(resposta.status, 204, 'aceita diagnóstico mínimo')
    igual(logs.length, 1, 'gera um log')

    const serializado = JSON.stringify(logs)
    igual(serializado.includes('example.com'), false, 'não registra email')
    igual(serializado.includes('nao-pode-ir-para-o-log'), false, 'não registra senha')
    igual(serializado.includes('mensagem crua'), false, 'não registra mensagem crua')

    const invalida = await POST(new Request('https://laudousg.com.br/api/auth/signup-diagnostic', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reference: 'curta' }),
    }))
    igual(invalida.status, 400, 'recusa referência inválida')

    const externa = await POST(new Request('https://laudousg.com.br/api/auth/signup-diagnostic', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
    body: JSON.stringify({ reference: 'A1B2C3D4E5' }),
    }))
    igual(externa.status, 403, 'recusa navegador de origem externa')
  } finally {
    console.error = original
  }

  console.log('signupDiagnostic.manual: 8/8 verificações passaram')
}

void rodar()
