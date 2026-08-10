"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

type Crumb = { href?: string; label: string };

const SEGMENT_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/testbench": "Testbench",
  "/modelos": "Modelos",
  "/prompts": "Prompts",
  "/audit": "Audit",
  "/blocks": "Blocks",
  "/reviewer": "Reviewer",
  "/changelog": "Changelog",
  "/settings": "Config",
  "/login": "Login",
};

function deriveCrumbs(pathname: string): Crumb[] {
  if (pathname === "/") return [{ label: "Dashboard" }];

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ href: "/", label: "Dashboard" }];

  let accumulated = "";
  for (const seg of segments) {
    accumulated += `/${seg}`;
    crumbs.push({
      href: accumulated,
      label: SEGMENT_LABELS[accumulated] ?? decodeURIComponent(seg),
    });
  }

  const last = crumbs[crumbs.length - 1];
  if (last && crumbs.length > 1) last.href = undefined;
  return crumbs;
}

export function PageHeader() {
  const pathname = usePathname();
  const crumbs = deriveCrumbs(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-stone-200 bg-white/90 px-6 backdrop-blur lg:px-10">
      <div className="flex items-center gap-4">
        <div className="font-display text-lg font-bold tracking-tight">
          <span className="text-stone-900">LaudoUSG</span>
          <span className="text-brand-600">.lab</span>
        </div>
        <div className="hidden h-5 w-px bg-stone-200 md:block" aria-hidden />
        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm md:flex">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-2">
                {crumb.href && !isLast ? (
                  <Link className="text-stone-500 hover:text-stone-900" href={crumb.href}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-medium text-stone-900" : "text-stone-500"}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <span className="text-stone-300">/</span>}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Buscar (em breve)"
          className="hidden items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-400 sm:flex"
          disabled
          title="Em breve"
          type="button"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <kbd className="font-mono text-xs uppercase tracking-wider">⌘K</kbd>
        </button>
        <div className="h-6 w-px bg-stone-200" aria-hidden />
        <div className="flex items-center gap-2 text-sm">
          <div
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 font-display text-sm font-semibold text-brand-800"
          >
            L
          </div>
          <span className="hidden text-stone-700 lg:inline">Luiz</span>
        </div>
      </div>
    </header>
  );
}
