import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { lerPerfil } from '@/lib/perfil/cliente'
import { Perfil, type PerfilDoMedico } from '@/components/preferencias/Perfil'
import { PlanoCard } from '@/components/preferencias/PlanoCard'
import { Digitadoras } from '@/components/preferencias/Digitadoras'
import { Tema } from '@/components/preferencias/Tema'
import type { Assinatura, PlanoDoBanco } from '@/lib/planos'

export const dynamic = 'force-dynamic'

/**
 * PREFERÊNCIAS — quem você é, o que você tem, e como a tela se comporta.
 *
 * Antes tinha só tema e digitadoras numa coluna estreita. O perfil (nome, CRM,
 * UF) não existia em lugar nenhum da web, mesmo com as colunas prontas no banco
 * desde o onboarding, e o médico não tinha como ver em que plano estava.
 *
 * Servidor busca o perfil, cliente cuida do que é interativo. A largura é usada:
 * duas colunas a partir de `lg`, com o que é do médico à esquerda e o que é da
 * conta e da máquina à direita.
 */
export default async function PreferenciasPage() {
  const r = await lerPerfil()
  const corpo = (r.ok ? r.corpo : null) as {
    profile?: PerfilDoMedico & { plan?: PlanoDoBanco }
    assinatura?: Assinatura
  } | null
  const perfil = corpo?.profile ?? null

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/app/gerar"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="mb-6 font-barlow text-2xl font-bold text-gray-900 dark:text-gray-100">
          Preferências
        </h1>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-4">
            {perfil ? (
              <Perfil inicial={perfil} />
            ) : (
              /**
               * FAIL-CLOSED. Sem perfil não se mostra um formulário vazio: o
               * médico preencheria o nome, salvaria contra o mesmo serviço que
               * está fora, e perderia o que digitou.
               */
              <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Não foi possível carregar o seu perfil agora.
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {r.ok ? 'O serviço respondeu sem os seus dados.' : r.erro}
                </p>
              </section>
            )}
            <Digitadoras />
          </div>

          <div className="flex flex-col gap-4">
            {/*
              Sem perfil, NÃO se mostra o cartão. O padrão seria 'free', e a
              tela diria "Plano Gratuito · assine o Essencial" para um médico
              que talvez já pague — com o botão de comprar de novo logo abaixo.
            */}
            {perfil ? (
              <PlanoCard plano={perfil.plan ?? 'free'} assinatura={corpo?.assinatura ?? null} />
            ) : null}
            <Tema />
          </div>
        </div>
      </div>
    </div>
  )
}
