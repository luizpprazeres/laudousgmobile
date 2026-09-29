import LandingNav from '@/components/landing/v2/LandingNav'
import HeroWorkspace from '@/components/landing/v2/HeroWorkspace'
import WorkflowRibbon from '@/components/landing/v2/WorkflowRibbon'
import Specialties from '@/components/landing/v2/Specialties'
import CalculatorStory from '@/components/landing/v2/CalculatorStory'
import SchemeDeck from '@/components/landing/v2/SchemeDeck'
import MobileStory from '@/components/landing/v2/MobileStory'
import WorkplaceScene from '@/components/landing/v2/WorkplaceScene'
import LandingFaq from '@/components/landing/v2/LandingFaq'
import FinalCta from '@/components/landing/v2/FinalCta'
import LandingFooter from '@/components/landing/v2/LandingFooter'
import Pricing from '@/components/landing/Pricing'

/**
 * Landing de www.laudousg.com.br: a Web primeiro, o celular depois.
 *
 * Server Component: só a ordem das seções mora aqui. Movimento e estado ficam
 * nos componentes client de `components/landing/v2`. Metadata, canonical e
 * dados estruturados continuam em `app/layout.tsx`, sem mudança.
 *
 * Ordem e tema: hero (claro) → especialidades (claro) → esquemas (escuro) →
 * sequência mobile (escuro, Claude 17bd) → onde você trabalha (claro, root) →
 * planos (escuro, oferta atual intacta) → fecho (claro).
 */
export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#111614] text-slate-950 selection:bg-emerald-100">
      <LandingNav />
      <main>
        <HeroWorkspace />
        <WorkflowRibbon />
        <Specialties />
        <CalculatorStory />
        <SchemeDeck />
        <MobileStory />
        <WorkplaceScene />
        <div data-nav-dark>
          <Pricing />
        </div>
        <LandingFaq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
