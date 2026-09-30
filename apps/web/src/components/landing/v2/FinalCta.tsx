import { PlansLink, SignupCta } from './Cta'

/**
 * Fecho, emendado ao rodapé (mesmo fundo): a frase termina no próprio nome,
 * em tamanho de assinatura. "Faça o próximo laudo no" + LaudoUSG grande.
 *
 * Ordem no celular: frase, nome, oferta — a frase não é interrompida pelos
 * botões. No desktop a oferta sobe para a direita da primeira linha.
 *
 * A oferta de entrada é a mesma de hoje (10 laudos grátis, sem cartão),
 * repetida do plano Gratuito para não inventar condição nova.
 */
export default function FinalCta() {
  return (
    <section data-landing-section="cta-final" aria-labelledby="cta-final-title" className="bg-slate-50">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-x-10 px-5 pt-24 sm:px-8 lg:grid-cols-12 lg:px-12 lg:pt-32">
        <h2
          id="cta-final-title"
          className="font-barlow text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-slate-950 [text-wrap:balance] sm:text-[3.4rem] lg:col-span-8 lg:row-start-1 lg:self-end xl:text-[4.2rem]"
        >
          Faça o próximo laudo no<span className="sr-only"> LaudoUSG.</span>
        </h2>

        {/* Nome em tamanho de assinatura, nas cores e pesos do logotipo. */}
        <p
          aria-hidden
          className="mt-1 select-none overflow-hidden text-[clamp(4.5rem,13vw,12rem)] font-black leading-[0.9] tracking-[-0.045em] text-[#18533F] lg:col-span-12 lg:row-start-2"
        >
          Laudo<span className="font-normal text-[#4a8a6a]">USG</span>
        </p>

        <div className="mt-10 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:mt-0 lg:self-end lg:pb-2">
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
