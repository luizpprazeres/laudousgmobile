import { RendererPreferences } from "@/components/settings/RendererPreferences";

export default function SettingsPage() {
  return (
    <section className="px-6 py-12 lg:px-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">config</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
        Configurações
      </h1>
      <p className="mt-2 max-w-xl text-base text-stone-600">
        Preferências de renderização do laudo por categoria. Quotas por kind, versão de prompt
        ativo e whitelist admin entram nesta tela em seguida.
      </p>

      <div className="mt-10">
        <RendererPreferences />
      </div>
    </section>
  );
}
