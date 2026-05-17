"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

type SalaReport = {
  outputText: string;
  category: string | null;
  createdAt: string;
};

type TimelineEntry = {
  category: string | null;
  createdAt: string;
};

type InvalidReason = "invalid_format" | "not_found" | "revoked" | "expired";

type SalaResponse = {
  tokenValid: boolean;
  report: SalaReport | null;
  reportsToday?: TimelineEntry[];
  reason?: InvalidReason;
};

const POLL_INTERVAL_MS = 5000;

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
  const lastSignatureRef = useRef<string | null>(null);

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

  const summary = useMemo(() => summarize(timeline), [timeline]);
  const status: "loading" | "invalid" | "waiting" | "live" = loading
    ? "loading"
    : !tokenValid
      ? "invalid"
      : !report
        ? "waiting"
        : "live";

  return (
    <>
      <Shell
        status={status}
        invalidReason={invalidReason}
        report={report}
        timeline={timeline}
        summary={summary}
        secondsSinceFetch={secondsSinceFetch}
        updatedFlash={updatedFlash}
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
  summary,
  secondsSinceFetch,
  updatedFlash,
}: {
  status: "loading" | "invalid" | "waiting" | "live";
  invalidReason: InvalidReason | null;
  report: SalaReport | null;
  timeline: TimelineEntry[];
  summary: { label: string; count: number }[];
  secondsSinceFetch: number | null;
  updatedFlash: number;
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
        <div className="live-pill" data-state={pillState}>
          <span className="live-dot" />
          <span className="live-text">{pillLabel}</span>
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
                    <span className="summary-count">{s.count}</span>
                    <span className="summary-label">{s.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          <SidebarSection title="Hoje">
            {timeline.length === 0 ? (
              <p className="muted">A timeline aparece aqui durante o turno.</p>
            ) : (
              <ol className="timeline">
                {timeline.map((entry, i) => {
                  const isLatest = i === 0;
                  return (
                    <li
                      key={`${entry.createdAt}-${i}`}
                      className={`timeline-item ${isLatest ? "is-latest" : ""}`}
                    >
                      <span className="timeline-time">
                        {formatTime(entry.createdAt)}
                      </span>
                      <span className="timeline-label">
                        {prettyCategory(entry.category ?? "")}
                      </span>
                      {isLatest && status === "live" && (
                        <span className="timeline-dot" />
                      )}
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
            <span>
              Link pessoal · não compartilhe publicamente. Conteúdo não fica
              armazenado localmente.
            </span>
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
            />
          )}
        </section>
      </div>
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
}: {
  report: SalaReport;
  secondsSinceFetch: number | null;
  updatedFlash: number;
}) {
  const { heading, body } = useMemo(
    () => splitHeading(report.outputText),
    [report.outputText],
  );

  const charCount = body.length + (heading?.length ?? 0);
  const density: "short" | "medium" | "long" | "xlong" =
    charCount < 1200
      ? "short"
      : charCount < 2400
        ? "medium"
        : charCount < 3800
          ? "long"
          : "xlong";

  return (
    <div key={updatedFlash} className="report-stage report-anim">
      <article className="paper-spread" data-density={density}>
        <div className="paper-pages" aria-hidden="true">
          <div className="paper-page" />
          <div className="paper-page" />
        </div>
        <div className="paper-flow">
          <div className="meta-line">
            {report.category && (
              <span className="badge">{prettyCategory(report.category)}</span>
            )}
            <span className="meta-sep">·</span>
            <time className="meta-time">{formatStamp(report.createdAt)}</time>
          </div>
          {heading && <h1 className="report-heading">{heading}</h1>}
          <pre className="report-body">{body}</pre>
        </div>
      </article>
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

function splitHeading(text: string): { heading: string | null; body: string } {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
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
    <style jsx global>{`
      @import url("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap");

      :root {
        --bg: #f7f6f1;
        --ink: #15201a;
        --ink-soft: #5b675f;
        --ink-mute: #98a09a;
        --paper: #ffffff;
        --line: #ece6d5;
        --line-strong: #d9d2bd;
        --brand: #059669;
        --brand-deep: #047857;
        --brand-soft: #d1fae5;
        --brand-tint: #ecfdf5;
        --amber: #b3801e;
        --amber-soft: #fef3c7;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0d100e;
          --ink: #f0ece2;
          --ink-soft: #aab1a8;
          --ink-mute: #6c736b;
          --paper: #161a17;
          --line: #232925;
          --line-strong: #34403a;
          --brand: #34d399;
          --brand-deep: #6ee7b7;
          --brand-soft: rgba(16, 185, 129, 0.18);
          --brand-tint: rgba(16, 185, 129, 0.08);
          --amber: #fbbf24;
          --amber-soft: rgba(251, 191, 36, 0.15);
        }
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
    `}</style>
  );
}

function ScopedStyles() {
  return (
    <style jsx>{`
      .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px clamp(20px, 4vw, 40px);
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
        grid-template-columns: 280px 1fr;
        gap: 0;
        max-width: 1280px;
        width: 100%;
        margin: 0 auto;
      }

      .sidebar {
        border-right: 1px solid var(--line);
        padding: 28px clamp(16px, 2vw, 24px);
        display: flex;
        flex-direction: column;
        gap: 28px;
        background: var(--paper);
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
        padding: 6px 0;
      }

      .summary-count {
        font-weight: 600;
        color: var(--ink);
        font-variant-numeric: tabular-nums;
        font-size: 16px;
        min-width: 18px;
      }

      .summary-label {
        font-size: 13.5px;
        color: var(--ink-soft);
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
        align-items: baseline;
        gap: 14px;
        padding: 8px 0 8px 26px;
        font-size: 13.5px;
        color: var(--ink-soft);
      }

      .timeline-item::before {
        content: "";
        position: absolute;
        left: 4px;
        top: 14px;
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--bg);
        border: 1.5px solid var(--line-strong);
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

      .timeline-time {
        font-family: "JetBrains Mono", monospace;
        font-size: 11.5px;
        color: var(--ink-mute);
        font-variant-numeric: tabular-nums;
        min-width: 42px;
      }

      .timeline-label {
        flex: 1;
      }

      .timeline-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: var(--brand);
        animation: pulse-brand 2.2s ease-in-out infinite;
      }

      .privacy-strip {
        margin-top: auto;
        display: flex;
        gap: 8px;
        padding: 12px;
        border: 1px dashed var(--line-strong);
        border-radius: 10px;
        font-size: 11.5px;
        line-height: 1.45;
        color: var(--ink-mute);
        align-items: flex-start;
      }

      .privacy-strip svg {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .main {
        padding: clamp(28px, 4vw, 48px);
        display: flex;
        flex-direction: column;
        background: var(--bg);
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
        max-width: 1120px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .report-anim {
        animation: report-in 480ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }

      .paper-spread {
        position: relative;
      }

      .paper-pages {
        position: absolute;
        inset: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(20px, 2vw, 32px);
        pointer-events: none;
      }

      .paper-spread[data-density="short"] {
        max-width: 560px;
        margin: 0 auto;
      }
      .paper-spread[data-density="short"] .paper-pages {
        grid-template-columns: 1fr;
        gap: 0;
      }
      .paper-spread[data-density="short"] .paper-flow {
        columns: 1;
        padding: clamp(36px, 4vw, 56px) clamp(32px, 4vw, 56px);
      }

      .paper-page {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 6px;
        box-shadow:
          0 1px 0 rgba(255, 255, 255, 0.8) inset,
          0 22px 50px -28px rgba(15, 25, 18, 0.18),
          0 8px 20px -14px rgba(15, 25, 18, 0.08);
      }

      .paper-flow {
        position: relative;
        z-index: 1;
        columns: 2;
        column-gap: clamp(56px, 6vw, 88px);
        padding: clamp(40px, 4vw, 56px) clamp(36px, 4vw, 56px);
        font-size: 14px;
        line-height: 1.62;
      }

      .paper-flow .meta-line {
        column-span: all;
      }

      .paper-flow .report-heading {
        column-span: all;
        margin-top: 8px;
        margin-bottom: 18px;
        padding-bottom: 14px;
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
        font-weight: 600;
        font-size: clamp(17px, 1.6vw, 20px);
        line-height: 1.22;
        letter-spacing: -0.018em;
        color: var(--ink);
        margin: 0 0 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--line);
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

      @media (max-width: 760px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .sidebar {
          border-right: 0;
          border-bottom: 1px solid var(--line);
          padding: 20px clamp(16px, 4vw, 24px);
        }
        .privacy-strip { margin-top: 12px; }
        .brand-sub { display: none; }
        .paper-pages { grid-template-columns: 1fr !important; gap: 0 !important; }
        .paper-flow { columns: 1 !important; padding: 32px 24px !important; }
      }
    `}</style>
  );
}
