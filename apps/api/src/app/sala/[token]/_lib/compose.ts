/**
 * Monta o texto exibido/copiado: texto do MÉDICO + acréscimos da Sala (frases
 * inseridas e anotações da auxiliar). Marca linha a linha o que é acréscimo,
 * porque a revisão médica cobre só o texto do médico — nunca os acréscimos.
 */
export type AdditionPlacement = "after-title" | "in-conclusion" | "footer";
export type Addition = { text: string; placement: AdditionPlacement };

export type Composed = {
  text: string;
  /** added[i] = a linha i de `text` é acréscimo da Sala (não revisado). */
  added: boolean[];
  additionCount: number;
};

function conclusionInfo(body: string): { lastN: number; hasConclusion: boolean } {
  const match = body.match(/CONCLUS[ÃA]O\s*:/i);
  if (!match || match.index === undefined) return { lastN: 0, hasConclusion: false };
  const tail = body.slice(match.index);
  const numbers = [...tail.matchAll(/^\s*(\d+)\)\s/gm)];
  if (numbers.length === 0) return { lastN: 0, hasConclusion: true };
  return { lastN: Math.max(...numbers.map((m) => parseInt(m[1] ?? "0", 10))), hasConclusion: true };
}

/**
 * Mesmo resultado textual do antigo `renderWithAnnotations(body, inserted, annotations)`:
 * frases "after-title" antes do corpo; "in-conclusion" numeradas após a
 * conclusão (ou no rodapé, sem conclusão); "footer" no fim.
 */
export function composeReport(
  body: string,
  inserted: readonly Addition[],
  annotations: readonly Addition[],
): Composed {
  const lines: string[] = [];
  const added: boolean[] = [];
  const push = (text: string, isAdded: boolean) => {
    for (const line of text.split("\n")) {
      lines.push(line);
      added.push(isAdded);
    }
  };

  const afterTitle = inserted.filter((p) => p.placement === "after-title").map((p) => p.text);
  const inConclusion = [
    ...inserted.filter((p) => p.placement === "in-conclusion").map((p) => p.text),
    ...annotations.filter((a) => a.placement === "in-conclusion").map((a) => a.text),
  ];
  const footer = [
    ...inserted.filter((p) => p.placement === "footer").map((p) => p.text),
    ...annotations.filter((a) => a.placement === "footer").map((a) => a.text),
  ];
  const info = conclusionInfo(body);
  const additionCount = afterTitle.length + inConclusion.length + footer.length;
  if (!info.hasConclusion) footer.push(...inConclusion);

  afterTitle.forEach((t, i) => {
    if (i > 0) push("", false);
    push(t, true);
  });
  if (afterTitle.length > 0) push("", false);

  push(body, false);

  if (info.hasConclusion) {
    inConclusion.forEach((t, i) => push(`${info.lastN + i + 1}) ${t}`, true));
  }

  if (footer.length > 0) {
    push("", false);
    footer.forEach((t, i) => {
      if (i > 0) push("", false);
      push(t, true);
    });
  }

  return {
    text: lines.join("\n"),
    added,
    additionCount,
  };
}
