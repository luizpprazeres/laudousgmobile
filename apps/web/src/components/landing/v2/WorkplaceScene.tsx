import { SignupCta } from './Cta'

/**
 * Depois do pico da sequência mobile (a Sala no iMac), esta faixa fecha o
 * argumento para quem trabalha sozinho, o comprador principal, e só cita a
 * Sala como opção de equipe. Não repete o título da última etapa do mobile nem
 * usa foto ilustrativa: a prova visual real acabou de passar.
 *
 * Todo o conteúdo vem da versão anterior desta seção; nenhuma condição nova.
 */
const MODOS = [
  {
    quem: 'Sozinho',
    texto: 'Use a plataforma no navegador e revise o texto antes de levar ao sistema da clínica.',
  },
  {
    quem: 'Com equipe',
    texto: 'Com a Sala do Auxiliar, a equipe acompanha o laudo em tempo real no computador da sala.',
  },
] as const

export default function WorkplaceScene() {
  return (
    <section
      data-landing-section="workplace"
      aria-labelledby="workplace-title"
      className="bg-[#f4f6f4] text-slate-950"
    >
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:items-end lg:gap-16 lg:px-12 lg:py-24">
        <div className="lg:col-span-6">
          <h2
            id="workplace-title"
            className="font-barlow text-[2.3rem] font-extrabold leading-[1.04] tracking-[-0.025em] sm:text-[3rem] lg:text-[3.4rem]"
          >
            Sozinho ou com equipe,{' '}
            <br className="hidden sm:inline" />
            o laudo é o mesmo.
          </h2>
          <div className="mt-8"><SignupCta tone="dark" size="lg" /></div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Web disponível. Apps nativos para iPhone e Android em breve.
          </p>
        </div>

        <div className="lg:col-span-6">
          <dl className="divide-y divide-slate-300/70 border-y border-slate-300/70">
            {MODOS.map((m) => (
              <div key={m.quem} className="grid gap-2 py-6 sm:grid-cols-[9rem_1fr] sm:gap-8">
                <dt className="font-barlow text-lg font-bold text-slate-950">{m.quem}</dt>
                <dd className="max-w-[34rem] text-base leading-relaxed text-slate-700">{m.texto}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-slate-600">A revisão final continua com o médico.</p>
        </div>
      </div>
    </section>
  )
}
