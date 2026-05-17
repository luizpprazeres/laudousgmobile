"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SalaReport = {
  outputText: string;
  category: string | null;
  createdAt: string;
};

type SalaResponse = {
  tokenValid: boolean;
  report: SalaReport | null;
};

const POLL_INTERVAL_MS = 5000;
const PAIRING_CODE_REGEX = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

function looksLikePairingCode(raw: string): boolean {
  return PAIRING_CODE_REGEX.test(raw.toUpperCase());
}

export default function SalaTokenPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const rawToken = params?.token ?? "";

  const [tokenValid, setTokenValid] = useState(true);
  const [report, setReport] = useState<SalaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const [updatedFlash, setUpdatedFlash] = useState(0);
  const [resolving, setResolving] = useState(looksLikePairingCode(rawToken));
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!rawToken) return;
    if (!looksLikePairingCode(rawToken)) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const code = rawToken.toUpperCase();
        const res = await fetch(`/api/sala/pair/redeem?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && typeof data?.token === "string" && data.token.length > 6) {
          router.replace(`/sala/${data.token}`);
        } else {
          setTokenValid(false);
          setLoading(false);
          setResolving(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setResolving(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawToken, router]);

  async function fetchLatest() {
    try {
      const res = await fetch(`/api/sala/latest?token=${encodeURIComponent(rawToken)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as SalaResponse;
      setLoading(false);
      setLastFetch(new Date());
      setTokenValid(data.tokenValid);
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
    if (!rawToken) return;
    if (resolving) return;
    fetchLatest();
    const intId = setInterval(fetchLatest, POLL_INTERVAL_MS);
    const tickId = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(intId);
      clearInterval(tickId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawToken, resolving]);

  const secondsSinceFetch = useMemo(() => {
    void tick;
    if (!lastFetch) return null;
    return Math.max(0, Math.floor((Date.now() - lastFetch.getTime()) / 1000));
  }, [tick, lastFetch]);

  return (
    <>
      <Shell
        loading={loading || resolving}
        tokenValid={tokenValid}
        report={report}
        secondsSinceFetch={secondsSinceFetch}
        updatedFlash={updatedFlash}
      />
      <GlobalStyles />
      <ScopedStyles />
    </>
  );
}

function Shell({
  loading,
  tokenValid,
  report,
  secondsSinceFetch,
  updatedFlash,
}: {
  loading: boolean;
  tokenValid: boolean;
  report: SalaReport | null;
  secondsSinceFetch: number | null;
  updatedFlash: number;
}) {
  return (
    <main className="page">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <div className="wordmark">
          <span style={{ color: "var(--ink)" }}>Laudo</span>
          <span style={{ color: "var(--brand)" }}>USG</span>
          <span className="dot" />
        </div>
        <div className="live-pill" data-state={tokenValid ? "live" : "off"}>
          <span className="live-dot" />
          <span className="live-text">
            {tokenValid ? "Ao vivo" : "Sessão encerrada"}
          </span>
        </div>
      </header>

      {loading ? (
        <LoadingState />
      ) : !tokenValid ? (
        <RevokedState />
      ) : !report ? (
        <WaitingState />
      ) : (
        <ReportView
          report={report}
          secondsSinceFetch={secondsSinceFetch}
          updatedFlash={updatedFlash}
        />
      )}

      <footer className="page-foot">
        <span className="foot-mark">
          <span style={{ color: "var(--ink)" }}>Laudo</span>
          <span style={{ color: "var(--brand)" }}>USG</span>
        </span>
        <span>Visualização do auxiliar · privada · não armazenada</span>
      </footer>
    </main>
  );
}

function LoadingState() {
  return (
    <section className="stage" aria-busy="true">
      <div className="card card--ghost">
        <div className="ghost ghost--meta" />
        <div className="ghost ghost--title" />
        <div className="ghost ghost--para" />
        <div className="ghost ghost--para ghost--short" />
        <div className="ghost ghost--para" />
      </div>
    </section>
  );
}

function RevokedState() {
  return (
    <section className="stage">
      <div className="card card--centered">
        <RevokedIllustration />
        <h1 className="state-title">
          Sessão <em>encerrada</em>.
        </h1>
        <p className="state-body">
          O médico revogou esta sessão ou o link expirou. Peça um código novo
          pra acompanhar os próximos laudos do turno.
        </p>
        <a href="/sala" className="ghost-button">
          ← Inserir outro código
        </a>
      </div>
    </section>
  );
}

function WaitingState() {
  return (
    <section className="stage" aria-live="polite">
      <div className="card card--centered">
        <WaitingIllustration />
        <h1 className="state-title">
          Aguardando o <em>primeiro laudo</em>.
        </h1>
        <p className="state-body">
          A sessão está ativa. Assim que o médico gerar um laudo, ele aparece
          aqui em segundos — sem precisar atualizar a página.
        </p>
        <div className="poll-strip">
          <span className="poll-blip" />
          <span>Sincronizando a cada 5 segundos</span>
        </div>
      </div>
    </section>
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
  const { heading, body } = useMemo(() => splitHeading(report.outputText), [
    report.outputText,
  ]);

  return (
    <section className="stage" aria-live="polite">
      <article key={updatedFlash} className="card card--report report-anim">
        <div className="meta-line">
          {report.category && <span className="badge">{prettyCategory(report.category)}</span>}
          <span className="meta-sep">·</span>
          <time className="meta-time">{formatStamp(report.createdAt)}</time>
        </div>
        {heading && <h1 className="report-heading">{heading}</h1>}
        <pre className="report-body">{body}</pre>
        <div className="status-row">
          <span className="status-dot" />
          <span>
            Atualiza automaticamente a cada 5s
            {secondsSinceFetch !== null && (
              <>
                <span style={{ margin: "0 8px", color: "var(--ink-mute)" }}>·</span>
                <span>última sincronização há {secondsSinceFetch}s</span>
              </>
            )}
          </span>
        </div>
      </article>
    </section>
  );
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
    ABDOMEN_TOTAL_DOPPLER: "Abdome com Doppler",
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
  return map[code] ?? code.replace(/_/g, " ").toLowerCase();
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
      width="180"
      height="126"
      role="img"
      aria-hidden="true"
      className="illus"
    >
      <defs>
        <linearGradient id="paper-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--paper)" />
          <stop offset="100%" stopColor="var(--bg)" />
        </linearGradient>
      </defs>
      <rect x="36" y="14" width="128" height="112" rx="6" fill="url(#paper-grad)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <line x1="50" y1="36" x2="120" y2="36" stroke="var(--line-strong)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="48" x2="150" y2="48" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="60" x2="138" y2="60" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="72" x2="148" y2="72" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="84" x2="100" y2="84" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="108" r="6" fill="var(--brand)" className="illus-pulse" />
    </svg>
  );
}

function RevokedIllustration() {
  return (
    <svg
      viewBox="0 0 200 140"
      width="180"
      height="126"
      role="img"
      aria-hidden="true"
      className="illus"
    >
      <rect x="36" y="14" width="128" height="112" rx="6" fill="var(--paper)" stroke="var(--line-strong)" strokeWidth="1.5" />
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
      @import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@500;600&family=Inter+Tight:wght@400;500;600&display=swap");

      :root {
        --bg: #faf9f4;
        --ink: #15201a;
        --ink-soft: #5b675f;
        --ink-mute: #99a39a;
        --paper: #ffffff;
        --line: #ece6d5;
        --line-strong: #d9d2bd;
        --brand: #059669;
        --brand-deep: #047857;
        --brand-soft: #d1fae5;
        --brand-tint: #ecfdf5;
        --gold: #c69d4d;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0d100e;
          --ink: #f3efe1;
          --ink-soft: #aab1a8;
          --ink-mute: #6c736b;
          --paper: #161a17;
          --line: #232925;
          --line-strong: #34403a;
          --brand: #34d399;
          --brand-deep: #6ee7b7;
          --brand-soft: rgba(16, 185, 129, 0.18);
          --brand-tint: rgba(16, 185, 129, 0.1);
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
        max-width: 920px;
        margin: 0 auto;
        padding: 24px clamp(16px, 4vw, 40px) 40px;
        display: flex;
        flex-direction: column;
        gap: clamp(20px, 4vw, 32px);
        position: relative;
      }

      .grain {
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: 0.35;
        mix-blend-mode: multiply;
        background-image: radial-gradient(rgba(20, 16, 0, 0.05) 1px, transparent 1px);
        background-size: 3px 3px;
        z-index: 0;
      }

      .page > * { position: relative; z-index: 1; }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 4px;
        animation: rise 500ms ease both;
      }

      .wordmark {
        font-family: "Inter Tight", sans-serif;
        font-weight: 700;
        font-size: 18px;
        letter-spacing: -0.02em;
        display: inline-flex;
        align-items: baseline;
      }

      .dot {
        width: 4px;
        height: 4px;
        border-radius: 999px;
        background: var(--brand);
        margin-left: 3px;
        transform: translateY(8px);
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
        background: var(--paper);
      }

      .live-pill[data-state="off"] { color: var(--ink-mute); }
      .live-pill[data-state="live"] { color: var(--brand-deep); }

      .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--brand);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
        animation: pulse 2.2s ease-in-out infinite;
      }

      .live-pill[data-state="off"] .live-dot {
        background: var(--ink-mute);
        animation: none;
        box-shadow: none;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55); }
        70% { box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }

      .stage {
        flex: 1;
        display: flex;
        flex-direction: column;
        animation: rise 600ms 80ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
      }

      .card {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: clamp(24px, 4vw, 40px);
        box-shadow: 0 30px 60px -36px rgba(20, 32, 24, 0.12);
      }

      .card--centered {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
        padding: clamp(36px, 6vw, 56px);
      }

      .card--ghost {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .card--report {
        padding: clamp(28px, 4vw, 48px);
      }

      .report-anim {
        animation: report-in 500ms cubic-bezier(0.2, 0.7, 0.2, 1);
      }

      @keyframes report-in {
        from {
          opacity: 0;
          transform: scale(0.992);
          filter: blur(2px);
        }
        to {
          opacity: 1;
          transform: scale(1);
          filter: blur(0);
        }
      }

      @keyframes rise {
        from { opacity: 0; transform: translateY(10px); }
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
        font-family: "Instrument Serif", serif;
        font-weight: 400;
        font-size: clamp(28px, 4.5vw, 40px);
        line-height: 1.05;
        letter-spacing: -0.018em;
        margin: 4px 0 0;
      }
      .state-title em { font-style: italic; color: var(--brand); }

      .state-body {
        font-size: 15px;
        line-height: 1.55;
        color: var(--ink-soft);
        max-width: 42ch;
        margin: 0;
      }

      .ghost-button {
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        border: 1px solid var(--line-strong);
        border-radius: 999px;
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
        margin-top: 12px;
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
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--ink-mute);
      }

      .badge {
        padding: 4px 10px;
        border: 1px solid var(--brand-soft);
        background: var(--brand-tint);
        color: var(--brand-deep);
        border-radius: 999px;
        font-size: 11px;
        letter-spacing: 0.12em;
      }

      .meta-sep { color: var(--ink-mute); opacity: 0.6; }

      .meta-time { font-variant-numeric: tabular-nums; }

      .report-heading {
        font-family: "Instrument Serif", serif;
        font-weight: 400;
        font-size: clamp(26px, 3.6vw, 34px);
        line-height: 1.15;
        letter-spacing: -0.016em;
        color: var(--ink);
        margin: 0 0 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--line);
      }

      .report-body {
        font-family: "Inter Tight", sans-serif;
        font-size: 16px;
        line-height: 1.66;
        color: var(--ink);
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        font-weight: 400;
      }

      .status-row {
        margin-top: 28px;
        padding-top: 18px;
        border-top: 1px dashed var(--line);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: "JetBrains Mono", monospace;
        font-size: 11.5px;
        letter-spacing: 0.04em;
        color: var(--ink-mute);
      }

      .status-dot {
        width: 7px; height: 7px; border-radius: 999px;
        background: var(--brand);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
        animation: pulse 2.2s ease-in-out infinite;
      }

      .page-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 4px 8px;
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--ink-mute);
        border-top: 1px solid var(--line);
        margin-top: auto;
      }

      .foot-mark {
        font-family: "Inter Tight", sans-serif;
        text-transform: none;
        font-weight: 700;
        letter-spacing: -0.01em;
        font-size: 12px;
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
      .ghost--title { width: 70%; height: 28px; margin-bottom: 8px; }
      .ghost--para { width: 100%; }
      .ghost--short { width: 60%; }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  );
}
