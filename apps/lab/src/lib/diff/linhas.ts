/**
 * Diff por linha (LCS) com destaque por palavra dentro da linha alterada.
 *
 * Para laudo, o diff por LINHA é o certo: cada frase é uma unidade clínica, e
 * um diff por caractere transformaria "trocou a frase" numa sopa ilegível.
 * Dentro de uma linha que mudou, aí sim vale destacar palavra a palavra.
 *
 * Sem dependência externa — o algoritmo é pequeno e o texto é curto (laudos de
 * ~1-4 mil caracteres).
 */

export type LinhaDiff =
  | { tipo: "igual"; texto: string }
  | { tipo: "removida"; texto: string }
  | { tipo: "adicionada"; texto: string }
  | { tipo: "alterada"; antes: string; depois: string; palavras: PalavraDiff[] };

export type PalavraDiff = { tipo: "igual" | "removida" | "adicionada"; texto: string };

/** Matriz LCS clássica. O(n·m) — suficiente para dezenas de linhas. */
function lcs<T>(a: T[], b: T[], iguais: (x: T, y: T) => boolean): number[][] {
  const m = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      m[i]![j] = iguais(a[i]!, b[j]!)
        ? (m[i + 1]![j + 1] ?? 0) + 1
        : Math.max(m[i + 1]![j] ?? 0, m[i]![j + 1] ?? 0);
    }
  }
  return m;
}

function normalizar(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Duas linhas são "a mesma frase editada" se compartilham parte do conteúdo. */
function parecidas(a: string, b: string): boolean {
  const pa = new Set(normalizar(a).split(" ").filter((w) => w.length > 3));
  const pb = new Set(normalizar(b).split(" ").filter((w) => w.length > 3));
  if (pa.size === 0 || pb.size === 0) return false;
  let comuns = 0;
  for (const w of pa) if (pb.has(w)) comuns++;
  return comuns / Math.min(pa.size, pb.size) >= 0.5;
}

export function diffPalavras(antes: string, depois: string): PalavraDiff[] {
  const a = antes.split(/(\s+)/).filter((x) => x !== "");
  const b = depois.split(/(\s+)/).filter((x) => x !== "");
  const m = lcs(a, b, (x, y) => x === y);
  const out: PalavraDiff[] = [];
  let i = 0;
  let j = 0;
  const push = (tipo: PalavraDiff["tipo"], texto: string) => {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.tipo === tipo) ultimo.texto += texto;
    else out.push({ tipo, texto });
  };
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { push("igual", a[i]!); i++; j++; }
    else if ((m[i + 1]?.[j] ?? 0) >= (m[i]?.[j + 1] ?? 0)) { push("removida", a[i]!); i++; }
    else { push("adicionada", b[j]!); j++; }
  }
  while (i < a.length) push("removida", a[i++]!);
  while (j < b.length) push("adicionada", b[j++]!);
  return out;
}

export function diffLinhas(gerado: string, final: string): LinhaDiff[] {
  const a = gerado.split("\n");
  const b = final.split("\n");
  const m = lcs(a, b, (x, y) => x === y);
  const out: LinhaDiff[] = [];
  let i = 0;
  let j = 0;

  const pendentesA: string[] = [];
  const pendentesB: string[] = [];

  /**
   * Ao fechar um bloco de divergência, tenta casar removidas com adicionadas
   * que sejam a MESMA frase editada — é o que produz "antes/depois" em vez de
   * duas linhas soltas.
   */
  const fecharBloco = () => {
    const usadasB = new Set<number>();
    for (const linhaA of pendentesA) {
      const idx = pendentesB.findIndex((lb, k) => !usadasB.has(k) && parecidas(linhaA, lb));
      if (idx >= 0) {
        usadasB.add(idx);
        out.push({
          tipo: "alterada",
          antes: linhaA,
          depois: pendentesB[idx]!,
          palavras: diffPalavras(linhaA, pendentesB[idx]!),
        });
      } else {
        out.push({ tipo: "removida", texto: linhaA });
      }
    }
    pendentesB.forEach((lb, k) => {
      if (!usadasB.has(k)) out.push({ tipo: "adicionada", texto: lb });
    });
    pendentesA.length = 0;
    pendentesB.length = 0;
  };

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      fecharBloco();
      out.push({ tipo: "igual", texto: a[i]! });
      i++; j++;
    } else if ((m[i + 1]?.[j] ?? 0) >= (m[i]?.[j + 1] ?? 0)) {
      pendentesA.push(a[i]!); i++;
    } else {
      pendentesB.push(b[j]!); j++;
    }
  }
  while (i < a.length) pendentesA.push(a[i++]!);
  while (j < b.length) pendentesB.push(b[j++]!);
  fecharBloco();

  return out;
}

/** Resumo de uma correção, para a lista e para os cartões. */
export function resumirDiff(d: LinhaDiff[]) {
  return {
    alteradas: d.filter((l) => l.tipo === "alterada").length,
    removidas: d.filter((l) => l.tipo === "removida").length,
    adicionadas: d.filter((l) => l.tipo === "adicionada").length,
    iguais: d.filter((l) => l.tipo === "igual").length,
  };
}
