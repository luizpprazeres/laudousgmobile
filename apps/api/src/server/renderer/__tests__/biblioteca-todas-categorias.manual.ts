/**
 * A Biblioteca responde para TODAS as categorias — e o que ela devolve serve.
 *
 * Este é o teste do sintoma que o Luiz relatou: "entro na Biblioteca do iOS e
 * só aparece o modelo obstétrico". O que se afirma aqui é o caminho inteiro:
 * a categoria resolve, a projeção chega completa, a operação passa na
 * validação, e a redação sai no laudo.
 *
 *   pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/biblioteca-todas-categorias.manual.ts
 */
import { describeCatalog } from "../catalog/describe";
import { validateOperations } from "../catalog/engine";
import { categoriasDaBiblioteca, resolveCatalogo, ehDerivado, flagsDeProducao } from "../catalog/registry";
import { laudoPadraoDe } from "../catalog/modeloNormalRegistry";
import { linhasDoLaudo, contarDados } from "../catalog/modeloNormal";
import { aplicarFrasesPersonalizadas } from "@/server/pipeline/frasesPersonalizadas";
import { frasesBaseDe, frasesDeOperacoes } from "@/server/customization/resolveFrases";
import type { Operation } from "../catalog/types";

let ok = 0;
const falhas: string[] = [];
function t(nome: string, cond: boolean, detalhe = "") {
  if (cond) ok++;
  else falhas.push(`${nome}${detalhe ? `\n        ${detalhe}` : ""}`);
}

const ESTILO = "CLASSICO_COMPLETO";
const cats = categoriasDaBiblioteca();

console.log("\nBiblioteca × todas as categorias\n");
console.log(`  ${"categoria".padEnd(24)} ${"slots".padStart(5)} ${"edit".padStart(5)}  fonte`);
console.log(`  ${"─".repeat(24)} ${"─".repeat(5)} ${"─".repeat(5)}  ${"─".repeat(22)}`);

t("a Biblioteca lista mais de uma categoria", cats.length >= 13, `listou ${cats.length}`);

for (const c of cats) {
  const entrada = resolveCatalogo(c.categoria, ESTILO);
  if (!entrada) {
    falhas.push(`${c.categoria}: resolveCatalogo devolveu undefined — a rota daria 404`);
    console.log(`  ${c.categoria.padEnd(24)} ${"—".padStart(5)}        ✗ 404`);
    continue;
  }

  const d = describeCatalog(entrada.catalog, [
    { nome: "Modelo padrão", ctx: { findings: entrada.samples[0]!.findings as never, fetoIndex: 0, gemelar: false, flags: flagsDeProducao() } },
  ], entrada.renderizarExemplo);

  const editaveis = d.slots.flatMap((s) => s.variantes).filter((v) => v.editavel && v.frase).length;
  console.log(`  ${c.categoria.padEnd(24)} ${String(d.slots.length).padStart(5)} ${String(editaveis).padStart(5)}  ${c.derivado ? "derivado do renderer" : "catálogo escrito"}`);

  // 1 · a projeção chega utilizável
  t(`${c.categoria}: tem slots`, d.slots.length > 0);
  t(`${c.categoria}: tem frase editável`, editaveis > 0, "a tela não teria o que mostrar");
  t(`${c.categoria}: a ordem cobre os slots`, d.ordens[0]!.slots.length > 0);
  t(`${c.categoria}: todo slot da ordem existe`,
    d.ordens[0]!.slots.every((id) => d.slots.some((s) => s.id === id)));
  t(`${c.categoria}: a projeção é JSON puro`, !JSON.stringify(d).includes("function"));

  if (!ehDerivado(c.categoria, ESTILO)) continue;

  // 2 · ida e volta COMPLETA nas derivadas: editar → validar → aplicar no laudo
  const laudo = laudoPadraoDe(c.categoria, ESTILO)!;
  const linhas = linhasDoLaudo(laudo);
  const alvo = linhas.find((l) => contarDados(l.texto) === 0 && l.secao === "corpo") ?? linhas[0]!;

  const nova = `REESCRITO: ${alvo.texto}`;
  const ops: Operation[] = [{ op: "replace_phrase", slot: alvo.id, value: nova }];
  t(`${c.categoria}: a operação passa na validação`, validateOperations(entrada.catalog, ops).length === 0,
    JSON.stringify(validateOperations(entrada.catalog, ops)));

  const frases = frasesDeOperacoes(ops, frasesBaseDe(c.categoria, ESTILO));
  t(`${c.categoria}: a operação vira uma troca de frase`, frases.length === 1);

  const r = aplicarFrasesPersonalizadas(laudo, frases);
  t(`${c.categoria}: a redação sai no laudo`, r.aplicadas === 1 && r.texto.includes(nova),
    `aplicadas=${r.aplicadas}`);
  t(`${c.categoria}: e o resto do laudo não muda`,
    r.texto.split("\n").length === laudo.split("\n").length);

  // 3 · a lacuna é obrigatória onde há dado
  const comDado = linhas.find((l) => contarDados(l.texto) > 0);
  if (comDado) {
    const semLacuna: Operation[] = [{ op: "replace_phrase", slot: comDado.id, value: "Frase sem o dado." }];
    t(`${c.categoria}: reescrever apagando o dado é recusado`,
      validateOperations(entrada.catalog, semLacuna).length > 0,
      `"${comDado.texto.slice(0, 60)}"`);
  }
}

// -------------------------------------------------- OBSTETRICA continua rica
console.log("\nO catálogo escrito não foi rebaixado pelo derivado");
{
  t("OBSTETRICA não é derivada", !ehDerivado("OBSTETRICA", ESTILO));
  const e = resolveCatalogo("OBSTETRICA", ESTILO)!;
  t("e mantém as variantes de achado", e.catalog.slots.some((s) => s.variantes.length > 3));
  t("e os cenários de exemplo", e.samples.length >= 6, `${e.samples.length} cenários`);
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — a Biblioteca serve todas as categorias`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
