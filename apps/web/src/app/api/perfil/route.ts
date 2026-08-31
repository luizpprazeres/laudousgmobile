/**
 * O perfil do médico, para o navegador — leitura e gravação.
 *
 * Repassa para a rota canônica com o JWT dele. O que ele pode mudar é decidido
 * em três camadas independentes, e é de propósito: aqui (só três campos saem do
 * corpo), no `apps/api` (Zod, com `plan` recusado explicitamente) e no banco
 * (o GRANT de coluna do `0024`, que nem menciona `plan`, `role` ou `email`).
 */

import { NextResponse } from 'next/server'
import { lerPerfil, salvarPerfil } from '@/lib/perfil/cliente'
import { idDeEstiloValido } from '@/lib/perfil/estilos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const r = await lerPerfil()
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })
  return NextResponse.json(r.corpo, { status: r.status })
}

export async function PATCH(req: Request) {
  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 })
  }
  const c = (corpo ?? {}) as Record<string, unknown>

  /**
   * A LISTA É BRANCA, não negra. Repassar o corpo inteiro faria esta rota
   * herdar todo campo que a rota canônica venha a aceitar no futuro — inclusive
   * um que não deveria vir da web.
   */
  const patch: { name?: string | null; crm?: string | null; uf?: string | null; default_writing_style_id?: string | null } = {}
  if ('name' in c) patch.name = (c.name as string | null) ?? null
  if ('crm' in c) patch.crm = (c.crm as string | null) ?? null
  if ('uf' in c) patch.uf = (c.uf as string | null) ?? null
  if ('default_writing_style_id' in c) {
    if (!idDeEstiloValido(c.default_writing_style_id)) {
      return NextResponse.json({ error: 'estilo de escrita inválido' }, { status: 400 })
    }
    patch.default_writing_style_id = c.default_writing_style_id
  }

  const r = await salvarPerfil(patch)
  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })

  /**
   * O SUCESSO SILENCIOSO QUE NÃO FEZ NADA — e como se recusa a fingir.
   *
   * `apps/api` e `apps/web` são projetos separados na Vercel e podem subir em
   * ordens diferentes. O Zod descarta chave desconhecida sem reclamar: contra
   * uma versão antiga da rota canônica, `crm` e `uf` seriam simplesmente
   * ignorados, ela responderia 200 com o perfil intacto, e a tela diria
   * "salvo" para uma gravação que não aconteceu.
   *
   * A prova é o próprio corpo de volta: se ele não traz sequer a CHAVE `crm`,
   * a rota lá não conhece o campo. Melhor uma falha clara agora do que o
   * médico descobrir que o CRM sumiu no dia em que imprimir o laudo.
   */
  const devolvido = (r.corpo as { profile?: Record<string, unknown> } | null)?.profile
  const pediuRegistro = 'crm' in patch || 'uf' in patch
  if (pediuRegistro && devolvido && !('crm' in devolvido)) {
    return NextResponse.json(
      { error: 'registro_nao_suportado' },
      { status: 502 },
    )
  }

  return NextResponse.json(r.corpo, { status: r.status })
}
