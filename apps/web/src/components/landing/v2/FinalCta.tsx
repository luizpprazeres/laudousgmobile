import { PlansLink, SignupCta } from './Cta'

/**
 * Fecho. A oferta de entrada é a mesma de hoje (10 laudos grátis, sem cartão),
 * repetida do plano Gratuito para não inventar condição nova.
 */
export default function FinalCta() {
  return (
    <section data-landing-section="cta-final" className="relative overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_20%_0%,rgba(16,185,129,0.12),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 items-end gap-10 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-32">
        <h2 className="font-barlow text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-slate-950 sm:text-[3.4rem] lg:col-span-8 xl:text-[4.2rem]">
          Faça o próximo laudo <span className="text-emerald-600">no LaudoUSG.</span>
        </h2>
        <div className="lg:col-span-4 lg:pb-2">
          <p className="max-w-[26rem] text-[1rem] leading-relaxed text-slate-600">
            Comece com 10 laudos grátis, sem cartão. Assine quando fizer sentido para a sua rotina.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <SignupCta size="lg" />
            <PlansLink />
          </div>
        </div>
      </div>
    </section>
  )
}
