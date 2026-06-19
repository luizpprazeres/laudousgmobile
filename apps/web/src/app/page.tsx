export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-sm font-medium text-emerald-700">
        laudousg web v2 — skeleton
      </span>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        LaudoUSG
      </h1>
      <p className="max-w-xl text-lg text-neutral-500">
        Nova plataforma web em construção. Geração de laudos de ultrassonografia
        com e sem IA.
      </p>
      <p className="text-sm text-neutral-400">
        S0 · scaffold no ar — landing e gerador chegam nos próximos sprints.
      </p>
    </main>
  );
}
