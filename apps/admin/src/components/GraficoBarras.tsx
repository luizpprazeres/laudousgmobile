/**
 * Gráfico de barras em HTML/CSS (sem JavaScript no navegador). Uma ou mais séries empilhadas;
 * os dias do período escolhido ficam em destaque. Tooltip no hover/foco de cada coluna.
 */
import type { Periodo } from "@/lib/data/tipos";
import { diaCurto } from "@/lib/formato";

interface Serie { nome: string; dados: number[]; cor?: string }

function teto(max: number, inteiro: boolean): number {
  if (max <= 0) return 1;
  if (inteiro && max <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of inteiro ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]) if (m * p >= max) return m * p;
  return 10 * p;
}

export function GraficoBarras(props: {
  rotulos: string[];
  series: Serie[];
  periodo?: Periodo;
  fmt?: (v: number) => string;
  fmtEixo?: (v: number) => string;
  exemplo?: boolean;
  alto?: boolean;
  rotuloX?: (r: string) => string;
  /** Força eixo só com inteiros (padrão: detecta pelos dados). */
  inteiro?: boolean;
}) {
  const { rotulos, series } = props;
  const n = rotulos.length;
  const totais = rotulos.map((_, i) => series.reduce((s, se) => s + (se.dados[i] ?? 0), 0));
  const inteiro = props.inteiro ?? series.every((se) => se.dados.every((v) => Number.isInteger(v)));
  const topo = teto(Math.max(0, ...totais), inteiro);
  const k = props.periodo === "today" ? 1 : props.periodo === "d7" ? 7 : n;
  const fmt = props.fmt ?? ((v: number) => String(v));
  const fmtEixo = props.fmtEixo ?? fmt;
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => f * topo).filter((v) => !inteiro || Number.isInteger(v));
  const passo = Math.max(1, Math.ceil(n / 8));
  const rx = props.rotuloX ?? ((r: string) => (/^\d{4}-\d{2}-\d{2}$/.test(r) ? diaCurto(r) : r));
  return (
    <div className={`gb${props.alto ? " tall" : ""}${props.exemplo ? " ex" : ""}`} role="img" aria-label={series.map((s) => s.nome).join(", ")}>
      <div className="gb-y">
        {/* medida invisível: dá à coluna a largura do maior rótulo (os visíveis são absolutos) */}
        <span className="gb-y-medida" aria-hidden="true">{fmtEixo(topo)}</span>
        {marcas.map((m) => <span key={m} style={{ bottom: `${(m / topo) * 100}%` }}>{fmtEixo(m)}</span>)}
      </div>
      <div className="gb-area">
        <div className="gb-plot">
          {marcas.filter((m) => m > 0).map((m) => <div key={m} className="gb-grid" style={{ bottom: `${(m / topo) * 100}%` }} />)}
          {rotulos.map((r, i) => {
            const on = i >= n - k;
            const ultimoNaoZero = series.reduce((u, se, si) => ((se.dados[i] ?? 0) > 0 ? si : u), -1);
            return (
              <div key={r + i} className={`gb-col${on ? " on" : ""}`} tabIndex={0}>
                {series.map((se, si) => {
                  const v = se.dados[i] ?? 0;
                  if (v <= 0) return null;
                  return <div key={se.nome} className={`gb-seg s${si}${si === ultimoNaoZero ? " top" : ""}`} style={{ height: `${(v / topo) * 100}%`, ...(se.cor ? { background: se.cor } : {}) }} />;
                })}
                <div className="gb-tip">
                  <b>{rx(r)}</b>
                  {series.map((se) => (
                    <div key={se.nome}>{se.nome}: {fmt(se.dados[i] ?? 0)}{props.exemplo ? " (fictício)" : ""}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="gb-x">
          {rotulos.map((r, i) => <span key={r + i}>{i % passo === 0 ? rx(r) : ""}</span>)}
        </div>
      </div>
    </div>
  );
}
