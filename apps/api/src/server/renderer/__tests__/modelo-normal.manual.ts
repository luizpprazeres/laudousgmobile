/**
 * O MODELO NORMAL de cada categoria — derivado do renderer real.
 *
 * O que se afirma aqui:
 *
 *   1. TODA categoria viva produz um modelo (a Biblioteca não mostra só OBSTETRICA)
 *   2. o modelo é SÓ NORMALIDADE — nenhuma frase de achado escapa para a lista
 *   3. os ids são estáveis e únicos (a personalização ancora neles)
 *   4. a projeção tem a MESMA forma do catálogo estruturado (o app não bifurca)
 *
 *   pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/modelo-normal.manual.ts
 */
import { descreverModeloNormal, idDaFrase, linhasDoLaudo } from "../catalog/modeloNormal";
import { MODELOS_NORMAIS, laudoPadraoDe } from "../catalog/modeloNormalRegistry";

let ok = 0;
const falhas: string[] = [];
function t(nome: string, cond: boolean, detalhe = "") {
  if (cond) ok++;
  else falhas.push(`${nome}${detalhe ? `\n        ${detalhe}` : ""}`);
}

/**
 * Vocabulário que denuncia ACHADO. Se uma destas aparecer AFIRMADA no modelo
 * normal, a derivação está trazendo patologia para a lista editável — e a
 * crítica C3 volta pela porta dos fundos.
 *
 * HEURÍSTICA, e assumida como tal: a garantia forte é estrutural (o modelo vem
 * do achado normal, então só pode conter normalidade). Isto é a segunda linha,
 * para pegar um renderer que afirme algo por default.
 */
const CHEIRO_DE_ACHADO = [
  /n[óo]dulo/i, /c[íi]sto/i, /c[áa]lculo/i, /litíase/i, /massa/i, /les[ãa]o/i,
  /espessad[oa]/i, /dilatad[oa]/i, /aumentad[oa] de volume/i,
  /suspeit/i, /neoplas/i, /derrame/i, /coleç[ãa]o/i, /trombo/i, /est[ée]nose/i,
  /BI-RADS [345]/i, /TI-RADS [345]/i, /[óo]bito/i, /malforma/i,
];

/**
 * A frase NEGA o achado?
 *
 * "Vesícula biliar de topografia usual e de parede fina, sem cálculo." é
 * normalidade — o termo aparece justamente para ser negado, que é como o laudo
 * de ultrassom afirma ausência. Sem esta leitura o detector acusa 5 das 13
 * categorias e vira ruído.
 */
// `(?<!\p{L})` e não `\b`: o `\b` do JavaScript é ASCII e não enxerga limite de
// palavra ao lado de "á"/"ã" — `/\bnão há\b/` não casa "Não há evidência". Foi o
// mesmo defeito que deixou o guard de vitalidade cego para "óbito".
const NEGA_O_ACHADO =
  /(?<!\p{L})(?:sem|n[ãa]o\s+(?:h[áa]|se|foram|foi|detalha|evidenci)|aus[êe]ncia\s+de|livre\s+de|isent[oa]\s+de)(?!\p{L})/iu;

console.log("\nModelo normal por categoria — derivado do renderer de produção\n");
console.log(`  ${"categoria".padEnd(24)} ${"linhas".padStart(6)}  ${"corpo".padStart(5)} ${"concl".padStart(5)}  situação`);
console.log(`  ${"─".repeat(24)} ${"─".repeat(6)}  ${"─".repeat(5)} ${"─".repeat(5)}  ${"─".repeat(30)}`);

for (const m of MODELOS_NORMAIS) {
  const laudo = laudoPadraoDe(m.categoria, "CLASSICO_COMPLETO");
  if (!laudo) {
    falhas.push(`${m.categoria}: não produziu laudo padrão`);
    console.log(`  ${m.categoria.padEnd(24)} ${"—".padStart(6)}                 ✗ sem modelo`);
    continue;
  }
  const linhas = linhasDoLaudo(laudo);
  const corpo = linhas.filter((l) => l.secao === "corpo").length;
  const concl = linhas.filter((l) => l.secao === "conclusao").length;

  // 1 · toda categoria tem modelo
  t(`${m.categoria}: produz modelo`, linhas.length > 0);

  // 2 · só normalidade — achado AFIRMADO, não achado negado
  const suspeitas = linhas.filter(
    (l) => CHEIRO_DE_ACHADO.some((re) => re.test(l.texto)) && !NEGA_O_ACHADO.test(l.texto),
  );
  t(`${m.categoria}: nenhuma frase de achado na lista`, suspeitas.length === 0,
    suspeitas.map((s) => `"${s.texto.slice(0, 70)}"`).join("\n        "));

  // 3 · ids únicos e estáveis
  const ids = new Set(linhas.map((l) => l.id));
  t(`${m.categoria}: ids únicos`, ids.size === linhas.length,
    `${linhas.length} linhas → ${ids.size} ids (frase repetida no laudo)`);
  t(`${m.categoria}: id é estável entre execuções`,
    linhas.every((l) => idDaFrase(l.texto) === l.id));

  // 4 · a projeção tem a forma do catálogo
  const d = descreverModeloNormal({ categoria: m.categoria, estilo: "CLASSICO_COMPLETO", laudo });
  t(`${m.categoria}: projeção completa`,
    d.slots.length === linhas.length &&
    d.ordens[0]!.slots.length === linhas.length &&
    d.slots.every((s) => s.variantes.length === 1 && s.variantes[0]!.editavel && s.variantes[0]!.frase));

  const marca = suspeitas.length > 0 ? "⚠ achado na lista" : "ok";
  console.log(`  ${m.categoria.padEnd(24)} ${String(linhas.length).padStart(6)}  ${String(corpo).padStart(5)} ${String(concl).padStart(5)}  ${marca}`);
}

// ------------------------------------------------- o id sobrevive a formatação
console.log("\nEstabilidade do id");
t("espaço extra não muda o id", idDaFrase("Fígado  normal.") === idDaFrase("Fígado normal."));
t("lacuna de tamanho diferente não muda o id",
  idDaFrase("Lobo medindo ____ cm.") === idDaFrase("Lobo medindo ______ cm."));
t("frase diferente muda o id", idDaFrase("Fígado normal.") !== idDaFrase("Baço normal."));

// ------------------------------------------------------- cabeçalhos fora da lista
console.log("Cabeçalhos e rodapés não entram");
{
  const linhas = linhasDoLaudo(
    "ULTRASSONOGRAFIA X\n\nCOMENTÁRIOS:\nTécnica.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nFígado normal.\n\nCONCLUSÃO:\n1) Normal.\n\n*Rodapé do serviço",
  );
  const textos = linhas.map((l) => l.texto);
  t("título fora", !textos.includes("ULTRASSONOGRAFIA X"));
  t("cabeçalhos fora", !textos.some((x) => /^(COMENTÁRIOS|CONCLUSÃO|OS SEGUINTES)/.test(x)));
  t("rodapé fora", !textos.some((x) => x.startsWith("*")));
  t("frase de corpo dentro, com seção certa",
    linhas.some((l) => l.texto === "Fígado normal." && l.secao === "corpo"));
  t("item de conclusão dentro, com seção certa",
    linhas.some((l) => l.texto === "1) Normal." && l.secao === "conclusao"));
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — todas as categorias têm modelo, e só com normalidade`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
