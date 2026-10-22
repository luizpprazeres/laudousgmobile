/** Peças visuais do painel — mesma marcação do protótipo aprovado. */
import type { ReactNode } from "react";
import { goCurto } from "@/lib/data/exemplo";
import type { Metrica } from "@/lib/data/tipos";
import { int } from "@/lib/formato";

const IconeAlerta = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v5M12 18v.01" />
  </svg>
);

export function Tag({ m }: { m: Metrica<unknown> }) {
  return m.origem === "real" ? (
    <span className="tag real" title={`Fonte: ${m.fonte}`}>Real</span>
  ) : (
    <span className="tag exm" title={`Aguardando GO: ${m.go}`}>Fictício</span>
  );
}

export function FaixaExemplo({ go }: { go: string }) {
  return (
    <div className="ex-band">
      <span className="tarja"><IconeAlerta />Dado fictício</span>
      <span className="go">Aguardando GO: {go}</span>
    </div>
  );
}

function Rodape({ m, extra }: { m: Metrica<unknown>; extra?: ReactNode }) {
  return (
    <div className="card-foot">
      {m.origem === "real" ? (
        <><span>Fonte:</span> <code>{m.fonte}</code></>
      ) : (
        <><span>Fonte quando existir:</span> <code>{m.fonte_futura}</code></>
      )}
      {m.nota ? <span>· {m.nota}</span> : null}
      {extra ? <span>· {extra}</span> : null}
    </div>
  );
}

export function Cartao(props: { titulo: string; sub?: ReactNode; m?: Metrica<unknown>; extra?: ReactNode; children: ReactNode; className?: string }) {
  const { m } = props;
  const ex = m?.origem === "exemplo";
  return (
    <section className={`card${ex ? " ex" : ""}${props.className ? " " + props.className : ""}`}>
      {m && m.origem === "exemplo" ? <FaixaExemplo go={m.go} /> : null}
      <div className="card-body">
        <div className="card-head">
          <div>
            <h3>{props.titulo}</h3>
            {props.sub ? <div className="sub">{props.sub}</div> : null}
          </div>
          {m ? <Tag m={m} /> : null}
        </div>
        {props.children}
      </div>
      {m ? <Rodape m={m} extra={props.extra} /> : null}
    </section>
  );
}

export function Kpi(props: { rotulo: string; valor: ReactNode; meta?: ReactNode; m: Metrica<unknown> }) {
  const { m } = props;
  const ex = m.origem === "exemplo";
  return (
    <div className={`card kpi${ex ? " ex" : ""}`} title={ex ? `Dado fictício — aguardando GO: ${m.go}` : `Fonte: ${m.fonte}`}>
      <div className="label"><span>{props.rotulo}</span><Tag m={m} /></div>
      <div className="value">{props.valor}</div>
      {props.meta ? <div className="meta">{props.meta}</div> : null}
      {m.origem === "exemplo" ? <div className="go-line">Aguardando GO: {goCurto(m.go)}</div> : null}
    </div>
  );
}

export function Barras({ itens, fmt }: { itens: [string, number][]; fmt?: (v: number) => string }) {
  const max = Math.max(1, ...itens.map((i) => i[1]));
  return (
    <div className="bars">
      {itens.map(([nome, v]) => {
        const txt = fmt ? fmt(v) : int(v);
        return (
          <div className="bar-row" key={nome} title={`${nome}: ${txt}`}>
            <span className="name">{nome}</span>
            <span className="track"><span className="fill" style={{ width: `${Math.max(0.5, (v / max) * 100)}%`, display: "block" }} /></span>
            <span className="num">{txt}</span>
          </div>
        );
      })}
    </div>
  );
}

export type Celula = ReactNode | { v: ReactNode; ex: true; go: string };
const ehEx = (c: Celula): c is { v: ReactNode; ex: true; go: string } => !!c && typeof c === "object" && "ex" in (c as object);

export function Tabela({ cab, linhas, numericas = [] }: { cab: string[]; linhas: Celula[][]; numericas?: number[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{cab.map((c, i) => <th key={c} className={numericas.includes(i) ? "num" : undefined}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((l, li) => (
            <tr key={li}>
              {l.map((c, i) => {
                const cls = [numericas.includes(i) ? "num" : "", ehEx(c) ? "exc" : ""].filter(Boolean).join(" ") || undefined;
                return ehEx(c) ? (
                  <td key={i} className={cls} title={`Dado fictício — ${c.go}`}>{c.v}</td>
                ) : (
                  <td key={i} className={cls}>{c}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Cabecalho({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{titulo}</h1>
          <p>{children}</p>
        </div>
      </div>
      <div className="legend-bar">
        <span className="tag real">Real</span><span>lido da fonte, só agregados (leitura)</span>
        <span className="tag exm">Fictício</span><span>número de exemplo com tarja; o selo diz qual GO do plano falta</span>
      </div>
    </>
  );
}

export const Secao = ({ children }: { children: ReactNode }) => <div className="section-title">{children}</div>;
