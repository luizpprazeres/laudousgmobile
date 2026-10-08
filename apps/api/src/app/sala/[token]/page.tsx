"use client";

import "./room.css";

import { Fragment, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ReviewHighlight, ReviewSignals } from "@laudousg/shared";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMotivationalQuote } from "@/lib/useMotivationalQuote";
import type { Quote } from "@/lib/motivationalQuotes";
import { reviewOf, type ReviewView } from "./_lib/review";
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
import {
  DEFAULT_PAGINATION_METRICS,
  paginateReport,
  paginationMetricsFromGeometry,
  type PaginationMetrics,
} from "./_lib/pagination";

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
  reviewSignals?: ReviewSignals;
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
  DOPPLER_CAROTIDAS: ["CAROTIDAS"],
};

const POLL_INTERVAL_MS = 3000;
/** Poll pendurado vira falha: libera o próximo em vez de travar a fila. */
const POLL_TIMEOUT_MS = 10_000;

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
  // Cache por id: o laudo aberto nunca depende de ser o "latest" do polling.
  const [reportsById, setReportsById] = useState<Record<string, SalaReport>>({});
  const [selection, dispatchSelection] = useReducer(selectionReducer, initialSelection);
  const [selectedError, setSelectedError] = useState(false);
  const [changedNoticeId, setChangedNoticeId] = useState<string | null>(null);
  const [names, setNames] = useState<NameMap>({});
  const [listOpen, setListOpen] = useState(false);
  // Vazio no SSR: hora só no cliente, para não divergir na hidratação.
  const [clock, setClock] = useState<string>("");
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

  /** Copia exatamente o laudo do médico, sem nome local nem estado de revisão. */
  async function onCopy(mode: CopyMode = "medical") {
    if (!displayReport) return;
    setCopyError(false);
    const ok = await copyReportToClipboard(displayReport);
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
  // Por laudo, independente da conexão global: some só com recarga bem-sucedida.
  const reportStale = selectedReportIsStale(
    displayReport,
    selectedId ? timeline.find((entry) => entry.id === selectedId) : undefined,
  );
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
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayReport, shortcutsOpen, listOpen, visibleTimeline]);

  const { quote: motivationalQuote, next: rotateMotivationalQuote } =
    useMotivationalQuote();

  useEffect(() => {
    if (latest?.id) {
      rotateMotivationalQuote();
    }
  }, [latest?.id, rotateMotivationalQuote]);

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
        changedNotice={!!displayReport && changedNoticeId === displayReport.id && !reportStale}
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
        reportStale={reportStale}
        offline={connection === "offline"}
        lastSyncAt={lastSyncAt}
        motivationalQuote={motivationalQuote}
        shortcutsOpen={shortcutsOpen}
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
        onCloseShortcuts={() => setShortcutsOpen(false)}
        onActiveMainTab={setActiveMainTab}
        formatClock={formatClock}
      />
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
  motivationalQuote,
  shortcutsOpen,
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
  motivationalQuote: Quote | null;
  shortcutsOpen: boolean;
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
                          <span className="timeline-primary">
                            <span className="timeline-time">{time}</span>
                            <span className="timeline-label" title={category}>{category}</span>
                            <span
                              className={`tl-review tl-review--${entryReview.status} ${isChanged ? "has-changed" : isFresh ? "has-new" : ""}`}
                              title={`${reviewLabel(entryReview.status)}${isFresh ? " · Novo" : ""}${isChanged ? " · Alterado" : ""}`}
                              aria-hidden="true"
                            >
                              {entryReview.status === "reviewed" ? "✓" : "◷"}
                            </span>
                          </span>
                          {name && <span className="timeline-name" title={name}>{name}</span>}
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
              onCopy={onCopy}
              onStep={onStep}
              onPatientName={onPatientName}
              onDismissChanged={onDismissChanged}
            />
          )}
        </section>

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
  onCopy: (mode?: CopyMode) => void;
  onStep: (delta: 1 | -1) => void;
  onPatientName: (reportId: string, value: string) => void;
  onDismissChanged: () => void;
}) {
  const { heading, body: rawBody } = useMemo(
    () => splitHeading(report.outputText),
    [report.outputText],
  );
  const spreadRef = useRef<HTMLDivElement>(null);
  const [paginationMetrics, setPaginationMetrics] = useState<PaginationMetrics>(
    DEFAULT_PAGINATION_METRICS,
  );
  const pages = useMemo(
    () => paginateReport(rawBody, [], Boolean(heading), paginationMetrics),
    [rawBody, heading, paginationMetrics],
  );

  useEffect(() => {
    const spread = spreadRef.current;
    if (!spread) return;
    let active = true;

    const measure = () => {
      if (!active) return;
      if (window.matchMedia("(max-width: 760px)").matches) {
        setPaginationMetrics(DEFAULT_PAGINATION_METRICS);
        return;
      }

      const paper = spread.querySelector<HTMLElement>(".paper");
      const flow = paper?.querySelector<HTMLElement>(".paper-flow");
      const body = flow?.querySelector<HTMLElement>(".report-body");
      if (!paper || !flow || !body) return;

      const paperRect = paper.getBoundingClientRect();
      const flowStyle = window.getComputedStyle(flow);
      const bodyStyle = window.getComputedStyle(body);
      const paddingLeft = Number.parseFloat(flowStyle.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(flowStyle.paddingRight) || 0;
      const paddingTop = Number.parseFloat(flowStyle.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(flowStyle.paddingBottom) || 0;
      const lineHeight = Number.parseFloat(bodyStyle.lineHeight) || 24;
      const contentWidth = paperRect.width - paddingLeft - paddingRight;
      const contentHeight = paperRect.height - paddingTop - paddingBottom;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      let averageCharWidth = (Number.parseFloat(bodyStyle.fontSize) || 16) * 0.5;
      let headingTextWidth = 0;
      if (context) {
        context.font = `${bodyStyle.fontWeight} ${bodyStyle.fontSize} ${bodyStyle.fontFamily}`;
        const sample = rawBody.replace(/\s+/g, " ").trim().slice(0, 800)
          || "Laudo ultrassonográfico com medidas e descrição dos achados.";
        averageCharWidth = context.measureText(sample).width / sample.length;
        if (heading) {
          context.font = `800 ${bodyStyle.fontSize} ${bodyStyle.fontFamily}`;
          headingTextWidth = context.measureText(heading).width;
        }
      }

      const next = paginationMetricsFromGeometry({
        contentWidthPx: contentWidth,
        contentHeightPx: contentHeight,
        lineHeightPx: lineHeight,
        averageCharWidthPx: averageCharWidth,
        headingTextWidthPx: headingTextWidth,
        headingMarginBottomPx: heading ? 14 : 0,
      });
      setPaginationMetrics((previous) =>
        previous.rowsPerPage === next.rowsPerPage
        && previous.charsPerRow === next.charsPerRow
        && Math.abs(previous.headingRows - next.headingRows) < 0.01
          ? previous
          : next,
      );
    };

    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(spread);
    if (document.fonts?.ready) void document.fonts.ready.then(measure);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [heading, rawBody]);
  const contentPageCount = pages.filter((page) => !page.empty).length || 1;
  const plan = copyPlan({
    review,
    offline,
  reportStale,
    additionCount: 0,
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
        <PatientNameField
          key={report.id}
          reportId={report.id}
          saved={patientName}
          onChange={onPatientName}
        />
        {nav()}
      </div>

      {highlightOn && (report.reviewSignals?.notices.length ?? 0) > 0 && (
        <details className="review-notices">
          <summary>
            ⚠ {report.reviewSignals!.notices.length} aviso{report.reviewSignals!.notices.length === 1 ? "" : "s"} sem trecho específico
          </summary>
          <ul>
            {report.reviewSignals!.notices.map((notice) => (
              <li key={notice.id}>{notice.message}</li>
            ))}
          </ul>
        </details>
      )}

      <div ref={spreadRef} className="paper-spread" aria-label={`Laudo em ${contentPageCount} página${contentPageCount === 1 ? "" : "s"}`}>
        {pages.map((page, index) => {
          const contentIndex = pages.slice(0, index + 1).filter((item) => !item.empty).length;
          return (
          <article
            key={`${report.id}-page-${index + 1}`}
            className={`paper ${page.empty ? "is-empty is-placeholder" : ""}`}
            data-page-label={page.empty ? "" : `${contentIndex} / ${contentPageCount}`}
            data-empty={page.empty ? "true" : "false"}
            aria-label={page.empty ? undefined : `Página ${contentIndex} de ${contentPageCount}`}
            aria-hidden={page.empty ? "true" : undefined}
          >
            <div className="paper-flow">
              {index === 0 && heading && (
                <h1
                  className={`report-heading ${highlightOn ? "report-heading--highlight" : ""}`}
                >
                  {heading}
                </h1>
              )}
              <div className="report-body">
                {renderBody(page.text, highlightOn, page.added, report.reviewSignals?.highlights ?? [])}
              </div>
            </div>
          </article>
          );
        })}
      </div>

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
  const hintId = `${inputId}-hint`;
  return (
    <div className="patient-field">
      <label className="sr-only" htmlFor={inputId}>Nome do paciente (opcional)</label>
      <span className="sr-only" id={hintId}>
        Usado só para localizar este laudo nesta sala. Não entra no laudo, na cópia nem na impressão.
      </span>
      <input
        id={inputId}
        type="text"
        value={draft}
        maxLength={60}
        autoComplete="off"
        spellCheck={false}
        placeholder="Nome do paciente (opcional)"
        aria-describedby={hintId}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(reportId, e.target.value);
        }}
      />
    </div>
  );
}

function renderBody(
  text: string,
  highlightOn: boolean,
  added: boolean[] = [],
  highlights: ReviewHighlight[] = [],
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
          {highlightOn ? renderHighlightedLine(line, highlights, i) : line}
        </span>
        {i < lines.length - 1 ? "\n" : ""}
      </Fragment>
    );
  });
}

function renderHighlightedLine(
  line: string,
  highlights: ReviewHighlight[],
  lineIndex: number,
): React.ReactNode[] {
  const candidates: Array<{ start: number; end: number; signal: ReviewHighlight }> = [];
  for (const signal of highlights) {
    if (!signal.anchor) continue;
    let from = 0;
    while (from < line.length) {
      const start = line.indexOf(signal.anchor, from);
      if (start < 0) break;
      candidates.push({ start, end: start + signal.anchor.length, signal });
      from = start + Math.max(signal.anchor.length, 1);
    }
  }
  candidates.sort((a, b) => a.start - b.start || (a.signal.kind === "missing" ? -1 : 1) || (a.end - a.start) - (b.end - b.start));

  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (selected.some((current) => candidate.start < current.end && candidate.end > current.start)) continue;
    selected.push(candidate);
  }

  if (!selected.length) return [line];
  const output: React.ReactNode[] = [];
  let cursor = 0;
  for (const { start, end, signal } of selected) {
    if (start > cursor) output.push(line.slice(cursor, start));
    output.push(
      <span
        key={`${lineIndex}-${start}-${signal.id}`}
        className={`review-mark review-mark--${signal.kind}`}
        tabIndex={0}
        role="note"
        aria-label={`${signal.anchor}. ${signal.message}`}
        data-review-reason={signal.message}
        title={signal.message}
      >
        {line.slice(start, end)}
      </span>,
    );
    cursor = end;
  }
  if (cursor < line.length) output.push(line.slice(cursor));
  return output;
}

function isAllCapsHeading(trimmed: string): boolean {
  if (trimmed.length < 4) return false;
  if (!/^[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ0-9 \-():.,/]+$/.test(trimmed)) return false;
  if (!/[A-ZÁÉÍÓÚÇÃÕÂÊÔÀÈÌÒÙÜ]/.test(trimmed)) return false;
  if (/[a-záéíóúçãõâêôàèìòùü]/.test(trimmed)) return false;
  return true;
}

async function copyReportToClipboard(report: SalaReport): Promise<boolean> {
  const { heading, body: rawBody } = splitHeading(report.outputText);
  const body = rawBody;
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
