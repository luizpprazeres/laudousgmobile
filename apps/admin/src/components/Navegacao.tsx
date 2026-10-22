"use client";
/** Menu lateral, seletor de período e tema — os únicos pedaços com JavaScript no navegador. */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITENS: { href: string; rotulo: string; icone: JSX.Element }[] = [
  { href: "/", rotulo: "Visão geral", icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg> },
  { href: "/funil", rotulo: "Funil", icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18l-7 9v6l-4 2v-8z" /></svg> },
  { href: "/testflight", rotulo: "TestFlight", icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" /></svg> },
  { href: "/assinaturas", rotulo: "Assinaturas", icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg> },
  { href: "/custos", rotulo: "Custos por usuário", icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
  { href: "/saude", rotulo: "Saúde", icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
];

export function Menu() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const p = busca.get("p");
  return (
    <nav className="nav" aria-label="Seções">
      {ITENS.map((i) => (
        <Link key={i.href} href={p ? `${i.href}?p=${p}` : i.href} aria-current={caminho === i.href ? "page" : undefined}>
          {i.icone}
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

export function SeletorPeriodo() {
  const caminho = usePathname();
  const p = useSearchParams().get("p") ?? "d30";
  const opcoes: [string, string][] = [["today", "Hoje"], ["d7", "7 dias"], ["d30", "30 dias"]];
  return (
    <div className="seg" role="group" aria-label="Período">
      {opcoes.map(([v, r]) => (
        <Link key={v} href={`${caminho}?p=${v}`} aria-current={p === v ? "true" : undefined} scroll={false}>
          {r}
        </Link>
      ))}
    </div>
  );
}

export function BotaoTema() {
  function alternar() {
    const raiz = document.documentElement;
    const atual = raiz.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const novo = atual === "dark" ? "light" : "dark";
    raiz.dataset.theme = novo;
    try {
      localStorage.setItem("admin-tema", novo);
    } catch {
      /* sem armazenamento: só nesta aba */
    }
  }
  return (
    <button type="button" className="icon-btn" onClick={alternar} aria-label="Alternar modo claro/escuro" title="Alternar modo claro/escuro">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
    </button>
  );
}
