import { apresentarErroDeCadastro } from '../signupErrors'

function igual(recebido: unknown, esperado: unknown, descricao: string) {
  if (recebido !== esperado) {
    throw new Error(`${descricao}: esperado ${JSON.stringify(esperado)}, recebeu ${JSON.stringify(recebido)}`)
  }
}

const fraca = apresentarErroDeCadastro({ code: 'weak_password', message: 'mensagem variável' })
igual(fraca.message, 'Use uma senha com pelo menos 8 caracteres.', 'prioriza o code do Supabase')
igual(fraca.mostrarReferencia, false, 'senha fraca não exige suporte')

const legado = apresentarErroDeCadastro({ message: 'Password should be at least 6 characters' })
igual(legado.code, 'weak_password', 'mantém compatibilidade com mensagens antigas')

const desconhecido = apresentarErroDeCadastro({ code: 'erro_novo_no_futuro' })
igual(desconhecido.mostrarReferencia, true, 'erro desconhecido ganha referência')
igual(desconhecido.message, 'Não foi possível criar a conta. Tente novamente.', 'erro desconhecido não vaza detalhe')

console.log('signupErrors.manual: 6/6 verificações passaram')
