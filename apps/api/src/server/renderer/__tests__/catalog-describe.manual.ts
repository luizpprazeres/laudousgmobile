/**
 * A projeção que a Biblioteca consome (describeCatalog) e o fluxo de prévia.
 *
 * Garante que a interface recebe informação suficiente e correta para (a) mostrar
 * o modelo frase a frase, (b) saber o que é editável e (c) explicar a recusa
 * quando não é.
 *
 * Rodar: pnpm exec tsx apps/api/src/server/renderer/__tests__/catalog-describe.manual.ts
 */
import { applyCustomization, validateOperations } from "../catalog/engine";
import { describeCatalog } from "../catalog/describe";
import { OBSTETRICA_CLASSICO } from "../catalog/OBSTETRICA.classico";
import { OBSTETRICA_SAMPLES } from "../catalog/OBSTETRICA.samples";
import { renderObstetricaCatalogo } from "../catalog/OBSTETRICA.render";
import type { Operation } from "../catalog/types";

let pass = 0, fail = 0;
function check(nome: string, cond: boolean, detalhe?: string) {
  if (cond) { pass++; console.log(`  ✓ ${nome}`); }
  else { fail++; console.log(`  ✗ ${nome}`); if (detalhe) console.log(detalhe); }
}

const flags = { igCorrection: false, flexivel: false, grannum: false, objetivo: false };
const d = describeCatalog(OBSTETRICA_CLASSICO, [
  { nome: "Gestação padrão", ctx: { findings: OBSTETRICA_SAMPLES[0]!.findings, fetoIndex: 0, gemelar: false, flags } },
  { nome: "Gestação inicial", ctx: { findings: OBSTETRICA_SAMPLES[1]!.findings, fetoIndex: 0, gemelar: false, flags } },
  { nome: "Gemelar", ctx: { findings: OBSTETRICA_SAMPLES[2]!.findings, fetoIndex: 0, gemelar: true, flags } },
]);

console.log("\n[D1] A projeção é serializável e completa\n");

check("é JSON puro (sem funções)", JSON.stringify(d).length > 0 && !JSON.stringify(d).includes("function"));
// A versão não é cravada: cravar quebra o teste a cada bump do catálogo sem que
// a garantia — a projeção espelhar a base — tenha sido violada (aconteceu no
// v1→v2, 16/08). O que se afirma é que `describeCatalog` copia fielmente.
check("traz id, categoria, estilo e versão",
  d.id === "OBSTETRICA/CLASSICO_COMPLETO" && d.categoria === "OBSTETRICA" &&
  d.estilo === "CLASSICO_COMPLETO" && d.versao === OBSTETRICA_CLASSICO.versao);
check("traz as três ordens de exibição", d.ordens.length === 3 && d.ordens.every((o) => o.slots.length > 0));
check("todo slot de toda ordem existe na lista de slots",
  d.ordens.every((o) => o.slots.every((s) => d.slots.some((x) => x.id === s))),
  `    faltando: ${d.ordens.flatMap((o) => o.slots).filter((s) => !d.slots.some((x) => x.id === s)).join(", ")}`);
check("a ordem do gemelar repete os slots por feto",
  (d.ordens.find((o) => o.nome === "Gemelar")?.slots ?? []).includes("feto_header"));

console.log("\n[D2] A interface sabe o que é editável — e por quê\n");

const dbp = d.slots.find((s) => s.id === "dbp")!;
check("DBP é obrigatório e declara o dado que precisa conservar",
  dbp.obrigatorio && dbp.placeholdersObrigatorios.includes("dbp"));
check("a variante padrão de DBP é editável", dbp.variantes.find((v) => v.padrao)?.editavel === true);

const placenta = d.slots.find((s) => s.id === "placenta")!;
const descrita = placenta.variantes.find((v) => v.id === "descrita")!;
check("a placenta descrita NÃO é editável", descrita.editavel === false);
check("e a interface recebe o motivo, em português", Boolean(descrita.motivo?.includes("achado alterado")));
check("a placenta normal continua editável",
  placenta.variantes.find((v) => v.padrao)?.editavel === true);
// A `normal` da placenta ganhou um `quando` (para não convier com o achado
// agudo) e com isso deixou de ser o fallback do slot. Sem `padrao: true`
// explícito, a Biblioteca perdia a única frase de placenta reescrevível.
check("a variante padrão da placenta é a NORMAL, não a primeira da lista",
  placenta.variantes.find((v) => v.padrao)?.id === "normal");
// O que a validação aceita tem de ser o que a aplicação altera. Enquanto as
// duas regras divergiam, esta operação passava e não mudava nada.
check("reescrever sem dizer a variante atinge a padrão — e chega ao laudo",
  (() => {
    const op: Operation[] = [{ op: "replace_phrase", slot: "placenta", value: "\nPlacenta com aspecto habitual." }];
    if (validateOperations(OBSTETRICA_CLASSICO, op).length > 0) return false;
    const cc = applyCustomization(OBSTETRICA_CLASSICO, {
      baseCatalogId: OBSTETRICA_CLASSICO.id, baseVersao: OBSTETRICA_CLASSICO.versao, operations: op,
    });
    const s = OBSTETRICA_SAMPLES.find((x) => x.id === "padrao")!;
    return renderObstetricaCatalogo({
      findings: s.findings, flags, catalog: cc.catalog, customSlots: cc.customSlots,
      extraConclusao: cc.extraConclusao,
    }).includes("Placenta com aspecto habitual.");
  })());

// Slot de achado é CONDICIONAL mas não removível — as duas travas do servidor
// precisam chegar à interface, senão ela oferece um botão que será recusado.
for (const id of ["cranio_achado", "placenta_achado", "cordao_umbilical", "movimentos_achado"]) {
  check(`"${id}" chega à interface como não removível`,
    d.slots.find((s) => s.id === id)?.removivel === false);
}
check("um slot comum continua removível", d.slots.find((s) => s.id === "ovarios")?.removivel === true);
check("slot obrigatório não é removível", d.slots.find((s) => s.id === "dbp")?.removivel === false);

const liquido = d.slots.find((s) => s.id === "liquido_amniotico")!;
// O líquido alterado PASSOU a ser editável (decisão do Luiz, 16/08): a frase é
// texto com dado, e o que a protege é conservar `{liquido_classe}`, não o
// bloqueio. Ver SlotVariant.personalizavel.
check("o líquido alterado é editável, com a classe travada",
  liquido.variantes.find((v) => v.id === "alterado")?.editavel === true &&
  OBSTETRICA_CLASSICO.slots.find((s) => s.id === "liquido_amniotico")!
    .variantes.find((v) => v.id === "alterado")!.placeholdersObrigatorios?.includes("liquido_classe") === true);
check("o líquido normal é editável",
  liquido.variantes.find((v) => v.padrao)?.editavel === true);
// O que sobra não-editável é o caso legítimo: frase montada por partes
// condicionais, que não existe como texto com lacunas.
check("a placenta descrita segue não editável (montada pelo motor)",
  d.slots.find((s) => s.id === "placenta")!.variantes.find((v) => v.id === "descrita")?.editavel === false);
check("e os achados de crânio agora SÃO editáveis",
  d.slots.find((s) => s.id === "cranio_achado")!.variantes.every((v) => v.editavel));
check("toda variante não editável explica o motivo",
  d.slots.flatMap((s) => s.variantes).filter((v) => !v.editavel).every((v) => Boolean(v.motivo)));

check("nenhuma frase exposta contém placeholder fora do vocabulário",
  d.slots.flatMap((s) => s.variantes).every((v) =>
    [...(v.frase ?? "").matchAll(/\{(\w+)\}/g)].every((m) => d.variaveis.includes(m[1] as string))));

console.log("\n[D3] O fluxo de prévia da tela\n");

const ops: Operation[] = [
  { op: "replace_phrase", slot: "saco_gestacional", value: "Saco gestacional de forma normal, medindo {sg_medidas} mm, com diâmetro médio de {dsm} mm." },
  { op: "replace_phrase", slot: "liquido_amniotico", value: "Líquido amniótico de quantidade normal." },
  { op: "append_conclusion_item", value: "Recomenda-se controle ecográfico em 4 semanas." },
];
check("as operações da tela passam na validação", validateOperations(OBSTETRICA_CLASSICO, ops).length === 0);

const c = applyCustomization(OBSTETRICA_CLASSICO, {
  baseCatalogId: OBSTETRICA_CLASSICO.id, baseVersao: OBSTETRICA_CLASSICO.versao, operations: ops,
});
const previa = (id: string) => {
  const s = OBSTETRICA_SAMPLES.find((x) => x.id === id)!;
  const base = renderObstetricaCatalogo({ findings: s.findings, flags });
  const custom = renderObstetricaCatalogo({
    findings: s.findings, flags, catalog: c.catalog, customSlots: c.customSlots, extraConclusao: c.extraConclusao,
  });
  return { base, custom, mudou: base !== custom };
};

const inicial = previa("inicial");
check("no cenário inicial, as 3 medidas aparecem",
  inicial.custom.includes("medindo 20,3 x 10,4 x 15,4 mm"));
check("e o item fixo entra na conclusão",
  inicial.custom.trimEnd().endsWith("Recomenda-se controle ecográfico em 4 semanas."));

const oligo = previa("oligoamnio");
check("no cenário de oligoâmnio, o achado sobrevive",
  oligo.custom.includes("oligoâmnio") && !oligo.custom.includes("Líquido amniótico de quantidade normal.\n"));

check("um item fixo na conclusão muda TODOS os cenários (inclusive os patológicos)",
  OBSTETRICA_SAMPLES.every((s) => previa(s.id).mudou));

// Já uma operação que só toca a normalidade tem de deixar o patológico intacto —
// é o sinal que a tela usa para mostrar "aqui o laudo não muda".
const soLiquido = applyCustomization(OBSTETRICA_CLASSICO, {
  baseCatalogId: OBSTETRICA_CLASSICO.id, baseVersao: OBSTETRICA_CLASSICO.versao,
  operations: [{ op: "replace_phrase", slot: "liquido_amniotico", value: "Líquido amniótico de quantidade normal." }],
});
const mudouCom = (id: string) => {
  const s = OBSTETRICA_SAMPLES.find((x) => x.id === id)!;
  return (
    renderObstetricaCatalogo({ findings: s.findings, flags }) !==
    renderObstetricaCatalogo({
      findings: s.findings, flags, catalog: soLiquido.catalog,
      customSlots: soLiquido.customSlots, extraConclusao: soLiquido.extraConclusao,
    })
  );
};
check("personalizar o líquido normal muda o cenário padrão", mudouCom("padrao"));
check("…e NÃO muda o cenário de oligoâmnio", !mudouCom("oligoamnio"));

console.log("\n[D4] Cenários de exemplo não carregam dado de paciente\n");
// Só os findings — `nome`/`descricao` do cenário são rótulos da interface.
const textoFindings = JSON.stringify(OBSTETRICA_SAMPLES.map((s) => s.findings));
check("nenhum campo de identificação nos findings dos cenários",
  !/paciente|\bcpf\b|prontuario|nascimento|"nome"/i.test(textoFindings));
check("nenhum laudo de exemplo contém nome próprio plausível",
  OBSTETRICA_SAMPLES.every((s) =>
    !/\b(sra?\.|paciente|nome:)/i.test(renderObstetricaCatalogo({ findings: s.findings, flags }))));
check("todos os cenários renderizam sem erro",
  OBSTETRICA_SAMPLES.every((s) => renderObstetricaCatalogo({ findings: s.findings, flags }).length > 0));
check("há pelo menos um cenário patológico para testar a proteção",
  OBSTETRICA_SAMPLES.some((s) => s.patologico));

console.log(`\n${pass} passaram, ${fail} falharam\n`);
if (fail > 0) process.exit(1);
