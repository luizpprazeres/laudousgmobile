import Image from 'next/image'

/** Avisos de disponibilidade futura, sem links de download ativos. */
export default function StoreAvailability() {
  return (
    <div aria-label="Apps disponíveis em breve" className="grid max-w-[380px] grid-cols-2 gap-2">
      {[
        { name: 'App Store', icon: '/brand/badge-apple.svg' },
        { name: 'Google Play', icon: '/brand/badge-googleplay.svg' },
      ].map((store) => (
        <div key={store.name} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/20 bg-black/25 px-2 py-3 sm:px-3 text-white">
          <Image src={store.icon} alt="" width={25} height={25} className="shrink-0" />
          <span className="leading-tight"><span className="block whitespace-nowrap text-[0.7rem] sm:text-[0.72rem] text-slate-300">Disponível em breve</span><span className="block text-[0.95rem] sm:text-[1rem] font-semibold">{store.name}</span></span>
        </div>
      ))}
    </div>
  )
}
