/**
 * A redação do médico aplicada ao laudo — para as categorias sem catálogo.
 *
 * Onde existe catálogo estruturado (OBSTETRICA), a personalização entra ANTES:
 * o laudo é montado com as frases dele, slot a slot. Aqui é o contrário — o
 * renderer monta o laudo como sempre, e a redação do médico é a última camada,
 * trocando linha por linha.
 *
 * Parece menos elegante, e é. Em compensação vale para TODAS as categorias sem
 * escrever um catálogo por categoria, e tem três propriedades que importam
 * mais que elegância:
 *
 *   1. NADA É RECONSTRUÍDO. O laudo continua sendo o do renderer de produção.
 *      A personalização não pode perder conteúdo, porque não monta nada.
 *   2. FAIL-SAFE. A troca só acontece onde a frase-base casa. Se o exame tem
 *      um achado, a linha de normalidade não está lá, nada casa, e o laudo sai
 *      intocado. O pior caso é a personalização não aplicar — nunca um laudo
 *      errado.
 *   3. O DADO SOBREVIVE. As medidas da linha real são capturadas e reinseridas
 *      na redação do médico. Ele muda como se escreve, não o que se mediu.
 */
import {
  contarDados,
  extrairDados,
  idDaFrase,
  preencherDados,
} from "@/server/renderer/catalog/modeloNormal";

/** Uma redação do médico: "onde sair a frase X, escreva Y". */
export type FrasePersonalizada = {
  /** `idDaFrase` da frase-base do modelo. */
  id: string;
  /** A frase do modelo-base, como estava quando ele personalizou. */
  base: string;
  /**
   * A redação dele. `null` = tirar a linha do laudo. `undefined` = deixar a
   * linha como está — é o caso de quem só acrescentou algo depois dela.
   */
  nova?: string | null;
  /**
   * Texto a ACRESCENTAR logo depois desta linha.
   *
   * Existia como operação (`insert_phrase_after`), o app oferecia o botão, e o
   * caminho derivado recusava — descartando a personalização inteira com a
   * mensagem errada, dizendo que o modelo tinha mudado. O médico contornava
   * colando as linhas novas dentro da frase que ele "alterava".
   */
  acrescentar?: string;
};

export type ResultadoAplicacao = {
  texto: string;
  /** Quantas linhas foram efetivamente trocadas — para a auditoria. */
  aplicadas: number;
  /**
   * Personalizações que não casaram com nenhuma linha. NÃO é erro: o exame
   * pode simplesmente não ter aquela frase (havia achado). Mas se for sempre,
   * é sinal de que o modelo-base mudou e ela virou letra morta.
   */
  naoAplicadas: string[];
};

/**
 * Valida uma redação contra a frase-base. Devolve os motivos da recusa.
 *
 * A trava que importa é a das LACUNAS: a frase nova precisa conservar todos os
 * dados da original. Sem isso, reescrever "Diâmetro biparietal (DBP) de ____
 * mm." como "Biometria dentro da normalidade." apagaria a medida do laudo — e
 * o médico não veria, porque a frase dele "parece" completa.
 */
export function validarFrase(base: string, nova: string | null): string[] {
  const erros: string[] = [];
  if (nova === null) return erros; // remover é decisão dele

  if (nova.trim() === "") {
    erros.push("a frase não pode ficar vazia — para tirá-la do laudo, use remover");
    return erros;
  }
  if (/^\s*(?:CONCLUS[ÃA]O|IMPRESS[ÃA]O|ACHADOS|T[ÉE]CNICA|COMENT[ÁA]RIOS)\s*:/imu.test(nova)) {
    erros.push("a frase não pode conter um cabeçalho de seção");
  }
  if (nova.includes("\n")) {
    erros.push("a frase é uma linha só — para acrescentar outra, use acrescentar frase");
  }

  const esperados = contarDados(base);
  const trazidos = (nova.match(/_{2,}/g) ?? []).length;
  if (trazidos < esperados) {
    erros.push(
      esperados === 1
        ? "a sua frase precisa conservar o dado do exame — deixe ____ onde ele entra"
        : `a sua frase precisa conservar os ${esperados} dados do exame — deixe ____ onde cada um entra`,
    );
  }
  if (trazidos > esperados) {
    erros.push(
      `a frase original tem ${esperados} dado(s) do exame e a sua tem ${trazidos} lacuna(s); ` +
        "as sobrando sairiam como ____ no laudo",
    );
  }
  return erros;
}

/**
 * Aplica as redações do médico sobre o laudo pronto.
 *
 * Percorre linha a linha e troca a PRIMEIRA que casar com cada personalização.
 * Uma personalização por linha, e uma linha por personalização: uma frase que
 * se repete (rim direito / rim esquerdo tem redações diferentes) não é trocada
 * duas vezes pela mesma regra.
 */
export function aplicarFrasesPersonalizadas(
  texto: string,
  frases: FrasePersonalizada[],
): ResultadoAplicacao {
  if (frases.length === 0) return { texto, aplicadas: 0, naoAplicadas: [] };

  const porId = new Map(frases.map((f) => [f.id, f]));
  const usadas = new Set<string>();
  const linhas = texto.split("\n");
  const saida: string[] = [];
  let aplicadas = 0;

  for (const linha of linhas) {
    const bruta = linha.trim();
    if (bruta === "") { saida.push(linha); continue; }

    const f = porId.get(idDaFrase(bruta));
    if (!f || usadas.has(f.id)) { saida.push(linha); continue; }

    // A frase-base precisa casar de verdade com ESTA linha — o id é um índice,
    // não uma prova. Sem isto, uma colisão de hash trocaria a linha errada.
    const dados = extrairDados(f.base, bruta);
    if (dados === null) { saida.push(linha); continue; }

    usadas.add(f.id);
    aplicadas++;

    // A numeração da conclusão ("1) ") é do motor e não pertence à frase.
    const prefixo = /^\s*\d+\)\s*/.exec(linha)?.[0] ?? "";
    const indent = /^\s*/.exec(linha)?.[0] ?? "";

    if (f.nova === null) {
      // Remover: a linha não entra na saída. O que vier depois dela, entra —
      // acrescentar ancorado numa linha removida já é recusado na validação.
    } else if (f.nova === undefined) {
      saida.push(linha); // só acrescentou algo depois; a linha segue igual
    } else {
      saida.push(`${prefixo || indent}${preencherDados(f.nova, dados).trim()}`);
    }

    if (f.acrescentar !== undefined) {
      /**
       * As linhas novas herdam o RECUO da âncora, não a numeração: numerar é do
       * motor, e um "2)" escrito aqui brigaria com o que o renderer contou.
       */
      for (const nl of preencherDados(f.acrescentar, dados).split("\n")) {
        saida.push(nl.trim() === "" ? "" : `${indent}${nl.trim()}`);
      }
    }
  }

  return {
    texto: saida.join("\n").replace(/\n{3,}/g, "\n\n"),
    aplicadas,
    naoAplicadas: frases.filter((f) => !usadas.has(f.id)).map((f) => f.id),
  };
}
