"use client";

import { Fragment, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMotivationalQuote } from "@/lib/useMotivationalQuote";
import type { Quote } from "@/lib/motivationalQuotes";
import { reviewOf, type ReviewView } from "./_lib/review";
import { composeReport } from "./_lib/compose";
import { copyPlan, type CopyMode } from "./_lib/copyPlan";
import {
  initialSelection,
  orderByCreation,
  positionOf,
  selectionReducer,
} from "./_lib/selection";
import {
  contentChanged,
  acceptResponse,
  isCurrentPoll,
  shouldRefetchSelected,
  selectedReportIsStale,
} from "./_lib/freshness";
import {
  clearAllNames,
  loadNames,
  restampNames,
  saveName,
  sessionNameStorage,
  type NameMap,
} from "./_lib/localNames";

/** Campos de revisão vêm do contrato `reportContract`; ausentes = pending. */
type RevisionFields = {
  contentRevision?: number | null;
  reviewStatus?: unknown;
  reviewedAt?: unknown;
};

type SalaReport = RevisionFields & {
  id: string;
  outputText: string;
  category: string | null;
  createdAt: string;
};

type TimelineEntry = RevisionFields & {
  id: string;
  category: string | null;
  createdAt: string;
};

type Theme = "light" | "dark";
const HIDDEN_IDS_KEY = "sala-hidden-ids";
const THEME_KEY = "sala-theme";
const HIGHLIGHT_KEY = "sala-highlight";

type InvalidReason = "invalid_format" | "not_found" | "revoked" | "expired";

type SalaResponse = {
  tokenValid: boolean;
  report: SalaReport | null;
  reportsToday?: TimelineEntry[];
  reason?: InvalidReason;
  /** Opcional (proposta ao backend): validade do código, limita os nomes locais. */
  tokenExpiresAt?: string | null;
};

type SalaSchema = {
  id: string;
  reportId: string | null;
  examType: string;
  examLabel: string;
  png: string;
  hasPdf: boolean;
  createdAt: string;
  updatedAt: string;
};

type ActiveMainTab = "report" | "schemas";
type ShellStatus = "loading" | "invalid" | "waiting" | "live" | "report-error";

/**
 * Esquemas visuais (`sala_schemas.exam_type`) que pertencem a cada categoria de
 * laudo. Defesa para linhas legadas SEM `report_id` — a listagem vem por médico
 * (`user_id`) e, sem vínculo, o esquema vazava entre exames (ex.: MIOMAS num
 * laudo de MAMA/TIREOIDE). Categoria sem entrada → nenhum esquema legado
 * (estrito, para não reabrir o vazamento). Novo `exam_type` do app precisa
 * entrar aqui.
 */
const SCHEMA_EXAM_TYPES_BY_CATEGORY: Record<string, string[]> = {
  MAMARIA: ["MAMA"],
  TIREOIDE: ["TIREOIDE"],
  OBSTETRICA: ["FETAL_POSITION"],
  MORFOLOGICO: ["FETAL_POSITION"],
  PELVE_FEMININA: ["MIOMAS"],
  DOPPLER_VENOSO_MMII: ["VENOSO_MMII"],
  DOPPLER_VENOSO_MMII_MEDIDAS: ["VENOSO_MMII"],
};

const POLL_INTERVAL_MS = 3000;
/** Poll pendurado vira falha: libera o próximo em vez de travar a fila. */
const POLL_TIMEOUT_MS = 10_000;

type Placement = "after-title" | "in-conclusion" | "footer";
type PhraseSource = "native" | "global";

type Phrase = {
  id: string;
  title: string;
  body: string;
  categoryCode?: string | null;
  categoryCodes?: string[];
};

type InsertedPhrase = {
  id: string;
  text: string;
  title: string;
  placement: Placement;
  source: PhraseSource;
};

type PersistedAnnotation = {
  id: string;
  reportId: string | null;
  text: string;
  placement: Placement;
  createdAt: string;
};

type PhrasesState = {
  natives: Phrase[];
  globals: Phrase[];
};

const EMPTY_PHRASES: PhrasesState = { natives: [], globals: [] };

/** Falhas seguidas de polling antes de avisar "Sem conexão". */
const OFFLINE_AFTER_FAILURES = 3;

type Connection = "opening" | "online" | "offline" | "off";

export default function SalaTokenPage() {
  const params = useParams<{ token: string }>();
  const token = (params?.token ?? "").toUpperCase();

  const [tokenValid, setTokenValid] = useState(true);
  const [invalidReason, setInvalidReason] = useState<InvalidReason | null>(null);
  const [latest, setLatest] = useState<SalaReport | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState(0);
  const [pollSeq, setPollSeq] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>("light");
  const [highlightOn, setHighlightOn] = useState<boolean>(true);
  const [copied, setCopied] = useState<CopyMode | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [phrases, setPhrases] = useState<PhrasesState>(EMPTY_PHRASES);
  const [insertedPhrases, setInsertedPhrases] = useState<InsertedPhrase[]>([]);
  const [persistedAnnotations, setPersistedAnnotations] = useState<
    PersistedAnnotation[]
  >([]);
  const [annotationWarning, setAnnotationWarning] = useState<string | null>(
    null,
  );
  const [justAddedAnnotationId, setJustAddedAnnotationId] = useState<
    string | null
  >(null);
  // Cache por id: o laudo aberto nunca depende de ser o "latest" do polling.
  const [reportsById, setReportsById] = useState<Record<string, SalaReport>>({});
  const [selection, dispatchSelection] = useReducer(selectionReducer, initialSelection);
  const [selectedError, setSelectedError] = useState(false);
  const [changedNoticeId, setChangedNoticeId] = useState<string | null>(null);
  const [names, setNames] = useState<NameMap>({});
  const [listOpen, setListOpen] = useState(false);
  // Vazio no SSR: hora só no cliente, para não divergir na hidratação.
  const [clock, setClock] = useState<string>("");
  const [noteDraft, setNoteDraft] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [schemas, setSchemas] = useState<SalaSchema[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<ActiveMainTab>("report");
  const reportsRef = useRef<Record<string, SalaReport>>({});
  // Ordem das respostas: geração muda com o código; seq ordena os polls;
  // requestClock marca o INÍCIO de toda requisição de laudo (latest ou report).
  const generationRef = useRef(0);
  const pollSeqRef = useRef(0);
  const lastAppliedSeqRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const requestClockRef = useRef(0);
  const appliedAtRef = useRef<Record<string, number>>({});
  const tokenExpiresAtRef = useRef<string | null>(null);
  /** Toda requisição de laudo em voo; abortadas ao trocar de código/desmontar. */
  const controllersRef = useRef<Set<AbortController>>(new Set());
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const pollsSinceFetchRef = useRef(0);
  const inFlightRef = useRef<Set<string>>(new Set());
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const annotationHighlightTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const selectedId = selection.selectedId;
  selectedIdRef.current = selectedId;

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
    } catch {}
  }, []);

  useEffect(() => {
    setClock(formatClock(new Date()));
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (annotationHighlightTimeoutRef.current) {
        clearTimeout(annotationHighlightTimeoutRef.current);
      }
    };
  }, []);

  // Nomes locais: revalida a validade (envelope expiresAt) a cada minuto, ao
  // voltar o foco e ao reexibir a aba — um computador parado da noite para o
  // dia não mostra nomes vencidos nem por um instante após voltar.
  useEffect(() => {
    if (!token) return;
    const refresh = () => setNames(loadNames(sessionNameStorage(), token, new Date()));
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token]);

  // Código revogado, expirado ou inexistente: nenhum nome sobrevive.
  useEffect(() => {
    if (!loading && !tokenValid) {
      clearAllNames(sessionNameStorage());
      setNames({});
    }
  }, [loading, tokenValid]);

  function setPatientName(reportId: string, value: string) {
    setNames(
      saveName(sessionNameStorage(), token, new Date(), reportId, value, tokenExpiresAtRef.current),
    );
  }

  function leave() {
    clearAllNames(sessionNameStorage());
    setNames({});
    window.location.assign("/sala");
  }

  function flashAnnotationWarning(message: string) {
    setAnnotationWarning(message);
    setTimeout(() => {
      setAnnotationWarning((prev) => (prev === message ? null : prev));
    }, 4000);
  }

  async function submitAnnotation() {
    const text = noteDraft.trim();
    if (!text || !displayReport?.id || !token) return;
    try {
      const res = await fetch(
        `/api/sala/${encodeURIComponent(token)}/annotations`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text,
            reportId: displayReport.id,
            placement: "in-conclusion",
          }),
        },
      );
      if (!res.ok) {
        if (res.status === 429) {
          flashAnnotationWarning(
            "Muitas anotações em pouco tempo. Tente de novo em alguns segundos.",
          );
        } else if (res.status === 422) {
          flashAnnotationWarning(
            "Limite de anotações por laudo atingido (30). Remova alguma antes.",
          );
        } else {
          flashAnnotationWarning("Não foi possível salvar a anotação.");
        }
        return;
      }
      const data = (await res.json()) as { annotation?: PersistedAnnotation };
      if (data.annotation) {
        setPersistedAnnotations((prev) => [...prev, data.annotation!]);
        setJustAddedAnnotationId(data.annotation.id);
        if (annotationHighlightTimeoutRef.current) {
          clearTimeout(annotationHighlightTimeoutRef.current);
        }
        annotationHighlightTimeoutRef.current = setTimeout(() => {
          setJustAddedAnnotationId((prev) =>
            prev === data.annotation?.id ? null : prev,
          );
          annotationHighlightTimeoutRef.current = null;
        }, 1400);
        setNoteDraft("");
      }
    } catch (e) {
      console.error("[sala] submitAnnotation falhou", e);
      flashAnnotationWarning("Erro de conexão ao salvar anotação.");
    }
  }

  async function deleteAnnotation(id: string) {
    const snapshot = persistedAnnotations.find((a) => a.id === id);
    if (!snapshot) return;
    setPersistedAnnotations((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(
        `/api/sala/${encodeURIComponent(token)}/annotations/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("[sala] deleteAnnotation falhou — rollback", e);
      setPersistedAnnotations((prev) =>
        [...prev, snapshot].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
      );
      flashAnnotationWarning("Não foi possível remover anotação.");
    }
  }

  function insertPhrase(
    phrase: Phrase,
    source: PhraseSource,
    placement: Placement,
  ) {
    setInsertedPhrases((prev) => [
      ...prev,
      {
        id: `${source}-${phrase.id}-${Date.now()}`,
        text: phrase.body,
        title: phrase.title,
        placement,
        source,
      },
    ]);
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
    if (selectedIdRef.current === id) dispatchSelection({ type: "clear" });
  }

  /**
   * Única porta de entrada de laudo no cache; avisa se o aberto mudou.
   * `startedAt` = relógio do início da requisição: resposta atrasada (mesmo
   * com a mesma revisão, ex.: reviewed → pending) é descartada.
   */
  function upsertReport(next: SalaReport, startedAt: number) {
    const prev = reportsRef.current[next.id];
    if (!acceptResponse({ prev, next, startedAt, appliedAt: appliedAtRef.current[next.id] })) return;
    appliedAtRef.current[next.id] = startedAt;
    if (next.id === selectedIdRef.current && contentChanged(prev, next)) {
      setChangedNoticeId(next.id);
    }
    const merged = { ...reportsRef.current, [next.id]: next };
    reportsRef.current = merged;
    setReportsById(merged);
  }

  async function loadReport(id: string) {
    if (inFlightRef.current.has(id)) return;
    inFlightRef.current.add(id);
    const isSelected = () => selectedIdRef.current === id;
    const generation = generationRef.current;
    const startedAt = ++requestClockRef.current;
    const controller = new AbortController();
    controllersRef.current.add(controller);
    try {
      const res = await fetch(
        `/api/sala/report?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { report: SalaReport | null };
      if (generation !== generationRef.current) return;
      if (data.report) {
        upsertReport(data.report, startedAt);
        if (isSelected()) setSelectedError(false);
      } else if (!reportsRef.current[id] && isSelected()) {
        setSelectedError(true);
      }
    } catch {
      // Com cópia em cache o laudo continua na tela; sem ela, pede nova tentativa.
      if (generation !== generationRef.current) return;
      if (!reportsRef.current[id] && isSelected()) setSelectedError(true);
    } finally {
      controllersRef.current.delete(controller);
      inFlightRef.current.delete(id);
      if (isSelected()) pollsSinceFetchRef.current = 0;
    }
  }

  function openReport(id: string) {
    dispatchSelection({ type: "select", id });
    setListOpen(false);
  }

  function stepReport(delta: 1 | -1) {
    dispatchSelection({ type: "step", delta, entries: visibleTimeline });
  }

  function retrySelected() {
    if (!selectedId) return;
    setSelectedError(false);
    void loadReport(selectedId);
  }

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  function toggleHighlight() {
    setHighlightOn((v) => !v);
  }

  /**
   * "medical" = só o texto do médico (o único coberto pela revisão).
   * "with-additions" = com as frases/anotações da Sala; sempre rascunho.
   * Nunca leva nome local nem estado de revisão.
   */
  async function onCopy(mode: CopyMode = "medical") {
    if (!displayReport) return;
    setCopyError(false);
    const ok = await copyReportToClipboard(
      displayReport,
      mode,
      insertedPhrases,
      persistedAnnotations,
    );
    if (!ok) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 4000);
      return;
    }
    setCopied(mode);
    setTimeout(() => setCopied((c) => (c === mode ? null : c)), 1800);
  }

  async function fetchLatest() {
    // Serializado: um poll por vez. Um pendurado cai no timeout e vira falha.
    if (pollInFlightRef.current || !token) return;
    pollInFlightRef.current = true;
    const generation = generationRef.current;
    const seq = ++pollSeqRef.current;
    const startedAt = ++requestClockRef.current;
    const controller = new AbortController();
    controllersRef.current.add(controller);
    const timeout = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
    const current = () =>
      isCurrentPoll({
        generation,
        currentGeneration: generationRef.current,
        seq,
        lastAppliedSeq: lastAppliedSeqRef.current,
      });
    try {
      const [latestRes, schemasData] = await Promise.all([
        fetch(`/api/sala/latest?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch(`/api/sala/${encodeURIComponent(token)}/schemas`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then((r) => (r.ok ? r.json() : { schemas: [] }))
          .catch(() => ({ schemas: [] })),
      ]);
      if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
      const data = (await latestRes.json()) as SalaResponse;
      if (!current()) return;
      lastAppliedSeqRef.current = seq;
      setSchemas((schemasData as { schemas?: SalaSchema[] }).schemas ?? []);
      setLoading(false);
      setFailures(0);
      setLastSyncAt(new Date().toISOString());
      setTokenValid(data.tokenValid);
      setInvalidReason(data.tokenValid ? null : data.reason ?? "not_found");
      const expires = typeof data.tokenExpiresAt === "string" ? data.tokenExpiresAt : null;
      if (expires !== tokenExpiresAtRef.current) {
        tokenExpiresAtRef.current = expires;
        setNames(restampNames(sessionNameStorage(), token, new Date(), expires));
      }
      setTimeline(data.tokenValid ? data.reportsToday ?? [] : []);
      if (data.report) upsertReport(data.report, startedAt);
      setLatest(data.report ?? null);
      pollsSinceFetchRef.current += 1;
      setPollSeq((n) => n + 1);
    } catch {
      // Mantém o que está na tela; só avisa depois de algumas falhas seguidas.
      if (generation === generationRef.current) setFailures((n) => n + 1);
    } finally {
      clearTimeout(timeout);
      controllersRef.current.delete(controller);
      if (generation === generationRef.current) pollInFlightRef.current = false;
    }
  }

  // Troca de código: nova geração, nada da sessão anterior sobrevive (cache,
  // ordem de respostas, seleção, validade) e respostas antigas são ignoradas.
  useEffect(() => {
    generationRef.current += 1;
    pollInFlightRef.current = false;
    inFlightRef.current = new Set();
    lastAppliedSeqRef.current = pollSeqRef.current;
    appliedAtRef.current = {};
    reportsRef.current = {};
    tokenExpiresAtRef.current = null;
    setReportsById({});
    setTimeline([]);
    setLatest(null);
    setLoading(true);
    setFailures(0);
    setLastSyncAt(null);
    setTokenValid(true);
    setInvalidReason(null);
    dispatchSelection({ type: "reset" });
    if (!token) return;
    fetchLatest();
    const intId = setInterval(fetchLatest, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchLatest();
    };
    document.addEventListener("visibilitychange", onVisible);
    const controllers = controllersRef.current;
    return () => {
      clearInterval(intId);
      document.removeEventListener("visibilitychange", onVisible);
      // Cancela de fato o que está em voo e invalida o que ainda chegar.
      generationRef.current += 1;
      for (const c of controllers) c.abort();
      controllers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const visibleTimeline = useMemo(
    () => orderByCreation(timeline.filter((e) => !hiddenIds.has(e.id))),
    [timeline, hiddenIds],
  );

  useEffect(() => {
    dispatchSelection({ type: "feed", entries: visibleTimeline });
  }, [visibleTimeline]);

  // Troca de laudo: avisos do anterior não valem para o novo.
  useEffect(() => {
    setChangedNoticeId(null);
    setSelectedError(false);
    setCopied(null);
    setCopyError(false);
    pollsSinceFetchRef.current = 0;
  }, [selectedId]);

  // Laudo aberto que não é o "latest": recarrega quando a revisão da lista muda
  // (ou periodicamente, com backend sem revisão). Assim uma edição do médico
  // num laudo antigo chega à tela sem trocar a seleção.
  useEffect(() => {
    if (!selectedId || !tokenValid || selectedError) return;
    const entry = timeline.find((e) => e.id === selectedId);
    if (
      shouldRefetchSelected({
        loaded: reportsRef.current[selectedId],
        listed: entry,
        isLatest: latest?.id === selectedId,
        pollsSinceFetch: pollsSinceFetchRef.current,
      })
    ) {
      void loadReport(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollSeq, selectedId, selectedError]);

  const summary = useMemo(() => summarize(visibleTimeline), [visibleTimeline]);
  const stats = useMemo<
    {
      total: number;
      rawCount: number;
      avgMs: number | null;
      buckets: { label: string; count: number }[];
    } | null
  >(() => {
    if (visibleTimeline.length === 0) return null;
    const rawCount = visibleTimeline.length;

    // Conta EXAMES, não versões: agrupa regeração/correção do MESMO exame
    // (mesma categoria + intervalo < 3 min) num exame só. Representante = a versão
    // mais recente.
    const GAP_MS = 3 * 60 * 1000;
    const sorted = [...visibleTimeline].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const exams: TimelineEntry[] = [];
    let prev: TimelineEntry | null = null;
    for (const e of sorted) {
      const sameExam =
        prev !== null &&
        prev.category === e.category &&
        Math.abs(new Date(prev.createdAt).getTime() - new Date(e.createdAt).getTime()) < GAP_MS;
      if (!sameExam) exams.push(e);
      prev = e;
    }
    const total = exams.length;

    // Subtotais por faixa de horário (BRT, UTC-3) dos EXAMES.
    const brtHour = (iso: string) =>
      new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).getUTCHours();
    let manha = 0,
      tarde = 0,
      noite = 0;
    for (const e of exams) {
      const h = brtHour(e.createdAt);
      if (h < 13) manha++;
      else if (h < 20) tarde++;
      else noite++;
    }
    const buckets = [
      { label: "até 13h", count: manha },
      { label: "13h–20h", count: tarde },
      { label: "após 20h", count: noite },
    ].filter((b) => b.count > 0);

    if (total < 2) return { total, rawCount, avgMs: null, buckets };
    const newest = exams[0];
    const oldest = exams[total - 1];
    if (!newest || !oldest) return { total, rawCount, avgMs: null, buckets };
    const span =
      new Date(newest.createdAt).getTime() - new Date(oldest.createdAt).getTime();
    return { total, rawCount, avgMs: Math.max(0, Math.floor(span / (total - 1))), buckets };
  }, [visibleTimeline]);
  const displayReport: SalaReport | null = selectedId
    ? reportsById[selectedId] ?? null
    : null;
  const review: ReviewView = reviewOf(displayReport);
  const position = positionOf(visibleTimeline, selectedId);
  const arrivalEntry = selection.arrivalId
    ? visibleTimeline.find((e) => e.id === selection.arrivalId) ?? null
    : null;
  // Esquemas do laudo em exibição. Vínculo primário por report_id (o push do
  // app grava o laudo de origem) — impede tanto o vazamento entre categorias
  // quanto entre dois laudos da MESMA categoria. Linhas legadas sem report_id
  // caem na defesa por categoria (mapa estrito acima).
  const visibleSchemas = useMemo(() => {
    const rep = displayReport;
    if (!rep) return [] as SalaSchema[];
    const allowed = SCHEMA_EXAM_TYPES_BY_CATEGORY[rep.category ?? ""] ?? [];
    return schemas.filter((s) =>
      s.reportId !== null ? s.reportId === rep.id : allowed.includes(s.examType),
    );
  }, [schemas, displayReport]);
  const status: ShellStatus = loading
    ? "loading"
    : !tokenValid
      ? "invalid"
      : !selectedId
        ? "waiting"
        : displayReport
          ? "live"
          : selectedError
            ? "report-error"
            : "loading";
  const connection: Connection = !loading && !tokenValid
    ? "off"
    : failures >= OFFLINE_AFTER_FAILURES
      ? "offline"
      : loading
        ? "opening"
        : "online";

  useEffect(() => {
    if (visibleSchemas.length === 0 && activeMainTab === "schemas") {
      setActiveMainTab("report");
    }
  }, [activeMainTab, visibleSchemas.length]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (shortcutsOpen) setShortcutsOpen(false);
        if (listOpen) setListOpen(false);
        return;
      }
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      // ↑/↓ ficam livres para rolar o laudo (leitura vertical).
      if (e.key === "j" || e.key === "ArrowRight") {
        e.preventDefault();
        stepReport(1);
        return;
      }
      if (e.key === "k" || e.key === "ArrowLeft") {
        e.preventDefault();
        stepReport(-1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayReport, persistedAnnotations, shortcutsOpen, listOpen, visibleTimeline]);

  useEffect(() => {
    setInsertedPhrases([]);
  }, [displayReport?.id]);

  const { quote: motivationalQuote, next: rotateMotivationalQuote } =
    useMotivationalQuote();

  useEffect(() => {
    if (latest?.id) {
      rotateMotivationalQuote();
    }
  }, [latest?.id, rotateMotivationalQuote]);

  useEffect(() => {
    if (!token) {
      setPhrases(EMPTY_PHRASES);
      return;
    }
    const cat = displayReport?.category ?? "";
    const url = `/api/sala/${encodeURIComponent(token)}/phrases${
      cat ? `?categoryCode=${encodeURIComponent(cat)}` : ""
    }`;
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : EMPTY_PHRASES))
      .then((data: PhrasesState) => {
        if (!cancelled) {
          setPhrases({
            natives: data.natives ?? [],
            globals: data.globals ?? [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) setPhrases(EMPTY_PHRASES);
      });
    return () => {
      cancelled = true;
    };
  }, [token, displayReport?.category]);

  useEffect(() => {
    if (!displayReport?.id || !token) {
      setPersistedAnnotations([]);
      return;
    }
    let cancelled = false;
    const url = `/api/sala/${encodeURIComponent(token)}/annotations?reportId=${encodeURIComponent(displayReport.id)}`;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { annotations: [] }))
      .then((data: { annotations?: PersistedAnnotation[] }) => {
        if (!cancelled) {
          setPersistedAnnotations(data.annotations ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setPersistedAnnotations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, displayReport?.id]);

  return (
    <>
      <Shell
        status={status}
        connection={connection}
        invalidReason={invalidReason}
        report={displayReport}
        review={review}
        timeline={visibleTimeline}
        activeId={selectedId}
        position={position}
        freshIds={selection.fresh}
        changedIds={selection.changed}
        arrival={arrivalEntry}
        changedNotice={!!displayReport && changedNoticeId === displayReport.id}
        missingFromList={!!displayReport && position === 0}
        names={names}
        listOpen={listOpen}
        summary={summary}
        stats={stats}
        theme={theme}
        clock={clock}
        highlightOn={highlightOn}
        copied={copied}
        copyError={copyError}
        reportStale={selectedReportIsStale(displayReport, timeline.find((entry) => entry.id === selectedId))}
        offline={connection === "offline"}
        lastSyncAt={lastSyncAt}
        noteDraft={noteDraft}
        phrases={phrases}
        insertedPhrases={insertedPhrases}
        persistedAnnotations={persistedAnnotations}
        justAddedAnnotationId={justAddedAnnotationId}
        annotationWarning={annotationWarning}
        motivationalQuote={motivationalQuote}
        shortcutsOpen={shortcutsOpen}
        noteInputRef={noteInputRef}
        schemas={visibleSchemas}
        activeMainTab={activeMainTab}
        salaToken={token}
        onToggleTheme={toggleTheme}
        onToggleHighlight={toggleHighlight}
        onCopy={onCopy}
        onPrint={() => window.print()}
        onHide={hideEntry}
        onSelect={openReport}
        onStep={stepReport}
        onToggleList={() => setListOpen((v) => !v)}
        onDismissArrival={() => dispatchSelection({ type: "dismissArrival" })}
        onDismissChanged={() => setChangedNoticeId(null)}
        onRetryReport={retrySelected}
        onPatientName={setPatientName}
        onLeave={leave}
        onSubmitAnnotation={submitAnnotation}
        onNoteDraft={setNoteDraft}
        onDeleteAnnotation={deleteAnnotation}
        onInsertPhrase={insertPhrase}
        onCloseShortcuts={() => setShortcutsOpen(false)}
        onActiveMainTab={setActiveMainTab}
        formatClock={formatClock}
      />
      <GlobalStyles />
      <ScopedStyles />
    </>
  );
}

function Shell({
  status,
  connection,
  invalidReason,
  report,
  review,
  timeline,
  activeId,
  position,
  freshIds,
  changedIds,
  arrival,
  changedNotice,
  missingFromList,
  names,
  listOpen,
  summary,
  stats,
  theme,
  clock,
  highlightOn,
  copied,
  copyError,
  offline,
  reportStale,
  lastSyncAt,
  noteDraft,
  phrases,
  insertedPhrases,
  persistedAnnotations,
  justAddedAnnotationId,
  annotationWarning,
  motivationalQuote,
  shortcutsOpen,
  noteInputRef,
  schemas,
  activeMainTab,
  salaToken,
  onToggleTheme,
  onToggleHighlight,
  onCopy,
  onPrint,
  onHide,
  onSelect,
  onStep,
  onToggleList,
  onDismissArrival,
  onDismissChanged,
  onRetryReport,
  onPatientName,
  onLeave,
  onSubmitAnnotation,
  onNoteDraft,
  onDeleteAnnotation,
  onInsertPhrase,
  onCloseShortcuts,
  onActiveMainTab,
  formatClock,
}: {
  status: ShellStatus;
  connection: Connection;
  invalidReason: InvalidReason | null;
  report: SalaReport | null;
  review: ReviewView;
  timeline: TimelineEntry[];
  activeId: string | null;
  position: number;
  freshIds: string[];
  changedIds: string[];
  arrival: TimelineEntry | null;
  changedNotice: boolean;
  missingFromList: boolean;
  names: NameMap;
  listOpen: boolean;
  summary: { label: string; count: number }[];
  stats: { total: number; rawCount: number; avgMs: number | null; buckets: { label: string; count: number }[] } | null;
  theme: Theme;
  clock: string;
  highlightOn: boolean;
  copied: CopyMode | null;
  copyError: boolean;
  offline: boolean;
  reportStale: boolean;
  lastSyncAt: string | null;
  noteDraft: string;
  phrases: PhrasesState;
  insertedPhrases: InsertedPhrase[];
  persistedAnnotations: PersistedAnnotation[];
  justAddedAnnotationId: string | null;
  annotationWarning: string | null;
  motivationalQuote: Quote | null;
  shortcutsOpen: boolean;
  noteInputRef: RefObject<HTMLTextAreaElement>;
  schemas: SalaSchema[];
  activeMainTab: ActiveMainTab;
  salaToken: string;
  onToggleTheme: () => void;
  onToggleHighlight: () => void;
  onCopy: (mode?: CopyMode) => void;
  onPrint: () => void;
  onHide: (id: string) => void;
  onSelect: (id: string) => void;
  onStep: (delta: 1 | -1) => void;
  onToggleList: () => void;
  onDismissArrival: () => void;
  onDismissChanged: () => void;
  onRetryReport: () => void;
  onPatientName: (reportId: string, value: string) => void;
  onLeave: () => void;
  onSubmitAnnotation: () => void;
  onNoteDraft: (value: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onInsertPhrase: (
    phrase: Phrase,
    source: PhraseSource,
    placement: Placement,
  ) => void;
  onCloseShortcuts: () => void;
  onActiveMainTab: (tab: ActiveMainTab) => void;
  formatClock: (date: Date) => string;
}) {
  const pillState =
    connection === "online" ? "live" : connection === "off" ? "off" : "waiting";
  const pillLabel =
    connection === "online"
      ? "Conectado"
      : connection === "offline"
        ? "Sem conexão"
        : connection === "off"
          ? "Sala encerrada"
          : "Abrindo…";

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
          {schemas.length > 0 && (
            <div className="main-tabs" role="tablist" aria-label="Conteúdo da sala">
              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === "report"}
                className={`main-tab ${activeMainTab === "report" ? "is-active" : ""}`}
                onClick={() => onActiveMainTab("report")}
              >
                Laudo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeMainTab === "schemas"}
                className={`main-tab ${activeMainTab === "schemas" ? "is-active" : ""}`}
                onClick={() => onActiveMainTab("schemas")}
              >
                Esquemas visuais
              </button>
            </div>
          )}
          {motivationalQuote && (
            <span
              className="motivational-quote"
              title={motivationalQuote.author ?? motivationalQuote.source ?? ""}
            >
              {motivationalQuote.text}
            </span>
          )}
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
          {status === "live" && activeMainTab === "report" && (
            <div className="topbar-tools">
              <button
                type="button"
                className={`topbar-tool ${highlightOn ? "is-on" : ""}`}
                onClick={onToggleHighlight}
                aria-pressed={highlightOn}
                title="Destacar cabeçalhos (H)"
              >
                <span className="topbar-tool-icon" aria-hidden="true">H</span>
                <span className="topbar-tool-label">Destacar</span>
              </button>
              <button
                type="button"
                className="topbar-tool"
                onClick={onPrint}
                title="Imprimir laudo"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                <span className="topbar-tool-label">Imprimir</span>
              </button>
            </div>
          )}
          {connection !== "off" && (
            <button
              type="button"
              className="topbar-tool"
              onClick={onLeave}
              title="Sair e apagar os nomes digitados neste computador"
            >
              <span className="topbar-tool-label">Sair</span>
            </button>
          )}
        </div>
      </header>

      {connection === "offline" && (
        <div className="offline-banner" role="status">
          <strong>Sem conexão.</strong> Tentando de novo… O laudo aberto continua
          aqui e pode ser copiado.
        </div>
      )}

      <div className="layout">
        <aside className="sidebar">
          <SidebarSection title="Resumo">
            {summary.length === 0 || !stats ? (
              <p className="muted">Nenhum laudo hoje ainda.</p>
            ) : (
              <ul className="summary-list">
                <li className="summary-stat">
                  <span className="summary-label">Exames</span>
                  <span className="summary-count">{stats.total}</span>
                </li>
                {stats.rawCount > stats.total && (
                  <li
                    style={{
                      padding: "0 0 4px",
                      fontSize: "11.5px",
                      color: "var(--ink-mute)",
                    }}
                  >
                    {stats.rawCount} laudos (com correções)
                  </li>
                )}
                {stats.buckets.length > 1 && (
                  <li
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px 12px",
                      padding: "2px 0 6px",
                      fontSize: "12px",
                      color: "var(--ink-mute)",
                    }}
                  >
                    {stats.buckets.map((b) => (
                      <span key={b.label}>
                        <strong style={{ color: "var(--ink)" }}>{b.count}</strong> {b.label}
                      </span>
                    ))}
                  </li>
                )}
                <li className="summary-stat">
                  <span className="summary-label">Média</span>
                  <span className="summary-count">
                    {stats.avgMs !== null ? formatDuration(stats.avgMs) : "—"}
                  </span>
                </li>
                {summary.length > 0 && (
                  <li className="summary-divider" aria-hidden="true" />
                )}
                {summary.map((s) => (
                  <li key={s.label}>
                    <span className="summary-label">{s.label}</span>
                    <span className="summary-count">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          <button
            type="button"
            className="daylist-toggle"
            aria-expanded={listOpen}
            aria-controls="sala-daylist"
            onClick={onToggleList}
          >
            <span>Laudos de hoje ({timeline.length})</span>
            <span aria-hidden="true">{listOpen ? "▴" : "▾"}</span>
          </button>
          <div
            id="sala-daylist"
            className={`daylist-wrap ${listOpen ? "is-open" : ""}`}
          >
            <SidebarSection title={`Laudos de hoje · ${timeline.length}`}>
              {timeline.length === 0 ? (
                <p className="muted">Os laudos do dia aparecem aqui.</p>
              ) : (
                <ol className="timeline">
                  {timeline.map((entry) => {
                    const isActive = entry.id === activeId;
                    const isFresh = freshIds.includes(entry.id);
                    const isChanged = changedIds.includes(entry.id);
                    const entryReview = reviewOf(entry);
                    const category = prettyCategory(entry.category ?? "");
                    const time = formatTime(entry.createdAt);
                    const name = names[entry.id];
                    return (
                      <li
                        key={entry.id}
                        className={`timeline-item ${isActive ? "is-active" : ""}`}
                      >
                        <button
                          type="button"
                          className="timeline-row"
                          onClick={() => onSelect(entry.id)}
                          aria-current={isActive ? "true" : undefined}
                          aria-label={`${category} das ${time}${name ? `, ${name}` : ""}. ${reviewLabel(entryReview.status)}${isFresh ? ". Novo" : ""}${isChanged ? ". Alterado" : ""}`}
                        >
                          <span className="timeline-top">
                            <span className="timeline-time">{time}</span>
                            {isFresh && <span className="tl-flag tl-flag--new">Novo</span>}
                            {isChanged && <span className="tl-flag">Alterado</span>}
                          </span>
                          <span className="timeline-label">{category}</span>
                          <span className={`timeline-name ${name ? "" : "is-empty"}`}>
                            {name ?? "sem nome"}
                          </span>
                          <span className={`tl-review tl-review--${entryReview.status}`}>
                            <span aria-hidden="true">
                              {entryReview.status === "reviewed" ? "✓" : "◷"}
                            </span>{" "}
                            {entryReview.status === "reviewed" ? "Revisado" : "Aguardando revisão"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="timeline-x"
                          onClick={(e) => {
                            e.stopPropagation();
                            onHide(entry.id);
                          }}
                          aria-label={`Ocultar ${category} das ${time} desta tela`}
                          title="Ocultar desta tela"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </SidebarSection>
          </div>

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
            <span>Nomes digitados ficam só neste computador</span>
          </div>
        </aside>

        <section className="main">
          {status === "loading" && <LoadingState />}
          {status === "invalid" && (
            <InvalidState reason={invalidReason ?? "not_found"} />
          )}
          {status !== "loading" &&
            status !== "invalid" &&
            activeMainTab === "schemas" &&
            schemas.length > 0 && (
            <SchemasGallery token={salaToken} schemas={schemas} />
          )}
          {status === "waiting" && activeMainTab === "report" && <WaitingState />}
          {status === "report-error" && activeMainTab === "report" && (
            <div className="card card--centered" role="alert">
              <p className="state-body">Não foi possível abrir este laudo.</p>
              <button type="button" className="ghost-button" onClick={onRetryReport}>
                Tentar de novo
              </button>
            </div>
          )}
          {status === "live" && activeMainTab === "report" && report && (
            <ReportView
              report={report}
              review={review}
              position={position}
              total={timeline.length}
              patientName={names[report.id] ?? ""}
              changedNotice={changedNotice}
              missingFromList={missingFromList}
              highlightOn={highlightOn}
              copied={copied}
              copyError={copyError}
              reportStale={reportStale}
              offline={offline}
              lastSyncAt={lastSyncAt}
              insertedPhrases={insertedPhrases}
              persistedAnnotations={persistedAnnotations}
              onCopy={onCopy}
              onStep={onStep}
              onPatientName={onPatientName}
              onDismissChanged={onDismissChanged}
            />
          )}
        </section>

        <aside className="activity-panel">
          <section className="panel-section">
            <h2 className="panel-title">Anotações</h2>
            {annotationWarning && (
              <p className="annotation-warning" role="alert">
                {annotationWarning}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmitAnnotation();
              }}
              className="note-form"
            >
              <textarea
                ref={noteInputRef}
                value={noteDraft}
                onChange={(e) => onNoteDraft(e.target.value)}
                placeholder={
                  report
                    ? "Acrescente uma observação..."
                    : "Aguardando laudo do médico..."
                }
                rows={3}
                className="note-input"
                disabled={!report}
              />
              <button
                type="submit"
                className="note-submit"
                disabled={!noteDraft.trim() || !report}
              >
                Adicionar à conclusão
              </button>
            </form>
            {persistedAnnotations.length > 0 && (
              <ul className="notes-list">
                {persistedAnnotations.slice().reverse().map((a) => (
                  <li
                    key={a.id}
                    className={`note-item ${a.id === justAddedAnnotationId ? "annotation--just-added" : ""}`}
                  >
                    <time>{formatTime(a.createdAt)}</time>
                    <p>{a.text}</p>
                    <button
                      type="button"
                      onClick={() => onDeleteAnnotation(a.id)}
                      aria-label="Remover anotação"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-section">
            <h2 className="panel-title">Frases nativas</h2>
            {phrases.natives.length === 0 ? (
              <p className="muted">
                {report
                  ? "Nenhuma frase nativa cadastrada pra esta categoria."
                  : "Aguardando laudo pra sugerir frases."}
              </p>
            ) : (
              <div className="phrase-list">
                {phrases.natives.map((p) => (
                  <PhraseCard
                    key={`native-${p.id}`}
                    phrase={p}
                    source="native"
                    insertedCount={
                      insertedPhrases.filter(
                        (ip) => ip.source === "native" && ip.text === p.body,
                      ).length
                    }
                    onInsert={(placement) =>
                      onInsertPhrase(p, "native", placement)
                    }
                    disabled={!report}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="panel-section">
            <h2 className="panel-title">Frases globais</h2>
            {phrases.globals.length === 0 ? (
              <p className="muted">
                {report
                  ? "Nenhuma frase global pra esta categoria."
                  : "Aguardando laudo pra sugerir frases."}
              </p>
            ) : (
              <div className="phrase-list">
                {phrases.globals.map((p) => (
                  <PhraseCard
                    key={p.id}
                    phrase={p}
                    source="global"
                    insertedCount={
                      insertedPhrases.filter(
                        (ip) => ip.source === "global" && ip.text === p.body,
                      ).length
                    }
                    onInsert={(placement) =>
                      onInsertPhrase(p, "global", placement)
                    }
                    disabled={!report}
                  />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {arrival && (
        <div className="arrival-toast" role="status" aria-live="polite">
          <span>
            Chegou um laudo novo · {prettyCategory(arrival.category ?? "")} ·{" "}
            {formatTime(arrival.createdAt)}
          </span>
          <button type="button" className="arrival-open" onClick={() => onSelect(arrival.id)}>
            Abrir
          </button>
          <button
            type="button"
            className="arrival-close"
            onClick={onDismissArrival}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}

      <footer className="shortcut-footer">? atalhos</footer>

      {shortcutsOpen && (
        <div className="shortcut-backdrop" onClick={onCloseShortcuts}>
          <div className="shortcut-popover" role="dialog" aria-label="Atalhos" onClick={(e) => e.stopPropagation()}>
            <div className="shortcut-title">Atalhos</div>
            <dl className="shortcut-list">
              <div><dt>j / →</dt><dd>próximo laudo da lista</dd></div>
              <div><dt>k / ←</dt><dd>laudo anterior da lista</dd></div>
              <div><dt>c</dt><dd>copiar o laudo aberto</dd></div>
              <div><dt>h</dt><dd>destacar títulos</dd></div>
              <div><dt>n</dt><dd>nova anotação</dd></div>
              <div><dt>Esc</dt><dd>fechar</dd></div>
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

function PhraseCard({
  phrase,
  source,
  insertedCount,
  onInsert,
  disabled,
}: {
  phrase: Phrase;
  source: PhraseSource;
  insertedCount: number;
  onInsert: (placement: Placement) => void;
  disabled?: boolean;
}) {
  const [placement, setPlacement] = useState<Placement>("in-conclusion");
  return (
    <article className={`phrase-card phrase-card--${source}`}>
      <header className="phrase-card-head">
        <h4 className="phrase-card-title">{phrase.title}</h4>
        {insertedCount > 0 && (
          <span className="phrase-card-badge" title="Vezes inserida no laudo atual">
            ×{insertedCount}
          </span>
        )}
      </header>
      <p className="phrase-card-body">{phrase.body}</p>
      <div
        className="phrase-placement"
        role="radiogroup"
        aria-label="Onde inserir esta frase"
      >
        {(
          [
            { value: "after-title", label: "Após título" },
            { value: "in-conclusion", label: "Na conclusão" },
            { value: "footer", label: "Rodapé" },
          ] as { value: Placement; label: string }[]
        ).map((opt) => (
          <label
            key={opt.value}
            className={`phrase-placement-chip ${placement === opt.value ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name={`placement-${source}-${phrase.id}`}
              value={opt.value}
              checked={placement === opt.value}
              onChange={() => setPlacement(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="phrase-insert"
        onClick={() => onInsert(placement)}
        disabled={disabled}
      >
        + Inserir no laudo
      </button>
    </article>
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
      <Link href="/sala" className="ghost-button">
        ← {copy.cta}
      </Link>
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
        Nenhum laudo hoje ainda. Assim que o médico gerar, ele aparece aqui
        sozinho.
      </p>
    </div>
  );
}

function SchemasGallery({
  token,
  schemas,
}: {
  token: string;
  schemas: SalaSchema[];
}) {
  return (
    <div className="schemas-stage report-anim">
      <div className="schemas-header">
        <div>
          <h1>Esquemas visuais</h1>
          <p>{schemas.length} esquema{schemas.length === 1 ? "" : "s"} disponível{schemas.length === 1 ? "" : "eis"} nesta sala.</p>
        </div>
      </div>
      <div className="schemas-grid">
        {schemas.map((schema) => (
          <article key={schema.id} className="schema-card">
            <div className="schema-image-wrap">
              <img
                src={`data:image/png;base64,${schema.png}`}
                alt={`Esquema visual de ${schema.examLabel}`}
                className="schema-image"
              />
            </div>
            <div className="schema-meta">
              <div>
                <h2>{schema.examLabel}</h2>
                <time>{formatStamp(schema.updatedAt)}</time>
              </div>
              {schema.hasPdf && (
                <a
                  className="schema-download"
                  href={`/api/sala/${encodeURIComponent(token)}/schemas/${encodeURIComponent(schema.id)}/pdf`}
                  download
                >
                  Baixar PDF
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function reviewLabel(status: ReviewView["status"]): string {
  return status === "reviewed" ? "Revisado pelo médico" : "Aguardando revisão do médico";
}

function ReportView({
  report,
  review,
  position,
  total,
  patientName,
  changedNotice,
  missingFromList,
  highlightOn,
  copied,
  copyError,
  offline,
  reportStale,
  lastSyncAt,
  insertedPhrases,
  persistedAnnotations,
  onCopy,
  onStep,
  onPatientName,
  onDismissChanged,
}: {
  report: SalaReport;
  review: ReviewView;
  position: number;
  total: number;
  patientName: string;
  changedNotice: boolean;
  missingFromList: boolean;
  highlightOn: boolean;
  copied: CopyMode | null;
  copyError: boolean;
  offline: boolean;
  reportStale: boolean;
  lastSyncAt: string | null;
  insertedPhrases: InsertedPhrase[];
  persistedAnnotations: PersistedAnnotation[];
  onCopy: (mode?: CopyMode) => void;
  onStep: (delta: 1 | -1) => void;
  onPatientName: (reportId: string, value: string) => void;
  onDismissChanged: () => void;
}) {
  const { heading, body: rawBody } = useMemo(
    () => splitHeading(report.outputText),
    [report.outputText],
  );
  const composed = useMemo(
    () => composeReport(rawBody, insertedPhrases, persistedAnnotations),
    [rawBody, insertedPhrases, persistedAnnotations],
  );
  const plan = copyPlan({
    review,
    offline,
  reportStale,
    additionCount: composed.additionCount,
    lastSyncLabel: lastSyncAt ? formatTime(lastSyncAt) : null,
  });
  const reviewed = plan.banner === "reviewed";
  const labelFor = (mode: CopyMode, label: string) =>
    copyError ? "Não copiou" : copied === mode ? "Copiado" : label;
  const canPrev = position > 1;
  const canNext = position > 0 && position < total;

  const copyButton = (
    action: { mode: CopyMode; label: string; tone: "approved" | "draft" },
    extraClass = "",
  ) => (
    <button
      type="button"
      className={`copy-btn ${action.tone === "approved" ? "copy-btn--primary" : "copy-btn--draft"} ${copied === action.mode ? "is-copied" : ""} ${copyError ? "is-error" : ""} ${extraClass}`}
      onClick={() => onCopy(action.mode)}
      data-copy-mode={action.mode}
    >
      {labelFor(action.mode, action.label)}
    </button>
  );

  const nav = (extraClass = "") => (
    <div className={`reader-nav ${extraClass}`}>
      <button
        type="button"
        className="nav-btn"
        onClick={() => onStep(-1)}
        disabled={!canPrev}
        aria-label="Laudo anterior da lista"
      >
        ‹<span className="nav-word"> Anterior</span>
      </button>
      <span className="nav-pos" aria-live="polite">
        {position > 0 ? `${position} de ${total}` : "fora da lista"}
      </span>
      <button
        type="button"
        className="nav-btn"
        onClick={() => onStep(1)}
        disabled={!canNext}
        aria-label="Próximo laudo da lista"
      >
        <span className="nav-word">Próximo </span>›
      </button>
    </div>
  );

  return (
    // key só pelo id: uma edição do médico atualiza o texto sem remontar nem
    // perder a rolagem.
    <div key={report.id} className="report-stage report-anim">
      <div
        className={`review-banner review-banner--${plan.banner}`}
        role="status"
      >
        <div className="review-text">
          <strong>
            <span aria-hidden="true">
              {plan.banner === "reviewed" ? "✓ " : plan.banner === "stale" ? "⚠ " : "◷ "}
            </span>
            {plan.title}
            {reviewed && review.reviewedAt && (
              <> · {formatTime(review.reviewedAt)}</>
            )}
          </strong>
          <span>{plan.detail}</span>
        </div>
        <div className="banner-actions">
          {copyButton(plan.primary, "copy-btn--main")}
          {plan.secondary && copyButton(plan.secondary, "copy-btn--secondary")}
        </div>
      </div>
      {copyError && (
        <p className="inline-alert" role="alert">
          Não foi possível copiar. Selecione o texto do laudo e use Ctrl+C.
        </p>
      )}
      {changedNotice && (
        <p className="inline-note" role="status">
          O médico alterou este laudo agora. O texto abaixo já é o novo.
          <button type="button" onClick={onDismissChanged}>Ok</button>
        </p>
      )}
      {missingFromList && (
        <p className="inline-note" role="status">
          Este laudo não está mais na lista de hoje.
        </p>
      )}

      <div className="reader-head">
        <div className="reader-meta">
          {report.category && (
            <span className="badge">{prettyCategory(report.category)}</span>
          )}
          <time className="meta-time">{formatStamp(report.createdAt)}</time>
        </div>
        {nav()}
      </div>

      <PatientNameField
        key={report.id}
        reportId={report.id}
        saved={patientName}
        onChange={onPatientName}
      />

      <article className="paper">
        <div className="paper-flow">
          {heading && (
            <h1
              className={`report-heading ${highlightOn ? "report-heading--highlight" : ""}`}
            >
              {heading}
            </h1>
          )}
          <div className="report-body">
            {renderBody(composed.text, highlightOn, composed.added)}
          </div>
        </div>
      </article>

      <div className="mobile-bar">
        {nav("reader-nav--compact")}
        {copyButton(plan.primary, "copy-btn--compact")}
      </div>
    </div>
  );
}

/**
 * Nome do paciente só para a auxiliar se orientar. Estado local de digitação
 * (o valor salvo é normalizado) e persistência só em sessionStorage.
 */
function PatientNameField({
  reportId,
  saved,
  onChange,
}: {
  reportId: string;
  saved: string;
  onChange: (reportId: string, value: string) => void;
}) {
  const [draft, setDraft] = useState(saved);
  const inputId = `sala-patient-${reportId}`;
  return (
    <div className="patient-field">
      <label htmlFor={inputId}>Paciente (opcional)</label>
      <input
        id={inputId}
        type="text"
        value={draft}
        maxLength={60}
        autoComplete="off"
        spellCheck={false}
        placeholder="Digite para achar este laudo na lista"
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(reportId, e.target.value);
        }}
      />
      <span className="patient-hint">
        Fica só neste computador até sair ou virar o dia. Não entra no laudo, na
        cópia nem na impressão.
      </span>
    </div>
  );
}

function renderBody(
  text: string,
  highlightOn: boolean,
  added: boolean[] = [],
): React.ReactNode[] {
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) => {
    const isHeading = isAllCapsHeading(line.trim());
    let cls = isHeading && highlightOn ? "doc-line doc-line--heading" : "doc-line";
    // Acréscimo da Sala: marcado para não se confundir com o texto revisado.
    if (added[i] && line.trim()) cls += " doc-line--added";
    // Quebra de linha fora do span: a etiqueta do acréscimo fica na mesma linha.
    return (
      <Fragment key={i}>
        <span className={cls} data-added={added[i] && line.trim() ? "sala" : undefined}>
          {line}
        </span>
        {i < lines.length - 1 ? "\n" : ""}
      </Fragment>
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

async function copyReportToClipboard(
  report: SalaReport,
  mode: CopyMode,
  inserted: InsertedPhrase[],
  annotations: PersistedAnnotation[],
): Promise<boolean> {
  const { heading, body: rawBody } = splitHeading(report.outputText);
  // "medical": exatamente o texto do médico. "with-additions": o que a tela
  // mostra (frases inseridas + anotações), sempre como rascunho.
  const body =
    mode === "with-additions"
      ? composeReport(rawBody, inserted, annotations).text
      : rawBody;
  const headingHtml = heading
    ? `<p><strong>${escapeHtml(heading)}</strong></p><p>&nbsp;</p>`
    : "";
  const bodyHtml = body
    .split(/\r?\n/)
    .map((line) => {
      if (line.trim() === "") return "<p>&nbsp;</p>";
      if (isAllCapsHeading(line.trim())) {
        return `<p><strong>${escapeHtml(line)}</strong></p>`;
      }
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
  const html = `<div>${headingHtml}${bodyHtml}</div>`;
  const plain = (heading ? heading + "\n\n" : "") + body;

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    } catch (e) {
      console.warn("Clipboard rich write failed, falling back to plain:", e);
    }
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(plain);
      return true;
    }
  } catch (e) {
    console.error("Clipboard write failed:", e);
  }
  return false;
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
    MAMARIA: "Mamas e axilas",
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

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
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
      @import url("https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap");

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
        --ok-bg: #ecfdf5;
        --ok-line: #059669;
        --ok-ink: #065f46;
        --wait-bg: #fffbeb;
        --wait-line: #b45309;
        --wait-ink: #7c2d12;
        --alert-ink: #991b1b;
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
        --ok-bg: rgba(16, 185, 129, 0.14);
        --ok-line: #34d399;
        --ok-ink: #a7f3d0;
        --wait-bg: rgba(245, 158, 11, 0.14);
        --wait-line: #f59e0b;
        --wait-ink: #fde68a;
        --alert-ink: #fca5a5;
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
        min-width: 0;
      }

      .main-tabs {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 3px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: var(--paper-shade);
      }

      .main-tab {
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--ink-soft);
        cursor: pointer;
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 600;
        padding: 7px 11px;
        transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
        white-space: nowrap;
      }

      .main-tab:hover {
        color: var(--ink);
      }

      .main-tab.is-active {
        background: var(--paper);
        color: var(--brand-deep);
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
      }

      .motivational-quote {
        font-style: italic;
        font-size: 11.5px;
        font-weight: 400;
        letter-spacing: 0.04em;
        color: var(--ink-mute);
        max-width: 380px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex-shrink: 1;
        min-width: 0;
        padding-right: 12px;
        user-select: none;
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

      .topbar-tools {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding-left: 8px;
        margin-left: 4px;
        border-left: 1px solid var(--line);
      }

      .topbar-tool {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 8px;
        color: var(--ink-soft);
        font-family: "Inter Tight", sans-serif;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms ease, color 120ms ease, border-color 120ms ease;
      }

      .topbar-tool:hover {
        color: var(--ink);
        background: var(--paper-shade);
        border-color: var(--line);
      }

      .topbar-tool:active {
        transform: scale(0.96);
      }

      .topbar-tool.is-on,
      .topbar-tool.is-copied {
        color: var(--brand-deep);
        background: var(--brand-tint);
        border-color: var(--brand-soft);
      }

      .topbar-tool.is-error {
        color: #b91c1c;
        background: #fef2f2;
        border-color: #fecaca;
      }

      [data-theme="dark"] .topbar-tool.is-error {
        color: #fca5a5;
        background: rgba(220, 38, 38, 0.12);
        border-color: rgba(220, 38, 38, 0.3);
      }

      .topbar-tool-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border: 1px solid currentColor;
        border-radius: 3px;
        font-family: "JetBrains Mono", monospace;
        font-weight: 600;
        font-size: 9px;
        line-height: 1;
      }

      .topbar-tool-label {
        font-size: 12px;
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
        grid-template-columns: 240px minmax(0, 1fr) 280px;
        gap: 0;
        width: 100%;
      }

      .sidebar {
        border-right: 1px solid var(--line);
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 24px;
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
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-mute);
        margin: 0;
        font-weight: 400;
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

      .summary-stat .summary-label {
        color: var(--ink);
        font-weight: 500;
      }

      .summary-divider {
        list-style: none;
        height: 1px;
        background: var(--line);
        margin: 6px 0 2px;
        padding: 0;
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
        left: 5px;
        top: 50%;
        transform: translateY(-50%);
        width: 5px;
        height: 5px;
        border-radius: 999px;
        background: var(--paper);
        border: 1px solid var(--line-strong);
        transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
      }

      .timeline-item.is-latest::before {
        background: var(--brand);
        border-color: var(--brand);
        box-shadow: 0 0 0 2px var(--brand-tint);
      }

      .timeline-item.is-latest .timeline-label {
        color: var(--ink);
        font-weight: 500;
      }

      .timeline-item.is-active::before {
        background: var(--brand-deep);
        border-color: var(--brand-deep);
        box-shadow: 0 0 0 2px var(--brand-soft);
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
        gap: 20px;
        position: sticky;
        top: 52px;
        align-self: start;
        max-height: calc(100vh - 52px);
        overflow-y: auto;
      }

      .annotation-warning {
        margin: 0;
        padding: 6px 10px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #b91c1c;
        font-size: 11.5px;
        line-height: 1.4;
      }

      [data-theme="dark"] .annotation-warning {
        background: rgba(220, 38, 38, 0.12);
        border-color: rgba(220, 38, 38, 0.3);
        color: #fca5a5;
      }

      .phrase-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .phrase-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 12px;
        background: var(--paper-shade);
        border: 1px solid var(--line);
        border-radius: 10px;
        transition: border-color 140ms ease, background 140ms ease;
      }

      .phrase-card:hover {
        border-color: var(--line-strong);
      }

      .phrase-card--native {
        background: var(--brand-tint);
        border-color: var(--brand-soft);
      }

      .phrase-card-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }

      .phrase-card-title {
        margin: 0;
        font-size: 12px;
        font-weight: 600;
        color: var(--ink);
        flex: 1;
        line-height: 1.3;
      }

      .phrase-card-badge {
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        color: var(--brand-deep);
        background: var(--brand-tint);
        border: 1px solid var(--brand-soft);
        border-radius: 999px;
        padding: 1px 6px;
        line-height: 1.3;
      }

      .phrase-card-body {
        margin: 0;
        font-size: 11.5px;
        line-height: 1.4;
        color: var(--ink-soft);
      }

      .phrase-placement {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .phrase-placement-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        font-size: 10.5px;
        color: var(--ink-mute);
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 999px;
        cursor: pointer;
        transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
        user-select: none;
      }

      .phrase-placement-chip input[type="radio"] {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        width: 0;
        height: 0;
      }

      .phrase-placement-chip:hover {
        color: var(--ink);
        border-color: var(--line-strong);
      }

      .phrase-placement-chip.is-selected {
        color: var(--brand-deep);
        background: var(--brand-tint);
        border-color: var(--brand-soft);
        font-weight: 500;
      }

      .phrase-insert {
        align-self: flex-end;
        padding: 5px 12px;
        border-radius: 7px;
        border: 1px solid var(--brand-soft);
        background: var(--brand-tint);
        color: var(--brand-deep);
        cursor: pointer;
        font-size: 11.5px;
        font-weight: 500;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 120ms ease, border-color 120ms ease;
      }

      .phrase-insert:hover:not(:disabled) {
        background: var(--brand-soft);
      }

      .phrase-insert:active:not(:disabled) {
        transform: scale(0.96);
      }

      .phrase-insert:disabled {
        opacity: 0.4;
        cursor: not-allowed;
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

      .annotation--just-added {
        animation: annotation-added 1400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
        max-width: 210mm;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .schemas-stage {
        max-width: 1320px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .schemas-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        padding: 0 4px;
      }

      .schemas-header h1 {
        margin: 0;
        color: var(--ink);
        font-size: clamp(24px, 3vw, 34px);
        font-weight: 650;
        letter-spacing: -0.02em;
      }

      .schemas-header p {
        margin: 6px 0 0;
        color: var(--ink-mute);
        font-size: 13px;
      }

      .schemas-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr));
        gap: 18px;
      }

      .schema-card {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 10px;
        box-shadow:
          0 1px 3px rgba(15, 23, 42, 0.08),
          0 12px 28px -24px rgba(15, 23, 42, 0.34);
        overflow: hidden;
      }

      .schema-image-wrap {
        background: var(--paper-shade);
        border-bottom: 1px solid var(--line);
        padding: 12px;
      }

      .schema-image {
        display: block;
        width: 100%;
        height: auto;
        border: 1px solid var(--line);
        border-radius: 6px;
        background: var(--paper);
      }

      .schema-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 14px 16px 16px;
      }

      .schema-meta h2 {
        margin: 0 0 4px;
        color: var(--ink);
        font-size: 16px;
        font-weight: 650;
      }

      .schema-meta time {
        color: var(--ink-mute);
        font-family: "JetBrains Mono", monospace;
        font-size: 10.5px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .schema-download {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
        padding: 8px 13px;
        border: 1px solid var(--brand-soft);
        border-radius: 8px;
        background: var(--brand-tint);
        color: var(--brand-deep);
        font-size: 12.5px;
        font-weight: 650;
        text-decoration: none;
        white-space: nowrap;
        transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 120ms ease, background 120ms ease;
      }

      .schema-download:hover {
        border-color: var(--brand);
      }

      .schema-download:active {
        transform: scale(0.97);
      }

      .report-anim {
        animation: report-in 360ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
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

      /* Leitura vertical: uma coluna do tamanho de uma folha A4, rolando para baixo. */
      .paper {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 6px;
        box-shadow:
          0 1px 3px rgba(15, 23, 42, 0.08),
          0 2px 8px rgba(15, 23, 42, 0.04);
      }

      [data-theme="dark"] .paper {
        box-shadow:
          0 1px 0 rgba(255, 255, 255, 0.04) inset,
          0 28px 60px -32px rgba(0, 0, 0, 0.5);
      }

      .paper-flow {
        padding: 56px 48px 64px;
        font-size: 18.5px;
        line-height: 1.55;
        overflow-wrap: anywhere;
      }

      /* ---- Faixa de revisão: texto + ícone + cor, sempre juntos ---- */
      .review-banner {
        position: sticky;
        top: 60px;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 18px;
        border-radius: 10px;
        border: 2px solid;
      }
      .review-banner--reviewed { background: var(--ok-bg); border-color: var(--ok-line); color: var(--ok-ink); }
      .review-banner--pending { background: var(--wait-bg); border-color: var(--wait-line); color: var(--wait-ink); }
      /* Sem conexão: neutro, nunca verde — a versão na tela pode estar velha. */
      .review-banner--stale { background: var(--paper-shade); border-color: var(--ink-soft); border-style: dashed; color: var(--ink); }
      .banner-actions { display: flex; flex-direction: column; align-items: stretch; gap: 8px; flex-shrink: 0; }
      .copy-btn--secondary { font-size: 13.5px; min-height: 40px; }

      /* Acréscimo da Sala (frase/anotação): fora da revisão médica. */
      .doc-line--added {
        background: var(--wait-bg);
        box-shadow: inset 3px 0 0 var(--wait-line);
        padding-left: 8px;
      }
      .doc-line--added::after {
        content: " · acréscimo da Sala, não revisado";
        font-size: 0.7em;
        font-weight: 700;
        color: var(--wait-ink);
      }
      .review-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .review-text strong { font-size: 17px; font-weight: 800; letter-spacing: 0.01em; }
      .review-text span { font-size: 14px; }

      .copy-btn {
        flex-shrink: 0;
        min-height: 44px;
        padding: 10px 18px;
        border-radius: 8px;
        font: inherit;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 120ms ease, filter 120ms ease;
      }
      .copy-btn:active { transform: scale(0.97); }
      .copy-btn:focus-visible, .nav-btn:focus-visible, .daylist-toggle:focus-visible,
      .arrival-toast button:focus-visible, .inline-note button:focus-visible {
        outline: 3px solid var(--ink);
        outline-offset: 2px;
      }
      .copy-btn--primary { background: #047857; color: #ffffff; border: 2px solid #047857; }
      .copy-btn--primary:hover { filter: brightness(1.08); }
      .copy-btn--draft { background: var(--paper); color: var(--wait-ink); border: 2px dashed var(--wait-line); }
      .copy-btn.is-copied { background: var(--ok-bg); color: var(--ok-ink); border-style: solid; border-color: var(--ok-line); }
      /* Rascunho copiado: confirmação neutra, nunca o verde de "revisado". */
      .copy-btn--draft.is-copied { background: var(--paper-shade); color: var(--ink); border-color: var(--ink-soft); border-style: dashed; }
      .copy-btn.is-error { background: var(--paper); color: var(--alert-ink); border-color: currentColor; }

      .inline-alert, .inline-note {
        margin: 0;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .inline-alert { color: var(--alert-ink); border: 1px solid currentColor; background: var(--paper); }
      .inline-note { color: var(--ink); background: var(--paper-shade); border: 1px solid var(--line-strong); }
      .inline-note button {
        min-height: 32px; padding: 4px 12px; border-radius: 6px; font: inherit; font-weight: 600;
        border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink); cursor: pointer;
      }

      .reader-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .reader-meta {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ink-soft);
      }
      .reader-nav { display: inline-flex; align-items: center; gap: 8px; }
      .nav-btn {
        min-height: 40px;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid var(--line-strong);
        background: var(--paper);
        color: var(--ink);
        font: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .nav-btn:disabled { opacity: 0.45; cursor: default; }
      .nav-pos { font-size: 13px; color: var(--ink-soft); font-variant-numeric: tabular-nums; min-width: 56px; text-align: center; }

      .patient-field {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 4px 12px;
      }
      .patient-field label { font-size: 14px; font-weight: 700; color: var(--ink); }
      .patient-field input {
        width: 100%;
        max-width: 420px;
        min-height: 40px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--line-strong);
        background: var(--paper);
        color: var(--ink);
        font: inherit;
        font-size: 15px;
      }
      .patient-field input:focus-visible { outline: 3px solid var(--brand-soft); border-color: var(--brand); }
      .patient-hint { grid-column: 2; font-size: 12.5px; color: var(--ink-soft); }

      /* ---- Lista do dia ---- */
      .timeline-top { display: inline-flex; align-items: center; gap: 6px; }
      .tl-flag {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 1px 6px;
        border-radius: 999px;
        border: 1px solid var(--line-strong);
        color: var(--ink);
      }
      .tl-flag--new { background: var(--ink); color: var(--paper); border-color: var(--ink); }
      .timeline-name { font-size: 12.5px; font-weight: 600; color: var(--ink); overflow-wrap: anywhere; }
      .timeline-name.is-empty { font-weight: 400; font-style: italic; color: var(--ink-soft); }
      .tl-review { font-size: 11.5px; font-weight: 700; }
      .tl-review--reviewed { color: var(--ok-ink); }
      .tl-review--pending { color: var(--wait-ink); }

      .daylist-toggle {
        display: none;
        width: 100%;
        min-height: 44px;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid var(--line-strong);
        background: var(--paper);
        color: var(--ink);
        font: inherit;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }

      .offline-banner {
        padding: 10px clamp(16px, 3vw, 28px);
        background: var(--paper-shade);
        border-bottom: 1px solid var(--line-strong);
        color: var(--ink);
        font-size: 14px;
      }

      .arrival-toast {
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        z-index: 20;
        display: flex;
        align-items: center;
        gap: 12px;
        width: max-content;
        max-width: calc(100vw - 32px);
        padding: 10px 10px 10px 16px;
        border-radius: 12px;
        background: var(--ink);
        color: var(--paper);
        font-size: 14px;
        box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.45);
      }
      .arrival-toast span { min-width: 0; }
      .arrival-open {
        min-height: 36px; padding: 6px 14px; border-radius: 8px; border: 0;
        background: var(--paper); color: var(--ink); font: inherit; font-weight: 700; cursor: pointer;
      }
      .arrival-close {
        min-width: 36px; min-height: 36px; border-radius: 8px; border: 1px solid currentColor;
        background: transparent; color: inherit; font-size: 18px; cursor: pointer;
      }

      .mobile-bar {
        display: none;
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 15;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
        background: var(--paper);
        border-top: 1px solid var(--line-strong);
      }
      .reader-nav--compact { gap: 2px; flex-shrink: 0; }
      .reader-nav--compact .nav-btn { min-width: 44px; min-height: 44px; padding: 6px 10px; font-size: 18px; }
      .reader-nav--compact .nav-word { display: none; }
      .reader-nav--compact .nav-pos { min-width: 44px; }
      .copy-btn--compact { flex: 1 1 auto; min-width: 0; padding: 8px 10px; font-size: 14px; white-space: normal; line-height: 1.2; }

      @keyframes report-in {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes annotation-added {
        0% {
          background: transparent;
        }
        28% {
          background: var(--brand-soft);
        }
        100% {
          background: var(--paper-shade);
        }
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
        font-weight: 800;
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
        font-weight: 800;
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
          grid-template-columns: 240px minmax(0, 1fr);
        }
        .activity-panel {
          display: none;
        }
        .motivational-quote {
          max-width: 240px;
          font-size: 10px;
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
        .main-tabs {
          width: 100%;
        }
        .main-tab {
          flex: 1;
        }
        .motivational-quote {
          display: none;
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
        .paper { border-radius: 6px; }
        .paper-flow { padding: 24px 18px 32px; font-size: 16.5px; }
        .main { padding: 16px 16px 96px; }
        .sidebar { gap: 12px; }
        .sidebar > .sidebar-section:first-child { display: none; }
        .daylist-toggle { display: flex; }
        .daylist-wrap { display: none; }
        .daylist-wrap.is-open { display: block; }
        .reader-head .reader-nav { display: none; }
        .review-banner .copy-btn--main { display: none; }
        .review-banner { flex-direction: column; align-items: stretch; }
        .review-banner { position: static; }
        .mobile-bar { display: flex; }
        .shortcut-footer { display: none; }
        .arrival-toast { bottom: 84px; left: 16px; right: 16px; width: auto; transform: none; }
        .daylist-wrap .sidebar-title { display: none; }
        .schema-meta {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      /* Impressão: só o texto do laudo. Nome local, faixa de revisão e
         controles nunca vão para o papel. */
      @media print {
        .topbar, .sidebar, .activity-panel, .offline-banner, .review-banner,
        .inline-alert, .inline-note, .reader-head, .patient-field, .mobile-bar,
        .arrival-toast, .shortcut-footer, .shortcut-backdrop { display: none !important; }
        .layout { display: block !important; }
        .main { padding: 0 !important; background: #fff !important; }
        .report-anim { animation: none !important; }
        .paper { max-width: none; border: 0; box-shadow: none !important; }
        .paper-flow { padding: 0; color: #000; }
        .doc-line--added { background: none; box-shadow: none; padding-left: 0; }
        .doc-line--added::after { content: none; }
      }
    `}} />
  );
}
