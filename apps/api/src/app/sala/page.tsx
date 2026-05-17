"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SLOT_COUNT = 6;

function isValidChar(ch: string): boolean {
  return ALPHABET.includes(ch.toUpperCase());
}

export default function SalaIndexPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<string[]>(Array(SLOT_COUNT).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = slots.join("");
  const isComplete = slots.every((s) => s.length === 1);

  function setSlot(index: number, value: string) {
    const upper = value.toUpperCase();
    const next = [...slots];
    next[index] = upper.length > 0 && isValidChar(upper) ? upper : "";
    setSlots(next);
    setError(null);
    if (next[index] && index < SLOT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !slots[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < SLOT_COUNT - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const raw = e.clipboardData
      .getData("text")
      .replace(/[\s\-_]/g, "")
      .toUpperCase()
      .split("")
      .filter(isValidChar)
      .slice(0, SLOT_COUNT);
    if (raw.length === 0) return;
    e.preventDefault();
    const next = Array(SLOT_COUNT).fill("");
    raw.forEach((c, i) => (next[i] = c));
    setSlots(next);
    setError(null);
    const focusIdx = Math.min(raw.length, SLOT_COUNT - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) {
      setError("Faltam caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    router.push(`/sala/${code}`);
  }

  return (
    <main className="page">
      <div className="grain" aria-hidden="true" />

      <div className="frame">
        <header className="frame-head">
          <div className="wordmark">
            <span style={{ color: "var(--ink)" }}>Laudo</span>
            <span style={{ color: "var(--brand)" }}>USG</span>
            <span className="dot" />
          </div>
          <span className="kicker">Sala do auxiliar</span>
        </header>

        <h1 className="display">
          Acompanhe os <em>laudos</em> em tempo real.
        </h1>

        <p className="lede">
          Digite o código que o médico mostra no celular. A sala fica ativa
          durante todo o turno — sem login, sem cadastro.
        </p>

        <form onSubmit={submit} className="form" autoComplete="off">
          <div className="slots" role="group" aria-label="Código de 6 caracteres">
            {slots.map((value, i) => (
              <div key={i} className={`slot ${value ? "slot--filled" : ""}`}>
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  value={value}
                  onChange={(e) => setSlot(i, e.target.value.slice(-1))}
                  onKeyDown={(e) => handleKey(i, e)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.currentTarget.select()}
                  maxLength={1}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`Caractere ${i + 1} de 6`}
                  className="slot-input"
                />
                <span className="slot-line" />
              </div>
            ))}
          </div>

          {error ? (
            <div className="error" role="alert">
              <span className="error-dot" />
              {error}
            </div>
          ) : (
            <div className="hint">Sem letras O, I, L ou números 0, 1.</div>
          )}

          <button
            type="submit"
            className="cta"
            disabled={!isComplete || loading}
            aria-busy={loading}
          >
            <span className="cta-label">
              {loading ? "Verificando" : "Entrar na sala"}
            </span>
            <span className="cta-arrow" aria-hidden="true">
              {loading ? "" : "→"}
            </span>
          </button>
        </form>

        <footer className="legal">
          <p>
            O laudo é privado. O auxiliar acessa o conteúdo apenas enquanto o
            médico mantém a sessão ativa. Sem armazenamento local, sem
            histórico.
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@500;600&family=Inter+Tight:wght@400;500;600&display=swap");

        :root {
          --bg: #faf9f4;
          --ink: #15201a;
          --ink-soft: #5b675f;
          --ink-mute: #99a39a;
          --paper: #ffffff;
          --line: #e8e3d4;
          --line-strong: #d9d2bd;
          --brand: #059669;
          --brand-deep: #047857;
          --brand-soft: #d1fae5;
          --brand-tint: #ecfdf5;
          --gold: #c69d4d;
          --danger: #b3261e;
          --danger-soft: #fbeae8;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0d100e;
            --ink: #f3efe1;
            --ink-soft: #aab1a8;
            --ink-mute: #6c736b;
            --paper: #14181591;
            --line: #232925;
            --line-strong: #34403a;
            --brand: #34d399;
            --brand-deep: #6ee7b7;
            --brand-soft: rgba(16, 185, 129, 0.18);
            --brand-tint: rgba(16, 185, 129, 0.1);
            --danger: #f87171;
            --danger-soft: rgba(248, 113, 113, 0.12);
          }
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, sans-serif;
          font-feature-settings: "ss01", "cv01";
        }
      `}</style>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          position: relative;
          overflow: hidden;
        }

        .page::before {
          content: "";
          position: absolute;
          inset: -120px -120px auto auto;
          width: 520px;
          height: 520px;
          background: radial-gradient(closest-side, var(--brand-soft), transparent 70%);
          opacity: 0.55;
          pointer-events: none;
          z-index: 0;
        }

        .page::after {
          content: "";
          position: absolute;
          inset: auto auto -160px -160px;
          width: 460px;
          height: 460px;
          background: radial-gradient(closest-side, rgba(198, 157, 77, 0.18), transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.4;
          mix-blend-mode: multiply;
          background-image: radial-gradient(rgba(20, 16, 0, 0.06) 1px, transparent 1px);
          background-size: 3px 3px;
          z-index: 1;
        }

        .frame {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 520px;
          padding: 40px clamp(20px, 5vw, 44px) 28px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 24px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.8) inset,
            0 30px 60px -30px rgba(20, 32, 24, 0.18),
            0 8px 24px -12px rgba(20, 32, 24, 0.08);
          animation: rise 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .frame-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .wordmark {
          font-family: "Inter Tight", sans-serif;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: -0.02em;
          display: inline-flex;
          align-items: baseline;
        }

        .dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--brand);
          margin-left: 3px;
          align-self: center;
          transform: translateY(8px);
        }

        .kicker {
          font-family: "JetBrains Mono", ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 10px;
          font-weight: 500;
          color: var(--ink-mute);
          padding: 6px 10px;
          border: 1px solid var(--line);
          border-radius: 999px;
        }

        .display {
          font-family: "Instrument Serif", "Times New Roman", serif;
          font-weight: 400;
          font-size: clamp(36px, 6vw, 52px);
          line-height: 1.04;
          letter-spacing: -0.022em;
          color: var(--ink);
          margin: 0 0 14px;
        }

        .display em {
          font-style: italic;
          color: var(--brand);
        }

        .lede {
          font-size: 15px;
          line-height: 1.55;
          color: var(--ink-soft);
          margin: 0 0 32px;
          max-width: 38ch;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .slots {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .slot {
          position: relative;
          aspect-ratio: 1 / 1.15;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .slot-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          border: 0;
          outline: 0;
          text-align: center;
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: clamp(22px, 5.5vw, 32px);
          font-weight: 600;
          color: var(--ink);
          caret-color: var(--brand);
          padding: 0;
          text-transform: uppercase;
        }

        .slot-line {
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: 14%;
          height: 2px;
          background: var(--line-strong);
          transition: background 200ms ease, transform 200ms ease;
        }

        .slot--filled .slot-line {
          background: var(--brand);
        }

        .slot:focus-within .slot-line {
          background: var(--brand);
          transform: scaleY(2);
          transform-origin: bottom;
        }

        .slot:focus-within::before {
          content: "";
          position: absolute;
          inset: -6px;
          border: 1px solid var(--brand-soft);
          border-radius: 14px;
        }

        .hint {
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          letter-spacing: 0.04em;
          color: var(--ink-mute);
          text-align: center;
        }

        .error {
          display: inline-flex;
          align-self: center;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--danger);
          background: var(--danger-soft);
          padding: 8px 14px;
          border-radius: 999px;
          animation: shake 280ms ease;
        }

        .error-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--danger);
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .cta {
          margin-top: 6px;
          width: 100%;
          padding: 16px 22px;
          background: var(--ink);
          color: var(--bg);
          border: 1px solid var(--ink);
          border-radius: 14px;
          font-family: "Inter Tight", sans-serif;
          font-weight: 500;
          font-size: 15px;
          letter-spacing: -0.01em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: transform 200ms ease, background 200ms ease, opacity 200ms;
        }

        .cta:hover:not(:disabled) {
          background: var(--brand-deep);
          border-color: var(--brand-deep);
          color: #fff;
        }

        .cta:active:not(:disabled) {
          transform: scale(0.99);
        }

        .cta:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .cta-label {
          font-variant-numeric: tabular-nums;
        }

        .cta-arrow {
          font-size: 18px;
          transition: transform 250ms ease;
        }

        .cta:hover:not(:disabled) .cta-arrow {
          transform: translateX(4px);
        }

        .legal {
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid var(--line);
        }

        .legal p {
          font-size: 12px;
          line-height: 1.55;
          color: var(--ink-mute);
          margin: 0;
        }

        @media (max-width: 380px) {
          .slots {
            gap: 6px;
          }
        }
      `}</style>
    </main>
  );
}
