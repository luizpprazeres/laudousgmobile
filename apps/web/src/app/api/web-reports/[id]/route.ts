import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { CompositionEnvelopeV1Schema, laudoConfereComEnvelope, parseEnvelope } from '@/lib/composition/envelope'
import { isAssociationCode } from '@/lib/composition/contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * REABRIR E EDITAR uma composição salva — o caminho autenticado.
 *
 * O histórico só mostra texto. Para voltar a editar o ESTADO, o laudo precisa
 * ser da conta (RLS + `user_id` explícito), ser uma composição com envelope que
 * esta versão da tela entende, e a gravação precisa partir da mesma versão que
 * foi aberta (`updated_at`): duas abas editando o mesmo laudo não se
 * sobrescrevem em silêncio — a segunda recebe 409.
 *
 * Laudo avulso (legado) não reabre por aqui: responde 422 e o histórico
 * continua mostrando o texto.
 */

const Id = z.string().uuid()

async function contexto(ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const { id } = await ctx.params
  return { supabase, user: data.user, id: Id.safeParse(id) }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user, id } = await contexto(ctx)
  if (!user) return Response.json({ error: 'não autorizado' }, { status: 401 })
  if (!id.success) return Response.json({ error: 'laudo não encontrado' }, { status: 404 })

  const { data, error } = await supabase
    .from('web_reports')
    .select('id, category_code, title, laudo_text, exam_state, updated_at')
    .eq('id', id.data)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return Response.json({ error: 'laudo não encontrado' }, { status: 404 })

  const parsed = parseEnvelope(data.exam_state)
  if (parsed.kind === 'legacy') {
    return Response.json({ error: 'este laudo foi salvo só como texto e não reabre para edição' }, { status: 422 })
  }
  if (parsed.kind === 'composition-unsupported') {
    return Response.json({ error: parsed.motivo }, { status: 422 })
  }
  // Texto do histórico e estado divergentes: reabrir editaria um laudo e
  // mostraria outro. O texto continua legível no histórico.
  if (!laudoConfereComEnvelope(data.laudo_text as string, parsed.envelope)) {
    return Response.json({ error: 'o texto salvo não corresponde ao estado da composição' }, { status: 422 })
  }
  return Response.json({
    id: data.id,
    title: data.title,
    laudoText: data.laudo_text,
    updatedAt: data.updated_at,
    envelope: parsed.envelope,
  })
}

const Patch = z.object({
  expectedUpdatedAt: z.string().min(1),
  title: z.string().min(1).max(200),
  laudoText: z.string().min(1).max(100_000),
  envelope: CompositionEnvelopeV1Schema,
}).strict()

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { supabase, user, id } = await contexto(ctx)
  if (!user) return Response.json({ error: 'não autorizado' }, { status: 401 })
  if (!id.success) return Response.json({ error: 'laudo não encontrado' }, { status: 404 })

  let corpo: z.infer<typeof Patch>
  try {
    corpo = Patch.parse(await req.json())
  } catch {
    return Response.json({ error: 'estado da composição inválido' }, { status: 400 })
  }
  if (parseEnvelope(corpo.envelope).kind !== 'composition' || !isAssociationCode(corpo.envelope.associationCode)) {
    return Response.json({ error: 'estado da composição inválido' }, { status: 400 })
  }
  if (!laudoConfereComEnvelope(corpo.laudoText, corpo.envelope)) {
    return Response.json({ error: 'o texto salvo não corresponde ao estado da composição' }, { status: 400 })
  }

  const { data: atual } = await supabase
    .from('web_reports')
    .select('exam_state, updated_at')
    .eq('id', id.data)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!atual) return Response.json({ error: 'laudo não encontrado' }, { status: 404 })
  const salvo = parseEnvelope(atual.exam_state)
  // Só se edita a MESMA composição: trocar o id aqui regravaria outro exame
  // por cima deste.
  if (salvo.kind !== 'composition' || salvo.envelope.compositionId !== corpo.envelope.compositionId) {
    return Response.json({ error: 'este laudo não corresponde à composição aberta' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('web_reports')
    .update({
      category_code: corpo.envelope.associationCode,
      title: corpo.title,
      laudo_text: corpo.laudoText,
      exam_state: corpo.envelope,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id.data)
    .eq('user_id', user.id)
    .eq('updated_at', corpo.expectedUpdatedAt)
    .select('updated_at')
    .maybeSingle()
  if (error) return Response.json({ error: 'não foi possível salvar' }, { status: 500 })
  if (!data) {
    return Response.json({ error: 'o laudo foi alterado em outro lugar depois de aberto; reabra antes de salvar' }, { status: 409 })
  }
  return Response.json({ id: id.data, updatedAt: data.updated_at })
}
