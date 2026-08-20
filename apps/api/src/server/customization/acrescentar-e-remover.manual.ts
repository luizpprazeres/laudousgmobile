/**
 * ACRESCENTAR e REMOVER linha nas categorias derivadas.
 *
 * O app sempre ofereceu os três botões. O servidor só executava dois: alterar e
 * remover. "Acrescentar frase depois desta" salvava o rascunho, publicava, e na
 * hora de gerar o conjunto INTEIRO era descartado — com a mensagem errada,
 * dizendo que o modelo tinha mudado. O médico contornava colando as linhas
 * novas dentro da frase que ele "alterava" (foi o que aconteceu no piloto da
 * cervical, 20/08).
 *
 *   pnpm exec tsx --env-file=../../.env src/server/customization/acrescentar-e-remover.manual.ts
 */
import { frasesBaseDe, frasesDeOperacoes } from "./resolveFrases";
import { aplicarFrasesPersonalizadas } from "@/server/pipeline/frasesPersonalizadas";
import { laudoPadraoDe } from "@/server/renderer/catalog/modeloNormalRegistry";
import { linhasDoLaudo, contarDados } from "@/server/renderer/catalog/modeloNormal";
import { validateOperations } from "@/server/renderer/catalog/engine";
import { resolveCatalogo } from "@/server/renderer/catalog/registry";
import type { Operation } from "@/server/renderer/catalog/types";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, cond: boolean, extra = "") => {
  if (cond) ok++;
  else falhas.push(`${nome}${extra ? `\n        ${extra}` : ""}`);
};

const CAT = "CERVICAL", EST = "CLASSICO_COMPLETO";
const laudo = laudoPadraoDe(CAT, EST)!;
const base = frasesBaseDe(CAT, EST);
const linhas = linhasDoLaudo(laudo);
const alvo = linhas.find((l) => contarDados(l.texto) === 0 && l.secao === "corpo") ?? linhas[0]!;
const entrada = resolveCatalogo(CAT, EST)!;
const nLinhas = (s: string) => s.split("\n").filter((x) => x.trim() !== "").length;

console.log("\n1 · ACRESCENTAR uma linha depois de outra\n");
{
  const ops: Operation[] = [
    { op: "insert_phrase_after", anchor: alvo.id, value: "Glândula tireoide de dimensões normais." },
  ];
  t("a operação passa na validação", validateOperations(entrada.catalog, ops).length === 0,
    JSON.stringify(validateOperations(entrada.catalog, ops)));

  const f = frasesDeOperacoes(ops, base);
  t("o resolver aceita — antes devolvia null", f !== null && f.length === 1, JSON.stringify(f));

  const r = aplicarFrasesPersonalizadas(laudo, f ?? []);
  t("a linha nova entra no laudo", r.texto.includes("Glândula tireoide de dimensões normais."));
  t("…e a âncora CONTINUA lá", r.texto.includes(alvo.texto), "a âncora sumiu");
  t("…logo depois dela", (() => {
    const L = r.texto.split("\n").map((x) => x.trim());
    return L.indexOf("Glândula tireoide de dimensões normais.") === L.indexOf(alvo.texto.trim()) + 1;
  })());
  t("o laudo ganhou exatamente UMA linha", nLinhas(r.texto) === nLinhas(laudo) + 1,
    `${nLinhas(laudo)} → ${nLinhas(r.texto)}`);
}

console.log("2 · ALTERAR e ACRESCENTAR na mesma âncora\n");
{
  // As duas são operações sobre a MESMA linha. Sem juntá-las por âncora, a
  // segunda sobrescrevia a primeira no mapa e metade se perdia.
  const ops: Operation[] = [
    { op: "replace_phrase", slot: alvo.id, value: "REDAÇÃO NOVA." },
    { op: "insert_phrase_after", anchor: alvo.id, value: "LINHA ACRESCENTADA." },
  ];
  const f = frasesDeOperacoes(ops, base);
  t("viram UMA frase com as duas coisas", f !== null && f.length === 1, JSON.stringify(f));
  const r = aplicarFrasesPersonalizadas(laudo, f ?? []);
  t("a redação nova entrou", r.texto.includes("REDAÇÃO NOVA."));
  t("a linha acrescentada entrou", r.texto.includes("LINHA ACRESCENTADA."));
  t("a frase original saiu", !r.texto.includes(alvo.texto));
  t("nesta ordem", r.texto.indexOf("REDAÇÃO NOVA.") < r.texto.indexOf("LINHA ACRESCENTADA."));
}

console.log("3 · DUAS acrescentadas na mesma âncora empilham na ordem\n");
{
  const ops: Operation[] = [
    { op: "insert_phrase_after", anchor: alvo.id, value: "PRIMEIRA." },
    { op: "insert_phrase_after", anchor: alvo.id, value: "SEGUNDA." },
  ];
  const r = aplicarFrasesPersonalizadas(laudo, frasesDeOperacoes(ops, base) ?? []);
  t("as duas entram", r.texto.includes("PRIMEIRA.") && r.texto.includes("SEGUNDA."));
  t("na ordem em que ele escreveu", r.texto.indexOf("PRIMEIRA.") < r.texto.indexOf("SEGUNDA."));
}

console.log("4 · REMOVER continua funcionando\n");
{
  const r = aplicarFrasesPersonalizadas(
    laudo,
    frasesDeOperacoes([{ op: "remove_slot", slot: alvo.id }], base) ?? [],
  );
  t("a linha sai do laudo", !r.texto.includes(alvo.texto));
  t("o laudo perdeu exatamente UMA linha", nLinhas(r.texto) === nLinhas(laudo) - 1);
}

console.log("5 · o que o derivado NÃO sabe fazer é recusado ao SALVAR\n");
{
  // Antes: salvava, publicava, e o laudo saía no padrão dizendo que o modelo
  // tinha mudado. Agora a recusa é na cara do médico, quando ele ainda pode
  // escolher outra coisa.
  const erros = validateOperations(entrada.catalog, [
    { op: "append_conclusion_item", value: "Sugere-se correlação clínica." },
  ]);
  t("item novo na conclusão é recusado na derivada", erros.length > 0, JSON.stringify(erros));
  t("…e o erro diz o que fazer no lugar", /acrescente a frase depois/.test(erros.join(" ")), erros.join(" "));

  // No catálogo ESCRITO continua valendo — lá o motor monta slot a slot.
  const obst = resolveCatalogo("OBSTETRICA", EST)!;
  t("no catálogo escrito continua permitido",
    validateOperations(obst.catalog, [{ op: "append_conclusion_item", value: "Controle em 4 semanas." }]).length === 0);
  t("o derivado se declara derivado", entrada.catalog.derivado === true);
  t("o escrito não", obst.catalog.derivado !== true);
}

console.log("6 · acrescentar depois de uma linha que some é recusado\n");
{
  const erros = validateOperations(entrada.catalog, [
    { op: "insert_phrase_after", anchor: alvo.id, value: "Órfã." },
    { op: "remove_slot", slot: alvo.id },
  ]);
  t("a combinação é recusada", erros.length > 0, JSON.stringify(erros));
}

console.log("7 · o caso REAL do piloto continua igual\n");
{
  // O Luiz colou as linhas novas dentro do replace. Isso tem de seguir
  // funcionando — há uma publicação em produção assim.
  const ops: Operation[] = [{
    op: "replace_phrase", slot: alvo.id,
    value: `${alvo.texto}\n\nGlândula tireoide de dimensões normais.`,
  }];
  const r = aplicarFrasesPersonalizadas(laudo, frasesDeOperacoes(ops, base) ?? []);
  t("o replace multilinha segue funcionando",
    r.texto.includes(alvo.texto) && r.texto.includes("Glândula tireoide de dimensões normais."));
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — alterar, acrescentar e remover, os três de verdade`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
