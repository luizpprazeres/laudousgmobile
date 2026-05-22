export default function SettingsPage() {
  return (
    <section className="px-6 py-12 lg:px-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">config</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
        Quotas, prompts globais e whitelist
      </h1>
      <p className="mt-2 max-w-xl text-base text-stone-600">
        Em definição. Esta tela vai concentrar configurações de quota por kind, versão de prompt
        ativo, whitelist admin e flags experimentais.
      </p>
    </section>
  );
}
