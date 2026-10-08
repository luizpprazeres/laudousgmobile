"use client";

import "./entry.css";

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
    <main className="page sala-entry">
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


    </main>
  );
}
