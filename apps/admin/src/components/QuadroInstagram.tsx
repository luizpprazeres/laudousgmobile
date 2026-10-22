"use client";
/**
 * Quadro do Instagram (story admin-instagram-quadro): S1–S4 lado a lado, cartões com as miniaturas,
 * arrastar e soltar nativo (HTML5) com alternativa por teclado, seleção e ações em lote.
 * Toda escrita vai para POST /admin/api/social/lote (sessão + origem conferidas no servidor);
 * depois de cada ação a página é recarregada do servidor (router.refresh) — o banco é a verdade.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type DragEvent, type MutableRefObject, type ReactNode } from "react";
import { comBase } from "@/lib/base";
import { identidade, LIMITE_LOTE_IDS, mensagemLote, ordemArrastando, rotuloDia, type AcaoLote, type CartaoQuadro, type DiaQuadro, type SemanaQuadro } from "@/lib/social/quadro";
import { ROTULO_FORMATO } from "@/lib/social/tipos";

type Arrasto = { tipo: "post"; id: string } | { tipo: "slide"; id: string; posicao: number };
type Aviso = { tipo: "ok" | "erro"; texto: string; itens?: { id: string; motivo: string }[] };

class ErroSessao extends Error {}

async function postarLote(corpo: object): Promise<Record<string, unknown>> {
  const r = await fetch(comBase("/api/social/lote"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(corpo),
    credentials: "same-origin",
    cache: "no-store",
  });
  if (r.status === 404) throw new ErroSessao("sessao");
  if (!r.ok) throw new Error("pedido");
  return (await r.json()) as Record<string, unknown>;
}

const MSG_SESSAO = "A sessão expirou ou o pedido foi recusado. Recarregue a página e entre de novo.";
const MSG_REDE = "Não deu para falar com o servidor. Confira a conexão e tente de novo.";
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

interface Ctx {
  sel: Set<string>;
  alternar: (id: string) => void;
  ocupado: boolean;
  dias: DiaQuadro[];
  mover: (c: CartaoQuadro, data: string, hora?: string) => void;
  reordenar: (c: CartaoQuadro, ordem: number[], foco?: number) => void;
  abrir: (c: CartaoQuadro, i: number, origem: HTMLElement) => void;
  arrasto: MutableRefObject<Arrasto | null>;
  arrastando: string | null;
  setArrastando: (id: string | null) => void;
  alvoSlide: string | null;
  setAlvoSlide: (k: string | null) => void;
}

export function QuadroInstagram({ semanas }: { semanas: SemanaQuadro[] }) {
  const router = useRouter();
  const [atualizando, iniciar] = useTransition();
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [confirmar, setConfirmar] = useState<AcaoLote | null>(null);
  const [trabalhando, setTrabalhando] = useState(false);
  const [alvoDia, setAlvoDia] = useState<string | null>(null);
  const [alvoSlide, setAlvoSlide] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [luz, setLuz] = useState<{ id: string; i: number } | null>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const origemLuz = useRef<HTMLElement | null>(null);

  const dias = useMemo(() => semanas.flatMap((s) => s.dias), [semanas]);
  const todos = useMemo(() => dias.flatMap((d) => [...d.feed, ...d.stories]), [dias]);
  const porId = useMemo(() => new Map(todos.map((c) => [c.id, c])), [todos]);
  const prontos = useMemo(() => todos.filter((c) => c.pronto), [todos]);
  const ocupado = trabalhando || atualizando;

  // Seleção só com o que ainda existe no quadro (depois de navegar ou recarregar).
  useEffect(() => {
    setSel((s) => {
      const n = new Set([...s].filter((id) => porId.has(id)));
      return n.size === s.size ? s : n;
    });
  }, [porId]);

  const recarregar = () => iniciar(() => router.refresh());

  async function tarefa(f: () => Promise<void>) {
    if (trabalhando) return;
    setTrabalhando(true);
    try {
      await f();
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof ErroSessao ? MSG_SESSAO : MSG_REDE });
    } finally {
      setTrabalhando(false);
      recarregar();
    }
  }

  const mover = (c: CartaoQuadro, data: string, hora?: string) =>
    tarefa(async () => {
      if (!c.editavel) {
        setAviso({ tipo: "erro", texto: `${c.id}: ${mensagemLote("mover", "status")}` });
        return;
      }
      const r = await postarLote({ acao: "mover", id: c.id, de: c.scheduled_at, data, hora: hora ?? c.hora });
      const res = String(r.resultado ?? "falha");
      setAviso(res === "ok" ? { tipo: "ok", texto: `${c.id} agora é ${rotuloDia(data)} às ${hora ?? c.hora}.` } : { tipo: "erro", texto: `${c.id}: ${mensagemLote("mover", res)}` });
    });

  const reordenar = (c: CartaoQuadro, ordem: number[], foco?: number) => {
    if (identidade(ordem)) return;
    void tarefa(async () => {
      if (!c.editavel) {
        setAviso({ tipo: "erro", texto: `${c.id}: ${mensagemLote("reordenar", "status")}` });
        return;
      }
      const r = await postarLote({ acao: "reordenar", id: c.id, ordem });
      const res = String(r.resultado ?? "falha");
      setAviso(res === "ok" ? { tipo: "ok", texto: `Nova ordem dos slides de ${c.id}: ${ordem.join(", ")} → 1 a ${ordem.length}.` } : { tipo: "erro", texto: `${c.id}: ${mensagemLote("reordenar", res)}` });
      if (res === "ok" && foco !== undefined) setLuz((l) => (l && l.id === c.id ? { ...l, i: foco } : l));
    });
  };

  const executarLote = (acao: AcaoLote) =>
    tarefa(async () => {
      setConfirmar(null);
      const ids = [...sel];
      const resultados: { id: string; resultado: string }[] = [];
      for (let k = 0; k < ids.length; k += LIMITE_LOTE_IDS) {
        const r = await postarLote({ acao, ids: ids.slice(k, k + LIMITE_LOTE_IDS) });
        resultados.push(...((r.resultados as { id: string; resultado: string }[] | undefined) ?? []));
      }
      const feitos = resultados.filter((r) => r.resultado === "ok");
      const falhas = resultados.filter((r) => r.resultado !== "ok");
      const verbo = acao === "aprovar" ? "aprovados" : "de volta para rascunho";
      setAviso({
        tipo: falhas.length ? "erro" : "ok",
        texto: `${feitos.length} de ${ids.length} ${verbo}.${falhas.length ? ` ${plural(falhas.length, "post não mudou", "posts não mudaram")}:` : ""}`,
        itens: falhas.map((f) => ({ id: f.id, motivo: mensagemLote(acao, f.resultado) })),
      });
      // Quem deu certo sai da seleção; quem não deu fica, para corrigir e tentar de novo.
      setSel(new Set(falhas.map((f) => f.id)));
    });

  const alternar = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const marcarVarios = (ids: string[]) =>
    setSel((s) => {
      const todosJa = ids.length > 0 && ids.every((id) => s.has(id));
      const n = new Set(s);
      for (const id of ids) {
        if (todosJa) n.delete(id);
        else n.add(id);
      }
      return n;
    });

  const abrir = (c: CartaoQuadro, i: number, origem: HTMLElement) => {
    origemLuz.current = origem;
    setLuz({ id: c.id, i });
  };
  const fecharLuz = () => {
    setLuz(null);
    origemLuz.current?.focus();
  };

  // ---------- soltar no dia ----------
  const sobreDia = (d: DiaQuadro) => (e: DragEvent) => {
    const a = arrasto.current;
    if (a?.tipo !== "post" || d.passado) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (alvoDia !== d.data) setAlvoDia(d.data);
  };
  const saiuDia = (d: DiaQuadro) => (e: DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null) && alvoDia === d.data) setAlvoDia(null);
  };
  const soltouDia = (d: DiaQuadro) => (e: DragEvent) => {
    const a = arrasto.current;
    setAlvoDia(null);
    if (a?.tipo !== "post") return;
    e.preventDefault();
    arrasto.current = null;
    setArrastando(null);
    const c = porId.get(a.id);
    if (c && c.data !== d.data) mover(c, d.data);
  };

  const ctx: Ctx = { sel, alternar, ocupado, dias, mover, reordenar, abrir, arrasto, arrastando, setArrastando, alvoSlide, setAlvoSlide };
  const selecionados = [...sel].map((id) => porId.get(id)).filter((c): c is CartaoQuadro => !!c);
  const nSel = selecionados.length;
  const manuaisSel = selecionados.filter((c) => c.manual).length;
  const prontosSel = selecionados.filter((c) => c.pronto).length;
  const cartaoLuz = luz ? porId.get(luz.id) : undefined;

  return (
    <div className="qd" aria-busy={ocupado}>
      <div className="qd-ferramentas">
        <button type="button" className="botao sec" onClick={() => marcarVarios(prontos.map((c) => c.id))} disabled={!prontos.length}>
          Selecionar tudo que está pronto ({prontos.length})
        </button>
        {nSel ? <button type="button" className="botao sec" onClick={() => setSel(new Set())}>Limpar seleção</button> : null}
        <span className="qd-dica">
          Arraste um rascunho pela alça <span aria-hidden="true">⋮⋮</span> para outro dia, ou use o dia e a hora no cartão. Arraste as miniaturas para reordenar o carrossel (no teclado: abra a miniatura e use “Mover”).
        </span>
        {ocupado ? <span className="qd-status" role="status">Salvando…</span> : null}
      </div>

      {aviso ? (
        <div className={`callout${aviso.tipo === "erro" ? " warn" : ""} qd-aviso`} role={aviso.tipo === "erro" ? "alert" : "status"}>
          <div className="qd-aviso-cab">
            <b>{aviso.texto}</b>
            <button type="button" className="qd-x" onClick={() => setAviso(null)} aria-label="Fechar aviso">×</button>
          </div>
          {aviso.itens?.length ? (
            <ul className="ig-lista">
              {aviso.itens.map((i) => (
                <li key={i.id}><Link href={`/instagram/${i.id}`}><code>{i.id}</code></Link>: {i.motivo}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="qd-quadro">
        {semanas.map((s) => {
          const cartoes = s.dias.flatMap((d) => [...d.feed, ...d.stories]);
          const ids = cartoes.map((c) => c.id);
          const tudo = ids.length > 0 && ids.every((id) => sel.has(id));
          return (
            <section key={s.rotulo} className="qd-semana" aria-labelledby={`qd-${s.rotulo}`}>
              <header className="qd-semana-cab">
                <div>
                  <h2 id={`qd-${s.rotulo}`}>{s.rotulo}</h2>
                  <span className="qd-sub">{s.intervalo} · {plural(cartoes.length, "post", "posts")} · {cartoes.filter((c) => c.pronto).length} prontos</span>
                </div>
                <button type="button" className="botao sec" onClick={() => marcarVarios(ids)} disabled={!ids.length} aria-pressed={tudo}>
                  {tudo ? "Desmarcar semana" : "Selecionar semana"}
                </button>
              </header>
              {s.dias.map((d) => (
                <section
                  key={d.data}
                  className={`qd-dia${d.hoje ? " hoje" : ""}${d.passado ? " passado" : ""}${alvoDia === d.data ? " alvo" : ""}`}
                  aria-label={rotuloDia(d.data)}
                  onDragOver={sobreDia(d)}
                  onDragLeave={saiuDia(d)}
                  onDrop={soltouDia(d)}
                >
                  <h3 className="qd-dia-cab">{d.rotulo}{d.hoje ? <span className="qd-hoje">hoje</span> : null}</h3>
                  {d.feed.map((c) => <Cartao key={c.id} c={c} ctx={ctx} />)}
                  {d.stories.length ? (
                    <div className="qd-stories" aria-label={`Stories de ${d.rotulo}`}>
                      {d.stories.map((c) => <Cartao key={c.id} c={c} ctx={ctx} story />)}
                    </div>
                  ) : null}
                  {!d.feed.length && !d.stories.length ? <p className="qd-vazio">{d.passado ? "—" : "Solte um rascunho aqui"}</p> : null}
                </section>
              ))}
            </section>
          );
        })}
      </div>

      {nSel ? (
        <div className="qd-lote" role="region" aria-label="Ações em lote">
          {confirmar === "aprovar" ? (
            <>
              <span role="alert">
                <b>Aprovar {plural(nSel, "post", "posts")}?</b> Eles serão publicados automaticamente nos horários marcados.
                {manuaisSel ? <> {plural(manuaisSel, "story manual", "stories manuais")} você publica pelo app.</> : null}
                {prontosSel < nSel ? <> {nSel - prontosSel} não {nSel - prontosSel === 1 ? "passa" : "passam"} nas regras agora e não {nSel - prontosSel === 1 ? "será aprovado" : "serão aprovados"}.</> : null}
              </span>
              <button type="button" className="botao" autoFocus onClick={() => executarLote("aprovar")} disabled={ocupado}>Aprovar {plural(nSel, "post", "posts")}</button>
              <button type="button" className="botao sec" onClick={() => setConfirmar(null)}>Cancelar</button>
            </>
          ) : confirmar === "rascunho" ? (
            <>
              <span role="alert"><b>Voltar {plural(nSel, "post", "posts")} para rascunho?</b> Eles saem da fila de publicação até serem aprovados de novo.</span>
              <button type="button" className="botao" autoFocus onClick={() => executarLote("rascunho")} disabled={ocupado}>Voltar {plural(nSel, "post", "posts")}</button>
              <button type="button" className="botao sec" onClick={() => setConfirmar(null)}>Cancelar</button>
            </>
          ) : (
            <>
              <span><b>{plural(nSel, "selecionado", "selecionados")}</b> · {prontosSel} prontos para aprovar</span>
              <button type="button" className="botao" onClick={() => setConfirmar("aprovar")} disabled={ocupado}>Aprovar selecionados</button>
              <button type="button" className="botao sec" onClick={() => setConfirmar("rascunho")} disabled={ocupado}>Voltar para rascunho</button>
              <button type="button" className="botao sec" onClick={() => setSel(new Set())}>Limpar seleção</button>
            </>
          )}
        </div>
      ) : null}

      {cartaoLuz && luz ? <Lightbox key={cartaoLuz.id} c={cartaoLuz} i={Math.min(luz.i, cartaoLuz.slides.length - 1)} ir={(i) => setLuz({ id: cartaoLuz.id, i })} fechar={fecharLuz} ctx={ctx} /> : null}
    </div>
  );
}

// ---------- cartão ----------

function Cartao({ c, ctx, story = false }: { c: CartaoQuadro; ctx: Ctx; story?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const marcado = ctx.sel.has(c.id);
  const n = c.slides.length;
  const reordenavel = c.editavel && n > 1;
  const comecar = (e: DragEvent) => {
    if (!c.editavel || ctx.ocupado) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", c.id);
    if (ref.current) e.dataTransfer.setDragImage(ref.current, 16, 16);
    ctx.arrasto.current = { tipo: "post", id: c.id };
    ctx.setArrastando(c.id);
  };
  const terminar = () => {
    ctx.arrasto.current = null;
    ctx.setArrastando(null);
  };
  const classe = ["qd-card", story ? "story" : "", `st-${c.status}`, c.selo.rotulo === "Atrasado" ? "st-atrasado" : "", marcado ? "marcado" : "", ctx.arrastando === c.id ? "arrastando" : ""].filter(Boolean).join(" ");

  return (
    <article ref={ref} className={classe} aria-label={`${c.id}, ${ROTULO_FORMATO[c.formato]}, ${c.selo.rotulo}`}>
      <div className="qd-card-cab">
        <input type="checkbox" checked={marcado} onChange={() => ctx.alternar(c.id)} aria-label={`Selecionar ${c.id}`} />
        <div
          className={`qd-alca${c.editavel ? "" : " travada"}`}
          draggable={c.editavel && !ctx.ocupado}
          onDragStart={comecar}
          onDragEnd={terminar}
          title={c.editavel ? "Arraste para outro dia" : "Aprovado não se move: volte para rascunho antes"}
        >
          {c.editavel ? <span className="qd-grip" aria-hidden="true">⋮⋮</span> : null}
          <code>{c.id}</code>
          {!story ? <span className="qd-fmt">{ROTULO_FORMATO[c.formato]}</span> : null}
        </div>
        <span className={`tag ${c.selo.classe}`} title={c.selo.dica}>{c.selo.rotulo}</span>
      </div>

      <ul className={`qd-minis${story ? " story" : ""}`} aria-label={`Slides de ${c.id}`}>
        {c.slides.map((s, i) => {
          const chave = `${c.id}#${s.posicao}`;
          return (
            <li key={s.posicao} className={ctx.alvoSlide === chave ? "alvo" : undefined}>
              <a
                href={s.url ?? comBase(`/instagram/${c.id}`)}
                className={`qd-mini${s.url ? "" : " falta"}`}
                draggable={reordenavel && !ctx.ocupado}
                aria-label={`Slide ${s.posicao} de ${n}${s.url ? "" : " (sem imagem)"}: abrir grande`}
                title={s.url ? s.alt || `Slide ${s.posicao}` : `Sem imagem: ${s.texto}`}
                onClick={(e) => {
                  e.preventDefault();
                  ctx.abrir(c, i, e.currentTarget);
                }}
                onDragStart={(e) => {
                  e.stopPropagation();
                  if (!reordenavel || ctx.ocupado) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", chave);
                  ctx.arrasto.current = { tipo: "slide", id: c.id, posicao: s.posicao };
                }}
                onDragEnd={() => {
                  ctx.arrasto.current = null;
                  ctx.setAlvoSlide(null);
                }}
                onDragOver={(e) => {
                  const a = ctx.arrasto.current;
                  if (a?.tipo !== "slide" || a.id !== c.id) return;
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  if (ctx.alvoSlide !== chave) ctx.setAlvoSlide(chave);
                }}
                onDrop={(e) => {
                  const a = ctx.arrasto.current;
                  if (a?.tipo !== "slide" || a.id !== c.id) return;
                  e.preventDefault();
                  e.stopPropagation();
                  ctx.arrasto.current = null;
                  ctx.setAlvoSlide(null);
                  ctx.reordenar(c, ordemArrastando(n, a.posicao, s.posicao));
                }}
              >
                {s.url ? <img src={s.url} alt="" loading="lazy" draggable={false} /> : <span aria-hidden="true">{s.posicao}</span>}
                {n > 1 ? <span className="qd-num" aria-hidden="true">{s.posicao}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>

      <Link href={`/instagram/${c.id}`} className="qd-tit" title="Abrir no editor">{c.titulo}</Link>
      <Quando c={c} ctx={ctx} />
      {c.faltam ? <span className="qd-alerta" role="note">{c.faltam === n ? "Sem imagem" : `Falta imagem em ${plural(c.faltam, "slide", "slides")}`}</span> : null}
      {c.editavel && !c.pronto && !c.faltam && c.bloqueio ? <span className="qd-alerta">{c.bloqueio}</span> : null}
      {c.erro ? <span className="ig-chip-erro">{c.erro}</span> : null}
      {c.link ? <a className="ig-chip-ver" href={c.link} target="_blank" rel="noreferrer noopener">Ver no Instagram ↗</a> : null}
      {!c.editavel && (c.status === "approved" || c.status === "failed") ? <span className="qd-trava">Para mover ou reordenar, volte para rascunho.</span> : null}
    </article>
  );
}

/** Dia e hora: em rascunho é o próprio seletor (alternativa por teclado ao arrastar). */
function Quando({ c, ctx }: { c: CartaoQuadro; ctx: Ctx }) {
  const [data, setData] = useState(c.data);
  const [hora, setHora] = useState(c.hora);
  useEffect(() => {
    setData(c.data);
    setHora(c.hora);
  }, [c.data, c.hora]);
  const texto = `${rotuloDia(c.data)} · ${c.hora}`;
  if (!c.editavel) return <span className="qd-quando">{texto}</span>;
  const mudou = data !== c.data || hora !== c.hora;
  const aplicar = () => {
    if (mudou && hora && !ctx.ocupado) ctx.mover(c, data, hora);
  };
  return (
    <details className="qd-quando-det">
      <summary className="qd-quando" title="Trocar dia ou hora">{texto} <span aria-hidden="true">▾</span></summary>
      <div className="qd-quando-form">
        <label>
          Dia
          <select value={data} onChange={(e) => setData(e.target.value)}>
            {ctx.dias.map((d) => (
              <option key={d.data} value={d.data} disabled={d.passado && d.data !== c.data}>{d.rotulo}</option>
            ))}
          </select>
        </label>
        <label>
          Hora
          <input type="time" step={300} value={hora} onChange={(e) => setHora(e.target.value)} onKeyDown={(e) => (e.key === "Enter" ? (e.preventDefault(), aplicar()) : undefined)} required />
        </label>
        <button type="button" className="botao" onClick={aplicar} disabled={!mudou || !hora || ctx.ocupado}>Aplicar</button>
      </div>
    </details>
  );
}

// ---------- lightbox ----------

function Lightbox({ c, i, ir, fechar, ctx }: { c: CartaoQuadro; i: number; ir: (i: number) => void; fechar: () => void; ctx: Ctx }) {
  const ref = useRef<HTMLDialogElement>(null);
  const n = c.slides.length;
  const s = c.slides[i];
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const fecharJa = () => ref.current?.close();
  const trocar = (para: number) => ctx.reordenar(c, ordemArrastando(n, i + 1, para + 1), para);
  if (!s) return null;
  const botaoIr = (para: number, rotulo: string, simbolo: ReactNode) => (
    <button type="button" className="qd-luz-seta" onClick={() => ir(para)} disabled={para < 0 || para >= n} aria-label={rotulo}>{simbolo}</button>
  );
  return (
    <dialog
      ref={ref}
      className={`qd-luz${c.formato === "story" ? " story" : ""}`}
      aria-labelledby="qd-luz-tit"
      onClose={fechar}
      onClick={(e) => (e.target === ref.current ? fecharJa() : undefined)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && i > 0) ir(i - 1);
        if (e.key === "ArrowRight" && i < n - 1) ir(i + 1);
      }}
    >
      <div className="qd-luz-caixa">
        <div className="qd-luz-cab">
          <b id="qd-luz-tit"><code>{c.id}</code> · {c.titulo}</b>
          <span className="qd-sub">{n > 1 ? `Slide ${i + 1} de ${n}` : ROTULO_FORMATO[c.formato]} · {rotuloDia(c.data)} {c.hora}</span>
          <button type="button" className="qd-x" onClick={fecharJa} aria-label="Fechar" autoFocus>×</button>
        </div>
        <div className="qd-luz-corpo">
          {n > 1 ? botaoIr(i - 1, "Slide anterior", "‹") : null}
          <figure>
            {s.url ? <img src={s.url} alt={s.alt || `Slide ${i + 1}`} /> : <div className="ig-sem-img"><span>Sem imagem. {s.texto}</span></div>}
            {s.alt ? <figcaption>{s.alt}</figcaption> : null}
          </figure>
          {n > 1 ? botaoIr(i + 1, "Próximo slide", "›") : null}
        </div>
        <div className="qd-luz-pe">
          {n > 1 && c.editavel ? (
            <>
              <button type="button" className="botao sec" onClick={() => trocar(i - 1)} disabled={i === 0 || ctx.ocupado}>← Mover para a posição {i}</button>
              <button type="button" className="botao sec" onClick={() => trocar(i + 1)} disabled={i === n - 1 || ctx.ocupado}>Mover para a posição {i + 2} →</button>
            </>
          ) : n > 1 ? <span className="qd-trava">Para reordenar, volte para rascunho.</span> : null}
          <Link href={`/instagram/${c.id}`} className="botao sec">Abrir no editor</Link>
        </div>
      </div>
    </dialog>
  );
}
