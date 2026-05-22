export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-primary">LaudoUSG.lab</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-zinc-950">Acesso admin</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">Login do painel será conectado no próximo sprint.</p>
        <button
          className="mt-8 w-full cursor-not-allowed rounded-lg bg-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-500"
          disabled
          type="button"
        >
          Entrar com email
        </button>
      </section>
    </main>
  );
}
