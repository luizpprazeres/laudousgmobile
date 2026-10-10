/**
 * PLACAR DETERMINÍSTICO DO WRITER COMPLETO (W10b) — sem juiz, contra o laudo FINAL do médico.
 * Generaliza o placar-msk.ts (W9) para as categorias do writer completo (abdome, vias, parede…).
 *
 * Por laudo e por candidato:
 *   omissao     frase de normalidade do ROTEIRO da categoria que está no final e falta no candidato;
 *   presumida   frase normal no candidato para uma estrutura que o médico ALTEROU no final (o final traz
 *               outra linha com o mesmo sujeito e não traz a frase normal) — normalidade presumida;
 *   medida      número ditado E presente no final que falta no candidato;
 *   placeholder "____", "X.X", "x,x" ou "0,0" no candidato (o final nunca tem);
 *   estrutura   cabeçalho que falta (título, COMENTÁRIOS, OS SEGUINTES…, CONCLUSÃO) ou laudo a mais/a menos;
 *   numeracao   conclusão de item único numerada, ou múltipla sem número;
 *   fechamento  "Demais … sem evidência…" ausente quando o final tem (ou presente quando o final não tem);
 *   conduta     "Convém/recomenda/correlacionar/avaliação …" no candidato que não está no final nem no ditado;
 *   dxCorpo     "compatível com / sugestivo de / diagnóstico mais provável" no corpo;
 *   limitacao   "parcialmente visualizado / gases" que não está no final nem no ditado;
 *   markdown    "**", "#" ou bullets.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/placar-writer.ts <rodada> [--keys gpt,B,B2] [--detalhe] [--casos]
 * Imprime só agregados, frases do roteiro e ids de 8 caracteres.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const dir = argv[0];
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

type Row = Record<string, any>;
/** Normalização para comparar frases: caixa, acento, espaço e grafias equivalentes da casa. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/cortico[\s-]*medular/g, "corticomedular")
    .replace(/diametros longitudinais/g, "diametros longitudinal")
    .replace(/\s+/g, " ")
    .trim();

type Normal = { frase: string; sujeito: RegExp };
type Cfg = { normais: Normal[]; fechamento?: RegExp; titulo: RegExp };
const N = (frase: string, sujeito: RegExp): Normal => ({ frase, sujeito });

export const CATEGORIAS: Record<string, Cfg> = {
  ABDOMEN_TOTAL: {
    titulo: /^ULTRASSONOGRAFIA\b/,
    fechamento: /demais orgaos e estruturas abdominais/,
    normais: [
      N("Fígado de dimensões normais, contornos regulares e ecotextura homogênea.", /^figado\b/),
      N("Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.", /^os vasos intra-hepaticos\b/),
      N("Veia porta de calibre normal.", /^veia porta\b/),
      N("Vesícula biliar de topografia usual e de parede fina, sem cálculo.", /^(vesicula biliar|ausencia da imagem da vesicula)\b/),
      N("Canal hepático e canal colédoco de calibre normal.", /^canal hepatico\b/),
      N("Baço de dimensões normais e ecotextura sólida e homogênea.", /^baco\b/),
      N("Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam dimensões normais.", /^pancreas\b/),
      N("Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.", /^rim direito\b/),
      N("Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.", /^rim esquerdo\b/),
      N("Veia cava inferior de calibre e contornos normais.", /^veia cava\b/),
      N("Aorta abdominal de calibre e contornos normais.", /^aorta\b/),
      N("Bexiga de forma, contorno e ecotextura normais.", /^bexiga\b/),
      N("Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.", /^orgaos e estruturas abdominais\b/),
    ],
  },
  VIAS_URINARIAS: {
    titulo: /^ULTRASSONOGRAFIA\b/,
    fechamento: /demais estruturas das vias urinarias/,
    normais: [
      N("Rim direito com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura corticomedular normais.", /^rim direito\b/),
      N("Rim esquerdo com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura corticomedular normais.", /^rim esquerdo\b/),
      N("Bexiga de forma, contorno e ecotextura normais.", /^bexiga\b/),
      N("Rins ecograficamente normais.", /^(rins|rim (direito|esquerdo)) /),
      N("Não há sinais de dilatação ureteral.", /dilatacao ureteral|ureter/),
      N("Bexiga ecograficamente normal.", /^bexiga\b/),
    ],
  },
  PAREDE_ABDOMINAL: {
    titulo: /^ULTRASSONOGRAFIA\b/,
    normais: [
      N("Parede abdominal anterior com ecogenicidade e ecotextura normais.", /^parede abdominal\b/),
      N("Não há sinais de hérnia.", /hernia/),
      N("Ausência de coleções.", /colec/),
      N("Planos musculoaponeuróticos da parede abdominal preservados, sem soluções de continuidade ou abaulamentos à manobra de Valsalva.", /^planos muscul/),
      N("Ausência de alterações detectáveis pelo método.", /^ausencia de alteracoes\b/),
    ],
  },
};

const HEAD = /^(COMENT[ÁA]RIOS|OS SEGUINTES ASPECTOS FORAM OBSERVADOS|CONCLUS[ÃA]O|T[ÉE]CNICA|ACHADOS|IMPRESS[ÃA]O)\s*:?\s*$/i;
const linhas = (t: string) => (t ?? "").split("\n").map((l) => l.replace(/^[\s*#_>-]+|[*_]+$/g, "").trim()).filter(Boolean);

/** Seções de cada laudo do texto (multi-laudo: um novo título abre outro laudo). */
function laudos(texto: string) {
  const out: { titulo: string; heads: string[]; corpo: string[]; conclusao: string[] }[] = [];
  let atual: (typeof out)[number] | null = null;
  let secao = "";
  for (const l of linhas(texto)) {
    if (/^(\d+[.)]\s*)?ULTRASSONOGRAFIA\b/.test(l) && l === l.toUpperCase()) {
      atual = { titulo: l, heads: [], corpo: [], conclusao: [] };
      out.push(atual);
      secao = "";
      continue;
    }
    if (!atual) {
      atual = { titulo: "", heads: [], corpo: [], conclusao: [] };
      out.push(atual);
    }
    if (HEAD.test(l)) {
      const h = l.toUpperCase().replace(/\s*:\s*$/, "");
      atual.heads.push(h);
      secao = /CONCLUS|IMPRESS/.test(h) ? "conc" : /SEGUINTES|ACHADOS/.test(h) ? "corpo" : "coment";
      continue;
    }
    if (secao === "corpo") atual.corpo.push(l);
    else if (secao === "conc") atual.conclusao.push(l);
  }
  return out;
}

const numeros = (s: string) => new Set((s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(".", ",")).filter((n) => !/^[0-5]$/.test(n)));
const CONDUTA = /\b(conv[ée]m|recomenda|sugere-se|correlacion|correla[çc][ãa]o cl[íi]nica|avalia[çc][ãa]o (urol[óo]gica|especializada|cl[íi]nica)|acompanhamento|encaminhamento|complementa[çc][ãa]o)/i;
const DX_CORPO = /compat[íi]vel com|sugestivo de|sugestiva de|diagn[óo]stico mais prov[áa]vel|caracterizando/i;
const LIMITACAO = /parcialmente visualizad|interposi[çc][ãa]o (de )?gases|gases intestinais/i;
const PLACEHOLDER = /_{2,}|\bX[.,]X\b|\bx[.,]x\b|\b0,0\b/;

type Tot = Record<string, number> & { casos: number };
const zero = (): Tot => ({ casos: 0, normaisFinal: 0, omissao: 0, presumida: 0, medidasDitadas: 0, medida: 0, placeholder: 0, estrutura: 0, numeracao: 0, fechamento: 0, conduta: 0, dxCorpo: 0, limitacao: 0, markdown: 0, recusa: 0 });

function main() {
  const rs: Row[] = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
  const keys = (arg("keys") ?? "gpt,B").split(",");
  const textoDe = (r: Row, k: string) => (k === "gpt" ? r.gpt : r[k]?.[0]?.text) ?? "";
  const cats = [...new Set(rs.map((r) => r.categoria as string))].filter((c) => CATEGORIAS[c]);
  const porFrase: Record<string, Map<string, number>> = {};
  const casos: string[] = [];
  for (const cat of cats) {
    const cfg = CATEGORIAS[cat];
    const tot: Record<string, Tot> = Object.fromEntries(keys.map((k) => [k, zero()]));
    for (const r of rs.filter((x) => x.categoria === cat)) {
      const fin = laudos(r.final);
      const finTxt = norm(r.final);
      const finLinhas = linhas(r.final).map(norm);
      const dit = String(r.ditado ?? "");
      const ditNum = numeros(dit);
      const numFinalDitado = [...numeros(r.final)].filter((n) => ditNum.has(n));
      for (const k of keys) {
        const texto = textoDe(r, k);
        if (!texto) continue;
        const t = tot[k];
        const marcas: string[] = [];
        t.casos++;
        if (!/^[\s*#_]*(CONCLUS[ÃA]O|IMPRESS[ÃA]O)\b/m.test(texto)) t.recusa++;
        const cand = laudos(texto);
        const candLinhas = linhas(texto).map(norm);
        const candTxt = norm(texto);
        // Cobertura das frases normais e normalidade presumida.
        for (const n of cfg.normais) {
          const f = norm(n.frase);
          const noFinal = finLinhas.includes(f);
          const noCand = candLinhas.includes(f) || candTxt.includes(f);
          if (noFinal) {
            t.normaisFinal++;
            if (!noCand) {
              t.omissao++;
              marcas.push(`omite "${n.frase.slice(0, 40)}"`);
              const m = (porFrase[`${cat}:${k}`] ??= new Map());
              m.set(n.frase, (m.get(n.frase) ?? 0) + 1);
            }
          } else if (noCand && !finTxt.includes(f) && finLinhas.some((l) => n.sujeito.test(l))) {
            t.presumida++;
            marcas.push(`normal presumido "${n.frase.slice(0, 40)}"`);
          }
        }
        // Medidas ditadas que o médico manteve no final.
        const candNum = numeros(texto);
        t.medidasDitadas += numFinalDitado.length;
        const faltam = numFinalDitado.filter((n) => !candNum.has(n));
        t.medida += faltam.length;
        if (faltam.length) marcas.push(`medida ausente ${faltam.join(" ")}`);
        if (PLACEHOLDER.test(texto)) { t.placeholder++; marcas.push("placeholder"); }
        // Estrutura: nº de laudos e cabeçalhos por laudo.
        if (cand.length !== fin.length) { t.estrutura++; marcas.push(`laudos ${cand.length}≠${fin.length}`); }
        else {
          for (let i = 0; i < fin.length; i++) {
            const faltaHead = fin[i].heads.filter((h) => !cand[i].heads.includes(h)).length + (fin[i].titulo && !cand[i].titulo ? 1 : 0);
            if (faltaHead) { t.estrutura++; marcas.push("cabeçalho ausente"); break; }
          }
        }
        // Numeração da conclusão e fechamento.
        for (const l of cand) {
          const itens = l.conclusao;
          const numerados = itens.filter((x) => /^\d+[.)]/.test(x)).length;
          if ((itens.length === 1 && numerados === 1) || (itens.length > 1 && numerados < itens.length)) { t.numeracao++; marcas.push("numeração"); break; }
        }
        if (cfg.fechamento) {
          const fFin = cfg.fechamento.test(finTxt);
          const fCand = cfg.fechamento.test(candTxt);
          if (fFin !== fCand) { t.fechamento++; marcas.push(fFin ? "sem fechamento" : "fechamento a mais"); }
        }
        if (CONDUTA.test(texto) && !CONDUTA.test(r.final) && !CONDUTA.test(dit)) { t.conduta++; marcas.push("conduta não ditada"); }
        if (cand.some((l) => l.corpo.some((x) => DX_CORPO.test(x)))) { t.dxCorpo++; marcas.push("diagnóstico no corpo"); }
        if (LIMITACAO.test(texto) && !LIMITACAO.test(r.final) && !LIMITACAO.test(dit)) { t.limitacao++; marcas.push("limitação inventada"); }
        if (/\*\*|^\s*#|^\s*[-•]\s/m.test(texto)) { t.markdown++; marcas.push("markdown"); }
        if (marcas.length) casos.push(`${cat.slice(0, 6)} ${r.id8} ${k}: ${marcas.join("; ")}`);
      }
    }
    console.log(`\n${cat} · ${dir.split("/").pop()}`);
    console.log("| candidato | casos | normais do final omitidas | normal presumido | medidas ditadas ausentes | placeholder | estrutura | numeração | fechamento | conduta não ditada | dx no corpo | limitação inventada | markdown | recusa |");
    console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const k of keys) {
      const t = tot[k];
      if (!t.casos) continue;
      const pct = ((100 * t.omissao) / Math.max(1, t.normaisFinal)).toFixed(1);
      console.log(`| ${k} | ${t.casos} | ${t.omissao}/${t.normaisFinal} (${pct}%) | ${t.presumida} | ${t.medida}/${t.medidasDitadas} | ${t.placeholder} | ${t.estrutura} | ${t.numeracao} | ${t.fechamento} | ${t.conduta} | ${t.dxCorpo} | ${t.limitacao} | ${t.markdown} | ${t.recusa} |`);
    }
  }
  if (argv.includes("--detalhe")) {
    for (const [chave, m] of Object.entries(porFrase)) {
      console.log(`\nomissões — ${chave}:`);
      for (const [f, n] of [...m].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${n}× ${f.slice(0, 90)}`);
    }
  }
  if (argv.includes("--casos")) console.log("\n" + casos.join("\n"));
}

main();
