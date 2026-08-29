import { z } from "zod";
export { OPTIONS } from "@/server/cors";
import { applyCustomization, diffDocs } from "@/server/renderer/catalog/engine";
import { describeCatalog } from "@/server/renderer/catalog/describe";
import { cenariosDe, laudoPadraoDe } from "@/server/renderer/catalog/modeloNormalRegistry";
import { sementeDeExemplo } from "@/server/renderer/catalog/exemplos";
import { flagsDeProducao, type EntradaCatalogo } from "@/server/renderer/catalog/registry";
import { catalogEnabledFor } from "@/server/renderer/catalog/engine";
import { env } from "@/server/env";
import { personalizacaoAtiva } from "@/server/customization/ativa";
import { lerJson, resolverContexto, respostaDeErro } from "@/server/customization/http";
import { NoteSchema, OperationsSchema } from "@/server/customization/schemas";
import { descartarRascunho, lerEstado, salvarRascunho } from "@/server/customization/store";
import type { Customization, Operation } from "@/server/renderer/catalog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/me/report-customizations/[category]?estilo=classico
 *
 * A personalização do modelo de laudo DO PRÓPRIO MÉDICO — projeto
 * docs/projeto-modelos/, item 6. Nada aqui altera o modelo global: as
 * operações são um overlay sobre o catálogo-base, que continua no Git.
 *
 *   GET    → catálogo + rascunho + publicado + histórico, com a prévia do que
 *            o rascunho muda em cada cenário
 *   PUT    → grava o rascunho (valida antes; rascunho inválido não é gravado)
 *   DELETE → descarta o rascunho (não mexe no publicado)
 *
 * Publicar e restaurar têm rotas próprias, porque são as ações que mudam o
 * laudo de verdade e merecem ser explícitas no log e na interface.
 */

/**
 * Prévia: o que estas operações mudam em cada cenário de exemplo.
 *
 * O diff é por SLOT (`diffDocs`), não textual — é o que permite mostrar a
 * alteração no ponto certo, com a frase antiga riscada e a nova embaixo, em
 * vez de dois laudos inteiros lado a lado.
 */
/**
 * O que cada ACHADO muda no modelo — "clico em oligoâmnio e vejo qual frase
 * sai e qual entra".
 *
 * Calculado sobre o modelo que o médico terá (com as operações dele
 * aplicadas), não sobre o catálogo-base: se ele reescreveu a frase de líquido
 * normal, é a frase DELE que precisa aparecer riscada quando há oligoâmnio.
 *
 * Só entram cenários com `comparaCom` — variações de achado sobre o mesmo
 * modelo. Gestação inicial e gemelar usam outro modelo e não se comparam.
 */
/**
 * Os cenários que representam MODELOS distintos — os samples sem `comparaCom`.
 * Sem eles, a Biblioteca mostra um modelo por categoria e esconde os demais.
 */
function cenariosBase(entrada: EntradaCatalogo, flags: ReturnType<typeof flagsDeProducao>) {
  const base = entrada.samples.filter((s) => !s.comparaCom);
  return (base.length > 0 ? base : entrada.samples.slice(0, 1)).map((s) => ({
    nome: s.nome,
    ctx: {
      findings: s.findings,
      fetoIndex: 0,
      gemelar: (s.findings as { numero_fetos?: number }).numero_fetos
        ? ((s.findings as { numero_fetos: number }).numero_fetos ?? 1) >= 2
        : false,
      flags,
    },
  }));
}

function variacoesDe(entrada: EntradaCatalogo, operations: Operation[]) {
  const flags = flagsDeProducao();
  const custom =
    operations.length > 0
      ? applyCustomization(entrada.catalog, {
          baseCatalogId: entrada.catalog.id,
          baseVersao: entrada.catalog.versao,
          operations,
        })
      : null;

  const doc = (findings: unknown) =>
    entrada.buildDoc({
      findings: findings as Parameters<typeof entrada.buildDoc>[0]["findings"],
      flags,
      ...(custom
        ? { catalog: custom.catalog, customSlots: custom.customSlots, extraConclusao: custom.extraConclusao }
        : {}),
    });

  return entrada.samples
    .filter((s) => s.comparaCom)
    .flatMap((s) => {
      const ref = entrada.samples.find((x) => x.id === s.comparaCom);
      if (!ref) return [];
      return [{
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        patologico: Boolean(s.patologico),
        compara_com_nome: ref.nome,
        mudancas: diffDocs(doc(ref.findings), doc(s.findings)),
      }];
    });
}

function previaDe(entrada: EntradaCatalogo, operations: Operation[]) {
  const flags = flagsDeProducao();
  const custom = applyCustomization(entrada.catalog, {
    baseCatalogId: entrada.catalog.id,
    baseVersao: entrada.catalog.versao,
    operations,
  } satisfies Customization);

  return entrada.samples.map((s) => {
    const argsCustom = {
      findings: s.findings,
      flags,
      catalog: custom.catalog,
      customSlots: custom.customSlots,
      extraConclusao: custom.extraConclusao,
    };
    const base = entrada.render({ findings: s.findings, flags });
    const personalizado = entrada.render(argsCustom);
    return {
      cenario: s.id,
      nome: s.nome,
      patologico: Boolean(s.patologico),
      mudou: base !== personalizado,
      mudancas: diffDocs(
        entrada.buildDoc({ findings: s.findings, flags }),
        entrada.buildDoc(argsCustom),
      ),
      laudo_padrao: base,
      laudo_personalizado: personalizado,
    };
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  try {
    const estado = await lerEstado(r.chave, r.entrada);
    const flags = flagsDeProducao();

    // O que o médico está vendo: o rascunho se houver, senão o publicado,
    // senão o modelo-base.
    const emEdicao = (estado.rascunho?.operations ??
      estado.publicado?.operations ??
      []) as Operation[];

    return Response.json({
      categoria: category,
      estilo: r.chave.styleCode,
      base_catalog_id: r.entrada.catalog.id,
      base_versao: r.entrada.catalog.versao,
      flags,
      catalogo: describeCatalog(
        r.entrada.catalog,
        /**
         * TODOS os cenários-base da categoria, não só o primeiro.
         *
         * Os samples com `comparaCom` são variações de ACHADO sobre o mesmo
         * modelo (oligoâmnio, placenta prévia) — esses viram a lista de
         * "variações". Os sem `comparaCom` são MODELOS diferentes: gestação
         * padrão, inicial e gemelar. Passar só o primeiro escondia dois terços
         * do modelo obstétrico, e é o mesmo defeito que fazia o morfológico sair
         * só com o 1º trimestre.
         */
        cenariosBase(r.entrada, flags),
        // Dá texto às variantes montadas pelo motor — sem isto, as patologias
        // aparecem na lista sem a frase que sairia no laudo.
        r.entrada.renderizarExemplo,
        r.entrada.projetarModelos,
      ),
      /**
       * A personalização publicada está REALMENTE valendo nos laudos?
       *
       * Publicar grava a intenção; quem decide se ela se aplica são as duas
       * flags de ambiente. Sem este campo a tela dizia "Em uso nos seus
       * laudos" para uma personalização que o gerador ignora — mentira
       * confortável, e a pior espécie num produto clínico.
       */
      personalizacao_ativa: personalizacaoAtiva({
        userId: r.chave.userId,
        categoria: category,
        estilo: r.chave.styleCode,
      }).ativa,
      /**
       * OS CENÁRIOS, com o que os DISTINGUE — para a tela achar um laudo real
       * do mesmo tipo.
       *
       * A coluna de exemplo mostrava o laudo mais recente da categoria, e no
       * obstétrico isso punha uma gestação de 7 semanas ao lado do modelo de 32
       * (Luiz, 21/08). O modelo é por cenário; o exemplo tem de ser também.
       *
       * `filtro` são só os campos ESCALARES do seed — e eles bastam porque o
       * seed existe justamente para discriminar o cenário: `numero_fetos`,
       * `gestacao_inicial`, `trimestre`. Arrays e objetos (o feto-base, por
       * exemplo) ficam de fora: nunca casariam com um laudo de verdade.
       */
      cenarios: cenariosDe(category).map((c) => ({
        nome: c.nome,
        /**
         * O EXEMPLO PREENCHIDO — mesmo cenário, mesmo estilo, mesmo motor.
         *
         * A primeira versão mostrava um laudo real do médico ao lado do modelo,
         * e desencontrava em dois eixos (Luiz, 21/08): vinha de outro cenário
         * (7 semanas ao lado do modelo de 32) e no estilo em que foi escrito,
         * não no que a tela mostra. Renderizar resolve os dois.
         *
         * Os valores vêm de `exemplos.ts` — o único lugar do sistema onde é
         * certo inventar medida, porque isto nunca vira laudo.
         */
        exemplo: laudoPadraoDe(
          category,
          r.chave.styleCode,
          { ...c.seed, ...sementeDeExemplo(category, c.nome) },
          /**
           * O contexto vai aqui também. Sem ele o abdome mostraria o MODELO e
           * a coluna de exemplo vazia — meia tela, que é o tipo de coisa que
           * o médico interpreta como defeito da personalização dele.
           */
          r.contexto,
        ),
      })),
      rascunho: estado.rascunho,
      publicado: estado.publicado,
      historico: estado.historico,
      // Há versões mais antigas do que as devolvidas. A tela usa para não
      // afirmar "este é todo o seu histórico" quando não é.
      historico_truncado: estado.historicoTruncado,
      // SEMPRE presente, mesmo sem nenhuma alteração — é como o médico vê o
      // laudo dele hoje. Antes só vinha com rascunho, e a tela não tinha o que
      // mostrar em quem nunca personalizou nada: justamente quem mais precisa
      // ver o modelo antes de mexer.
      previa: previaDe(r.entrada, emEdicao),
      // O efeito de cada achado sobre o modelo QUE ELE TERÁ: com o rascunho
      // se houver, senão com o publicado, senão com o base.
      variacoes: variacoesDe(
        r.entrada,
        emEdicao.length > 0 ? emEdicao : ((estado.publicado?.operations ?? []) as Operation[]),
      ),
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}

const PutSchema = z.object({
  operations: OperationsSchema,
  note: NoteSchema,
});

export async function PUT(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  const raw = await lerJson(req);
  if (raw !== null && typeof raw === "object" && "erro" in raw) return (raw as { erro: Response }).erro;

  const parsed = PutSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "body inválido", detalhes: parsed.error.issues }, { status: 400 });
  }

  try {
    const rascunho = await salvarRascunho(
      r.chave,
      r.entrada,
      parsed.data.operations,
      parsed.data.note ?? null,
    );
    return Response.json({
      rascunho,
      previa: previaDe(r.entrada, rascunho.operations),
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ category: string }> }) {
  const { category } = await ctx.params;
  const r = await resolverContexto(req, category);
  if ("erro" in r) return r.erro;

  try {
    const descartou = await descartarRascunho(r.chave);
    return Response.json({ descartou });
  } catch (e) {
    return respostaDeErro(e);
  }
}
