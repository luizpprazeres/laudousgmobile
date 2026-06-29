import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  isWebPlan,
  profilePlanForWebPlan,
  profilePlanForProductId,
  type ProfilePlan,
} from '@/lib/abacatepay'

// Webhook AbacatePay. Autenticação: secret na URL (?webhookSecret=...).
// Eventos de assinatura: subscription.completed / .renewed (pago) e .cancelled.
// Atualiza profiles.plan via service role (bypass RLS).

type Subscription = {
  externalId?: string
  metadata?: { userId?: string; plan?: string }
  items?: Array<{ id?: string; productId?: string; product?: { id?: string } }>
  productId?: string
}

type WebhookBody = {
  event?: string
  data?: {
    subscription?: Subscription
    payment?: { status?: string }
  }
}

function extractUserId(sub: Subscription): string | undefined {
  return sub.externalId || sub.metadata?.userId
}

function extractProfilePlan(sub: Subscription): Exclude<ProfilePlan, 'free'> | undefined {
  // 1) preferir o plano vindo do metadata que enviamos no checkout
  const metaPlan = sub?.metadata?.plan
  if (isWebPlan(metaPlan)) return profilePlanForWebPlan(metaPlan)
  // 2) fallback: descobrir pelo product id presente na assinatura
  const productId =
    sub?.productId ||
    sub?.items?.[0]?.id ||
    sub?.items?.[0]?.productId ||
    sub?.items?.[0]?.product?.id
  return profilePlanForProductId(productId)
}

export async function POST(request: NextRequest) {
  // 1) Valida o secret na URL.
  const expected = process.env.ABACATEPAY_WEBHOOK_SECRET
  const provided = request.nextUrl.searchParams.get('webhookSecret')
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as WebhookBody
  const event = body.event ?? ''
  const sub = body.data?.subscription

  const userId = sub ? extractUserId(sub) : undefined
  if (!userId) {
    // Sem como mapear ao profile — aceita (200) para não reentregar infinitamente,
    // mas registra para investigação.
    console.warn('[abacate webhook] evento sem userId mapeável:', event)
    return NextResponse.json({ received: true, mapped: false })
  }

  let newPlan: ProfilePlan | undefined

  switch (event) {
    case 'subscription.completed':
    case 'subscription.renewed':
      newPlan = sub ? extractProfilePlan(sub) : undefined
      break
    case 'subscription.cancelled':
      newPlan = 'free'
      break
    default:
      // trial_started e outros: nada a fazer no plano.
      return NextResponse.json({ received: true, event, action: 'ignored' })
  }

  if (!newPlan) {
    console.warn('[abacate webhook] não foi possível resolver o plano para', event)
    return NextResponse.json({ received: true, mapped: false })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ plan: newPlan }).eq('id', userId)

  if (error) {
    console.error('[abacate webhook] erro ao atualizar profile:', error.message)
    return NextResponse.json({ error: 'db update failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, userId, plan: newPlan })
}
