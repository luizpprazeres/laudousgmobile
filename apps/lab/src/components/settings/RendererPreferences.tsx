"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Toggles de renderer por categoria (DET-5 ONDA 2). Lê/grava em
 * /api/me/report-preferences (proxy do lab → API mobile, conta admin). Os
 * defaults espelham os do backend: a coluna `renderer_preferences` nasce null,
 * então o estado efetivo de uma chave ausente é o default abaixo.
 */

type ToggleKey = "show_domingos_score" | "show_conduct_recommendation";

type ToggleDef = {
  key: ToggleKey;
  label: string;
  help: string;
  /** Espelha o default do renderer no backend quando a chave está ausente. */
  default: boolean;
};

type CategoryDef = { code: string; label: string; toggles: ToggleDef[] };

const CATEGORIES: CategoryDef[] = [
  {
    code: "TIREOIDE",
    label: "Tireoide",
    toggles: [
      {
        key: "show_domingos_score",
        label: "Escore de Domingos",
        help: "Exibe a NOTA final e o TI-RADS calculados na conclusão.",
        default: true,
      },
      {
        key: "show_conduct_recommendation",
        label: "Conduta sugerida",
        help: "Acrescenta a conduta sugerida por TI-RADS ao final do laudo.",
        default: false,
      },
    ],
  },
  {
    code: "MAMARIA",
    label: "Mamária",
    toggles: [
      {
        key: "show_conduct_recommendation",
        label: "Conduta sugerida",
        help: "Acrescenta a conduta sugerida por BI-RADS ao final do laudo.",
        default: false,
      },
    ],
  },
];

type PrefRow = {
  category_code: string;
  renderer_preferences: Record<string, unknown> | null;
};

type GetResponse = { preferences?: PrefRow[] };

function effectiveValue(
  prefs: PrefRow[],
  code: string,
  toggle: ToggleDef,
): boolean {
  const row = prefs.find((p) => p.category_code === code);
  const val = row?.renderer_preferences?.[toggle.key];
  return typeof val === "boolean" ? val : toggle.default;
}

function mergeLocal(
  prefs: PrefRow[],
  code: string,
  key: ToggleKey,
  value: boolean,
): PrefRow[] {
  const idx = prefs.findIndex((p) => p.category_code === code);
  if (idx === -1) {
    return [...prefs, { category_code: code, renderer_preferences: { [key]: value } }];
  }
  const next = [...prefs];
  const current = next[idx];
  if (!current) return next;
  const base =
    current.renderer_preferences && typeof current.renderer_preferences === "object"
      ? { ...current.renderer_preferences }
      : {};
  next[idx] = { ...current, renderer_preferences: { ...base, [key]: value } };
  return next;
}

export function RendererPreferences() {
  const [prefs, setPrefs] = useState<PrefRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/me/report-preferences", {
          signal: controller.signal,
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail.slice(0, 200) || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as GetResponse;
        setPrefs(data.preferences ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setPrefs([]);
      }
    })();
    return () => controller.abort();
  }, []);

  const onToggle = useCallback(
    async (code: string, toggle: ToggleDef, next: boolean) => {
      const fieldId = `${code}:${toggle.key}`;
      setError(null);
      // Atualização otimista.
      setPrefs((p) => (p ? mergeLocal(p, code, toggle.key, next) : p));
      setSaving((s) => new Set(s).add(fieldId));
      try {
        const res = await fetch("/api/me/report-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_code: code,
            renderer_preferences: { [toggle.key]: next },
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail.slice(0, 200) || `HTTP ${res.status}`);
        }
      } catch (err) {
        // Reverte em caso de falha.
        setPrefs((p) => (p ? mergeLocal(p, code, toggle.key, !next) : p));
        setError((err as Error).message);
      } finally {
        setSaving((s) => {
          const n = new Set(s);
          n.delete(fieldId);
          return n;
        });
      }
    },
    [],
  );

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-lg font-bold tracking-tight text-stone-900">
        Preferências de renderer
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Toggles por categoria aplicados na geração do laudo (conta admin do lab).
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-100">
          Falha ao carregar/salvar: {error}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {prefs === null
          ? CATEGORIES.map((c) => <CategorySkeleton key={c.code} label={c.label} />)
          : CATEGORIES.map((cat) => (
              <div
                key={cat.code}
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-card"
              >
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-brand-700">
                  {cat.label}
                </h3>
                <div className="mt-3 divide-y divide-stone-100">
                  {cat.toggles.map((toggle) => {
                    const fieldId = `${cat.code}:${toggle.key}`;
                    const checked = effectiveValue(prefs, cat.code, toggle);
                    return (
                      <div
                        key={toggle.key}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-stone-900">
                            {toggle.label}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-500">{toggle.help}</p>
                        </div>
                        <Switch
                          checked={checked}
                          disabled={saving.has(fieldId)}
                          label={`${cat.label} — ${toggle.label}`}
                          onChange={(next) => onToggle(cat.code, toggle, next)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

function CategorySkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-card">
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-stone-300">
        {label}
      </h3>
      <div className="mt-3 h-10 animate-pulse rounded-md bg-stone-100" />
    </div>
  );
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        checked ? "bg-brand-600" : "bg-stone-300",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
