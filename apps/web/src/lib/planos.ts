/**
 * OS PLANOS — uma fonte só, para a vitrine e para dentro do aplicativo.
 *
 * Os preços e o que cada plano inclui viviam dentro de `/precos/page.tsx`. A
 * tela de preferências precisa dizer ao médico em que plano ele está e o que
 * aquilo inclui — e copiar a tabela para lá criaria duas verdades sobre o mesmo
 * contrato comercial, que um dia divergem. Fica aqui, e as duas telas leem.
 */

/** O que se vende. Preços mensais, decisão do Luiz em 19/06. */
export const PRECOS = {
  essencial: 99.0,
  profissional: 169.9,
} as const

export type PlanoWeb = keyof typeof PRECOS

export const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export type LinhaComparativa = {
  label: string
  free: string | true | false
  essencial: string | true | false
  profissional: string | true | false
}

export const COMPARATIVO: LinhaComparativa[] = [
  { label: 'Laudos', free: '10 vitalício', essencial: '800/mês', profissional: 'Ilimitados' },
  { label: 'Categorias de USG', free: true, essencial: true, profissional: true },
  { label: 'Geração com e sem IA', free: true, essencial: true, profissional: true },
  { label: 'Link de sala (auxiliar)', free: false, essencial: true, profissional: true },
  { label: 'Exportação .docx', free: true, essencial: true, profissional: true },
  { label: 'Suporte', free: false, essencial: 'WhatsApp', profissional: 'WhatsApp prioritário' },
]

/**
 * O `plan` do banco NÃO é o nome comercial — e sozinho ele é AMBÍGUO.
 *
 * `profiles.plan` é `free | essencial | pro | clinic`, escrito por dois canais
 * que nomearam os níveis de formas diferentes:
 *
 *   - a **AbacatePay** (site) grava `pro` para quem assinou o **Essencial** e
 *     `clinic` para o **Profissional** (`lib/abacatepay.ts`);
 *   - a **Apple** (iOS) grava o tier dela, `essencial` ou `pro`, onde `pro` é o
 *     nível de cima (`subscriptions.tier`, com CHECK no banco).
 *
 * Então `pro` significa "o plano do meio" para quem assinou no site e "o de
 * cima" para quem assinou na App Store. Rotular a partir do `plan` sozinho
 * erraria o nome para metade dos assinantes.
 *
 * Quem desempata é a ORIGEM: `/api/me/profile` devolve a assinatura ativa da
 * App Store quando existe. Havendo linha, o tier da Apple manda; não havendo, o
 * plano veio do site.
 */
export type PlanoDoBanco = 'free' | 'essencial' | 'pro' | 'clinic'

/** A assinatura da App Store, quando o médico assinou por lá. */
export type Assinatura = {
  origem: 'apple'
  tier: 'essencial' | 'pro'
  period: 'monthly' | 'yearly' | string
  expires_at: string
  is_trial: boolean
  status: string
} | null

export type Nivel = {
  rotulo: string
  /** A coluna do comparativo que descreve este nível. */
  coluna: 'free' | 'essencial' | 'profissional'
  /** Onde a assinatura é gerida — e por isso onde se cancela. */
  origem: 'App Store' | 'site' | null
  /** `null` quando não há para onde subir. */
  sugereUpgrade: PlanoWeb | null
}

/**
 * O nível do médico, com o nome que o canal dele usa.
 *
 * A App Store manda quando há assinatura ativa: é o contrato vivo, e o `plan`
 * do perfil é só o reflexo dele.
 */
export function nivelDe(plano: PlanoDoBanco, assinatura: Assinatura): Nivel {
  if (assinatura) {
    return assinatura.tier === 'pro'
      ? { rotulo: 'Pro', coluna: 'profissional', origem: 'App Store', sugereUpgrade: null }
      : { rotulo: 'Essencial', coluna: 'essencial', origem: 'App Store', sugereUpgrade: null }
  }
  switch (plano) {
    case 'clinic':
      return { rotulo: 'Profissional', coluna: 'profissional', origem: 'site', sugereUpgrade: null }
    case 'pro':
    case 'essencial':
      return { rotulo: 'Essencial', coluna: 'essencial', origem: 'site', sugereUpgrade: 'profissional' }
    default:
      return { rotulo: 'Gratuito', coluna: 'free', origem: null, sugereUpgrade: 'essencial' }
  }
}

/** O que este nível inclui, em linhas prontas para listar. */
export function inclui(nivel: Nivel): { label: string; valor: string | boolean }[] {
  return COMPARATIVO.map((l) => ({ label: l.label, valor: l[nivel.coluna] }))
}
