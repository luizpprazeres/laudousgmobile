"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { useParams } from "next/navigation";

type SalaReport = {
  id: string;
  outputText: string;
  category: string | null;
  createdAt: string;
};

type TimelineEntry = {
  id: string;
  category: string | null;
  createdAt: string;
};

type Theme = "light" | "dark";
const HIDDEN_IDS_KEY = "sala-hidden-ids";
const THEME_KEY = "sala-theme";
const HIGHLIGHT_KEY = "sala-highlight";
const NOTES_KEY = "sala-notes";
const SEEN_IDS_KEY = "sala-seen-ids";

type ActivityKind =
  | "received"
  | "viewed"
  | "copied"
  | "highlight-on"
  | "highlight-off"
  | "note"
  | "back-live";

type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  at: number;
  label?: string;
};

type InvalidReason = "invalid_format" | "not_found" | "revoked" | "expired";

type SalaResponse = {
  tokenValid: boolean;
  report: SalaReport | null;
  reportsToday?: TimelineEntry[];
  reason?: InvalidReason;
};

const POLL_INTERVAL_MS = 5000;

const A4_PAGE_WIDTH_PX = 794;
const A4_PAGE_HEIGHT_PX = 1123;
const A4_PAGE_GAP_PX = 24;

export default function SalaTokenPage() {
  const params = useParams<{ token: string }>();
  const token = (params?.token ?? "").toUpperCase();

  const [tokenValid, setTokenValid] = useState(true);
  const [invalidReason, setInvalidReason] = useState<InvalidReason | null>(null);
  const [report, setReport] = useState<SalaReport | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const [updatedFlash, setUpdatedFlash] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>("light");
  const [highlightOn, setHighlightOn] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SalaReport | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [clock, setClock] = useState<string>(() => formatClock(new Date()));
  const [noteDraft, setNoteDraft] = useState("");
  const [notes, setNotes] = useState<{ id: string; text: string; at: number }[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const lastSignatureRef = useRef<string | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }
      const storedHl = localStorage.getItem(HIGHLIGHT_KEY);
      if (storedHl === "0") setHighlightOn(false);
      const storedHidden = localStorage.getItem(HIDDEN_IDS_KEY);
      if (storedHidden) {
        const arr = JSON.parse(storedHidden) as string[];
        setHiddenIds(new Set(arr));
      }
      const storedNotes = localStorage.getItem(NOTES_KEY);
      if (storedNotes) {
        const arr = JSON.parse(storedNotes) as { id: string; text: string; at: number }[];
        setNotes(arr.slice(-50));
      }
      const storedSeen = localStorage.getItem(SEEN_IDS_KEY);
      if (storedSeen) {
        setSeenIds(new Set(JSON.parse(storedSeen) as string[]));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  function pushActivity(kind: ActivityKind, label?: string) {
    setActivity((prev) => [
      { id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, at: Date.now(), label },
      ...prev,
    ].slice(0, 40));
  }

  function persistNotes(next: { id: string; text: string; at: number }[]) {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(next.slice(-50))); } catch {}
  }

  function persistSeen(next: Set<string>) {
    try { localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(Array.from(next))); } catch {}
  }

  function submitNote() {
    const text = noteDraft.trim();
    if (!text) return;
    const entry = { id: `n-${Date.now()}`, text, at: Date.now() };
    setNotes((prev) => {
      const next = [...prev, entry];
      persistNotes(next);
      return next;
    });
    pushActivity("note", text.length > 40 ? `${text.slice(0, 40)}…` : text);
    setNoteDraft("");
  }

  function removeNote(id: string) {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      persistNotes(next);
      return next;
    });
  }

  function markSeen(id: string) {
    setSeenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistSeen(next);
      return next;
    });
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(HIGHLIGHT_KEY, highlightOn ? "1" : "0"); } catch {}
  }, [highlightOn]);

  function hideEntry(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    if (selectedReportId === id) {
      setSelectedReportId(null);
      setSelectedReport(null);
    }
  }

  async function selectReport(id: string) {
    if (id === selectedReportId) return;
    setSelectedReportId(id);
    setSelectedReport(null);
    setSelectedLoading(true);
    let loadedReport: SalaReport | null = null;
    try {
      const res = await fetch(
        `/api/sala/report?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { report: SalaReport | null };
      loadedReport = data.report ?? null;
      setSelectedReport(loadedReport);
    } catch {
      setSelectedReport(null);
    } finally {
      setSelectedLoading(false);
      if (loadedReport) {
        pushActivity("viewed", prettyCategory(loadedReport.category ?? ""));
      }
    }
  }

  function backToLive() {
    setSelectedReportId(null);
    setSelectedReport(null);
    pushActivity("back-live");
  }

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  function toggleHighlight() {
    setHighlightOn((v) => {
      pushActivity(v ? "highlight-off" : "highlight-on");
      return !v;
    });
  }

  async function onCopy() {
    if (!displayReport) return;
    await copyReportToClipboard(displayReport);
    setCopied(true);
    pushActivity("copied");
    setTimeout(() => setCopied(false), 1800);
  }

  async function fetchLatest() {
    try {
      const res = await fetch(`/api/sala/latest?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as SalaResponse;
      setLoading(false);
      setLastFetch(new Date());
      setTokenValid(data.tokenValid);
      setInvalidReason(data.tokenValid ? null : data.reason ?? "not_found");
      setTimeline(data.reportsToday ?? []);
      if (data.report) {
        const sig = data.report.outputText + (data.report.createdAt ?? "");
        if (lastSignatureRef.current && lastSignatureRef.current !== sig) {
          setUpdatedFlash((n) => n + 1);
          pushActivity("received", prettyCategory(data.report.category ?? ""));
        } else if (!lastSignatureRef.current) {
          pushActivity("received", prettyCategory(data.report.category ?? ""));
        }
        lastSignatureRef.current = sig;
        setReport(data.report);
      } else {
        setReport(null);
      }
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchLatest();
    const intId = setInterval(fetchLatest, POLL_INTERVAL_MS);
    const tickId = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(intId);
      clearInterval(tickId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const secondsSinceFetch = useMemo(() => {
    void tick;
    if (!lastFetch) return null;
    return Math.max(0, Math.floor((Date.now() - lastFetch.getTime()) / 1000));
  }, [tick, lastFetch]);

  const visibleTimeline = useMemo(
    () => timeline.filter((e) => !hiddenIds.has(e.id)),
    [timeline, hiddenIds],
  );
  const summary = useMemo(() => summarize(visibleTimeline), [visibleTimeline]);
  const latestReport = useMemo(
    () => (report && !hiddenIds.has(report.id) ? report : null),
    [report, hiddenIds],
  );
  const isViewingPast = selectedReportId !== null && selectedReportId !== latestReport?.id;
  const displayReport: SalaReport | null = isViewingPast ? selectedReport : latestReport;
  const activeId = displayReport?.id ?? latestReport?.id ?? null;
  const status: "loading" | "invalid" | "waiting" | "live" = loading
    ? "loading"
    : !tokenValid
      ? "invalid"
      : selectedLoading
        ? "loading"
        : !displayReport
          ? "waiting"
          : "live";

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || target.isContentEditable;
    }

    function selectRelative(delta: number) {
      if (visibleTimeline.length === 0) return;
      const currentIndex = activeId
        ? visibleTimeline.findIndex((entry) => entry.id === activeId)
        : -1;
      const nextIndex = Math.min(
        Math.max(currentIndex + delta, 0),
        visibleTimeline.length - 1,
      );
      const next = visibleTimeline[nextIndex];
      if (next) selectReport(next.id);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (isViewingPast) backToLive();
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        selectRelative(1);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        selectRelative(-1);
        return;
      }
      if (e.key === "c") {
        e.preventDefault();
        void onCopy();
        return;
      }
      if (e.key === "h") {
        e.preventDefault();
        toggleHighlight();
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        noteInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, displayReport, isViewingPast, shortcutsOpen, visibleTimeline]);

  return (
    <>
      <Shell
        status={status}
        invalidReason={invalidReason}
        report={displayReport}
        timeline={visibleTimeline}
        activeId={activeId}
        isViewingPast={isViewingPast}
        summary={summary}
        secondsSinceFetch={secondsSinceFetch}
        updatedFlash={updatedFlash}
        theme={theme}
        clock={clock}
        highlightOn={highlightOn}
        copied={copied}
        notes={notes}
        noteDraft={noteDraft}
        activity={activity}
        shortcutsOpen={shortcutsOpen}
        noteInputRef={noteInputRef}
        onToggleTheme={toggleTheme}
        onToggleHighlight={toggleHighlight}
        onCopy={onCopy}
        onHide={hideEntry}
        onSelect={selectReport}
        onBackToLive={backToLive}
        onSubmitNote={submitNote}
        onNoteDraft={setNoteDraft}
        onRemoveNote={removeNote}
        onCloseShortcuts={() => setShortcutsOpen(false)}
        formatClock={formatClock}
      />
      <GlobalStyles />
      <ScopedStyles />
    </>
  );
}

function Shell({
  status,
  invalidReason,
  report,
  timeline,
  activeId,
  isViewingPast,
  summary,
  secondsSinceFetch,
  updatedFlash,
  theme,
  clock,
  highlightOn,
  copied,
  notes,
  noteDraft,
  activity,
  shortcutsOpen,
  noteInputRef,
  onToggleTheme,
  onToggleHighlight,
  onCopy,
  onHide,
  onSelect,
  onBackToLive,
  onSubmitNote,
  onNoteDraft,
  onRemoveNote,
  onCloseShortcuts,
  formatClock,
}: {
  status: "loading" | "invalid" | "waiting" | "live";
  invalidReason: InvalidReason | null;
  report: SalaReport | null;
  timeline: TimelineEntry[];
  activeId: string | null;
  isViewingPast: boolean;
  summary: { label: string; count: number }[];
  secondsSinceFetch: number | null;
  updatedFlash: number;
  theme: Theme;
  clock: string;
  highlightOn: boolean;
  copied: boolean;
  notes: { id: string; text: string; at: number }[];
  noteDraft: string;
  activity: ActivityEntry[];
  shortcutsOpen: boolean;
  noteInputRef: RefObject<HTMLTextAreaElement>;
  onToggleTheme: () => void;
  onToggleHighlight: () => void;
  onCopy: () => void;
  onHide: (id: string) => void;
  onSelect: (id: string) => void;
  onBackToLive: () => void;
  onSubmitNote: () => void;
  onNoteDraft: (value: string) => void;
  onRemoveNote: (id: string) => void;
  onCloseShortcuts: () => void;
  formatClock: (date: Date) => string;
}) {
  const pillState =
    status === "invalid" ? "off" : status === "live" ? "live" : "waiting";
  const pillLabel =
    status === "invalid"
      ? "Sessão off"
      : status === "live"
        ? "Ao vivo"
        : "Aguardando";

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">
            <span style={{ color: "var(--ink)" }}>Laudo</span>
            <span style={{ color: "var(--brand)" }}>USG</span>
          </span>
          <span className="brand-sub">Sala do Auxiliar</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
            title={theme === "light" ? "Modo escuro" : "Modo claro"}
          >
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            )}
          </button>
          <time className="topbar-clock" aria-label="Hora atual">{clock}</time>
          <div className="live-pill" data-state={pillState}>
            <span className="live-dot" />
            <span className="live-text">{pillLabel}</span>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <SidebarSection title="Resumo">
            {summary.length === 0 ? (
              <p className="muted">Nenhum laudo hoje ainda.</p>
            ) : (
              <ul className="summary-list">
                {summary.map((s) => (
                  <li key={s.label}>
                    <span className="summary-label">{s.label}</span>
                    <span className="summary-count">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          <SidebarSection title={`HOJE · ${timeline.length}`}>
            {timeline.length === 0 ? (
              <p className="muted">A timeline aparece aqui durante o turno.</p>
            ) : (
              <ol className="timeline">
                {timeline.map((entry, i) => {
                  const isLatest = i === 0;
                  const isActive = entry.id === activeId;
                  return (
                    <li
                      key={entry.id}
                      className={`timeline-item ${isLatest ? "is-latest" : ""} ${isActive ? "is-active" : ""}`}
                    >
                      <button
                        type="button"
                        className="timeline-row"
                        onClick={() => onSelect(entry.id)}
                        aria-current={isActive ? "true" : undefined}
                        aria-label={`Visualizar ${prettyCategory(entry.category ?? "")} de ${formatTime(entry.createdAt)}`}
                        title="Visualizar este laudo"
                      >
                        <span className="timeline-time">
                          {formatTime(entry.createdAt)}
                        </span>
                        <span className="timeline-label">
                          {prettyCategory(entry.category ?? "")}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="timeline-x"
                        onClick={(e) => {
                          e.stopPropagation();
                          onHide(entry.id);
                        }}
                        aria-label="Ocultar este laudo da sala"
                        title="Ocultar"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </SidebarSection>

          <div className="privacy-strip">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>link pessoal · efêmero</span>
          </div>
        </aside>

        <section className="main">
          {status === "loading" && <LoadingState />}
          {status === "invalid" && (
            <InvalidState reason={invalidReason ?? "not_found"} />
          )}
          {status === "waiting" && <WaitingState />}
          {status === "live" && report && (
            <ReportView
              report={report}
              secondsSinceFetch={secondsSinceFetch}
              updatedFlash={updatedFlash}
              highlightOn={highlightOn}
              copied={copied}
              isViewingPast={isViewingPast}
              onToggleHighlight={onToggleHighlight}
              onCopy={onCopy}
              onBackToLive={onBackToLive}
            />
          )}
        </section>

        <aside className="activity-panel">
          <section className="panel-section">
            <h2 className="panel-title">Anotações</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmitNote();
              }}
              className="note-form"
            >
              <textarea
                ref={noteInputRef}
                value={noteDraft}
                onChange={(e) => onNoteDraft(e.target.value)}
                placeholder="Acrescente uma observação..."
                rows={3}
                className="note-input"
              />
              <button type="submit" className="note-submit" disabled={!noteDraft.trim()}>
                Adicionar
              </button>
            </form>
            {notes.length > 0 && (
              <ul className="notes-list">
                {notes.slice().reverse().map((n) => (
                  <li key={n.id} className="note-item">
                    <time>{formatTime(new Date(n.at).toISOString())}</time>
                    <p>{n.text}</p>
                    <button type="button" onClick={() => onRemoveNote(n.id)} aria-label="Remover">×</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-section">
            <h2 className="panel-title">Atividade</h2>
            {activity.length === 0 ? (
              <p className="muted">Eventos aparecem aqui durante o turno.</p>
            ) : (
              <ol className="activity-list">
                {activity.map((a) => (
                  <li key={a.id} className={`activity-item activity-${a.kind}`}>
                    <time>{formatClock(new Date(a.at))}</time>
                    <span>{labelForActivity(a)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      <footer className="shortcut-footer">press ? for shortcuts</footer>

      {shortcutsOpen && (
        <div className="shortcut-backdrop" onClick={onCloseShortcuts}>
          <div className="shortcut-popover" role="dialog" aria-label="Atalhos" onClick={(e) => e.stopPropagation()}>
            <div className="shortcut-title">Atalhos</div>
            <dl className="shortcut-list">
              <div><dt>j / ↓</dt><dd>próximo laudo</dd></div>
              <div><dt>k / ↑</dt><dd>laudo anterior</dd></div>
              <div><dt>c</dt><dd>copiar laudo</dd></div>
              <div><dt>h</dt><dd>destacar cabeçalhos</dd></div>
              <div><dt>n</dt><dd>nova anotação</dd></div>
              <div><dt>Esc</dt><dd>voltar ou fechar</dd></div>
            </dl>
          </div>
        </div>
      )}
    </main>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sidebar-section">
      <h2 className="sidebar-title">{title}</h2>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="card card--ghost" aria-busy="true">
      <div className="ghost ghost--meta" />
      <div className="ghost ghost--title" />
      <div className="ghost ghost--para" />
      <div className="ghost ghost--para ghost--short" />
      <div className="ghost ghost--para" />
    </div>
  );
}

function InvalidState({ reason }: { reason: InvalidReason }) {
  const copy = invalidCopy(reason);
  return (
    <div className="card card--centered">
      <RevokedIllustration />
      <h1 className="state-title">
        {copy.titlePrefix} <em>{copy.titleAccent}</em>.
      </h1>
      <p className="state-body">{copy.body}</p>
      <a href="/sala" className="ghost-button">
        ← {copy.cta}
      </a>
    </div>
  );
}

function invalidCopy(reason: InvalidReason): {
  titlePrefix: string;
  titleAccent: string;
  body: string;
  cta: string;
} {
  switch (reason) {
    case "invalid_format":
      return {
        titlePrefix: "Código",
        titleAccent: "inválido",
        body:
          "O código tem 6 caracteres — letras maiúsculas (sem O, I, L) e números (sem 0, 1). Confira no celular do médico e digite de novo.",
        cta: "Digitar de novo",
      };
    case "revoked":
      return {
        titlePrefix: "Sessão",
        titleAccent: "revogada",
        body:
          "O médico encerrou esta sala. Peça o código do turno atual pra continuar.",
        cta: "Inserir outro código",
      };
    case "expired":
      return {
        titlePrefix: "Código",
        titleAccent: "expirado",
        body:
          "Este código passou da validade. Peça pro médico gerar um novo no app.",
        cta: "Inserir outro código",
      };
    case "not_found":
    default:
      return {
        titlePrefix: "Código",
        titleAccent: "não encontrado",
        body:
          "Nenhuma sala ativa com esse código. Confira no celular do médico — é fácil trocar 8 por B, 6 por G.",
        cta: "Digitar de novo",
      };
  }
}

function WaitingState() {
  return (
    <div className="card card--centered" aria-live="polite">
      <WaitingIllustration />
      <h1 className="state-title">
        Aguardando o <em>primeiro laudo</em>.
      </h1>
      <p className="state-body">
        A sessão está conectada. Cada laudo que o médico gerar aparece aqui em
        segundos.
      </p>
      <div className="poll-strip">
        <span className="poll-blip" />
        <span>Sincronizando a cada 5 segundos</span>
      </div>
    </div>
  );
}

function ReportView({
  report,
  secondsSinceFetch,
  updatedFlash,
  highlightOn,
  copied,
  isViewingPast,
  onToggleHighlight,
  onCopy,
  onBackToLive,
}: {
  report: SalaReport;
  secondsSinceFetch: number | null;
  updatedFlash: number;
  highlightOn: boolean;
  copied: boolean;
  isViewingPast: boolean;
  onToggleHighlight: () => void;
  onCopy: () => void;
  onBackToLive: () => void;
}) {
  const { heading, body } = useMemo(
    () => splitHeading(report.outputText),
    [report.outputText],
  );

  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(1);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight;
      const pages = Math.max(1, Math.ceil(h / A4_PAGE_HEIGHT_PX));
      setPageCount((prev) => (prev !== pages ? pages : prev));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => obs.disconnect();
  }, [body, heading, highlightOn]);

  const flowStyle: CSSProperties | undefined =
    pageCount > 1
      ? {
          columnCount: pageCount,
          columnFill: "auto",
          height: `${A4_PAGE_HEIGHT_PX}px`,
          width: `${pageCount * A4_PAGE_WIDTH_PX + (pageCount - 1) * A4_PAGE_GAP_PX}px`,
        }
      : undefined;

  return (
    <div key={updatedFlash} className="report-stage report-anim">
      <div className="paper-scroll">
        <article className="paper-spread" data-pages={pageCount}>
          <div className="paper-pages-bg" aria-hidden="true">
            {Array.from({ length: pageCount }, (_, i) => (
              <div key={i} className="paper-page" />
            ))}
          </div>
          <div className="paper-flow" style={flowStyle}>
            {heading && (
              <h1
                className={`report-heading ${highlightOn ? "report-heading--highlight" : ""}`}
              >
                {heading}
              </h1>
            )}
            <div className="report-body">{renderBody(body, highlightOn)}</div>
          </div>
        </article>
        <div
          ref={measureRef}
          className="paper-flow paper-flow--measure"
          aria-hidden="true"
        >
          {heading && <h1 className="report-heading">{heading}</h1>}
          <div className="report-body">{renderBody(body, highlightOn)}</div>
        </div>
      </div>
      <div className="report-toolbar">
        <div className="report-toolbar-meta">
          {report.category && (
            <span className="badge">{prettyCategory(report.category)}</span>
          )}
          <time className="meta-time">{formatStamp(report.createdAt)}</time>
          {isViewingPast && (
            <button
              type="button"
              className="past-pill"
              onClick={onBackToLive}
              title="Voltar ao laudo mais recente"
            >
              <span className="past-pill-dot" />
              <span>Histórico · voltar ao vivo</span>
            </button>
          )}
        </div>
        <div className="report-toolbar-actions">
          <button
            type="button"
            className={`tool-btn ${highlightOn ? "is-on" : ""}`}
            onClick={onToggleHighlight}
            aria-pressed={highlightOn}
            title="Destacar títulos e seções"
          >
            <span className="tool-icon">H</span>
            <span className="tool-label">Destacar</span>
          </button>
          <button
            type="button"
            className={`tool-btn ${copied ? "is-copied" : ""}`}
            onClick={onCopy}
            title="Copiar laudo mantendo formatação"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
            <span className="tool-label">{copied ? "Copiado" : "Copiar"}</span>
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => window.print()}
            title="Imprimir laudo"
          >
            <span className="tool-label">Imprimir</span>
          </button>
        </div>
      </div>
      <div className="status-row">
        <span className="status-dot" />
        <span>
          Polling a cada 5s
          {secondsSinceFetch !== null && (
            <>
              <span style={{ margin: "0 8px", color: "var(--ink-mute)" }}>
                ·
              </span>
              <span>última sincronização há {secondsSinceFetch}s</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function renderBody(text: string, highlightOn: boolean): React.ReactNode[] {
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) => {
    const isHeading = isAllCapsHeading(line.trim());
    const cls = isHeading && highlightOn ? "doc-line doc-line--heading" : "doc-line";
    return (
      <span key={i} className={cls}>
        {line}
        {i < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

function isAllCapsHeading(trimmed: string): boolean {
  if (trimmed.length < 4) return false;
  if (!/^[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ0-9 \-():.,/]+$/.test(trimmed)) return false;
  if (!/[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ]/.test(trimmed)) return false;
  if (/[a-záéíóúçãõâêôàèìòùü]/.test(trimmed)) return false;
  return true;
}

async function copyReportToClipboard(report: SalaReport) {
  const { heading, body } = splitHeading(report.outputText);
  const headingHtml = heading
    ? `<h2 style="font-family:Arial,sans-serif;font-size:14pt;font-weight:bold;margin:0 0 12px;">${escapeHtml(heading)}</h2>`
    : "";
  const bodyHtml = body
    .split(/\r?\n/)
    .map((line) => {
      if (line.trim() === "") return "<br/>";
      if (isAllCapsHeading(line.trim())) {
        return `<p style="font-family:Arial,sans-serif;font-size:11pt;font-weight:bold;margin:8px 0 4px;">${escapeHtml(line)}</p>`;
      }
      return `<p style="font-family:Arial,sans-serif;font-size:11pt;margin:0;">${escapeHtml(line)}</p>`;
    })
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;">${headingHtml}${bodyHtml}</div>`;
  const plain = (heading ? heading + "\n\n" : "") + body;

  try {
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return;
    }
  } catch {}
  try {
    await navigator.clipboard.writeText(plain);
  } catch {}
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function summarize(entries: TimelineEntry[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const key = prettyCategory(e.category ?? "");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function labelForActivity(a: ActivityEntry): string {
  if (a.kind === "received") return a.label ? `laudo recebido · ${a.label}` : "laudo recebido";
  if (a.kind === "viewed") return a.label ? `visualizou histórico · ${a.label}` : "visualizou histórico";
  if (a.kind === "copied") return "copiou laudo";
  if (a.kind === "highlight-on") return "destacou cabeçalhos: on";
  if (a.kind === "highlight-off") return "destacou cabeçalhos: off";
  if (a.kind === "note") return a.label ? `anotação: ${a.label}` : "anotação";
  return "voltou ao vivo";
}

function splitHeading(text: string): { heading: string | null; body: string } {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (!line) continue;
    if (/^(ULTRASSONOGRAFIA|ECOGRAFIA|USG)/i.test(line)) {
      const rest = lines.slice(i + 1).join("\n").replace(/^\n+/, "");
      return { heading: line, body: rest };
    }
    break;
  }
  return { heading: null, body: text };
}

function prettyCategory(code: string): string {
  const map: Record<string, string> = {
    ABDOMEN_TOTAL: "Abdome total",
    ABDOMEN_TOTAL_DOPPLER: "Abdome c/ Doppler",
    ABDOMEN_SUPERIOR: "Abdome superior",
    VIAS_URINARIAS: "Vias urinárias",
    TIREOIDE: "Tireoide",
    MAMARIA: "Mamária",
    PELVE_FEMININA: "Pelve feminina",
    OBSTETRICA: "Obstétrica",
    DOPPLER_OBSTETRICO: "Doppler obstétrico",
    MORFOLOGICO: "Morfológico",
    MUSCULOESQUELETICO: "Musculoesquelético",
    MUSCULOESQUELETICO_V2: "Musculoesquelético",
    ESCROTAL: "Escrotal",
    REGIAO_INGUINAL: "Região inguinal",
    PROSTATA_TRANSRETAL: "Próstata transretal",
    PROSTATA_SUPRAPUBICA: "Próstata suprapúbica",
    DOPPLER_CAROTIDAS: "Doppler carótidas",
    DOPPLER_VENOSO_MMII: "Doppler venoso MMII",
    DOPPLER_ARTERIAL_MMII: "Doppler arterial MMII",
    DOPPLER_RENAL: "Doppler renal",
    OCULAR: "Ocular",
  };
  if (!code) return "Sem categoria";
  return map[code] ?? code.replace(/_/g, " ").toLowerCase();
}

function formatClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

function formatStamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function WaitingIllustration() {
  return (
    <svg
      viewBox="0 0 200 140"
      width="148"
      height="104"
      role="img"
      aria-hidden="true"
      className="illus"
    >
      <rect
        x="36"
        y="14"
        width="128"
        height="112"
        rx="6"
        fill="var(--paper)"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      <line x1="50" y1="36" x2="120" y2="36" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="48" x2="150" y2="48" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="60" x2="138" y2="60" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="72" x2="148" y2="72" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="84" x2="100" y2="84" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="108" r="5" fill="var(--brand)" className="illus-pulse" />
    </svg>
  );
}

function RevokedIllustration() {
  return (
    <svg
      viewBox="0 0 200 140"
      width="148"
      height="104"
      role="img"
      aria-hidden="true"
      className="illus"
    >
      <rect
        x="36"
        y="14"
        width="128"
        height="112"
        rx="6"
        fill="var(--paper)"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      <line x1="50" y1="36" x2="120" y2="36" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="48" x2="150" y2="48" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="60" x2="138" y2="60" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="22" x2="156" y2="118" stroke="var(--ink-mute)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function GlobalStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap");

      :root, [data-theme="light"] {
        --bg: #ffffff;
        --ink: #15201a;
        --ink-soft: #475569;
        --ink-mute: #94a3b8;
        --paper: #ffffff;
        --paper-shade: #f8fafc;
        --line: #e5e7eb;
        --line-strong: #cbd5e1;
        --brand: #059669;
        --brand-deep: #047857;
        --brand-soft: #d1fae5;
        --brand-tint: #ecfdf5;
        --amber: #475569;
        --amber-soft: #f1f5f9;
        --highlight: #fff5cc;
        --highlight-ink: #6b4f00;
      }

      [data-theme="dark"] {
        --bg: #0b0e0c;
        --ink: #f0ece2;
        --ink-soft: #b0b6ad;
        --ink-mute: #6c736b;
        --paper: #15191a;
        --paper-shade: #1a1f1d;
        --line: #232925;
        --line-strong: #38423b;
        --brand: #34d399;
        --brand-deep: #6ee7b7;
        --brand-soft: rgba(16, 185, 129, 0.22);
        --brand-tint: rgba(16, 185, 129, 0.08);
        --amber: #fbbf24;
        --amber-soft: rgba(251, 191, 36, 0.18);
        --highlight: rgba(251, 191, 36, 0.18);
        --highlight-ink: #fbd97a;
      }

      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--ink);
        font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, sans-serif;
        font-feature-settings: "ss01", "cv01";
        -webkit-font-smoothing: antialiased;
      }
    `}} />
  );
}

function ScopedStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px clamp(16px, 3vw, 28px);
        border-bottom: 1px solid var(--line);
        background: var(--paper);
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .brand {
        display: flex;
        align-items: baseline;
        gap: 14px;
      }

      .wordmark {
        font-weight: 700;
        font-size: 19px;
        letter-spacing: -0.02em;
      }

      .brand-sub {
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-mute);
        padding-left: 14px;
        border-left: 1px solid var(--line);
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .theme-toggle {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--paper);
        color: var(--ink-soft);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms ease, color 120ms ease, border-color 120ms ease;
      }

      .theme-toggle:hover {
        color: var(--ink);
        border-color: var(--line-strong);
        background: var(--paper-shade);
      }

      .theme-toggle:active {
        transform: scale(0.96);
      }

      .topbar-clock {
        font-family: "JetBrains Mono", monospace;
        font-size: 12.5px;
        color: var(--ink-soft);
        font-variant-numeric: tabular-nums;
        padding: 6px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--paper);
      }

      .live-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px 6px 10px;
        border-radius: 999px;
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        border: 1px solid var(--line);
        background: var(--bg);
      }

      .live-pill[data-state="off"] { color: var(--ink-mute); }
      .live-pill[data-state="waiting"] { color: var(--amber); border-color: var(--amber-soft); background: var(--amber-soft); }
      .live-pill[data-state="live"] { color: var(--brand-deep); border-color: var(--brand-soft); background: var(--brand-tint); }

      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--brand);
      }
      .live-pill[data-state="off"] .live-dot { background: var(--ink-mute); }
      .live-pill[data-state="waiting"] .live-dot {
        background: var(--amber);
        animation: pulse-amber 1.8s ease-in-out infinite;
      }
      .live-pill[data-state="live"] .live-dot {
        background: var(--brand);
        animation: pulse-brand 2.2s ease-in-out infinite;
      }

      @keyframes pulse-brand {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55); }
        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }

      @keyframes pulse-amber {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }

      .layout {
        flex: 1;
        display: grid;
        grid-template-columns: 200px 1fr 280px;
        gap: 0;
        width: 100%;
      }

      .sidebar {
        border-right: 1px solid var(--line);
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        background: var(--paper);
        position: sticky;
        top: 52px;
        align-self: start;
        max-height: calc(100vh - 52px);
        overflow-y: auto;
      }

      .sidebar-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .sidebar-title {
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-mute);
        margin: 0;
        font-weight: 500;
      }

      .muted {
        font-size: 13px;
        line-height: 1.5;
        color: var(--ink-mute);
        margin: 0;
      }

      .summary-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .summary-list li {
        display: flex;
        align-items: baseline;
        gap: 10px;
        padding: 4px 0;
      }

      .summary-count {
        font-weight: 600;
        color: var(--ink);
        font-variant-numeric: tabular-nums;
        font-size: 13.5px;
        margin-left: auto;
      }

      .summary-label {
        font-size: 13px;
        flex: 1;
        color: var(--ink-soft);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .timeline {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .timeline::before {
        content: "";
        position: absolute;
        left: 7px;
        top: 8px;
        bottom: 8px;
        width: 1px;
        background: var(--line);
      }

      .timeline-item {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 4px 0 4px 24px;
        font-size: 11.5px;
        color: var(--ink-soft);
        border-radius: 8px;
        transition: background 140ms ease;
      }

      .timeline-item:hover {
        background: var(--paper-shade);
      }

      .timeline-item.is-active {
        background: var(--brand-tint);
      }

      .timeline-item::before {
        content: "";
        position: absolute;
        left: 4px;
        top: 50%;
        transform: translateY(-50%);
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--bg);
        border: 1.5px solid var(--line-strong);
        transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
      }

      .timeline-item.is-latest::before {
        background: var(--brand);
        border-color: var(--brand);
        box-shadow: 0 0 0 3px var(--brand-tint);
      }

      .timeline-item.is-latest .timeline-label {
        color: var(--ink);
        font-weight: 500;
      }

      .timeline-item.is-active::before {
        background: var(--brand-deep);
        border-color: var(--brand-deep);
        box-shadow: 0 0 0 3px var(--brand-soft);
      }

      .timeline-item.is-active .timeline-label {
        color: var(--brand-deep);
        font-weight: 600;
      }

      .timeline-row {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
        background: transparent;
        border: 0;
        padding: 5px 4px 5px 0;
        text-align: left;
        cursor: pointer;
        color: inherit;
        font: inherit;
        border-radius: 6px;
        min-width: 0;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms ease, color 120ms ease, border-color 120ms ease;
        transform-origin: left center;
      }

      .timeline-row:focus-visible {
        outline: 2px solid var(--brand-soft);
        outline-offset: 2px;
      }

      .timeline-row:active {
        transform: scale(0.96);
      }

      .timeline-time {
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        color: var(--ink-mute);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.04em;
        flex-shrink: 0;
      }

      .timeline-label {
        font-size: 11.5px;
        line-height: 1.3;
        word-break: break-word;
        hyphens: auto;
        align-self: stretch;
      }

      .timeline-x {
        flex-shrink: 0;
        opacity: 0;
        background: transparent;
        border: 1px solid var(--line);
        color: var(--ink-mute);
        width: 20px;
        height: 20px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin-right: 4px;
        transition: opacity 120ms ease, color 120ms ease, border-color 120ms ease, background 120ms ease;
      }

      .timeline-item:hover .timeline-x,
      .timeline-x:focus-visible {
        opacity: 1;
      }

      .timeline-x:hover {
        color: #b3261e;
        border-color: #b3261e;
        background: rgba(179, 38, 30, 0.08);
      }

      .past-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 11px;
        border-radius: 999px;
        border: 1px solid var(--amber-soft);
        background: var(--amber-soft);
        color: var(--amber);
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms ease, color 120ms ease, border-color 120ms ease;
      }

      .past-pill:hover { filter: brightness(0.95); }
      .past-pill:active { transform: scale(0.96); }

      .past-pill-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: var(--amber);
      }

      .privacy-strip {
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 10px;
        border: 1px dashed var(--line-strong);
        border-radius: 10px;
        font-size: 11px;
        line-height: 1;
        color: var(--ink-mute);
      }

      .privacy-strip svg {
        flex-shrink: 0;
      }

      .main {
        padding: clamp(20px, 3vw, 32px);
        display: flex;
        flex-direction: column;
        background: var(--bg);
      }

      .activity-panel {
        border-left: 1px solid var(--line);
        padding: 16px 14px;
        background: var(--paper);
        display: flex;
        flex-direction: column;
        gap: 18px;
        position: sticky;
        top: 52px;
        align-self: start;
        max-height: calc(100vh - 52px);
        overflow-y: auto;
      }

      .panel-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .panel-title {
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-mute);
        margin: 0;
        font-weight: 500;
      }

      .note-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .note-input {
        width: 100%;
        resize: vertical;
        min-height: 60px;
        font: inherit;
        font-size: 13px;
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: var(--paper-shade);
        color: var(--ink);
        transition: border-color 120ms ease;
      }

      .note-input:focus {
        outline: none;
        border-color: var(--brand);
      }

      .note-submit {
        align-self: flex-end;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid var(--brand-soft);
        background: var(--brand-tint);
        color: var(--brand-deep);
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms ease, color 120ms ease, border-color 120ms ease;
      }

      .note-submit:active {
        transform: scale(0.96);
      }

      .note-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .note-submit:disabled:active {
        transform: none;
      }

      .notes-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .note-item {
        display: grid;
        grid-template-columns: 42px 1fr 18px;
        gap: 8px;
        align-items: start;
        padding: 8px 10px;
        background: var(--paper-shade);
        border-radius: 8px;
      }

      .note-item time {
        font-family: "JetBrains Mono", monospace;
        color: var(--ink-mute);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }

      .note-item p {
        color: var(--ink);
        line-height: 1.4;
        font-size: 12.5px;
        margin: 0;
      }

      .note-item button {
        opacity: 0;
        border: 0;
        background: transparent;
        color: var(--ink-mute);
        cursor: pointer;
        padding: 0;
        font-size: 16px;
        line-height: 1;
        transition: opacity 120ms ease, color 120ms ease;
      }

      .note-item:hover button,
      .note-item button:focus-visible {
        opacity: 1;
      }

      .note-item button:hover {
        color: var(--ink);
      }

      .activity-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .activity-item {
        display: flex;
        align-items: baseline;
        gap: 10px;
        padding: 4px 0;
        font-size: 12px;
        color: var(--ink-soft);
      }

      .activity-item::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: var(--ink-mute);
        flex-shrink: 0;
        margin-top: 5px;
      }

      .activity-item time {
        font-family: "JetBrains Mono", monospace;
        color: var(--ink-mute);
        font-size: 11px;
        min-width: 42px;
        font-variant-numeric: tabular-nums;
      }

      .activity-received::before,
      .activity-back-live::before {
        background: var(--brand);
      }

      .activity-copied::before {
        background: var(--amber);
      }

      .activity-highlight-on::before,
      .activity-highlight-off::before {
        background: var(--ink-mute);
      }

      .activity-note::before {
        background: var(--brand-deep);
      }

      .activity-viewed::before {
        background: var(--ink-soft);
      }

      .card {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: clamp(24px, 4vw, 40px);
      }

      .card--centered {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 14px;
        padding: clamp(40px, 6vw, 64px) clamp(24px, 4vw, 48px);
        margin: auto;
        max-width: 540px;
      }

      .card--ghost {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .report-stage {
        max-width: 1320px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .report-anim {
        animation: report-in 480ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }

      .report-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        padding: 0 4px;
      }

      .report-toolbar-meta {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-mute);
      }

      .report-toolbar-actions {
        display: inline-flex;
        gap: 8px;
      }

      .tool-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 12px;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink-soft);
        font-family: "Inter Tight", sans-serif;
        font-size: 12.5px;
        font-weight: 500;
        cursor: pointer;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms ease, color 120ms ease, border-color 120ms ease;
      }

      .tool-btn:hover {
        color: var(--ink);
        border-color: var(--line-strong);
        background: var(--paper-shade);
      }

      .tool-btn:active {
        transform: scale(0.96);
      }

      .tool-btn.is-on {
        color: var(--brand-deep);
        border-color: var(--brand-soft);
        background: var(--brand-tint);
      }

      .tool-btn.is-copied {
        color: var(--brand-deep);
        border-color: var(--brand-soft);
        background: var(--brand-tint);
      }

      .tool-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border: 1px solid currentColor;
        border-radius: 4px;
        font-family: "JetBrains Mono", monospace;
        font-weight: 600;
        font-size: 10px;
        line-height: 1;
      }

      .paper-scroll {
        width: 100%;
        overflow-x: auto;
        position: relative;
        padding-bottom: 8px;
      }

      .paper-spread {
        position: relative;
        margin: 0 auto;
        width: max-content;
      }

      .paper-pages-bg {
        position: absolute;
        inset: 0;
        display: flex;
        gap: 24px;
        pointer-events: none;
      }

      .paper-page {
        flex-shrink: 0;
        width: 210mm;
        height: 297mm;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 6px;
        box-shadow:
          0 1px 3px rgba(15, 23, 42, 0.08),
          0 2px 8px rgba(15, 23, 42, 0.04);
      }

      [data-theme="dark"] .paper-page {
        box-shadow:
          0 1px 0 rgba(255, 255, 255, 0.04) inset,
          0 28px 60px -32px rgba(0, 0, 0, 0.5);
      }

      .paper-flow {
        position: relative;
        z-index: 1;
        width: 210mm;
        min-height: 297mm;
        padding: 56px 48px;
        column-gap: 24px;
        font-size: 12.5px;
        line-height: 1.55;
      }

      .paper-flow--measure {
        position: absolute;
        left: -99999px;
        top: 0;
        visibility: hidden;
        pointer-events: none;
        user-select: none;
        min-height: 0;
        height: auto;
      }

      @keyframes report-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .illus { margin-bottom: 4px; }

      .illus-pulse {
        animation: pulse-blip 1.8s ease-in-out infinite;
        transform-origin: 100px 108px;
      }

      @keyframes pulse-blip {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.4); opacity: 0.6; }
      }

      .state-title {
        font-weight: 600;
        font-size: clamp(24px, 3.4vw, 32px);
        line-height: 1.15;
        letter-spacing: -0.02em;
        margin: 6px 0 0;
        color: var(--ink);
      }
      .state-title em { font-style: normal; color: var(--brand-deep); font-weight: 600; }

      .state-body {
        font-size: 14.5px;
        line-height: 1.55;
        color: var(--ink-soft);
        max-width: 44ch;
        margin: 0;
      }

      .ghost-button {
        margin-top: 6px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 16px;
        border: 1px solid var(--line-strong);
        border-radius: 10px;
        color: var(--ink);
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        transition: background 200ms, border-color 200ms;
      }

      .ghost-button:hover {
        background: var(--brand-tint);
        border-color: var(--brand);
      }

      .poll-strip {
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: "JetBrains Mono", monospace;
        font-size: 11.5px;
        letter-spacing: 0.04em;
        color: var(--ink-mute);
      }

      .poll-blip {
        width: 6px; height: 6px; border-radius: 999px;
        background: var(--brand);
        animation: blip 1.4s ease-in-out infinite;
      }

      @keyframes blip {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 1; }
      }

      .meta-line {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 18px;
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-mute);
      }

      .badge {
        padding: 4px 10px;
        border: 1px solid var(--brand-soft);
        background: var(--brand-tint);
        color: var(--brand-deep);
        border-radius: 999px;
        font-size: 10.5px;
        letter-spacing: 0.12em;
      }

      .meta-sep { color: var(--ink-mute); opacity: 0.6; }
      .meta-time { font-variant-numeric: tabular-nums; }

      .report-heading {
        font-weight: inherit;
        font-size: inherit;
        font-family: inherit;
        line-height: inherit;
        letter-spacing: normal;
        text-transform: none;
        color: inherit;
        margin: 0 0 14px;
        padding: 0;
        border: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
        hyphens: auto;
      }

      .report-heading--highlight {
        font-weight: 700;
      }

      .report-body {
        font-family: "Inter Tight", sans-serif;
        font-size: inherit;
        line-height: inherit;
        color: var(--ink);
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        font-weight: 400;
      }

      .doc-line {
        white-space: pre-wrap;
      }

      .doc-line--heading {
        font-weight: 700;
      }

      .status-row {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.06em;
        color: var(--ink-mute);
        text-transform: uppercase;
      }

      .status-dot {
        width: 7px; height: 7px; border-radius: 999px;
        background: var(--brand);
        animation: pulse-brand 2.2s ease-in-out infinite;
      }

      .shortcut-footer {
        position: fixed;
        right: 16px;
        bottom: 12px;
        z-index: 8;
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        color: var(--ink-mute);
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 5px 9px;
      }

      .shortcut-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding: 72px 22px 22px;
        background: transparent;
      }

      .shortcut-popover {
        width: min(260px, calc(100vw - 44px));
        background: var(--paper);
        border: 1px solid var(--line-strong);
        border-radius: 12px;
        box-shadow: 0 24px 60px -36px var(--line-strong);
        padding: 14px;
      }

      .shortcut-title {
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-mute);
        margin-bottom: 10px;
      }

      .shortcut-list {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .shortcut-list div {
        display: grid;
        grid-template-columns: 64px 1fr;
        gap: 10px;
        align-items: baseline;
      }

      .shortcut-list dt {
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
        color: var(--ink);
        margin: 0;
      }

      .shortcut-list dd {
        font-size: 12.5px;
        color: var(--ink-soft);
        margin: 0;
      }

      .ghost {
        height: 14px;
        background: linear-gradient(
          90deg,
          var(--line) 0%,
          var(--line-strong) 50%,
          var(--line) 100%
        );
        background-size: 200% 100%;
        border-radius: 6px;
        animation: shimmer 1.4s ease-in-out infinite;
      }

      .ghost--meta { width: 35%; height: 12px; }
      .ghost--title { width: 70%; height: 26px; margin-bottom: 6px; }
      .ghost--para { width: 100%; }
      .ghost--short { width: 60%; }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @media (max-width: 1100px) {
        .layout {
          grid-template-columns: 200px 1fr;
        }
        .activity-panel {
          display: none;
        }
      }

      @media (max-width: 760px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .topbar {
          align-items: flex-start;
          gap: 12px;
          flex-direction: column;
        }
        .topbar-actions {
          flex-wrap: wrap;
        }
        .sidebar {
          border-right: 0;
          border-bottom: 1px solid var(--line);
          padding: 20px clamp(16px, 4vw, 24px);
          position: relative;
          top: auto;
          max-height: none;
        }
        .privacy-strip { margin-top: 12px; }
        .brand-sub { display: none; }
        .paper-scroll { overflow-x: visible; padding-bottom: 0; }
        .paper-spread { width: 100% !important; }
        .paper-pages-bg { display: none !important; }
        .paper-flow {
          column-count: 1 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          padding: 28px 22px !important;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
        }
      }
    `}} />
  );
}
