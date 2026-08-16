/**
 * O MODELO NORMAL de uma categoria — o laudo padrão, frase a frase.
 *
 * POR QUE ISTO EXISTE. A Biblioteca só mostrava OBSTETRICA, porque só ela tem
 * catálogo estruturado. Escrever um catálogo à mão para as outras 13 custaria
 * o mesmo que custou o obstétrico (704 linhas + harness de 4320 combinações)
 * multiplicado por 13 — e, pior, criaria treze cópias do texto clínico. A
 * dívida central deste sistema já é ter o mesmo texto em mais de um lugar.
 *
 * Aqui o modelo não é escrito: é DERIVADO. Constrói-se o achado normal a
 * partir do schema Zod da categoria e renderiza-se com o renderer REAL de
 * produção. O texto continua tendo uma fonte só — a Biblioteca ganha uma
 * janela para ele, não uma cópia.
 *
 * O QUE ISSO GARANTE, de graça:
 *
 *   · a lista contém SOMENTE frases de normalidade, por construção. Uma frase
 *     de achado nunca entra, porque o achado normal não a produz. A crítica C3
 *     (personalização mascarando patologia) não precisa de trava aqui — o
 *     caminho não existe.
 *   · a frase mostrada é exatamente a que sai no laudo do médico, com as flags
 *     de produção. Não há como divergir do que ele vê no dia a dia.
 *
 * O QUE ISSO NÃO FAZ. Não conhece variantes, predicados nem conclusão por
 * achado. Para isso existe o catálogo estruturado (`OBSTETRICA.classico.ts`),
 * que continua sendo o caminho superior onde existir.
 */
import { createHash } from "node:crypto";
import type { z } from "zod";
import type { CatalogDescription, SlotDescription } from "./describe";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// 1 · O achado NORMAL, derivado do schema
// ---------------------------------------------------------------------------

/**
 * Caminha o schema Zod montando o achado de um exame sem alterações.
 *
 * A convenção do sistema é `null` = "não ditado", e é justamente isso que
 * produz o laudo padrão: o renderer escreve a frase de normalidade para tudo
 * que não foi ditado. Por isso o normal é, quase inteiro, o schema com nulos.
 *
 * `campo` entra na decisão porque uma contagem não pode ser 0 (`numero_fetos`
 * zero não é um exame normal, é um exame impossível).
 */
export function achadoNormalDe(schema: z.ZodTypeAny, campo = ""): unknown {
  const d = (schema as any)._def;
  switch (d?.typeName) {
    case "ZodDefault":
      return d.defaultValue();
    case "ZodNullable":
    case "ZodOptional":
      return null;
    case "ZodArray":
      return [];
    case "ZodBoolean":
      return false;
    case "ZodString":
      return "";
    case "ZodNumber":
      return /numero|quantidade|contagem/i.test(campo) ? 1 : 0;
    case "ZodEnum":
      return d.values[0];
    case "ZodObject": {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(d.shape() as Record<string, z.ZodTypeAny>)) {
        out[k] = achadoNormalDe(v, k);
      }
      return out;
    }
    case "ZodEffects":
      return achadoNormalDe(d.schema, campo);
    case "ZodUnion":
      return achadoNormalDe(d.options[0], campo);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 2 · Fatiar o laudo em linhas endereçáveis
// ---------------------------------------------------------------------------

/**
 * Cabeçalhos de seção. Não são frases do modelo: são estrutura, e o médico não
 * os personaliza por aqui (mudar "CONCLUSÃO:" é outra conversa, e o validador
 * já recusa cabeçalho dentro de uma frase).
 */
const CABECALHO = /^\s*(?:OS SEGUINTES ASPECTOS[^\n]*|CONCLUS[ÃA]O|IMPRESS[ÃA]O|ACHADOS|T[ÉE]CNICA|COMENT[ÁA]RIOS)\s*:?\s*$/iu;

/** Rodapés e notas de escore — texto fixo do serviço, não frase clínica. */
const RODAPE = /^\s*\*/u;

export type SecaoLinha = "titulo" | "tecnica" | "corpo" | "conclusao";

export type LinhaModelo = {
  /** Id ESTÁVEL, derivado do texto — ver `idDaFrase`. */
  id: string;
  texto: string;
  secao: SecaoLinha;
  /**
   * A linha traz um dado do exame (medida, contagem) que a redação do médico
   * precisa conservar? Detectado pela lacuna `____` do renderer.
   */
  temDado: boolean;
};

/**
 * O id de uma frase é o HASH DELA, não a posição.
 *
 * Índice de linha quebra a cada frase nova no renderer: a personalização da
 * linha 7 passaria a valer para outra frase, silenciosamente. Ancorando no
 * texto, uma frase que mude no modelo-base simplesmente deixa de casar — a
 * personalização não se aplica e o laudo sai no padrão, que é o fail-safe
 * certo. A Biblioteca detecta o mesmo e avisa "esta frase mudou".
 */
export function idDaFrase(texto: string): string {
  const normal = texto.trim().replace(/\s+/g, " ").replace(/_{2,}/g, "__");
  return `frase:${createHash("sha1").update(normal).digest("hex").slice(0, 10)}`;
}

/** Quebra o laudo renderizado nas linhas que o médico pode reescrever. */
export function linhasDoLaudo(texto: string): LinhaModelo[] {
  const linhas = texto.split("\n");
  const out: LinhaModelo[] = [];
  let secao: SecaoLinha = "titulo";
  let primeira = true;

  for (const bruta of linhas) {
    const l = bruta.trim();
    if (l === "") continue;

    if (/^\s*(?:CONCLUS[ÃA]O|IMPRESS[ÃA]O)\s*:?\s*$/iu.test(l)) { secao = "conclusao"; continue; }
    if (/^\s*(?:T[ÉE]CNICA|COMENT[ÁA]RIOS)\s*:?\s*$/iu.test(l)) { secao = "tecnica"; continue; }
    if (/^\s*(?:OS SEGUINTES ASPECTOS|ACHADOS)/iu.test(l)) { secao = "corpo"; continue; }
    if (CABECALHO.test(l) || RODAPE.test(l)) continue;

    // A primeira linha não-vazia é o título do exame.
    if (primeira) { primeira = false; continue; }

    out.push({
      id: idDaFrase(l),
      texto: l,
      secao,
      // A numeração da conclusão ("1) ") é do motor, não da frase.
      temDado: /_{2,}/.test(l),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3 · Projeção para a Biblioteca — a MESMA forma do catálogo estruturado
// ---------------------------------------------------------------------------

/**
 * O app não precisa saber se a categoria tem catálogo estruturado ou modelo
 * derivado. As duas coisas chegam como `CatalogDescription`; o que muda é
 * quanto cada uma sabe. Por isso a projeção aqui monta um slot por frase, com
 * uma variante padrão só.
 */
export function descreverModeloNormal(args: {
  categoria: string;
  estilo: string;
  /** O laudo padrão, já renderizado pelo renderer de produção. */
  laudo: string;
  /** Vocabulário de placeholders — vazio: o modelo derivado não interpola. */
  variaveis?: string[];
}): CatalogDescription {
  const linhas = linhasDoLaudo(args.laudo);

  const slots: SlotDescription[] = linhas.map((l) => ({
    id: l.id,
    // Nenhuma frase do modelo normal é obrigatória por si: obrigatoriedade é
    // invariante clínica, e o modelo derivado não sabe declará-la. Quem sabe é
    // o catálogo estruturado. Aqui o médico pode tirar a linha do laudo dele.
    obrigatorio: false,
    removivel: true,
    placeholdersObrigatorios: [],
    condicional: false,
    variantes: [{
      id: "normal",
      frase: l.texto,
      padrao: true,
      editavel: true,
    }],
  }));

  return {
    id: `${args.categoria}/${args.estilo}`,
    categoria: args.categoria,
    estilo: args.estilo,
    /**
     * Versão 0 marca "modelo derivado", não escrito à mão. A trava de versão
     * da personalização compara este número; como ele muda junto com o
     * renderer, uma mudança no texto-base invalida a personalização antiga —
     * que é o comportamento certo.
     */
    versao: 0,
    variaveis: args.variaveis ?? [],
    cabecalhos: { corpo: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", conclusao: "CONCLUSÃO:" },
    slots,
    ordens: [{
      nome: "Modelo padrão",
      slots: linhas.map((l) => l.id),
    }],
  };
}
