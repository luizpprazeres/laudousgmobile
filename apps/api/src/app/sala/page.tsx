"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SalaIndexPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = code.replace(/[\s\-_]/g, "").toUpperCase();
    if (normalized.length !== 6) {
      setError("Código tem 6 letras/números.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sala/pair/redeem?code=${encodeURIComponent(normalized)}`);
      const data = await res.json();
      if (!res.ok || !data.token) {
        setError("Código inválido ou expirado.");
        return;
      }
      router.push(`/sala/${data.token}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <span style={{ color: "#18533F" }}>Laudo</span>
          <span style={{ color: "#059669" }}>USG</span>
          <span style={styles.dot} />
        </div>
        <h1 style={styles.title}>Sala do Auxiliar</h1>
        <p style={styles.subtitle}>
          Digite o código de 6 caracteres que o médico mostra no celular.
        </p>
        <form onSubmit={submit} style={{ width: "100%" }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC23X"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            maxLength={9}
            style={styles.input}
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Verificando…" : "Entrar na sala"}
          </button>
        </form>
        <p style={styles.footer}>
          O laudo é privado. O auxiliar só recebe o conteúdo enquanto o
          médico mantém a sessão ativa.
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F2F2F7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
    border: "1px solid #E5E7EB",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -0.5,
    display: "inline-flex",
    alignItems: "baseline",
  },
  dot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: 999,
    background: "#059669",
    marginLeft: 4,
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    margin: "8px 0 0 0",
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    margin: "0 0 16px 0",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 4,
    textAlign: "center",
    border: "1px solid #D1D5DB",
    borderRadius: 12,
    outline: "none",
    fontFamily: "monospace",
    textTransform: "uppercase",
  },
  error: {
    marginTop: 12,
    padding: "10px 12px",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
    borderRadius: 8,
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    width: "100%",
    padding: "14px 16px",
    background: "#059669",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  footer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    margin: "16px 0 0 0",
  },
};
