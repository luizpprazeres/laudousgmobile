import { Suspense, type ReactNode } from "react";
import { BotaoTema, Menu, SeletorPeriodo } from "@/components/Navegacao";
import { exigirAdmin } from "@/lib/auth/servidor";
import { comBase } from "@/lib/base";

export const dynamic = "force-dynamic";

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  // Segunda checagem (a primeira é o middleware): sem admin + MFA, nada abaixo renderiza.
  await exigirAdmin();
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>LaudoUSG <small>· Admin</small></span>
        </div>
        <div className="spacer" />
        <Suspense fallback={null}><SeletorPeriodo /></Suspense>
        <BotaoTema />
        <form method="post" action={comBase("/api/auth/logout")}>
          <button type="submit" className="botao sec" title="Sair do painel">Sair</button>
        </form>
      </header>
      <div className="shell">
        <aside className="side">
          <Suspense fallback={null}><Menu /></Suspense>
          <div className="side-foot">
            <div><b>Painel interno</b></div>
            <div>Só leitura, exceto Instagram e Convites. Números com tarja são fictícios até o GO indicado.</div>
          </div>
        </aside>
        <main id="conteudo" tabIndex={-1}>{children}</main>
      </div>
    </>
  );
}
