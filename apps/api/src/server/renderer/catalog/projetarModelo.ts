/**
 * O modelo de uma categoria projetado COMO LINHAS — corpo e conclusão, na
 * ordem do laudo, com a seção de cada uma.
 *
 * Existe uma função por origem porque as duas origens são mesmo diferentes:
 *
 *   catálogo ESCRITO   → tem documento estruturado; as linhas saem dos
 *                        segmentos, e a frase com `{placeholders}` vem da
 *                        variante que produziu cada segmento
 *   modelo DERIVADO    → tem só o laudo renderizado; as linhas são as linhas,
 *                        e o dado do exame é a lacuna `____` que o renderer
 *                        imprimiu
 *
 * A tela não distingue: recebe `LinhaDoModelo` das duas.
 */
import type { LinhaDoModelo, AchadoProjetado, VariantDescription, DadoDaFrase } from "./describe";
import { linhasDoLaudo } from "./modeloNormal";
import type { Catalog, ReportDoc, SlotContext } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function motivoNaoEditavel(v: { montar?: unknown; personalizavel?: boolean }): string | undefined {
  if (v.personalizavel === false) {
    return "Esta frase é montada pelo sistema a partir dos dados do exame e não existe como texto fixo.";
  }
  if (v.montar) {
    return "É montada pelo sistema a partir dos dados do exame (listas, cálculos ou concordância).";
  }
  return undefined;
}

/**
 * Linhas a partir de um documento já construído.
 *
 * O texto exibido é a `frase` da variante — não o texto do segmento. O
 * segmento já está interpolado ("DBP de 78 mm"), e o que o médico edita é a
 * redação ("DBP de {dbp} mm"). Quando a variante não tem frase (é montada), o
 * segmento serve de amostra: melhor mostrar como sai do que não mostrar nada.
 */
export function linhasDeDocumento<F>(doc: ReportDoc, catalog: Catalog<F>): LinhaDoModelo[] {
  const porId = new Map(catalog.slots.map((s) => [s.id, s]));
  const vistos = new Set<string>();
  const out: LinhaDoModelo[] = [];

  for (const seg of doc.segments) {
    // O gemelar repete o mesmo slot por feto; no modelo ele aparece uma vez.
    const chave = `${seg.kind}|${seg.slotId}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const slot = porId.get(seg.slotId);
    const variante = slot?.variantes.find((v) => v.id === seg.variantId);
    const motivo = variante ? motivoNaoEditavel(variante) : undefined;
    const frase =
      seg.kind === "conclusao"
        ? variante?.conclusao ?? seg.text
        : variante?.frase ?? seg.text;
    const obrig = [
      ...(slot?.placeholdersObrigatorios ?? []),
      ...(variante?.placeholdersObrigatorios ?? []),
    ];

    out.push({
      secao: seg.kind === "conclusao" ? "conclusao" : "corpo",
      slot: seg.slotId,
      variante: seg.variantId,
      frase: frase.trim(),
      // Sem variante conhecida (itens do motor, como a IG) não há o que editar.
      editavel: variante !== undefined && motivo === undefined,
      ...(motivo ? { motivo } : {}),
      obrigatorio: Boolean(slot?.obrigatorio),
      removivel: !slot?.obrigatorio && slot?.removivel !== false,
      placeholdersObrigatorios: obrig,
      dados: dadosNomeados(frase, obrig, catalog.rotulosVariaveis),
    });
  }
  return out;
}

/** As linhas de TÉCNICA/COMENTÁRIOS, que não são slots do documento. */
export function linhasDePreambulo<F>(catalog: Catalog<F>): LinhaDoModelo[] {
  const blocos = [catalog.cabecalhos.tecnica, catalog.preambulo].filter(
    (b): b is string => Boolean(b),
  );
  return blocos.flatMap((b) =>
    b
      .split("\n")
      // O cabeçalho da seção ("COMENTÁRIOS:") é estrutura, não frase.
      .filter((l) => l.trim() !== "" && !/^[A-ZÇÃÕÉÊÁÍÓÚ ]+:$/.test(l.trim()))
      .map((l) => ({
        secao: "tecnica" as const,
        slot: "preambulo",
        variante: "texto",
        frase: l.trim(),
        // O preâmbulo é do catálogo, não de um slot — personalizá-lo exige um
        // slot a que ancorar a operação, e ele não tem. Aparece para conferir.
        editavel: false,
        motivo: "Texto fixo do serviço (equipamento e protocolo de documentação).",
        obrigatorio: true,
        removivel: false,
        placeholdersObrigatorios: [],
        dados: [],
      })),
  );
}

/** Linhas a partir do laudo padrão renderizado (modelo derivado). */
export function linhasDeLaudoPadrao(laudo: string): LinhaDoModelo[] {
  return linhasDoLaudo(laudo, { incluirTecnica: true }).map((l) => ({
    secao: l.secao === "titulo" ? ("corpo" as const) : l.secao,
    slot: l.id,
    variante: "normal",
    // A numeração ("1) ") é do motor e não pertence à redação — deixá-la na
    // frase faria o médico editar um número que o sistema recalcula.
    frase: l.texto.replace(/^\d+\)\s*/, ""),
    // A técnica do derivado é texto do serviço, como o preâmbulo do escrito.
    editavel: l.secao !== "tecnica",
    ...(l.secao === "tecnica"
      ? { motivo: "Texto fixo do serviço (equipamento e protocolo de documentação)." }
      : {}),
    obrigatorio: false,
    removivel: l.secao !== "tecnica",
    placeholdersObrigatorios: [],
    dados: dadosPosicionais(l.texto),
  }));
}

/**
 * Os slots de achado do catálogo — condicionais, com TODAS as variantes.
 *
 * `incluirSe` é o que marca um slot como condicional: ele só entra no laudo
 * quando o achado é ditado. São exatamente os que não podem aparecer no modelo
 * de rotina, e exatamente os que o médico quer poder reescrever.
 */
export function achadosDoCatalogo<F>(
  catalog: Catalog<F>,
  descrever: (slotId: string, v: any) => VariantDescription,
): AchadoProjetado[] {
  return catalog.slots
    .filter((s) => s.incluirSe !== undefined && s.variantes.some((v) => v.exemplo))
    .map((s) => ({
      slot: s.id,
      removivel: !s.obrigatorio && s.removivel !== false,
      variantes: s.variantes.map((v) => descrever(s.id, v)),
    }));
}

export type ContextoDeCenario<F> = { nome: string; ctx: SlotContext<F> };

// ---------------------------------------------------------------------------
// Os DADOS de uma frase — nomeados ou posicionais, mesma forma para a tela
// ---------------------------------------------------------------------------

/**
 * Rótulo de uma lacuna posicional, inferido do que vem depois dela.
 *
 * "Diâmetro biparietal (DBP) de ____ mm." → "medida em mm". É pouco, e é
 * honesto: no modelo derivado o sistema não sabe o NOME do dado — sabe que ali
 * entra um valor que o renderer preencheu. Chutar "DBP" a partir do texto
 * seria inventar semântica que não existe.
 */
function rotuloDaLacuna(depois: string): string {
  const u = /^\s*(mm|cm|ml|g|gramas|bpm|%|semanas|dias)\b/i.exec(depois);
  return u ? `medida em ${u[1]!.toLowerCase()}` : "dado do exame";
}

/** Os dados de uma frase do catálogo ESCRITO — `{campo}` nomeado. */
export function dadosNomeados(
  frase: string,
  obrigatorios: string[],
  rotulos: Readonly<Record<string, string>> | undefined,
): DadoDaFrase[] {
  return [...frase.matchAll(/\{(\w+)\}/g)].map((m) => ({
    marcador: m[0],
    rotulo: rotulos?.[m[1]!] ?? m[1]!.replace(/_/g, " "),
    obrigatorio: obrigatorios.includes(m[1]!),
  }));
}

/**
 * Os dados de uma frase do modelo DERIVADO — lacunas `____`.
 *
 * Todas obrigatórias: a lacuna é justamente o valor que o renderer preencheu,
 * e uma redação que a descarta apaga a medida do laudo.
 */
export function dadosPosicionais(frase: string): DadoDaFrase[] {
  const out: DadoDaFrase[] = [];
  const re = /_{2,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(frase)) !== null) {
    out.push({
      marcador: "____",
      rotulo: rotuloDaLacuna(frase.slice(m.index + m[0].length)),
      obrigatorio: true,
    });
  }
  return out;
}
