import type { Metadata, Viewport } from 'next'
import { Inter, Barlow } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import JsonLd from '@/components/JsonLd'

const inter = Inter({
  subsets: ['latin'],
})

const barlow = Barlow({
  subsets: ['latin'],
  variable: '--font-barlow',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'LaudoUSG',
  applicationCategory: 'MedicalApplication',
  operatingSystem: 'Web',
  url: 'https://laudousg.com',
  description:
    'Plataforma para geração de laudos de ultrassonografia com inteligência artificial. Dite os achados por voz e obtenha laudos prontos em segundos.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Plano Gratuito',
      price: '0',
      priceCurrency: 'BRL',
      description: '10 laudos vitalícios — gratuito para sempre',
    },
    {
      '@type': 'Offer',
      name: 'Plano Essencial',
      price: '99.00',
      priceCurrency: 'BRL',
      description: 'Plano mensal essencial',
    },
    {
      '@type': 'Offer',
      name: 'Plano Profissional',
      price: '169.90',
      priceCurrency: 'BRL',
      description: 'Plano mensal profissional',
    },
  ],
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'LaudoUSG',
  url: 'https://laudousg.com',
  logo: 'https://laudousg.com/brand/logo-laudousg-transparent.png',
  description:
    'Plataforma SaaS para geração de laudos de ultrassonografia com inteligência artificial',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://laudousg.com'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LaudoUSG',
  },
  other: {
    'theme-color': '#ffffff',
  },
  title: 'LaudoUSG – Laudos de Ultrassonografia com IA',
  description:
    'Plataforma para geração de laudos de ultrassonografia com inteligência artificial. Dite os achados por voz e obtenha laudos prontos em segundos.',
  alternates: {
    canonical: 'https://laudousg.com',
  },
  openGraph: {
    type: 'website',
    url: 'https://laudousg.com',
    siteName: 'LaudoUSG',
    title: 'LaudoUSG – Laudos de Ultrassonografia com IA',
    description:
      'Plataforma para geração de laudos de ultrassonografia com inteligência artificial. Dite os achados por voz e obtenha laudos prontos em segundos.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LaudoUSG – Laudos de Ultrassonografia com IA',
    description:
      'Plataforma para geração de laudos de ultrassonografia com IA. Dite os achados e obtenha laudos prontos em segundos.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body
        className={`${inter.className} ${barlow.variable} antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider>
          <JsonLd schema={softwareAppSchema} />
          <JsonLd schema={organizationSchema} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
