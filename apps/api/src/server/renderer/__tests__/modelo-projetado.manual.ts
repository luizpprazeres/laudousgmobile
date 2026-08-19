/**
 * O MODELO PROJETADO — o que a Biblioteca desenha, por categoria e cenário.
 *
 * Este arquivo existe por causa de uma conferência do Luiz no device, em que
 * ele achou cinco defeitos que nenhum teste pegava. Todos tinham a mesma raiz:
 * a tela montava as linhas sozinha, a partir de `slots` + `ordens`, e essa
 * estrutura não carrega nem a seção nem a condicionalidade.
 *
 *   · sem COMENTÁRIOS e sem CONCLUSÃO — tireoide e mamária emendavam o corpo
 *     na conclusão, sem o cabeçalho
 *   · achado condicional vazando para o modelo de rotina — a obstétrica
 *     mostrava "Imagem hipoecoica e heterogênea…" (um descolamento) como se
 *     fosse linha de exame normal
 *   · DOPPLERVELOCIMETRIA vazia, sem as artérias
 *   · morfológico só de 1º trimestre
 *   · cervicometria concluindo "[REVISAR]"
 *
 *   pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/modelo-projetado.manual.ts
 */
import { describeCatalog } from "../catalog/describe";
import { resolveCatalogo, flagsDeProducao, categoriasDaBiblioteca } from "../catalog/registry";

let ok = 0;
const falhas: string[] = [];
function t(nome: string, cond: boolean, detalhe = "") {
  if (cond) ok++;
  else falhas.push(`${nome}${detalhe ? `\n        ${detalhe}` : ""}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const flags = flagsDeProducao();
function projetar(cat: string) {
  const e = resolveCatalogo(cat, "CLASSICO_COMPLETO")!;
  const base = e.samples.filter((s: any) => !s.comparaCom);
  const ctxs = (base.length ? base : e.samples.slice(0, 1)).map((s: any) => ({
    nome: s.nome,
    ctx: { findings: s.findings, fetoIndex: 0, gemelar: (s.findings?.numero_fetos ?? 1) >= 2, flags },
  }));
  return describeCatalog(e.catalog, ctxs, e.renderizarExemplo, (e as any).projetarModelos);
}

console.log("\nModelo projetado — o que a Biblioteca desenha\n");
console.log(`  ${"categoria".padEnd(22)} ${"modelos".padStart(7)} ${"linhas".padStart(6)} ${"achados".padStart(7)}  seções`);
console.log(`  ${"─".repeat(22)} ${"─".repeat(7)} ${"─".repeat(6)} ${"─".repeat(7)}  ${"─".repeat(28)}`);

for (const c of categoriasDaBiblioteca()) {
  const d = projetar(c.categoria);
  const ms = d.modelos ?? [];
  const linhas = ms.flatMap((m) => m.linhas);
  const secoes = [...new Set(linhas.map((l) => l.secao))];
  console.log(`  ${c.categoria.padEnd(22)} ${String(ms.length).padStart(7)} ${String(linhas.length).padStart(6)} ${String((d.achados ?? []).length).padStart(7)}  ${secoes.join(", ")}`);

  // 1 · toda categoria projeta pelo menos um modelo, com linhas
  t(`${c.categoria}: tem modelo projetado`, ms.length > 0);
  t(`${c.categoria}: tem linhas`, linhas.length > 0);

  // 2 · o modelo mostra o laudo INTEIRO — técnica e conclusão inclusive
  t(`${c.categoria}: mostra a TÉCNICA/COMENTÁRIOS`, secoes.includes("tecnica"),
    "sem ela o médico não confere o texto de técnica do serviço");
  t(`${c.categoria}: mostra a CONCLUSÃO`, secoes.includes("conclusao"),
    "o modelo terminava no último aspecto e emendava na conclusão sem cabeçalho");

  // 3 · nenhum ACHADO no modelo de rotina
  const ACHADO = /hipoecoica e heterogênea|acretismo|lagos venosos|ventriculomegalia|Dandy-Walker|cisterna magna aumentada|cavum do septo|Óbito|sem vitalidade|Bradicardia|Taquicardia|artéria umbilical única|Não foram observados movimentos/i;
  const vazou = linhas.filter((l) => ACHADO.test(l.frase));
  t(`${c.categoria}: nenhum achado no modelo de rotina`, vazou.length === 0,
    vazou.map((v) => `"${v.frase.slice(0, 70)}"`).join("\n        "));

  // 4 · o modelo não apresenta exame mal feito nem aviso do sistema
  const ruim = linhas.filter((l) => /\[REVISAR\]|não caracterizad|não visualizad|insuficiente/i.test(l.frase));
  t(`${c.categoria}: sem [REVISAR] nem exame mal feito`, ruim.length === 0,
    ruim.map((v) => `"${v.frase.slice(0, 70)}"`).join("\n        "));

  // 5 · a numeração da conclusão é do motor, não da frase
  t(`${c.categoria}: a conclusão não traz a numeração`,
    !linhas.some((l) => /^\d+\)\s/.test(l.frase)));

  // 6 · nenhuma seção vazia — um cabeçalho sem linha embaixo é um buraco
  for (const m of ms) {
    t(`${c.categoria}/${m.nome}: conclusão não fica vazia`,
      m.linhas.some((l) => l.secao === "conclusao"),
      "cabeçalho CONCLUSÃO sem nenhum item");
  }
}

// ------------------------------------------------- os defeitos, um a um
console.log("\nOs defeitos que o Luiz encontrou");
{
  const d = projetar("OBSTETRICA");
  t("obstétrica tem os 3 modelos (padrão, inicial, gemelar)", (d.modelos ?? []).length === 3,
    `${(d.modelos ?? []).length} modelo(s)`);
  t("o descolamento placentário NÃO está no modelo",
    !(d.modelos ?? []).flatMap((m) => m.linhas).some((l) => /hipoecoica e heterogênea/i.test(l.frase)));
  t("…mas ESTÁ na lista de achados, editável",
    (d.achados ?? []).some((a) => a.slot === "placenta_achado" && a.variantes.some((v) => v.editavel)));
  t("os achados não são removíveis",
    (d.achados ?? []).filter((a) => ["cranio_achado", "placenta_achado"].includes(a.slot)).every((a) => !a.removivel));
}
{
  const linhas = (projetar("DOPPLER_OBSTETRICO").modelos ?? []).flatMap((m) => m.linhas);
  t("o Doppler traz as artérias", linhas.some((l) => /Artéria umbilical/i.test(l.frase)),
    "a seção DOPPLERVELOCIMETRIA saía vazia");
  t("…e com o índice como LACUNA, não com o valor do seed",
    linhas.some((l) => /Artéria umbilical: IP ____/.test(l.frase)),
    linhas.find((l) => /Artéria umbilical/i.test(l.frase))?.frase ?? "");
}
{
  const ms = projetar("MORFOLOGICO").modelos ?? [];
  t("o morfológico tem os três trimestres", ms.length === 3, ms.map((m) => m.nome).join(", "));
  t("e o de 2º trimestre tem a anatomia dele",
    ms.some((m) => m.linhas.some((l) => /quatro câmaras/i.test(l.frase))));
}
{
  const linhas = (projetar("TIREOIDE").modelos ?? []).flatMap((m) => m.linhas);
  t("a tireoide separa corpo e conclusão",
    linhas.some((l) => l.secao === "corpo") && linhas.some((l) => l.secao === "conclusao"));
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — o modelo projetado está inteiro em todas as categorias`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
