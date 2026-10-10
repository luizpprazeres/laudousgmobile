/**
 * PLACAR DETERMINÍSTICO DA MAMA (W10c) — sem juiz, contra o laudo FINAL do médico. Generaliza o
 * método do `placar-msk.ts` para o writer completo da MAMARIA.
 *
 * Por laudo e candidato:
 *   fixas      frase fixa do modelo da casa (técnica, documentação, fundo, "não há sinais…", axilas,
 *              linfonodos axilares, rodapé) que está no final e falta no candidato;
 *   titulo     título diferente do final (escopo mamas × mamas e axilas);
 *   axilas     axilas inventadas (final sem axilas) / omitidas (final com axilas);
 *   birads     categoria BI-RADS do final ausente no candidato (ditada ou BI-RADS 1 do normal × não ditada,
 *              que o médico acrescenta e o contrato proíbe inferir) / categoria a mais;
 *   fotos      "em 06 fotos" (o médico tira em 26 de 29 finais);
 *   default    frase de normalidade que não é da casa (vinda da biblioteca antiga): "constituição
 *              fibroglandular usual", "sem nódulos ou cistos visíveis", "axilas sem linfonodopatia",
 *              "pele e contornos sem alterações";
 *   achados    medida "A x B x C" do final ausente no candidato; linha de achado do final cuja medida
 *              está no candidato mas fora do padrão da casa (lado com "de mama", horário entre aspas
 *              com dois dígitos, "situada", "distando … do seu centro até a pele");
 *   conclusao  itens da conclusão: número diferente do final; numeração fora do padrão (item único sem
 *              número; vários com "1)");
 *   corpoDiag  "cisto", "nódulo", "compatível", "sugestivo", "diagnóstico" no corpo sem estar no corpo do final;
 *   lixo       "____", "[REVISAR", "[?]", markdown, bullets, comentário fora do laudo.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/placar-mama.ts <rodada> [--keys gpt,B,B3] [--casos]
 * Imprime só agregados e ids de 8 caracteres.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const dir = argv[0];
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const KEYS = (arg("keys") ?? "gpt,B").split(",");
const CASOS = argv.includes("--casos");

type Row = Record<string, any>;
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[“”"«»]/g, "")
    .replace(/[.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const FIXAS: Array<[string, RegExp]> = [
  ["técnica", /^exame realizado com transdutor de \d+ mhz abrangendo todos os quadrantes das mamas/],
  ["documentação", /^a documentacao fotografica foi obtida/],
  ["fundo", /^mamas com ecotextura de fundo/],
  ["não há sinais", /^nao ha sinais evidentes de imagem nodular solida cistica ou complexa/],
  ["axilas (corpo)", /^imagens ovais com a periferia hipoecoica e o centro hiperecoico nas axilas/],
  ["linfonodos axilares", /^(\d+ )?linfonodos axilares normais/],
  ["rodapé sem número", /^breast imaging reporting and data system/],
];
const DEFAULT_ALHEIO = /constituicao fibroglandular usual|sem nodulos ou cistos visiveis|axilas sem linfonodopatia|pele e contornos sem alteracoes/;

function secoes(texto: string) {
  const linhas = (texto ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const titulo = linhas.find((l) => /^ULTRASSONOGRAFIA/i.test(l.replace(/[*#_\s]+/g, " ").trim())) ?? "";
  const iA = linhas.findIndex((l) => /^OS SEGUINTES ASPECTOS/i.test(l.replace(/[*#_]/g, "").trim()));
  const iC = linhas.findIndex((l) => /^CONCLUS[ÃA]O/i.test(l.replace(/[*#_]/g, "").trim()));
  const corpo = iA >= 0 ? linhas.slice(iA + 1, iC >= 0 ? iC : undefined) : [];
  const concl = iC >= 0 ? linhas.slice(iC + 1).filter((l) => !/^Breast Imaging/i.test(l)) : [];
  return { linhas, titulo, corpo, concl };
}
const medidas = (s: string) =>
  [...s.matchAll(/(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)/g)].map((m) =>
    [m[1], m[2], m[3]].map((x) => x.replace(".", ",")).join(" x "),
  );
const birads = (s: string) =>
  new Set([...s.matchAll(/BI-?RADS®?\s*(\d[A-C]?)/gi)].map((m) => m[1].toUpperCase()));
const temAxila = (s: string) => /axil/i.test(s.replace(/^.*Breast Imaging.*$/gim, ""));

type Tot = Record<string, number>;
function main() {
  const rs: Row[] = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
  const textoDe = (r: Row, k: string) => (k === "gpt" ? r.gpt : r[k]?.[0]?.text) ?? "";
  const tot: Record<string, Tot> = {};
  const porCaso: Record<string, Record<string, string[]>> = {};
  for (const k of KEYS) tot[k] = {};
  const inc = (k: string, m: string, id8: string, n = 1) => {
    if (!n) return;
    tot[k][m] = (tot[k][m] ?? 0) + n;
    ((porCaso[k] ??= {})[id8] ??= []).push(n > 1 ? `${m}×${n}` : m);
  };

  for (const r of rs) {
    const fin = secoes(r.final);
    const finN = fin.linhas.map(norm);
    const finCorpoN = norm(fin.corpo.join(" "));
    for (const k of KEYS) {
      const texto: string = textoDe(r, k);
      if (!texto) continue;
      tot[k].casos = (tot[k].casos ?? 0) + 1;
      const c = secoes(texto);
      const cN = c.linhas.map(norm);
      // fixas
      for (const [nome, re] of FIXAS) {
        if (finN.some((l) => re.test(l))) {
          tot[k].fixasNoFinal = (tot[k].fixasNoFinal ?? 0) + 1;
          if (!cN.some((l) => re.test(l))) inc(k, `fixa:${nome}`, r.id8);
        }
      }
      if (norm(c.titulo) !== norm(fin.titulo)) inc(k, "titulo", r.id8);
      const fAx = temAxila(r.final);
      const cAx = temAxila(texto);
      if (!fAx && cAx) inc(k, "axilas inventadas", r.id8);
      if (fAx && !cAx) inc(k, "axilas omitidas", r.id8);
      const bf = birads(r.final);
      const bc = birads(texto);
      const biradsDitado = /bi-?rads|birads|bairads|categoria/i.test(r.ditado ?? "");
      for (const b of bf) if (!bc.has(b)) inc(k, b === "1" || biradsDitado ? "birads faltando (ditado ou normal)" : "birads faltando (não ditado — política)", r.id8);
      for (const b of bc) if (!bf.has(b)) inc(k, `birads a mais`, r.id8);
      if (/em \d+ fotos/i.test(texto) && !/em \d+ fotos/i.test(r.final)) inc(k, "em 06 fotos", r.id8);
      inc(k, "frase normal alheia", r.id8, cN.filter((l) => DEFAULT_ALHEIO.test(l)).length);
      // achados por medida (laudo colado pronto: o médico mantém a própria redação — só a medida conta)
      const colado = /OS SEGUINTES ASPECTOS|COMENT[ÁA]RIOS:/i.test(r.ditado ?? "");
      if (colado) tot[k].colados = (tot[k].colados ?? 0) + 1;
      const cMed = new Set(medidas(texto));
      for (const linha of fin.corpo) {
        for (const m of medidas(linha)) {
          tot[k].medidasNoFinal = (tot[k].medidasNoFinal ?? 0) + 1;
          if (!cMed.has(m)) {
            inc(k, "medida ausente", r.id8);
            continue;
          }
          const cl = c.corpo.find((l) => medidas(l).includes(m)) ?? "";
          tot[k].linhasAchado = (tot[k].linhasAchado ?? 0) + 1;
          if (colado) continue;
          if (!/^Image(m|ns) /.test(cl)) inc(k, "achado: não começa por Imagem", r.id8);
          if (/ de mama (direita|esquerda)/.test(linha) && !/ de mama (direita|esquerda)/.test(cl)) inc(k, "achado: lado sem 'de mama'", r.id8);
          if (/às "\d\d horas?"|à "\d\d hora"/.test(linha) && !/[àa]s? ["“]\d\d horas?"/.test(cl)) inc(k, "achado: horário fora do formato", r.id8);
          if (/distando/.test(linha) && !/distando [\d,]+ cm do seu centro até a pele/.test(cl)) inc(k, "achado: distância fora do padrão", r.id8);
          if (/a maior medindo/.test(linha) !== /a maior medindo/.test(cl)) inc(k, "achado: multiplicidade ('a maior') ≠ final", r.id8);
          if (/\[REVISAR|_{3,}/.test(cl)) inc(k, "achado: com [REVISAR]/____", r.id8);
        }
      }
      // conclusão
      const itensF = fin.concl.length;
      const itensC = c.concl.length;
      if (itensF !== itensC) inc(k, "itens da conclusão ≠ final", r.id8);
      const numerados = c.concl.filter((l) => /^\d+\)\s/.test(l)).length;
      if ((itensC === 1 && numerados) || (itensC > 1 && numerados !== itensC)) inc(k, "numeração fora do padrão", r.id8);
      // corpo diagnóstico
      const corpoC = norm(c.corpo.join(" "));
      for (const t of ["cisto", "nodulo", "compativel", "sugestiv", "diagnostico"]) {
        if (corpoC.includes(t) && !finCorpoN.includes(t)) inc(k, `corpo diagnóstico (${t})`, r.id8);
      }
      // lixo
      if (/_{3,}/.test(texto)) inc(k, "____", r.id8);
      if (/\[REVISAR/i.test(texto) && !/\[REVISAR/i.test(r.final)) inc(k, "[REVISAR]", r.id8);
      if (/\*\*|^#|^\s*[-*•] /m.test(texto)) inc(k, "markdown/bullet", r.id8);
      if (!/^ULTRASSONOGRAFIA/.test(texto.trim())) inc(k, "não começa no título", r.id8);
    }
  }

  console.log(`rodada ${dir.split("/").pop()} · ${rs.length} casos`);
  const metricas = [...new Set(KEYS.flatMap((k) => Object.keys(tot[k])))].filter(
    (m) => !["casos", "fixasNoFinal", "medidasNoFinal", "linhasAchado", "colados"].includes(m),
  ).sort();
  console.log(`| métrica | ${KEYS.join(" | ")} |`);
  console.log(`|---|${KEYS.map(() => "---").join("|")}|`);
  console.log(`| casos | ${KEYS.map((k) => tot[k].casos ?? 0).join(" | ")} |`);
  console.log(`| frases fixas no final (omitidas) | ${KEYS.map((k) => `${tot[k].fixasNoFinal ?? 0} (${Object.entries(tot[k]).filter(([m]) => m.startsWith("fixa:")).reduce((a, [, n]) => a + n, 0)})`).join(" | ")} |`);
  console.log(`| medidas no final | ${KEYS.map((k) => tot[k].medidasNoFinal ?? 0).join(" | ")} |`);
  console.log(`| laudos colados (padrão do achado não medido) | ${KEYS.map((k) => tot[k].colados ?? 0).join(" | ")} |`);
  for (const m of metricas) console.log(`| ${m} | ${KEYS.map((k) => tot[k][m] ?? 0).join(" | ")} |`);
  const graves = (k: string) =>
    Object.entries(tot[k]).filter(([m]) => /axilas|birads a mais|birads faltando \(ditado|medida ausente|corpo diag|frase normal alheia|____|titulo/.test(m)).reduce((a, [, n]) => a + n, 0);
  console.log(`| **soma (axilas, BI-RADS, medidas, corpo, alheias, ____, título)** | ${KEYS.map(graves).join(" | ")} |`);
  if (CASOS) for (const k of KEYS) for (const [id, ms] of Object.entries(porCaso[k] ?? {})) console.log(`${k} ${id}: ${ms.join(", ")}`);
}

main();
