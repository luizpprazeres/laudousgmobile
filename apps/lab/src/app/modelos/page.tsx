import { ModelCatalogEditor } from "@/components/modelos/ModelCatalogEditor";

export const dynamic = "force-dynamic";

export default function ModelosPage() {
  return (
    <section className="px-6 py-12 lg:px-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-brand-700">modelos</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-stone-900">
        Biblioteca de modelos
      </h1>
      <p className="mt-2 max-w-3xl text-base text-stone-600">
        O modelo de laudo, frase a frase. Reescreva o que quiser e veja o efeito nos cenários de
        exemplo antes de publicar — inclusive nos patológicos, onde a personalização não se
        aplica de propósito.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-stone-500">
        Esta é uma bancada de avaliação: <strong>nada é salvo</strong>. A publicação, o histórico
        e o rollback entram no próximo passo do projeto.
      </p>

      <div className="mt-10">
        <ModelCatalogEditor />
      </div>
    </section>
  );
}
