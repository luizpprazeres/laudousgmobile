/**
 * O que a ROTA devolve bate com o que a TELA do app espera?
 *
 * Rodar de apps/api:
 *   pnpm exec tsx src/server/customization/contrato-biblioteca.manual.ts
 *
 * Não toca o banco: monta a resposta do GET com os mesmos dados da rota e a
 * valida contra o schema Zod do app. É barato e pega a classe de erro mais
 * provável aqui — o app e a API evoluírem separados. Já aconteceu uma vez
 * nesta sessão: o `MudancaSchema` do app não batia com o `Mudanca` do engine.
 */

import { describeCatalog } from "@/server/renderer/catalog/describe";
import { flagsDeProducao, resolveCatalogo } from "@/server/renderer/catalog/registry";
import { applyCustomization, diffDocs } from "@/server/renderer/catalog/engine";
// Caminho relativo de propósito: é o schema REAL do app, não uma cópia.
import { EstadoSchema, type Variacao } from "../../../../mobile/src/lib/personalizacao.schemas";

let ok = 0;
const falhas: string[] = [];
const check = (nome: string, cond: boolean, extra?: unknown) => {
  if (cond) ok++;
  else falhas.push(nome + (extra === undefined ? "" : ` — ${JSON.stringify(extra).slice(0, 400)}`));
};

const entrada = resolveCatalogo("OBSTETRICA", "CLASSICO_COMPLETO")!;
const flags = flagsDeProducao();

// Mesma montagem da rota GET (app/api/me/report-customizations/[category]).
const catalogo = describeCatalog(entrada.catalog, [
  { nome: "Gestação padrão", ctx: { findings: entrada.samples[0]!.findings, fetoIndex: 0, gemelar: false, flags } },
]);

const operations = [
  { op: "append_conclusion_item" as const, value: "Controle em 4 semanas." },
];
const custom = applyCustomization(entrada.catalog, {
  baseCatalogId: entrada.catalog.id,
  baseVersao: entrada.catalog.versao,
  operations,
});
const previa = entrada.samples.map((s) => {
  const argsCustom = {
    findings: s.findings,
    flags,
    catalog: custom.catalog,
    customSlots: custom.customSlots,
    extraConclusao: custom.extraConclusao,
  };
  return {
    cenario: s.id,
    nome: s.nome,
    patologico: Boolean(s.patologico),
    mudou: true,
    mudancas: diffDocs(entrada.buildDoc({ findings: s.findings, flags }), entrada.buildDoc(argsCustom)),
    laudo_padrao: entrada.render({ findings: s.findings, flags }),
    laudo_personalizado: entrada.render(argsCustom),
  };
});

/** Mesma função da rota: o efeito de cada achado sobre o modelo do médico. */
function variacoesDe(operations: { op: string; [k: string]: unknown }[]) {
  const c =
    operations.length > 0
      ? applyCustomization(entrada.catalog, {
          baseCatalogId: entrada.catalog.id,
          baseVersao: entrada.catalog.versao,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          operations: operations as any,
        })
      : null;
  const doc = (findings: unknown) =>
    entrada.buildDoc({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findings: findings as any,
      flags,
      ...(c ? { catalog: c.catalog, customSlots: c.customSlots, extraConclusao: c.extraConclusao } : {}),
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

const agora = new Date().toISOString();
const resposta = {
  categoria: "OBSTETRICA",
  estilo: "CLASSICO_COMPLETO",
  base_catalog_id: entrada.catalog.id,
  base_versao: entrada.catalog.versao,
  flags,
  catalogo,
  rascunho: {
    id: "00000000-0000-4000-8000-000000000000",
    versao: 1,
    status: "draft",
    operations,
    baseCatalogId: entrada.catalog.id,
    baseVersao: entrada.catalog.versao,
    note: null,
    createdAt: agora,
    updatedAt: agora,
    publishedAt: null,
    baseDesatualizado: false,
  },
  publicado: null,
  historico: [],
  previa,
  variacoes: variacoesDe(operations),
};

const r = EstadoSchema.safeParse(resposta);
check("a resposta da rota valida no schema do app", r.success, r.success ? undefined : r.error.issues);

if (r.success) {
  const e = r.data;

  // A tela monta a lista de frases assim (ModeloEditor.linhas).
  const porId = new Map(e.catalogo.slots.map((s) => [s.id, s]));
  const ordem = e.catalogo.ordens[0]?.slots ?? [];
  const vistos = new Set<string>();
  const linhas = ordem.flatMap((id) => {
    if (vistos.has(id)) return [];
    vistos.add(id);
    const slot = porId.get(id);
    if (!slot) return [];
    const padrao = slot.variantes.find((v) => v.padrao) ?? slot.variantes[0];
    if (!padrao?.frase) return [];
    return [{ slot, frase: padrao.frase, editavel: padrao.editavel }];
  });

  check("a tela consegue montar frases", linhas.length > 0, linhas.length);
  check("há frase editável (senão a tela é só leitura)", linhas.some((l) => l.editavel));
  check(
    "há frase NÃO editável com motivo (a recusa é explicada)",
    e.catalogo.slots.some((s) => s.variantes.some((v) => !v.editavel && (v.motivo ?? "") !== "")),
  );
  check(
    "toda ordem aponta para slot existente",
    ordem.every((id) => porId.has(id)),
    ordem.filter((id) => !porId.has(id)),
  );
  check("há slot obrigatório (a trava existe de fato)", e.catalogo.slots.some((s) => s.obrigatorio));
  check(
    "placeholders das frases estão no vocabulário",
    linhas.every((l) =>
      [...l.frase.matchAll(/\{(\w+)\}/g)].every((m) => e.catalogo.variaveis.includes(m[1]!)),
    ),
  );
  check("a prévia trouxe cenários", e.previa.length > 0, e.previa.length);
  check("cada prévia traz o diff por slot", e.previa.every((p) => Array.isArray(p.mudancas)));
  check(
    "o diff da conclusão é do tipo acrescentada",
    e.previa.every((p) => p.mudancas.some((m) => m.tipo === "acrescentada" && m.secao === "conclusao")),
  );

  console.log(`\nlinhas que a tela vai desenhar: ${linhas.length}`);
  console.log(`  editáveis: ${linhas.filter((l) => l.editavel).length}`);
  console.log(`  escritas pelo sistema: ${linhas.filter((l) => !l.editavel).length}`);
}

// --- as variações: "o que muda quando há oligoâmnio" ---------------------
const vs = variacoesDe([]) as Variacao[];
check("há variações de achado", vs.length >= 4, vs.length);
check(
  "toda variação tem mudança no corpo",
  vs.every((v) => v.mudancas.some((m) => m.secao === "corpo")),
);
check(
  "toda mudança de corpo tem antes E depois (dá para riscar e substituir)",
  vs.every((v) =>
    v.mudancas
      .filter((m) => m.secao === "corpo")
      .every((m) => (m.antes ?? "").trim() !== "" && (m.depois ?? "").trim() !== ""),
  ),
);

const oligo = vs.find((v) => v.id === "oligoamnio");
check("o oligoâmnio está entre elas", oligo !== undefined);
if (oligo) {
  const corpo = oligo.mudancas.find((m) => m.secao === "corpo");
  const concl = oligo.mudancas.find((m) => m.secao === "conclusao");
  check("oligoâmnio risca a frase de normalidade", (corpo?.antes ?? "").includes("normal"), corpo?.antes);
  check("e põe o achado no lugar", (corpo?.depois ?? "").toLowerCase().includes("oligo"), corpo?.depois);
  check("a conclusão também muda", concl !== undefined && (concl.depois ?? "").toLowerCase().includes("oligo"));
  check("é marcado como patológico", oligo.patologico === true);
}

// O PONTO SUTIL: com a frase personalizada, é a frase DO MÉDICO que aparece
// riscada quando há oligoâmnio — não a do catálogo-base. Se isto quebrar, a
// tela risca um texto que aquele médico nunca teria visto.
const MINHA = "Volume de líquido amniótico dentro da normalidade.";
const vsCustom = variacoesDe([
  { op: "replace_phrase", slot: "liquido_amniotico", value: MINHA },
]) as Variacao[];
const oligoCustom = vsCustom.find((v) => v.id === "oligoamnio");
const antesCustom = oligoCustom?.mudancas.find((m) => m.secao === "corpo")?.antes ?? "";
check("com personalização, risca a frase DO MÉDICO", antesCustom.includes(MINHA), antesCustom);
check(
  "e não a do catálogo-base",
  !antesCustom.includes("pela análise subjetiva"),
  antesCustom,
);
check(
  "o que o achado põe no lugar NÃO muda com a personalização",
  (oligoCustom?.mudancas.find((m) => m.secao === "corpo")?.depois ?? "") ===
    (oligo?.mudancas.find((m) => m.secao === "corpo")?.depois ?? ""),
);

console.log(`\nContrato rota × tela da Biblioteca\n`);
for (const f of falhas) console.log("  ✗", f);
console.log(`\n${ok} passaram, ${falhas.length} falharam\n`);
process.exit(falhas.length === 0 ? 0 : 1);
