/**
 * O CAMINHO INTEIRO da personalização — rascunho → publicar → laudo.
 *
 * Este é o gate que autoriza `MODEL_CUSTOMIZATION_CATEGORIES`. Todos os outros
 * testam pedaços: validação, aplicação, projeção. Aqui se afirma o que o médico
 * vive — ele reescreve uma frase, publica, gera um laudo, e o laudo sai com a
 * frase dele — e, sobretudo, o que NÃO pode acontecer.
 *
 * São DOIS caminhos e eles funcionam por mecanismos opostos:
 *   OBSTETRICA  → catálogo: o laudo é MONTADO com as frases dele
 *   as outras   → overlay: o laudo é montado como sempre e as linhas trocadas
 *
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/customization/personalizacao-ponta-a-ponta.manual.ts
 */
import { applyCustomization, validateOperations } from "@/server/renderer/catalog/engine";
import { OBSTETRICA_CLASSICO } from "@/server/renderer/catalog/OBSTETRICA.classico";
import { OBSTETRICA_SAMPLES } from "@/server/renderer/catalog/OBSTETRICA.samples";
import { renderObstetricaCatalogo } from "@/server/renderer/catalog/OBSTETRICA.render";
import { aplicarFrasesPersonalizadas } from "@/server/pipeline/frasesPersonalizadas";
import { frasesBaseDe, frasesDeOperacoes } from "./resolveFrases";
import { laudoPadraoDe } from "@/server/renderer/catalog/modeloNormalRegistry";
import { linhasDoLaudo } from "@/server/renderer/catalog/modeloNormal";
import type { Operation } from "@/server/renderer/catalog/types";

let ok = 0;
const falhas: string[] = [];
function t(nome: string, cond: boolean, detalhe = "") {
  if (cond) ok++;
  else falhas.push(`${nome}${detalhe ? `\n        ${detalhe}` : ""}`);
}

const FLAGS = { igCorrection: false, flexivel: false, grannum: false, objetivo: false };
const padrao = OBSTETRICA_SAMPLES.find((s) => s.id === "padrao")!.findings;

function comOps(ops: Operation[], findings = padrao): string {
  const c = applyCustomization(OBSTETRICA_CLASSICO, {
    baseCatalogId: OBSTETRICA_CLASSICO.id,
    baseVersao: OBSTETRICA_CLASSICO.versao,
    operations: ops,
  });
  return renderObstetricaCatalogo({
    findings, flags: FLAGS, catalog: c.catalog,
    customSlots: c.customSlots, extraConclusao: c.extraConclusao,
  });
}

console.log("\nPersonalização ponta a ponta\n");

// ------------------------------------------------- 1 · o caminho do CATÁLOGO
console.log("1 · OBSTETRICA — a frase do médico é MONTADA no laudo");
{
  const ops: Operation[] = [{
    op: "replace_phrase", slot: "anatomia_visceras",
    value: "O estômago e a bexiga fetais foram identificados, com ecotextura preservada.",
  }];
  t("a operação passa na validação", validateOperations(OBSTETRICA_CLASSICO, ops).length === 0);
  const laudo = comOps(ops);
  t("a frase dele sai no laudo", laudo.includes("ecotextura preservada"));
  t("a frase padrão sai de cena", !laudo.includes("bem identificados e com ecotextura homogênea"));
  t("o resto do laudo continua", laudo.includes("Diâmetro biparietal") && laudo.includes("CONCLUSÃO:"));
}
{
  // O dado do exame precisa sobreviver à redação nova.
  const ops: Operation[] = [{ op: "replace_phrase", slot: "dbp", value: "DBP: {dbp} mm." }];
  t("reescrever conservando o dado é aceito", validateOperations(OBSTETRICA_CLASSICO, ops).length === 0);
  t("…e o VALOR do exame entra na frase dele", comOps(ops).includes("DBP: 85 mm."));

  const semDado: Operation[] = [{ op: "replace_phrase", slot: "dbp", value: "Biometria normal." }];
  t("reescrever APAGANDO o dado é recusado", validateOperations(OBSTETRICA_CLASSICO, semDado).length > 0);
}

// ------------------------------------- 2 · o que a personalização NÃO pode fazer
console.log("2 · os invariantes seguram, mesmo com o médico no comando");
{
  t("slot obrigatório não pode ser removido",
    validateOperations(OBSTETRICA_CLASSICO, [{ op: "remove_slot", slot: "dbp" }]).length > 0);
  for (const slot of ["cranio_achado", "placenta_achado", "bcf", "pielectasia", "ascite", "hidropsia"]) {
    t(`"${slot}" (achado) não pode ser removido`,
      validateOperations(OBSTETRICA_CLASSICO, [{ op: "remove_slot", slot }]).length > 0);
  }
  t("reescrever a ventriculomegalia SEM a medida é recusado",
    validateOperations(OBSTETRICA_CLASSICO, [{
      op: "replace_phrase", slot: "cranio_achado", variant: "ventriculomegalia",
      value: "\nVentriculomegalia.",
    }]).length > 0);
  t("cabeçalho de seção na frase é recusado",
    validateOperations(OBSTETRICA_CLASSICO, [{
      op: "replace_phrase", slot: "anatomia_visceras", value: "CONCLUSÃO: normal",
    }]).length > 0);
  t("placeholder que não existe é recusado",
    validateOperations(OBSTETRICA_CLASSICO, [{
      op: "replace_phrase", slot: "anatomia_visceras", value: "Vísceras {inexistente}.",
    }]).length > 0);
}
{
  /**
   * O TESTE QUE MAIS IMPORTA: a personalização não pode fazer um laudo COM
   * ACHADO parecer normal. O médico reescreve a frase de normalidade das
   * vísceras; num exame com ascite, a frase dele sai — e a ascite TAMBÉM.
   */
  const comAscite = {
    ...padrao,
    fetos: [{ ...padrao.fetos[0]!, ascite: true }],
  } as typeof padrao;
  const laudo = comOps(
    [{ op: "replace_phrase", slot: "anatomia_visceras", value: "Vísceras fetais sem alterações." }],
    comAscite,
  );
  t("a redação dele aparece", laudo.includes("Vísceras fetais sem alterações."));
  t("…e a ASCITE continua no corpo", /líquido anecoico na cavidade abdominal fetal/i.test(laudo),
    laudo.slice(0, 200));
  t("…e na conclusão", /Ascite fetal\./.test(laudo));
}

// -------------------------- 2b · os três juntos: personalização + achado + gemelar
console.log("2b · personalização + achado + GEMELAR ao mesmo tempo");
{
  /**
   * Os três caminhos que mais mexem no laudo, no mesmo exame. Cada um já tem
   * teste isolado; o risco mora na combinação — a personalização atua sobre o
   * catálogo, o achado escolhe outra variante, e o gemelar repete o slot por
   * feto e reordena a conclusão.
   */
  const gemelar = OBSTETRICA_SAMPLES.find((s) => s.id === "gemelar")!.findings;
  const comObito = {
    ...gemelar,
    fetos: gemelar.fetos.map((ft, i) =>
      i === 1 ? { ...ft, bcf_alteracao: "ausente" as const, bcf_bpm: null, cordao_vasos: "dois" as const } : ft,
    ),
  } as typeof gemelar;

  const laudo = comOps(
    [{ op: "replace_phrase", slot: "liquido_amniotico", value: "Líquido amniótico sem alterações." }],
    comObito,
  );
  t("a redação dele aparece no gemelar", laudo.includes("Líquido amniótico sem alterações."));
  t("o óbito do feto B sobrevive", /Ausência de batimentos cardíacos fetais/i.test(laudo));
  t("…e é ATRIBUÍDO na conclusão", /Óbito fetal \(feto B\)\./.test(laudo), laudo.slice(-320));
  t("a artéria única também", /Artéria umbilical única \(feto B\)\./.test(laudo));
  t("o feto A mantém o BCF dele", /BCF = 140 bpm/.test(laudo));
  t("e não vaza atribuição para o feto A", !/\(feto A\)/.test(laudo.split("CONCLUSÃO:")[1] ?? ""));
}

// ------------------------------------------------ 3 · o caminho do OVERLAY
console.log("3 · categorias derivadas — a linha é TROCADA no laudo pronto");
for (const cat of ["ABDOMEN_SUPERIOR", "TIREOIDE", "PELVE_FEMININA"]) {
  const laudo = laudoPadraoDe(cat, "CLASSICO_COMPLETO");
  if (!laudo) { falhas.push(`${cat}: sem modelo`); continue; }
  // Qualquer linha do corpo serve — inclusive as COM medida: na tireoide todas
  // têm. Prefixar o texto original preserva as lacunas, que é justamente o que
  // a validação exige da redação nova.
  const alvo = linhasDoLaudo(laudo).find((l) => l.secao === "corpo");
  if (!alvo) { falhas.push(`${cat}: sem linha de corpo`); continue; }

  const nova = `REESCRITO: ${alvo.texto}`;
  const frases = frasesDeOperacoes(
    [{ op: "replace_phrase", slot: alvo.id, value: nova }],
    frasesBaseDe(cat, "CLASSICO_COMPLETO"),
  );
  const r = aplicarFrasesPersonalizadas(laudo, frases);
  t(`${cat}: a redação dele sai no laudo`, r.aplicadas === 1 && r.texto.includes(nova));
  t(`${cat}: o laudo não muda de tamanho`, r.texto.split("\n").length === laudo.split("\n").length);

  // FAIL-SAFE: com achado, a linha de normalidade não existe e nada é trocado.
  const comAchado = laudo.replace(alvo.texto, "Achado patológico descrito pelo médico.");
  const r2 = aplicarFrasesPersonalizadas(comAchado, frases);
  t(`${cat}: laudo com achado sai INTOCADO`, r2.texto === comAchado && r2.aplicadas === 0);
}

// ------------------------------------------------------- 3b · ISOLAMENTO
console.log("3b · uma personalização não vaza para onde não devia");
{
  /**
   * O gate que importa não é "a frase apareceu" — é provar que ela NÃO aparece
   * onde não foi pedida (crítica do Codex, 19/08).
   *
   * O mesmo SLOT vive em cenários diferentes com VARIANTES diferentes: `bcf`
   * tem `padrao` no exame de rotina e `inicial` na gestação inicial. Reescrever
   * sem dizer a variante atinge só a padrão — e o cenário inicial tem de sair
   * intocado.
   */
  const inicial = OBSTETRICA_SAMPLES.find((s) => s.id === "inicial")!.findings;
  const ops: Operation[] = [{
    op: "replace_phrase", slot: "bcf",
    value: "Batimentos cardíacos audíveis e regulares (BCF = {bcf} bpm).",
  }];
  t("a redação nova sai no cenário PADRÃO", comOps(ops).includes("audíveis e regulares"));
  t("…e o cenário INICIAL fica intocado",
    !comOps(ops, inicial).includes("audíveis e regulares") &&
      comOps(ops, inicial).includes("Batimentos cardíacos ritmados"),
    comOps(ops, inicial).split("\n").find((l) => /Batimentos/.test(l)) ?? "");

  // E a variante de ACHADO do mesmo slot também não é atingida.
  const comObitoUnico = {
    ...padrao,
    fetos: [{ ...padrao.fetos[0]!, bcf_alteracao: "ausente" as const, bcf_bpm: null }],
  } as typeof padrao;
  t("…e a variante de ÓBITO do mesmo slot também não",
    !comOps(ops, comObitoUnico).includes("audíveis e regulares") &&
      /Ausência de batimentos cardíacos fetais/.test(comOps(ops, comObitoUnico)));
}
{
  /**
   * O SIMÉTRICO, e é o que a TELA precisa dizer: um slot que existe em todos os
   * cenários muda em TODOS. Não é vazamento — é a mesma frase —, mas o médico
   * personaliza olhando UM cenário e o efeito é global. Se um dia isso deixar
   * de ser verdade, este teste avisa.
   */
  const gemelar = OBSTETRICA_SAMPLES.find((s) => s.id === "gemelar")!.findings;
  const ops: Operation[] = [{
    op: "replace_phrase", slot: "liquido_amniotico", value: "Líquido amniótico preservado.",
  }];
  t("slot comum a todos os cenários muda em TODOS — comportamento esperado",
    comOps(ops).includes("Líquido amniótico preservado.") &&
      comOps(ops, gemelar).includes("Líquido amniótico preservado."));
}
{
  /**
   * INSTÂNCIA: no gemelar o slot é o mesmo para os dois fetos. Personalizar
   * atinge os dois — e tem de atingir, senão o laudo descreveria os fetos com
   * redações diferentes sem que o médico tivesse pedido.
   */
  const gemelar = OBSTETRICA_SAMPLES.find((s) => s.id === "gemelar")!.findings;
  const laudo = comOps(
    [{ op: "replace_phrase", slot: "peso_fetal", value: "Peso estimado: {peso} gramas{peso_extras}." }],
    gemelar,
  );
  const ocorrencias = (laudo.match(/Peso estimado:/g) ?? []).length;
  t("no gemelar a redação vale para os DOIS fetos", ocorrencias === 2, `${ocorrencias} ocorrência(s)`);
  t("…e cada um com o SEU peso", laudo.includes("2100 gramas") && laudo.includes("2380 gramas"));
}

// --------------------------------------------- 4 · a trava de versão do base
console.log("4 · personalização de outra versão não se aplica");
{
  let lancou = false;
  try {
    applyCustomization(OBSTETRICA_CLASSICO, {
      baseCatalogId: OBSTETRICA_CLASSICO.id,
      baseVersao: OBSTETRICA_CLASSICO.versao - 1,
      operations: [{ op: "replace_phrase", slot: "anatomia_visceras", value: "X." }],
    });
  } catch { lancou = true; }
  t("versão anterior do base é recusada", lancou);
  t("o catálogo está na versão que a estrutura de hoje merece",
    OBSTETRICA_CLASSICO.versao >= 3, `v${OBSTETRICA_CLASSICO.versao}`);
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — o caminho inteiro está sob controle`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
