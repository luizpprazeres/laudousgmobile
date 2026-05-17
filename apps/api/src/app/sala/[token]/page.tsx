"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

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

export default function SalaTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [state, setState] = useState<{
    loading: boolean;
    tokenValid: boolean;
    report: SalaReport | null;
    error: string | null;
    lastFetch: Date | null;
  }>({
    loading: true,
    tokenValid: true,
    report: null,
    error: null,
    lastFetch: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchLatest() {
    try {
      const res = await fetch(`/api/sala/latest?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as SalaResponse;
      setState({
        loading: false,
        tokenValid: data.tokenValid,
        report: data.report,
        error: null,
        lastFetch: new Date(),
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Erro de conexão." }));
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchLatest();
    timerRef.current = setInterval(fetchLatest, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state.loading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <div style={styles.muted}>Carregando…</div>
        </div>
      </main>
    );
  }

  if (!state.tokenValid) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Sessão encerrada</h1>
          <p style={styles.body}>
            O médico revogou esta sessão ou o link expirou. Peça um novo
            código.
          </p>
          <a href="/sala" style={styles.button}>
            Voltar
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={{ color: "#18533F" }}>Laudo</span>
          <span style={{ color: "#059669" }}>USG</span>
          <span style={styles.dot} />
        </div>
        <div style={styles.live}>
          <span style={styles.liveDot} /> Sala ativa
        </div>
      </header>
      <div style={styles.card}>
        {state.report ? (
          <>
            <div style={styles.meta}>
              {state.report.category && <span>{state.report.category}</span>}
              <span style={styles.metaSeparator}>·</span>
              <span>{formatDate(state.report.createdAt)}</span>
            </div>
            <pre style={styles.report}>{state.report.outputText}</pre>
            <div style={styles.footer}>
              Atualiza automaticamente a cada {POLL_INTERVAL_MS / 1000}s.
              {state.lastFetch && (
                <> Última atualização: {state.lastFetch.toLocaleTimeString("pt-BR")}.</>
              )}
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            <h2 style={styles.title}>Aguardando o primeiro laudo</h2>
            <p style={styles.body}>
              Assim que o médico gerar um laudo no celular, ele aparece aqui em
              segundos.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F2F2F7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxWidth: 980,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 4px",
  },
  brand: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: -0.5,
    display: "inline-flex",
    alignItems: "baseline",
  },
  dot: {
    display: "inline-block",
    width: 5,
    height: 5,
    borderRadius: 999,
    background: "#059669",
    marginLeft: 4,
    marginBottom: 2,
  },
  live: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: "#15803D",
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    borderRadius: 999,
    padding: "4px 10px",
  },
  liveDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#10B981",
    boxShadow: "0 0 0 4px rgba(16,185,129,0.18)",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #E5E7EB",
    padding: 24,
    boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
    flex: 1,
    minHeight: 320,
  },
  empty: {
    minHeight: 240,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    color: "#6B7280",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px 0",
  },
  body: {
    fontSize: 15,
    color: "#4B5563",
    margin: 0,
    maxWidth: 480,
  },
  meta: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  metaSeparator: { color: "#D1D5DB" },
  report: {
    fontSize: 16,
    lineHeight: 1.55,
    color: "#111827",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    margin: 0,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  footer: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 16,
  },
  button: {
    display: "inline-block",
    marginTop: 16,
    padding: "10px 16px",
    background: "#059669",
    color: "#FFFFFF",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  },
  muted: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    padding: "40px 0",
  },
};
