"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  Library,
  Newspaper,
  Pencil,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/testbench", label: "Testbench", icon: FlaskConical },
  { href: "/modelos", label: "Modelos", icon: Library },
  { href: "/showcase", label: "Showcase", icon: LayoutGrid },
  { href: "/audit", label: "Audit", icon: FileText },
  { href: "/blocks", label: "Blocks", icon: Pencil },
  { href: "/reviewer", label: "Reviewer", icon: Eye },
  { href: "/changelog", label: "Changelog", icon: Newspaper },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center border-r border-stone-200 bg-white py-4">
      <Link
        aria-label="LaudoUSG.lab"
        className="mb-6 grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white shadow-card transition hover:bg-brand-700"
        href="/"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 3v18M9 3l5 5M9 21l5-5" />
          <path d="M14 3h6v18h-6" />
        </svg>
      </Link>

      <nav aria-label="Navegação principal" className="flex flex-1 flex-col items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <SidebarLink key={href} href={href} label={label} active={active}>
              <Icon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
              <span className="sr-only">{label}</span>
            </SidebarLink>
          );
        })}
      </nav>

      <SidebarLink href="/settings" label="Config" active={pathname.startsWith("/settings")} tone="muted">
        <Settings aria-hidden className="h-5 w-5" strokeWidth={1.8} />
        <span className="sr-only">Config</span>
      </SidebarLink>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  active,
  children,
  tone = "default",
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/item relative grid h-10 w-10 place-items-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        active
          ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
          : tone === "muted"
            ? "text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            : "text-stone-500 hover:bg-stone-100 hover:text-stone-900",
      )}
      href={href}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-card transition-opacity duration-150 group-hover/item:opacity-100"
      >
        {label}
      </span>
    </Link>
  );
}
