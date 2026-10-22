"use client";
export default function ErroPainel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="callout warn">
      <b>Não foi possível carregar os dados.</b> Uma fonte falhou (Supabase ou App Store Connect).
      {error.digest ? <> Código: <code>{error.digest}</code>.</> : null}{" "}
      <button type="button" className="botao sec" onClick={reset}>Tentar de novo</button>
    </div>
  );
}
