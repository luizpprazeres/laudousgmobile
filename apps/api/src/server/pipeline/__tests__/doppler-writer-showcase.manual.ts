/**
 * SHOWCASE (não-determinístico — chama OpenAI) dos 3 DOPPLER de alto uso do S5,
 * gerados pelo caminho WRITER real, nos 2 estilos (Clássico + Objetivo).
 *
 * Replica o fluxo do route /api/generate (fast-path): loadDeterministicBundle →
 * runWriterStream → post-processors do writer. Gera docs/doppler-writer-showcase.html.
 *
 * Rodar: tsx src/server/pipeline/__tests__/doppler-writer-showcase.manual.ts
 */
import { config } from "dotenv";
config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });

const CLASSICO_ID = "11111111-1111-4111-8111-111111111111";
const OBJETIVO_ID = "44444444-4444-4444-8444-444444444444";

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
        titulo: "TVP aguda (MIE)",
        ditado:
          "Membro inferior esquerdo. Veia femoral comum esquerda não compressível, com material ecogênico endoluminal e ausência de fluxo ao Doppler, compatível com trombose venosa profunda aguda. Veia poplítea pérvia e compressível. Veia safena magna com refluxo de 1,8 segundos.",
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
  const fs = await import("node:fs");

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
    if (bundle.error) {
      return { texto: "", erro: bundle.error.code };
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
      ragBlocks: bundle.blocks,
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
