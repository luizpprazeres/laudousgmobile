import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planos e Preços — LaudoUSG | Software de Laudos USG com IA',
  description:
    'Compare os planos do LaudoUSG: Gratuito, Essencial e Profissional. Escolha a solução ideal para sua rotina de ultrassonografia.',
  alternates: {
    canonical: 'https://laudousg.com/precos',
  },
  openGraph: {
    url: 'https://laudousg.com/precos',
    title: 'Planos e Preços — LaudoUSG | Software de Laudos USG com IA',
    description:
      'Compare os planos do LaudoUSG: Gratuito, Essencial e Profissional. Escolha a solução ideal para sua rotina de ultrassonografia.',
  },
}

export default function PrecosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
