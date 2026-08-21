import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { abacatePost, isWebPlan, productIdForPlan } from '@/lib/abacatepay'

type SubscriptionCreateResponse = { url?: string; id?: string; status?: string }

export async function POST(request: NextRequest) {
  // 1) Usuário precisa estar logado (sabemos qual profile atualizar no webhook).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // 2) Valida o plano.
  const body = (await request.json().catch(() => ({}))) as { plan?: string }
  if (!isWebPlan(body.plan)) {
    return NextResponse.json({ error: 'plano inválido' }, { status: 400 })
  }
  const plan = body.plan

  const productId = productIdForPlan(plan)
  if (!productId) {
    return NextResponse.json({ error: 'produto não configurado' }, { status: 500 })
  }

  // 3) Cria a assinatura (checkout recorrente) na AbacatePay.
  const origin = request.nextUrl.origin
  const { data, error } = await abacatePost<SubscriptionCreateResponse>('/subscriptions/create', {
    items: [{ id: productId, quantity: 1 }],
    methods: ['CARD'],
    externalId: user.id,
    /**
     * Volta para as PREFERÊNCIAS, não para a tela de gerar.
     *
     * Quem acabou de pagar quer ver o que comprou. O destino antigo era
     * `/app?assinatura=sucesso` — e `/app` deixou de existir (o middleware
     * manda para `/app/gerar`), onde ninguém lia o parâmetro: o médico pagava e
     * caía numa tela de trabalho sem uma palavra de confirmação.
     */
    completionUrl: `${origin}/app/preferencias?assinatura=sucesso`,
    returnUrl: `${origin}/precos`,
    metadata: { userId: user.id, email: user.email, plan },
  })

  if (error || !data?.url) {
    return NextResponse.json(
      { error: error ?? 'falha ao criar checkout' },
      { status: 502 }
    )
  }

  return NextResponse.json({ url: data.url })
}
