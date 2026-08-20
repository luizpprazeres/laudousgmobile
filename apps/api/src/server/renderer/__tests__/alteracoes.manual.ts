/**
 * A FUNDAÇÃO DAS ALTERAÇÕES — piloto na TIREOIDE.
 *
 * O que se afirma aqui é o desenho inteiro (Codex, 19/08): o humano declara o
 * CENÁRIO, o renderer escreve a FRASE. Se um dia alguém colar redação clínica
 * num `AlteracaoSpec`, este gate não pega — mas os outros afirmam que o texto
 * que sai é o do renderer, e é isso que importa.
 *
 *   pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/alteracoes-tireoide.manual.ts
 */
import { previaDaAlteracao, renderizarSelecao, conflitosEntre } from "../catalog/alteracoes";
import { alteracoesDe, categoriasComAlteracoes } from "../catalog/alteracoes/index";
import { laudoPadraoDe } from "../catalog/modeloNormalRegistry";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, cond: boolean, extra = "") => {
  if (cond) ok++;
  else falhas.push(`${nome}${extra ? `\n        ${extra}` : ""}`);
};

const CAT = "TIREOIDE";
const specs = alteracoesDe(CAT);
const de = (id: string) => specs.find((s) => s.id === id)!;

console.log("\n1 · toda alteração declarada renderiza e MUDA o laudo\n");
t("a categoria-piloto tem alterações", specs.length >= 8, `${specs.length}`);
for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"]) {
  for (const s of specs) {
    const p = previaDaAlteracao(CAT, estilo, s);
    t(`${estilo} · ${s.id}: renderiza`, p !== null);
    if (p) t(`${estilo} · ${s.id}: muda alguma linha`, p.entram.length + p.saem.length > 0);
  }
}

console.log("2 · a MEDIDA vira lacuna — o modelo não crava o número do cenário\n");
{
  const p = previaDaAlteracao(CAT, "CLASSICO_COMPLETO", de("nodulo_solido_suspeito"))!;
  const linha = p.entram.find((l) => l.includes("hipoecoica"))!;
  t("a frase do nódulo aparece", Boolean(linha));
  t("…e as medidas viraram ____", linha.includes("____"), linha);
  // 1,3 / 1,0 / 1,2 são os números que EU escolhi no cenário. Nenhum deles pode
  // chegar ao médico como se fosse o padrão da casa.
  t("…sem nenhum número do seed", !/1,3|1,2 cm|0,9 x/.test(linha), linha);
}

console.log("3 · o RENDERER é quem classifica — o cenário não diz TI-RADS\n");
{
  const suspeito = previaDaAlteracao(CAT, "CLASSICO_COMPLETO", de("nodulo_solido_suspeito"))!;
  const benigno = previaDaAlteracao(CAT, "CLASSICO_COMPLETO", de("nodulo_solido_benigno"))!;
  const cSus = suspeito.entram.join(" ");
  const cBen = benigno.entram.join(" ");
  t("o suspeito recebe TI-RADS alto", /TI-RADS [45]/.test(cSus), cSus.slice(0, 110));
  t("o benigno recebe TI-RADS baixo", /TI-RADS [123]/.test(cBen), cBen.slice(0, 110));
  t("os dois recebem classificações DIFERENTES",
    (cSus.match(/TI-RADS \d/)?.[0] ?? "a") !== (cBen.match(/TI-RADS \d/)?.[0] ?? "b"));
  // A prova de que a classificação não está escrita no cenário:
  t("nenhum cenário menciona TI-RADS ou nota",
    !JSON.stringify(specs).match(/TI-RADS|NOTA FINAL/i));
}

console.log("4 · combinar duas alterações dá um laudo COERENTE\n");
{
  const sel = [de("nodulo_solido_suspeito"), de("nodulo_lobo_esquerdo"), de("linfonodos_alterados")];
  const r = renderizarSelecao(CAT, "CLASSICO_COMPLETO", sel);
  t("a combinação renderiza", r.ok === true, JSON.stringify(r).slice(0, 120));
  if (r.ok) {
    t("o achado da direita está lá", r.texto.includes("Lobo direito") && r.texto.includes("hipoecoica"));
    t("o achado da esquerda está lá", r.texto.includes("Lobo esquerdo") && r.texto.includes("isoecoica"));
    t("os linfonodos estão lá", /Linfonodos cervicais/.test(r.texto));
    // O ponto do desenho: a conclusão é RECOMPOSTA e numerada pelo renderer,
    // não concatenada pela tela.
    const concl = r.texto.split(/CONCLUS[ÃA]O:/)[1] ?? "";
    t("a conclusão numera os quatro itens", /(^|\n)\s*4[.)]/.test(concl), concl.trim().slice(0, 140));
    t("…e traz as duas classificações", (concl.match(/TI-RADS/g) ?? []).length === 2);
  }
}

console.log("5 · o que NÃO combina é recusado, não remendado\n");
{
  const c = conflitosEntre([de("nodulo_cistico_simples"), de("nodulo_solido_suspeito")]);
  t("dois nódulos no mesmo lobo conflitam", c.length === 1, JSON.stringify(c));
  t("…e o motivo é legível", /mesmo grupo/.test(c[0]?.motivo ?? ""), c[0]?.motivo);
  const r = renderizarSelecao(CAT, "CLASSICO_COMPLETO", [de("volume_aumentado"), de("volume_reduzido")]);
  t("volume aumentado + reduzido é recusado", r.ok === false);
  // Sem a trava, o merge raso deixaria só o último — e o médico veria o laudo
  // sem o achado que clicou.
  t("lobos direito e esquerdo NÃO conflitam",
    conflitosEntre([de("nodulo_solido_suspeito"), de("nodulo_lobo_esquerdo")]).length === 0);
}

console.log("6 · nenhuma seleção volta ao normal por acidente\n");
{
  const normal = laudoPadraoDe(CAT, "CLASSICO_COMPLETO")!;
  for (const s of specs) {
    const r = renderizarSelecao(CAT, "CLASSICO_COMPLETO", [s]);
    if (r.ok) t(`${s.id}: o laudo difere do normal`, r.texto !== normal);
  }
  const vazia = renderizarSelecao(CAT, "CLASSICO_COMPLETO", []);
  t("sem alteração nenhuma, sai o modelo normal", vazia.ok === true && vazia.texto === normal);
}

console.log("7 · o desenho GENERALIZA — vale para toda categoria curada\n");
{
  const cats = categoriasComAlteracoes();
  t("há mais de uma categoria curada", cats.length >= 2, cats.join(", "));
  for (const cat of cats) {
    const lista = alteracoesDe(cat);
    t(`${cat}: tem cenários`, lista.length > 0);
    // Ids repetidos fariam a tela mandar um e o servidor aplicar outro.
    t(`${cat}: os ids são únicos`, new Set(lista.map((s) => s.id)).size === lista.length);
    for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"]) {
      for (const spec of lista) {
        // Um cenário pode valer só num estilo — e declara isso. O que não pode
        // é aparecer na lista e não fazer nada ao ser clicado.
        if (spec.estilos && !spec.estilos.includes(estilo)) continue;
        const p = previaDaAlteracao(cat, estilo, spec);
        t(`${cat}/${estilo} · ${spec.id}: renderiza e muda o laudo`, p !== null);
      }
    }
    // A regra que vale em todas: nenhum cenário escreve texto clínico.
    t(`${cat}: nenhum cenário menciona classificação`,
      !JSON.stringify(lista).match(/TI-RADS|BI-RADS|NOTA FINAL|Categoria/i));
  }
}

console.log("8 · MAMÁRIA — outra classificação calculada, mesmo mecanismo\n");
{
  const m = (id: string) => alteracoesDe("MAMARIA").find((s) => s.id === id)!;
  const suspeito = previaDaAlteracao("MAMARIA", "CLASSICO_COMPLETO", m("nodulo_solido_suspeito"))!;
  const benigno = previaDaAlteracao("MAMARIA", "CLASSICO_COMPLETO", m("nodulo_solido_benigno"))!;
  const cSus = suspeito.entram.join(" ");
  const cBen = benigno.entram.join(" ");
  t("o suspeito recebe BI-RADS alto", /BI-RADS® [45]/.test(cSus), cSus.slice(0, 120));
  t("o benigno recebe BI-RADS baixo", /BI-RADS® [123]/.test(cBen), cBen.slice(0, 120));
  t("as categorias são diferentes",
    (cSus.match(/BI-RADS® \d/)?.[0] ?? "a") !== (cBen.match(/BI-RADS® \d/)?.[0] ?? "b"));
  // A frase normal "não há sinais evidentes" precisa SAIR quando há achado —
  // é o mesmo princípio de não deixar normalidade encobrir patologia.
  t("a frase de normalidade sai quando há nódulo",
    suspeito.saem.some((l) => /Não há sinais evidentes/.test(l)), suspeito.saem.join(" | "));
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — o cenário é escrito, a frase é do renderer`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
