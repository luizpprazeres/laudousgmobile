/**
 * PLACAR DETERMINÍSTICO DA TIREOIDE (W10c) — sem juiz, contra o laudo FINAL do médico. Na tireoide o
 * texto é do renderer (determinístico); o que varia entre candidatos é a EXTRAÇÃO. Então o placar lê o
 * texto renderizado e o final com o mesmo parser e compara por eixo, imagem a imagem (pareadas pela
 * medida "A x B x C" no mesmo lobo):
 *   eco, margem, halo, forma, calcificações, localização (terço), plural ("imagens … a maior");
 *   nota      NOTA FINAL da conclusão ≠ final (marca "TI-2" quando o final pontua halo/vascularização
 *             que o ditado não traz — decisão pendente do Luiz, não erro de extração);
 *   estrutura medida/volume de lobo e istmo, título (Doppler), picos sistólicos, frase da cadeia
 *             ganglionar I–V nos COMENTÁRIOS (TI-5), "situada no", volume total da conclusão.
 * Cada divergência de eixo é contada em "≠ final" e, quando a palavra do final aparece no ditado,
 * também em "≠ final, valor no ditado" (erro de extração provável).
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/placar-tireoide.ts <rodada> [--keys gpt,R,A] [--casos]
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
const KEYS = (arg("keys") ?? "gpt,R,A").split(",");
const CASOS = argv.includes("--casos");

type Row = Record<string, any>;
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// Vocabulário do renderer (TIREOIDE.ts), do mais específico ao mais geral.
const ECO = [
  "anecoica com componentes solidos", "anecoica com septos", "anecoica com finos ecos", "anecoica homogenea",
  "hipoecoica com areas anecoicas", "hiperecoica com areas anecoicas", "isoecoica com areas anecoicas",
  "solida com areas anecoicas", "solida com calcificacao parietal", "hipoecoica", "isoecoica", "hiperecoica", "anecoica",
];
const EIXOS: Record<string, Array<[string, RegExp]>> = {
  margem: [["espiculada", /margens? espiculadas?/], ["irregular", /margens? irregular/], ["regular", /margens? regular/]],
  halo: [["espesso", /halo espesso/], ["fino", /halo fino/], ["sem halo", /sem halo/]],
  forma: [["alta", /mais alt[ao] do que larg/], ["larga", /mais larg[ao] do que alt/]],
  calc: [["micro", /microcalcifica/], ["grosseiras", /calcificac\w+ grosseira/], ["casca", /casca de ovo/], ["sem", /sem calcifica/]],
  local: [["superior", /terco superior/], ["medio", /terco medio/], ["inferior", /terco inferior/]],
};
const PALAVRA_DITADO: Record<string, RegExp> = {
  espiculada: /espicul/, irregular: /irregular/, regular: /regular/, espesso: /halo espesso/, fino: /halo fino/,
  "sem halo": /sem halo/, alta: /mais alt/, larga: /mais larg/, micro: /microcalc/, grosseiras: /grosseir/,
  casca: /casca/, sem: /sem calcifica/, superior: /superior/, medio: /medio/, inferior: /inferior/,
};

type Nod = { med: string; eco: string | null; eixos: Record<string, string | null>; plural: boolean; seg: string };
type Estr = { med: string | null; vol: string | null; difusa: boolean; nods: Nod[] };
const medida = (s: string) => {
  const m = s.match(/(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)\s*[x×]\s*(\d+(?:[,.]\d+)?)/);
  return m ? [m[1], m[2], m[3]].map((x) => x.replace(".", ",")).join(" x ") : null;
};

function parse(texto: string) {
  const linhas = (texto ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const iA = linhas.findIndex((l) => /^OS SEGUINTES ASPECTOS/i.test(l));
  const iC = linhas.findIndex((l) => /^CONCLUS[ÃA]O/i.test(l));
  const corpo = iA >= 0 ? linhas.slice(iA + 1, iC >= 0 ? iC : undefined) : [];
  const concl = iC >= 0 ? linhas.slice(iC + 1) : [];
  const estr: Record<string, Estr> = {};
  for (const l of corpo) {
    const m = l.match(/^(Lobo direito|Lobo esquerdo|Istmo)\b/i);
    if (!m) continue;
    const nome = norm(m[1]);
    const [cabeca, ...resto] = l.split(/,?\s*apresentando\s+/i);
    const vol = cabeca.match(/volume de (\d+(?:[,.]\d+)?)\s*ml/i)?.[1]?.replace(".", ",") ?? null;
    const corpoNods = resto.join(" apresentando ");
    const difusa = /modifica\S* difusa|difusamente|heterog/i.test(l) && !/\bimage(m|ns)\b/i.test(corpoNods.split(/[;]/)[0] ?? "");
    const nods: Nod[] = [];
    for (const seg of corpoNods.split(/;\s*/)) {
      const med = medida(seg);
      if (!med || !/\bimage(m|ns)\b/i.test(seg)) continue;
      const n = norm(seg);
      const eixos: Record<string, string | null> = {};
      for (const [eixo, vals] of Object.entries(EIXOS)) eixos[eixo] = vals.find(([, re]) => re.test(n))?.[0] ?? null;
      nods.push({ med, eco: ECO.find((e) => n.includes(e)) ?? null, eixos, plural: /\bimagens\b/.test(n) || /a maior medindo/.test(n), seg: n });
    }
    estr[nome] = { med: medida(cabeca), vol, difusa, nods };
  }
  const notas = [...concl.join(" ").matchAll(/nota final (\d+)/gi)].map((x) => x[1]);
  return {
    titulo: linhas.find((l) => /^ULTRASSONOGRAFIA/i.test(l)) ?? "",
    cadeia: /cadeia ganglionar cervical/i.test(texto),
    situadaSemNo: /situad[ao]s? ter[cç]o/i.test(texto),
    picos: [...texto.matchAll(/Pico sist[óo]lico da art[ée]ria tireoidiana (\w+) (\w+) de (\d+(?:[,.]\d+)?)/gi)].map((x) => `${x[1]} ${x[2]} ${x[3].replace(".", ",")}`),
    volTotal: concl.join(" ").match(/volume (?:normal|aumentado|reduzido) \((\d+(?:[,.]\d+)?) ml\)/i)?.[1]?.replace(".", ",") ?? null,
    estr,
    notas,
    linfonodos: /linfonodo/i.test(corpo.join(" ")),
    rodape: /Domingos Correia da Rocha/.test(texto),
  };
}

function main() {
  const rs: Row[] = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
  const textoDe = (r: Row, k: string) => (k === "gpt" ? r.gpt : k === "R" ? r.replay?.text : r[k]?.[0]?.text) ?? "";
  const tot: Record<string, Record<string, number>> = {};
  const porCaso: Record<string, Record<string, string[]>> = {};
  for (const k of KEYS) tot[k] = {};
  const inc = (k: string, m: string, id8: string) => {
    tot[k][m] = (tot[k][m] ?? 0) + 1;
    ((porCaso[k] ??= {})[id8] ??= []).push(m);
  };
  for (const r of rs) {
    const f = parse(r.final);
    const dit = norm(r.ditado ?? "");
    for (const k of KEYS) {
      const texto = textoDe(r, k);
      if (!texto || !/^ULTRASSONOGRAFIA/.test(texto.trim())) {
        if (k !== "R" || r.replay) inc(k, "sem laudo (falha/erro de schema)", r.id8);
        continue;
      }
      tot[k].casos = (tot[k].casos ?? 0) + 1;
      const c = parse(texto);
      if (norm(c.titulo) !== norm(f.titulo)) inc(k, "título (Doppler) ≠ final", r.id8);
      if (f.cadeia && !c.cadeia) inc(k, "cadeia ganglionar I–V apagada (TI-5)", r.id8);
      if (c.situadaSemNo) inc(k, "'situada terço' sem 'no'", r.id8);
      for (const p of f.picos) if (!c.picos.includes(p)) inc(k, "pico sistólico ausente/diferente", r.id8);
      if (f.volTotal && c.volTotal !== f.volTotal) inc(k, "volume total ≠ final", r.id8);
      if (!f.linfonodos && c.linfonodos) inc(k, "parágrafo de linfonodos não ditado", r.id8);
      if (!f.rodape && c.rodape) inc(k, "rodapé Domingos sem nódulo (TI-3)", r.id8);
      let iNota = 0;
      for (const [nome, ef] of Object.entries(f.estr)) {
        const ec = c.estr[nome];
        if (!ec) { inc(k, `estrutura ausente (${nome})`, r.id8); continue; }
        if (ef.med && ec.med !== ef.med) inc(k, "medida de lobo/istmo ≠ final", r.id8);
        if (ef.vol && ec.vol !== ef.vol) inc(k, "volume de lobo/istmo ≠ final", r.id8);
        if (ef.difusa !== ec.difusa) inc(k, "alteração difusa ≠ final", r.id8);
        for (const nf of ef.nods) {
          tot[k].nodulosNoFinal = (tot[k].nodulosNoFinal ?? 0) + 1;
          const nc = ec.nods.find((x) => x.med === nf.med) ?? Object.values(c.estr).flatMap((e) => e.nods).find((x) => x.med === nf.med);
          if (!nc) { inc(k, "imagem do final ausente (medida)", r.id8); continue; }
          if (nf.eco && nc.eco !== nf.eco) {
            inc(k, "eixo eco ≠ final", r.id8);
            if (dit.includes(nf.eco.split(" ")[0]) && (nf.eco.split(" ").length === 1 || dit.includes(nf.eco.split(" ").slice(-1)[0]))) inc(k, "eixo eco ≠ final, valor no ditado", r.id8);
          }
          for (const eixo of Object.keys(EIXOS)) {
            const vf = nf.eixos[eixo];
            const vc = nc.eixos[eixo];
            if (vf && vc !== vf) {
              inc(k, `eixo ${eixo} ≠ final`, r.id8);
              if (PALAVRA_DITADO[vf]?.test(dit)) inc(k, `eixo ${eixo} ≠ final, valor no ditado`, r.id8);
            }
            if (!vf && vc) inc(k, `eixo ${eixo} a mais`, r.id8);
          }
          if (nf.plural !== nc.plural) inc(k, "plural/'a maior' ≠ final", r.id8);
        }
      }
      // Notas na ordem da conclusão.
      for (const nfNota of f.notas) {
        const ncNota = c.notas[iNota++];
        tot[k].notasNoFinal = (tot[k].notasNoFinal ?? 0) + 1;
        if (ncNota !== nfNota) {
          const ti2 = /halo|vasculariza/.test(norm(r.final)) && !/halo|vasculariza|chammas/.test(dit);
          inc(k, ti2 ? "NOTA FINAL ≠ final (eixo não ditado — TI-2)" : "NOTA FINAL ≠ final", r.id8);
        }
      }
      if (/_{3,}/.test(texto)) inc(k, "____", r.id8);
      if (/\*\*|^#/m.test(texto)) inc(k, "markdown", r.id8);
    }
  }
  console.log(`rodada ${dir.split("/").pop()} · ${rs.length} casos`);
  const ms = [...new Set(KEYS.flatMap((k) => Object.keys(tot[k])))].filter((m) => !["casos", "nodulosNoFinal", "notasNoFinal"].includes(m)).sort();
  console.log(`| métrica | ${KEYS.join(" | ")} |`);
  console.log(`|---|${KEYS.map(() => "---").join("|")}|`);
  for (const m of ["casos", "nodulosNoFinal", "notasNoFinal", ...ms]) console.log(`| ${m} | ${KEYS.map((k) => tot[k][m] ?? 0).join(" | ")} |`);
  const ext = (k: string) => Object.entries(tot[k]).filter(([m]) => /valor no ditado|ausente|medida de lobo|volume de lobo|volume total|pico|título|alteração difusa|plural|situada|cadeia/.test(m)).reduce((a, [, n]) => a + n, 0);
  console.log(`| **soma de erros de extração prováveis** | ${KEYS.map(ext).join(" | ")} |`);
  if (CASOS) for (const k of KEYS) for (const [id, m] of Object.entries(porCaso[k] ?? {})) console.log(`${k} ${id}: ${m.join(", ")}`);
}

main();
