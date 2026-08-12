/**
 * Procedência de cada trecho do laudo — de onde veio o texto.
 *
 * A versão antiga do lab (`lib/reviewer/segment-builder.ts`) atribuía trechos a
 * blocos do RAG por semelhança de palavras (Jaccard ≥ 0,12). Isso fazia sentido
 * quando havia um retriever vetorial a calibrar. Hoje não há: o bundle carrega
 * TODOS os blocos por chave fixa, e nas categorias de renderer o laudo é montado
 * em código — a atribuição por semelhança vira ficção.
 *
 * Aqui a regra é outra e é verificável: **correspondência literal**. Se o valor
 * que o LLM colocou num campo de texto livre aparece exatamente no laudo, aquele
 * trecho é do LLM. Se não aparece nenhum, o trecho é do código do renderer.
 *
 * Isso só vale onde o laudo é montado por código a partir de dados tipados.
 * No caminho do writer o LLM redige o texto inteiro e não há correspondência a
 * estabelecer — por isso `procedenciaDisponivel()` responde `false` e a tela
 * diz que não sabe, em vez de inventar cor.
 */

/**
 * - `codigo`     — não veio de nenhum campo do LLM (frase do template)
 * - `llm_texto`  — o LLM REDIGIU (frase livre, várias palavras)
 * - `llm_dado`   — o LLM CLASSIFICOU ou MEDIU (valor único: enum, número)
 *
 * A distinção entre redigir e classificar importa: escolher "cefálica" de uma
 * lista fechada é muito menos arriscado do que escrever uma frase inteira.
 */
export type Origem = "codigo" | "llm_texto" | "llm_dado";

export type TrechoProcedencia = {
  texto: string;
  origem: Origem;
  /** Nome do campo do structured_output que produziu o trecho, quando houver. */
  campo?: string;
};

/** Campos string que não são redação: identificadores, datas, códigos. */
const NAO_E_REDACAO = /^(id|codigo|code|tipo|type|status|categoria|category|rotulo)$/i;

/** Percorre o structured_output e devolve os textos livres, com o caminho do campo. */
export function textosLivresDo(
  obj: unknown,
  prefixo = "",
  saida: { campo: string; valor: string }[] = [],
): { campo: string; valor: string }[] {
  if (obj === null || obj === undefined) return saida;

  if (typeof obj === "string") {
    const v = obj.trim();
    // Só conta como REDAÇÃO o que tem mais de uma palavra. Valor único
    // ("cefálica", "normal") é classificação e entra como `llm_dado` adiante.
    const multiplasPalavras = v.split(/\s+/).length > 1;
    if (v.length >= 8 && multiplasPalavras && !NAO_E_REDACAO.test(prefixo.split(".").pop() ?? "")) {
      saida.push({ campo: prefixo, valor: v });
    }
    return saida;
  }
  if (Array.isArray(obj)) {
    obj.forEach((it, i) => textosLivresDo(it, `${prefixo}[${i}]`, saida));
    return saida;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      textosLivresDo(v, prefixo ? `${prefixo}.${k}` : k, saida);
    }
  }
  return saida;
}

/** Números do structured_output — viram medidas no laudo. */
export function numerosDo(obj: unknown, prefixo = "", saida: { campo: string; valor: number }[] = []) {
  if (obj === null || obj === undefined) return saida;
  if (typeof obj === "number" && Number.isFinite(obj)) {
    saida.push({ campo: prefixo, valor: obj });
    return saida;
  }
  if (Array.isArray(obj)) {
    obj.forEach((it, i) => numerosDo(it, `${prefixo}[${i}]`, saida));
    return saida;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      numerosDo(v, prefixo ? `${prefixo}.${k}` : k, saida);
    }
  }
  return saida;
}

/** Valores de uma palavra: o LLM classificou, não redigiu. */
export function classificacoesDe(
  obj: unknown,
  prefixo = "",
  saida: { campo: string; valor: string }[] = [],
): { campo: string; valor: string }[] {
  if (obj === null || obj === undefined) return saida;
  if (typeof obj === "string") {
    const v = obj.trim();
    if (v.length >= 4 && v.split(/\s+/).length === 1 && !NAO_E_REDACAO.test(prefixo.split(".").pop() ?? "")) {
      saida.push({ campo: prefixo, valor: v });
    }
    return saida;
  }
  if (Array.isArray(obj)) {
    obj.forEach((it, i) => classificacoesDe(it, `${prefixo}[${i}]`, saida));
    return saida;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      classificacoesDe(v, prefixo ? `${prefixo}.${k}` : k, saida);
    }
  }
  return saida;
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Como o número aparece no laudo: vírgula decimal, e possivelmente convertido
 * de cm para mm (o médico dita em cm; o laudo publica em mm).
 */
function formasDoNumero(n: number): string[] {
  const formas = new Set<string>();
  const add = (x: number) => {
    if (!Number.isFinite(x)) return;
    const s = Number.isInteger(x) ? String(x) : x.toFixed(1);
    formas.add(s.replace(".", ","));
    formas.add(s);
  };
  add(n);
  add(n * 10);
  add(n / 10);
  return [...formas].filter((f) => f.length >= 2);
}

/**
 * Marca os trechos do laudo cuja origem é comprovável.
 *
 * Estratégia deliberadamente conservadora: só marca o que casa LITERALMENTE.
 * Na dúvida, o trecho fica como `codigo` — e o rodapé da tela diz que "código"
 * aqui significa "não veio de nenhum campo do LLM", não "provadamente do
 * template".
 */
export function procedenciaDoLaudo(
  laudo: string,
  structuredOutput: unknown,
): { trechos: TrechoProcedencia[]; resumo: Record<Origem, number> } {
  const textos = textosLivresDo(structuredOutput)
    .filter((t) => laudo.includes(t.valor))
    // Do maior para o menor: evita que um trecho curto quebre um longo ao meio.
    .sort((a, b) => b.valor.length - a.valor.length);

  const numeros = numerosDo(structuredOutput);
  const classificacoes = classificacoesDe(structuredOutput)
    .filter((c) => laudo.includes(c.valor))
    .sort((a, b) => b.valor.length - a.valor.length);

  type Marca = { ini: number; fim: number; origem: Origem; campo: string };
  const marcas: Marca[] = [];
  const ocupado = (ini: number, fim: number) =>
    marcas.some((m) => ini < m.fim && fim > m.ini);

  for (const t of textos) {
    let de = 0;
    for (;;) {
      const i = laudo.indexOf(t.valor, de);
      if (i === -1) break;
      if (!ocupado(i, i + t.valor.length)) {
        marcas.push({ ini: i, fim: i + t.valor.length, origem: "llm_texto", campo: t.campo });
      }
      de = i + t.valor.length;
    }
  }

  for (const c of classificacoes) {
    const re = new RegExp(`(?<![\\p{L}])${escaparRegex(c.valor)}(?![\\p{L}])`, "gu");
    for (const m of laudo.matchAll(re)) {
      const i = m.index ?? -1;
      if (i >= 0 && !ocupado(i, i + c.valor.length)) {
        marcas.push({ ini: i, fim: i + c.valor.length, origem: "llm_dado", campo: c.campo });
      }
    }
  }

  for (const n of numeros) {
    for (const forma of formasDoNumero(n.valor)) {
      // \b não funciona bem com vírgula decimal; delimita à mão.
      const re = new RegExp(`(?<![\\d,.])${escaparRegex(forma)}(?![\\d,.])`, "g");
      for (const m of laudo.matchAll(re)) {
        const i = m.index ?? -1;
        if (i >= 0 && !ocupado(i, i + forma.length)) {
          marcas.push({ ini: i, fim: i + forma.length, origem: "llm_dado", campo: n.campo });
        }
      }
    }
  }

  marcas.sort((a, b) => a.ini - b.ini);

  const trechos: TrechoProcedencia[] = [];
  let cursor = 0;
  for (const m of marcas) {
    if (m.ini > cursor) trechos.push({ texto: laudo.slice(cursor, m.ini), origem: "codigo" });
    trechos.push({ texto: laudo.slice(m.ini, m.fim), origem: m.origem, campo: m.campo });
    cursor = m.fim;
  }
  if (cursor < laudo.length) trechos.push({ texto: laudo.slice(cursor), origem: "codigo" });

  const resumo: Record<Origem, number> = { codigo: 0, llm_texto: 0, llm_dado: 0 };
  for (const t of trechos) resumo[t.origem] += t.texto.length;

  return { trechos, resumo };
}

/**
 * Como interpretar o trecho NÃO atribuído a nenhum campo do LLM.
 *
 * A mesma medição significa coisas diferentes conforme o caminho:
 *  - no RENDERER, o que não veio de campo veio do template, em código;
 *  - no WRITER, o LLM redigiu o laudo inteiro, então o não atribuído foi ele
 *    que escreveu — livremente, sem passar por campo estruturado.
 *
 * Chamar os dois de "código" seria mentira no segundo caso.
 */
export type ModoProcedencia = "renderer" | "writer";

/**
 * O caminho está na SYSTEM MESSAGE, não em `model_writer`.
 *
 * `model_writer` guarda o MODELO DE IA (gpt-4.1-mini, gpt-5.4-mini) mesmo
 * quando o laudo foi montado em código — nunca vale "renderer/v1". A primeira
 * versão desta função comparava com essa string e classificava TUDO como
 * writer. Medido em 443 laudos obstétricos da auditoria: 300 são do renderer,
 * e a tela mostrava "o LLM redigiu" onde era template, em 3 de cada 4.
 *
 * A system message do caminho determinístico começa com
 * `[renderer/v1] render programático determinístico (CATEGORIA)`.
 */

export function modoDe(systemMessage: string | null): ModoProcedencia {
  return (systemMessage ?? "").startsWith("[renderer/") ? "renderer" : "writer";
}

/** Rótulo honesto do trecho não atribuído, por caminho. */
export function rotuloNaoAtribuido(modo: ModoProcedencia): { curto: string; ajuda: string } {
  return modo === "renderer"
    ? {
        curto: "template",
        ajuda:
          "Não veio de nenhum campo preenchido pelo LLM — é frase escrita no código do renderer.",
      }
    : {
        curto: "o LLM redigiu",
        ajuda:
          "Neste caminho o LLM escreve o laudo inteiro. O trecho não corresponde a nenhum campo estruturado: foi redação livre.",
      };
}

/**
 * A atribuição exige o `structured_output` daquela geração. Sem ele não há o
 * que casar, e a tela deve dizer que não sabe em vez de inventar cor.
 */
export function procedenciaDisponivel(_modelWriter: string | null, temStructured: boolean): boolean {
  return temStructured;
}
