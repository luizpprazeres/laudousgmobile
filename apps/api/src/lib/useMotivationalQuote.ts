"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUOTES, type Quote } from "@/lib/motivationalQuotes";

const STORAGE_KEY = "sala-quote-seen";
const ROTATE_INTERVAL_MS = 10 * 60 * 1000; // 10min
const EVENT_COOLDOWN_MS = 3 * 60 * 1000; // 3min mínimo entre rotações automáticas
const STRICT_MODE_DEDUP_MS = 1000; // dedup mount duplo do React StrictMode

/**
 * Encapsula rotação de frases motivacionais no topbar.
 *
 * - Pool de 50 frases hardcoded (importa de motivationalQuotes.ts)
 * - sessionStorage rastreia IDs vistos NESTA SESSÃO (reset ao fechar aba)
 * - Quando todas foram vistas, reseta pool
 * - setInterval rotaciona a cada 10min
 * - Visibility API pausa interval em aba oculta (não consome pool sem ver)
 * - rotateIfAllowed() centraliza cooldown 3min: tanto interval quanto event
 *   externo (novo laudo) passam por ele. Mount inicial usa pickNext direto.
 * - pickNext tem guard interno de 1s pra cobrir StrictMode dev (mount duplo).
 */
export function useMotivationalQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const lastChangeAtRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const readSeen = useCallback((): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw === null) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((x): x is string => typeof x === "string"));
    } catch {
      return new Set();
    }
  }, []);

  const writeSeen = useCallback((seen: Set<string>) => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
    } catch {
      // quota exceeded, ignore
    }
  }, []);

  const pickNext = useCallback(() => {
    // Guard contra mount duplo do React StrictMode (dev): se a última troca
    // aconteceu há menos de 1s, ignora. lastChangeAtRef === 0 = primeiro pick legítimo.
    const elapsed = Date.now() - lastChangeAtRef.current;
    if (lastChangeAtRef.current !== 0 && elapsed < STRICT_MODE_DEDUP_MS) {
      return;
    }
    const seen = readSeen();
    let available = QUOTES.filter((q) => !seen.has(q.id));
    if (available.length === 0) {
      seen.clear();
      available = QUOTES;
    }
    const idx = Math.floor(Math.random() * available.length);
    const next = available[idx];
    if (!next) return;
    seen.add(next.id);
    writeSeen(seen);
    lastChangeAtRef.current = Date.now();
    setQuote(next);
  }, [readSeen, writeSeen]);

  /**
   * Wrapper com cooldown 3min — usado por interval E por trigger externo
   * (novo laudo). Evita duplo-fire quando evento e tick coincidem.
   */
  const rotateIfAllowed = useCallback(() => {
    const elapsed = Date.now() - lastChangeAtRef.current;
    if (elapsed < EVENT_COOLDOWN_MS) return;
    pickNext();
  }, [pickNext]);

  // Pick inicial no mount — força primeira frase (cooldown ainda não ativo)
  useEffect(() => {
    pickNext();
  }, [pickNext]);

  // Interval com pause via visibility API. Usa rotateIfAllowed (não pickNext
  // direto) pra respeitar cooldown unificado.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const startInterval = () => {
      if (intervalRef.current !== null) return;
      intervalRef.current = setInterval(rotateIfAllowed, ROTATE_INTERVAL_MS);
    };
    const stopInterval = () => {
      if (intervalRef.current === null) return;
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        startInterval();
      } else {
        stopInterval();
      }
    };

    if (document.visibilityState === "visible") startInterval();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rotateIfAllowed]);

  return { quote, next: rotateIfAllowed };
}
