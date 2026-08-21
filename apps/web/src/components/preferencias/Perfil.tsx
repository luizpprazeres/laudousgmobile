'use client'

import { useState } from 'react'
import { Check, Loader2, Lock } from 'lucide-react'
import { UFS } from '@/lib/ufs'

export type PerfilDoMedico = {
  name: string | null
  email: string
  crm: string | null
  uf: string | null
}

/**
 * QUEM ASSINA O LAUDO — nome, CRM e UF.
 *
 * O e-mail fica travado: é a identidade da conta no Supabase, e trocá-lo é
 * mudar de login, não editar um campo. O cadeado diz isso sem precisar de um
 * parágrafo.
 *
 * CRM e UF andam juntos porque um número de conselho sem estado não identifica
 * ninguém — o mesmo número existe em 27 conselhos. A regra vale nas duas pontas:
 * aqui, para o médico entender, e na rota canônica, para valer.
 */
export function Perfil({ inicial }: { inicial: PerfilDoMedico }) {
  const [nome, setNome] = useState(inicial.name ?? '')
  const [crm, setCrm] = useState(inicial.crm ?? '')
  const [uf, setUf] = useState(inicial.uf ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const mudou =
    nome !== (inicial.name ?? '') || crm !== (inicial.crm ?? '') || uf !== (inicial.uf ?? '')

  /** Um sem o outro não vai — e o botão diz isso antes de o servidor recusar. */
  const meioPreenchido = (crm.trim() === '') !== (uf === '')

  const salvar = async () => {
    setSalvando(true)
    setErro(null)
    setSalvo(false)
    try {
      /**
       * SÓ o que mudou vai no corpo — PATCH de verdade, e não é preciosismo.
       *
       * Há CRM gravado no formato antigo, com prefixo e estado dentro da string
       * ("CRM-AL 9446"). A validação de hoje exige só dígitos, e com razão: é o
       * que sai impresso. Mandar os três campos sempre faria esse médico ser
       * recusado ao tentar mudar apenas o NOME, por causa de um CRM que ele nem
       * tocou. Enviando só o alterado, o campo antigo fica quieto até que ele
       * mesmo resolva mexer nele.
       */
      const patch: Record<string, string | null> = {}
      if (nome !== (inicial.name ?? '')) patch.name = nome.trim() || null
      if (crm !== (inicial.crm ?? '')) patch.crm = crm.trim() || null
      if (uf !== (inicial.uf ?? '')) patch.uf = uf || null

      const r = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setErro(
          j.error === 'crm_e_uf_juntos'
            ? 'Informe o CRM e a UF juntos, ou deixe os dois em branco.'
            : j.error === 'invalid_body'
              ? 'O CRM é só o número, de 4 a 10 dígitos.'
              : j.error === 'registro_nao_suportado'
                ? 'O serviço ainda não grava CRM e UF. Nada foi salvo — tente de novo em alguns minutos.'
                : (j.error ?? 'Não foi possível salvar.'),
        )
        return
      }
      setSalvo(true)
    } catch {
      setErro('Sem conexão. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Perfil</h2>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        É o que identifica você como responsável pelo laudo.
      </p>

      <div className="flex flex-col gap-3">
        <Campo rotulo="Nome">
          <input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              setSalvo(false)
            }}
            placeholder="Dr. Domingos Prazeres"
            maxLength={120}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </Campo>

        <div className="flex flex-wrap items-end gap-2">
          <Campo rotulo="CRM" className="min-w-[8rem] flex-1">
            <input
              value={crm}
              inputMode="numeric"
              /* Só dígitos entram — o "CRM" e a UF já têm o lugar deles. */
              onChange={(e) => {
                setCrm(e.target.value.replace(/\D/g, '').slice(0, 10))
                setSalvo(false)
              }}
              placeholder="12345"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </Campo>
          <Campo rotulo="UF" className="w-24">
            <select
              value={uf}
              onChange={(e) => {
                setUf(e.target.value)
                setSalvo(false)
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">—</option>
              {UFS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo rotulo="E-mail">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 dark:border-gray-700">
            <span className="flex-1 truncate text-sm text-gray-500 dark:text-gray-400">
              {inicial.email}
            </span>
            <Lock
              className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600"
              aria-label="O e-mail é o seu login e não muda por aqui"
            />
          </div>
        </Campo>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={salvar}
          disabled={!mudou || salvando || meioPreenchido}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar
        </button>
        {meioPreenchido ? (
          <span className="text-xs text-amber-700 dark:text-amber-500">
            CRM e UF andam juntos.
          </span>
        ) : salvo ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> salvo
          </span>
        ) : null}
        {erro ? <span className="text-xs text-red-600 dark:text-red-400">{erro}</span> : null}
      </div>
    </section>
  )
}

function Campo({
  rotulo,
  className,
  children,
}: {
  rotulo: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {rotulo}
      </span>
      {children}
    </label>
  )
}
