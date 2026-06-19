// Integração AbacatePay — base https://api.abacatepay.com/v2 (auth Bearer).
// Mapeia as ofertas da web (essencial/profissional) ⇄ produtos AbacatePay ⇄
// enum profiles.plan do projeto (free | pro | clinic).

export const ABACATEPAY_BASE = 'https://api.abacatepay.com/v2'

export type WebPlan = 'essencial' | 'profissional'
export type ProfilePlan = 'free' | 'pro' | 'clinic'

type PlanConfig = {
  /** env com o product id da AbacatePay (modo dev/prod) */
  productEnv: string
  /** valor gravado em profiles.plan quando o pagamento confirma */
  profilePlan: Exclude<ProfilePlan, 'free'>
}

export const PLAN_CONFIG: Record<WebPlan, PlanConfig> = {
  essencial: { productEnv: 'ABACATEPAY_PRODUCT_ESSENCIAL', profilePlan: 'pro' },
  profissional: { productEnv: 'ABACATEPAY_PRODUCT_PROFISSIONAL', profilePlan: 'clinic' },
}

export function isWebPlan(v: unknown): v is WebPlan {
  return v === 'essencial' || v === 'profissional'
}

/** Resolve o product id (da env) para um plano da web. */
export function productIdForPlan(plan: WebPlan): string | undefined {
  return process.env[PLAN_CONFIG[plan].productEnv]
}

/** Dado um product id vindo do webhook, descobre o enum profiles.plan. */
export function profilePlanForProductId(productId: string | undefined): Exclude<ProfilePlan, 'free'> | undefined {
  if (!productId) return undefined
  for (const plan of Object.keys(PLAN_CONFIG) as WebPlan[]) {
    if (process.env[PLAN_CONFIG[plan].productEnv] === productId) {
      return PLAN_CONFIG[plan].profilePlan
    }
  }
  return undefined
}

/** Dado o nome do plano web (de metadata), retorna o enum profiles.plan. */
export function profilePlanForWebPlan(plan: WebPlan): Exclude<ProfilePlan, 'free'> {
  return PLAN_CONFIG[plan].profilePlan
}

type AbacateResponse<T> = { data: T | null; error: string | null; success?: boolean }

/** POST autenticado na API da AbacatePay. */
export async function abacatePost<T = unknown>(
  path: string,
  body: unknown
): Promise<AbacateResponse<T>> {
  const key = process.env.ABACATEPAY_API_KEY
  if (!key) return { data: null, error: 'ABACATEPAY_API_KEY ausente' }

  const res = await fetch(`${ABACATEPAY_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => ({}))) as AbacateResponse<T>
  if (!res.ok) {
    return { data: null, error: json?.error ?? `HTTP ${res.status}` }
  }
  return json
}
