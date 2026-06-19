'use client'

import Image from 'next/image'
import { Reveal } from './Reveal'

function StoreBadge({
  glyph,
  alt,
  small,
  big,
}: {
  glyph: string
  alt: string
  small: string
  big: string
}) {
  return (
    <div className="relative inline-flex items-center gap-3 rounded-2xl bg-[#0f172a] text-white pl-4 pr-5 py-2.5 min-w-[210px] select-none">
      <span className="absolute -top-2 right-3 rounded-full bg-emerald-500 text-white text-[0.56rem] font-bold uppercase tracking-[0.08em] px-2 py-0.5">
        Em breve
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={glyph} alt={alt} width={26} height={26} className="w-[26px] h-[26px]" />
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[0.62rem] text-slate-300">{small}</span>
        <span className="font-barlow font-bold text-[1.02rem]">{big}</span>
      </span>
    </div>
  )
}

export default function Stores() {
  return (
    <section className="relative bg-white px-6 sm:px-10 pt-20 sm:pt-24 pb-20 lg:pb-0 lg:min-h-[600px] overflow-hidden">
      <div className="relative max-w-[1080px] mx-auto lg:flex lg:items-center lg:min-h-[520px]">
        <Reveal className="relative z-10 lg:max-w-[54%]">
          <h2 className="font-barlow font-extrabold text-[2rem] sm:text-[2.5rem] leading-[1.08] tracking-[-0.02em] text-[#0f172a] mb-4">
            Em breve,{' '}
            <span className="text-emerald-600">na palma da mão.</span>
          </h2>
          <p className="text-[0.96rem] leading-[1.7] text-slate-600 max-w-[460px] mb-7">
            Já dá pra usar tudo pelo navegador do celular hoje. Os apps nativos de iPhone e
            Android estão a caminho, pra ficar ainda mais rápido abrir e laudar.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <StoreBadge
              glyph="/brand/badge-apple.svg"
              alt="App Store"
              small="Em breve na"
              big="App Store"
            />
            <StoreBadge
              glyph="/brand/badge-googleplay.svg"
              alt="Google Play"
              small="Disponível em breve no"
              big="Google Play"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto lg:mx-0 mt-12 lg:mt-0 w-[260px] sm:w-[300px] lg:w-[380px] lg:absolute lg:right-[4%] lg:bottom-0">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 bottom-0 bg-gradient-to-tr from-emerald-100/70 to-transparent rounded-t-3xl blur-xl"
            />
            <div className="relative rounded-t-3xl border border-b-0 border-slate-200 shadow-[0_30px_70px_-22px_rgba(15,23,42,0.28)] overflow-hidden bg-white">
              <Image
                src="/brand/app-preview.png"
                alt="App LaudoUSG no iPhone, na tela de escolher a categoria do exame"
                width={840}
                height={1010}
                className="w-full h-auto block"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
