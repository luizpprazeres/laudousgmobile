/**
 * SHOWCASE (não-determinístico — chama OpenAI) dos 3 DOPPLER de alto uso do S5,
 * gerados pelo caminho WRITER real, nos 2 estilos (Clássico + Objetivo).
 *
 * Replica o fluxo do route /api/generate (fast-path): loadDeterministicBundle →
 * runWriterStream → post-processors do writer. Gera docs/doppler-writer-showcase.html.
 *
 * Rodar: tsx src/server/pipeline/__tests__/doppler-writer-showcase.manual.ts
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });

const CLASSICO_ID = "11111111-1111-4111-8111-111111111111";
const OBJETIVO_ID = "44444444-4444-4444-8444-444444444444";
const REPO_ROOT = "/Users/luizprazeres/laudousgmobile-def";
const VARIANT_TAG_PREFIX = "variant:";
const VENOUS_CARTOGRAPHY_TRIGGER =
  /cartografia|mapeamento\s+venoso|pr[ée][-\s]?operat[óo]rio|pr[ée][-\s]?op\b|varizes?|pr[ée][-\s]?safenectomia|pr[ée][-\s]?abla[çc][ãa]o|pr[ée][-\s]?radiofrequ[êe]ncia|insufici[êe]ncia\s+(?:venosa|varicosa)/i;

type Caso = { titulo: string; ditado: string };
const SUITE: { categoria: string; casos: Caso[] }[] = [
  {
    categoria: "DOPPLER_OBSTETRICO",
    casos: [
      {
        titulo: "Normal (28s3d)",
        ditado:
          "Gestação de 28 semanas e 3 dias. Feto único, apresentação cefálica, dorso à esquerda. Batimentos cardíacos presentes, BCF 148 bpm. Movimentos fetais ativos. DBP 71 mm, circunferência cefálica 258 mm, circunferência abdominal 242 mm, comprimento do fêmur 53 mm. Peso fetal aproximado 1180 gramas, percentil 45. Placenta anterior grau I. Líquido amniótico normal. Artéria umbilical IP 1,0 percentil 50. Artéria cerebral média IP 1,9 percentil 60. Artéria uterina direita IP 0,68, uterina esquerda IP 0,72.",
      },
      {
        titulo: "Alterado (CIR + uterinas alteradas)",
        ditado:
          "Gestação de 34 semanas. Feto único cefálico, dorso à direita. BCF 140 bpm. DBP 86 mm, circunferência cefálica 305 mm, circunferência abdominal 290 mm, comprimento do fêmur 64 mm. Peso fetal 1980 gramas, percentil 6. Placenta posterior grau II. Líquido amniótico reduzido. Artéria umbilical IP 1,4 percentil 96, com diástole reduzida. Artéria cerebral média IP 1,3 percentil 8. Relação cérebro-placentária reduzida. Artérias uterinas com incisura protodiastólica bilateral, IP médio 1,2 percentil 97.",
      },
    ],
  },
  {
    categoria: "DOPPLER_RENAL",
    casos: [
      {
        titulo: "Normal",
        ditado:
          "Aorta abdominal de calibre normal, VPS 85 cm/s, sem placas. Artéria renal direita com VPS 110 cm/s no segmento ostial, padrão espectral normal. Artéria renal esquerda VPS 130 cm/s, padrão normal. Índice de resistência no parênquima direito 0,62 e esquerdo 0,64. Rim direito 10,8 cm, rim esquerdo 10,5 cm.",
      },
      {
        titulo: "Estenose à esquerda",
        ditado:
          "Aorta abdominal VPS 95 cm/s. Artéria renal direita VPS 130 cm/s, IR 0,66. Artéria renal esquerda com VPS de 290 cm/s no segmento médio, relação aorto-renal 3,4, com padrão tardus-parvus nas interlobares distais e IR 0,48. Rim esquerdo 8,9 cm, rim direito 10,9 cm.",
      },
    ],
  },
  {
    categoria: "DOPPLER_VENOSO_MMII",
    casos: [
      {
        titulo: "Normal (MID)",
        ditado:
          "Membro inferior direito. Veias femoral comum, femoral, poplítea e veias da panturrilha compressíveis, com fluxo fásico e resposta normal às manobras de compressão distal. Sem trombos. Veia safena magna pérvia, sem refluxo.",
      },
      {
        titulo: "TVP-only contraste (MIE)",
        ditado:
          "Exame para pesquisa de TVP no membro inferior esquerdo. Veias femoral comum, femoral e poplítea pérvias e compressíveis, com fluxo fásico preservado. Veias tibiais posteriores e fibulares compressíveis. Sem trombos.",
      },
      {
        titulo: "Cartografia bilateral — refluxo safena magna + tributárias + perfurantes",
        ditado:
          "Cartografia venosa pré-operatória dos membros inferiores. No membro inferior direito, sistema venoso fêmoro-poplíteo pérvio e compressível, sem trombose. Junção safeno-femoral competente. Safena magna direita com refluxo em coxa média e distal, diâmetros: croça 5,1 mm, coxa proximal 4,3 mm, coxa média 4,9 mm, coxa distal 5,4 mm, joelho 4,2 mm, perna proximal 3,6 mm, perna média 3,0 mm. Tributária varicosa medial de coxa medindo 4,8 mm, drenando para varicosidades na face medial da perna. Perfurante incompetente medial de perna a 16 cm do maléolo, 4,2 mm, refluxo de 1,1 segundo. Junção safeno-poplítea competente, safena parva sem refluxo. No membro inferior esquerdo, sistema profundo pérvio e compressível. Junção safeno-femoral com refluxo. Safena magna esquerda com refluxo desde a croça até perna proximal, medidas em ordem: croça 6,4 mm, coxa proximal 5,9 mm, coxa média 5,2 mm, coxa distal 4,9 mm, joelho 4,4 mm, perna proximal 3,8 mm. Tributária posterior de coxa medindo 5 mm, com transferência para tributária anterior de perna. Perfurante medial de perna 18 cm acima do maléolo, 4,5 mm. Safena parva esquerda pérvia, sem refluxo.",
      },
      {
        titulo: "Cartografia — prosa com transferência e drenagem",
        ditado:
          "Mapeamento venoso por varizes. Membro inferior direito com veias profundas pérvias e compressíveis. A safena magna direita tem refluxo segmentar na coxa distal, transferido através de ramo tributário anterior da coxa e drenado por tributária varicosa da face medial da perna. Os diâmetros encontram-se em torno de 4,0 mm na croça, 3,7 mm na coxa proximal, 4,6 mm na coxa distal, 3,9 mm no joelho e 3,2 mm na perna proximal. Não há refluxo na safena parva direita. Membro inferior esquerdo com sistema profundo pérvio. Junção safeno-femoral esquerda com refluxo, safena magna com refluxo em coxa proximal e média, transferido por tributária posterior de coxa, drenado através de varicosidades em face posterior e medial da perna. Diâmetros de 5,7 mm na croça, 5,1 mm na coxa proximal, 4,8 mm na coxa média, 4,0 mm no joelho e 3,5 mm na perna. Perfurante incompetente posterior de perna esquerda medindo 3,9 mm.",
      },
      {
        titulo: "Cartografia — insuficiência varicosa com medidas em ordem livre",
        ditado:
          "Insuficiência venosa varicosa, avaliação pré-ablação. À direita, veias femoral comum, femoral e poplítea compressíveis. Safena magna com refluxo desde a junção safeno-femoral até o joelho. Medidas ditadas: joelho 4,6 mm, croça 6,0 mm, coxa média 5,5 mm, coxa proximal 5,8 mm, coxa distal 5,1 mm, perna proximal 3,7 mm. Tributária varicosa lateral de coxa, 5,2 mm, comunicando com rede varicosa lateral da perna. Perfurante lateral da perna direita 4,0 mm. Safena parva direita competente. À esquerda, sistema profundo sem trombose. Safena magna esquerda pérvia, sem refluxo significativo, com diâmetro de 4,2 mm na croça e 3,6 mm na coxa média. Tributárias varicosas discretas na face medial da perna. Junção safeno-poplítea e safena parva esquerdas competentes.",
      },
    ],
  },
];

function formatObjectiveEnumerations(text: string) {
  return text
    .replace(/([^\n])\s+(\d+[-)]\s)/g, "$1\n$2")
    .split("\n")
    .filter((line) => !line.includes("____"))
    .filter(
      (line) =>
        !/Breast Imaging Reporting|Domingos Correia da Rocha|American College of Radiology/i.test(
          line,
        ),
    )
    .join("\n");
}

type LocalBlock = {
  id: string;
  kind: string;
  title: string;
  content: string;
  priority: number;
  tags: string[];
  status: string;
};

function variantOf(tags: string[]): string | null {
  const tag = tags.find((x) => x.startsWith(VARIANT_TAG_PREFIX));
  return tag ? tag.slice(VARIANT_TAG_PREFIX.length) : null;
}

function parseTags(value: string | undefined) {
  if (!value) return [];
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseSnippet(filePath: string): LocalBlock {
  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Frontmatter ausente em ${filePath}`);
  const values = new Map<string, string>();
  for (const line of (match[1] ?? "").split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return {
    id: values.get("id") ?? path.basename(filePath),
    kind: values.get("kind") ?? "regra",
    title: values.get("id") ?? path.basename(filePath),
    content: (match[2] ?? "").trim(),
    priority: Number.parseInt(values.get("priority") ?? "50", 10),
    tags: parseTags(values.get("tags")),
    status: values.get("status") ?? "published",
  };
}

function walkMarkdownFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
    return [];
  });
}

function loadLocalVenousCartographyBundle() {
  const snippetsDir = path.join(
    REPO_ROOT,
    "packages/knowledge/snippets/DOPPLER_VENOSO_MMII",
  );
  return walkMarkdownFiles(snippetsDir)
    .map(parseSnippet)
    .filter((block) => block.status !== "archived" && block.status !== "draft")
    .filter((block) => {
      const blockVariant = variantOf(block.tags);
      return blockVariant === null || blockVariant === "cartografia";
    })
    .sort(
      (a, b) =>
        kindRank(a.kind) - kindRank(b.kind) ||
        b.priority - a.priority ||
        a.id.localeCompare(b.id),
    )
    .map((block) => ({
      id: block.id,
      kind: block.kind,
      title: block.title,
      content: block.content,
      priority: block.priority,
      similarity: null,
    }));
}

const KIND_ORDER = [
  "modelo",
  "regra",
  "frase",
  "conclusao",
  "excecao",
  "comentario_tecnico",
  "exemplo",
] as const;

function kindRank(kind: string): number {
  const index = (KIND_ORDER as readonly string[]).indexOf(kind);
  return index === -1 ? KIND_ORDER.length : index;
}

async function main() {
  const { loadDeterministicBundle } = await import("../bundleLoader");
  const { runWriterStream } = await import("../writer");
  const { getWritingStyleById, getKnownCategories } = await import(
    "../../db/lookups"
  );
  const { ensurePesoFetalConclusion } = await import("../pesoFetalGuard");
  const { correctDopplerConclusion, extractDopplerData } = await import(
    "../dopplerOverlay"
  );
  const { removeEmptyConclusionItems } = await import(
    "../emptyConclusionItemsGuard"
  );

  const categoriesInfo = await getKnownCategories();
  const styles = {
    CLASSICO: await getWritingStyleById(CLASSICO_ID),
    OBJETIVO: await getWritingStyleById(OBJETIVO_ID),
  };

  async function gera(
    categoria: string,
    ditado: string,
    styleId: string,
    styleCode: string,
  ): Promise<{ texto: string; erro?: string }> {
    const bundle = await loadDeterministicBundle({
      categoryCode: categoria,
      writingStyleId: styleId,
      rawInput: ditado,
      accountVariantKey: undefined,
    });
    let ragBlocks;
    if (bundle.error) {
      if (
        categoria === "DOPPLER_VENOSO_MMII" &&
        bundle.error.code === "BUNDLE_VARIANT_EMPTY" &&
        VENOUS_CARTOGRAPHY_TRIGGER.test(ditado)
      ) {
        ragBlocks = loadLocalVenousCartographyBundle();
      } else {
        return { texto: "", erro: bundle.error.code };
      }
    } else {
      ragBlocks = bundle.blocks;
    }
    const findings = {
      schema_version: "v1",
      categoria_detectada: categoria,
      tipo_exame: categoriesInfo.labels.get(categoria) ?? categoria,
      achados: {},
      comandos_do_medico: [],
      trechos_confusos: [],
      nivel_de_confianca: "alta",
    } as never;

    const gen = runWriterStream({
      findings,
      ragBlocks: ragBlocks as never,
      writingStyleCode: styleCode as never,
      categoryCode: categoria,
      categoryLabel: categoriesInfo.labels.get(categoria) ?? categoria,
      rawUserMessage: ditado,
    });
    let finalText = "";
    while (true) {
      const next = await gen.next();
      if (next.done) {
        finalText = next.value.fullText;
        break;
      }
    }
    // Post-processors do writer (espelha route.ts).
    if (styleCode === "OBJETIVO") finalText = formatObjectiveEnumerations(finalText);
    if (categoria === "DOPPLER_OBSTETRICO") {
      finalText = ensurePesoFetalConclusion(finalText, ditado);
      finalText = correctDopplerConclusion(finalText, extractDopplerData(ditado));
    }
    finalText = removeEmptyConclusionItems(finalText);
    return { texto: finalText };
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const secoes: string[] = [];

  for (const { categoria, casos } of SUITE) {
    const casosHtml: string[] = [];
    for (const c of casos) {
      const [cl, ob] = await Promise.all([
        gera(categoria, c.ditado, CLASSICO_ID, styles.CLASSICO!.code),
        gera(categoria, c.ditado, OBJETIVO_ID, styles.OBJETIVO!.code),
      ]);
      const col = (r: { texto: string; erro?: string }, label: string) =>
        r.erro
          ? `<div class="col err"><h4>${label}</h4><pre class="erro">⚠ BUNDLE: ${r.erro}\n(estilo sem biblioteca curada no DB — bloquearia em prod)</pre></div>`
          : `<div class="col"><h4>${label}</h4><pre>${esc(r.texto)}</pre></div>`;
      casosHtml.push(
        `<div class="caso"><div class="ditado"><b>${esc(c.titulo)}</b><br>${esc(c.ditado)}</div><div class="cols">${col(cl, "CLÁSSICO")}${col(ob, "OBJETIVO")}</div></div>`,
      );
      console.log(`✓ ${categoria} — ${c.titulo}`);
    }
    secoes.push(`<section><h2>${categoria}</h2>${casosHtml.join("")}</section>`);
  }

  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Showcase DOPPLER writer — S5</title>
<style>
body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:24px;background:#f5f5f7;color:#1d1d1f}
h1{font-size:22px} h2{margin-top:32px;border-bottom:2px solid #0071e3;padding-bottom:6px;color:#0071e3}
.caso{background:#fff;border-radius:12px;padding:16px;margin:16px 0;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ditado{background:#f0f4ff;border-radius:8px;padding:10px;font-size:13px;color:#444;margin-bottom:12px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.col h4{margin:0 0 6px;font-size:12px;letter-spacing:.5px;color:#888}
pre{white-space:pre-wrap;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px;font:13px/1.5 ui-monospace,Menlo,monospace;margin:0}
pre.erro{background:#fff4f4;border-color:#ffcccc;color:#c00}
</style>
<h1>Showcase DOPPLER (caminho writer/LLM) — S5 · cabeçalhos unificados TÉCNICA / ACHADOS / IMPRESSÃO</h1>
<p>Gerado com gpt-4.1-mini (fast-path) · estilo Clássico vs Objetivo lado a lado.</p>
${secoes.join("")}
</html>`;

  const out = "/Users/luizprazeres/laudousgmobile-def/docs/doppler-writer-showcase.html";
  fs.writeFileSync(out, html, "utf8");
  console.log(`\nBoletim: ${out}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
