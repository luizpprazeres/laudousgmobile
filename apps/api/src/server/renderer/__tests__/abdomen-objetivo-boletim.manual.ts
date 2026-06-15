/**
 * Boletim de avaliação clínica do ABDOMEN_TOTAL estilo OBJETIVO (Sprint 3) —
 * render DETERMINÍSTICO (sem LLM; casos só catálogo). Gera HTML com casos
 * representativos para o Luiz validar a estrutura objetiva (TÉCNICA/ACHADOS/
 * IMPRESSÃO), a ordem fixa dos órgãos, as frases clínicas reusadas e a impressão.
 *
 * Rodar: tsx src/server/renderer/__tests__/abdomen-objetivo-boletim.manual.ts
 * Saída: docs/abdomen-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderOrgan,
  renderExtraAbdominal,
  assembleAbdomenObjetivo,
  type OrganRender,
  type FreeSlotRenderedAbdomen,
} from "../phrases/ABDOMEN_TOTAL";
import {
  ABDOMEN_ORGAN_KEYS,
  type AbdomenOrganKey,
  type AbdomenTotalFindings,
  type AbdomenOrganState,
  type AbdomenFinding,
} from "../findingsSchemas/ABDOMEN_TOTAL";

const finding = (p: Partial<AbdomenFinding>): AbdomenFinding => ({
  tipo: "outro",
  grau: null,
  quantidade: null,
  lateralidade: null,
  mobilidade: null,
  localizacao: null,
  medidas_cm: null,
  valor_ml: null,
  termo_do_medico: null,
  descricao_livre: null,
  ...p,
});

const NORMAL: AbdomenOrganState = { status: "normal", achados: [] };

function F(
  overrides: Partial<Record<AbdomenOrganKey, AbdomenOrganState>>,
  extra: AbdomenFinding[] = [],
): AbdomenTotalFindings {
  const orgaos = Object.fromEntries(
    ABDOMEN_ORGAN_KEYS.map((k) => [k, overrides[k] ?? NORMAL]),
  ) as AbdomenTotalFindings["orgaos"];
  return { orgaos, achados_extra_abdominais: extra, observacoes_do_medico: null };
}

function render(f: AbdomenTotalFindings): string {
  const organRenders = new Map<AbdomenOrganKey, OrganRender>();
  for (const organ of ABDOMEN_ORGAN_KEYS) {
    organRenders.set(organ, renderOrgan(organ, f.orgaos[organ]));
  }
  const extraRenders = f.achados_extra_abdominais.map(renderExtraAbdominal);
  return assembleAbdomenObjetivo({
    organRenders,
    freeByOrgan: new Map<string, FreeSlotRenderedAbdomen[]>(),
    extraRenders,
    allOrganKeys: ABDOMEN_ORGAN_KEYS,
  });
}

type Caso = { nome: string; descricao: string; laudo: string };

const CASES: Caso[] = [
  {
    nome: "1. Abdome total normal",
    descricao: "Todos os órgãos sem alterações → impressão sem alterações.",
    laudo: render(F({})),
  },
  {
    nome: "2. Esteatose hepática moderada",
    descricao: "Aumento difuso da ecogenicidade → impressão esteatose.",
    laudo: render(
      F({ figado: { status: "alterado", achados: [finding({ tipo: "esteatose", grau: "moderado" })] } }),
    ),
  },
  {
    nome: "3. Litíase da vesícula biliar",
    descricao: "Cálculo único móvel com sombra acústica.",
    laudo: render(
      F({
        vesicula: {
          status: "alterado",
          achados: [finding({ tipo: "litiase", quantidade: "unica", mobilidade: "movel", medidas_cm: [1.4] })],
        },
      }),
    ),
  },
  {
    nome: "4. Cisto renal simples direito",
    descricao: "Imagem anecoica homogênea no terço médio.",
    laudo: render(
      F({
        rim_direito: {
          status: "alterado",
          achados: [finding({ tipo: "cisto_simples", medidas_cm: [2.1, 1.8, 1.6], localizacao: "terço médio" })],
        },
      }),
    ),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map(
  (c) => `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta">${esc(c.descricao)}</p>
    <pre>${esc(c.laudo)}</pre>
  </section>`,
).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>ABDOMEN TOTAL OBJETIVO — Boletim de avaliação (Sprint 3)</title>
<style>
  body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:880px;margin:0 auto;padding:32px;color:#1c1917;background:#fafaf9}
  h1{font-size:24px}
  .intro{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:18px 20px;margin:18px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card header{border-bottom:1px solid #f5f5f4;padding-bottom:8px}
  .card h2{font-size:16px;margin:0}
  .meta{font-size:13px;color:#57534e;margin:10px 0}
  pre{white-space:pre-wrap;background:#fafaf9;border:1px solid #f0efee;border-radius:8px;padding:14px;font:13px/1.55 ui-monospace,Menlo,monospace;margin:0}
</style></head><body>
<h1>ABDOMEN TOTAL OBJETIVO — Boletim de avaliação (Sprint 3, render determinístico)</h1>
<div class="intro"><p>Cada caso: <b>achados montados à mão</b> → <b>laudo objetivo</b>
(TÉCNICA / ACHADOS / IMPRESSÃO). Valide: (1) <b>ordem fixa dos órgãos</b>; (2) <b>frases clínicas
reusadas</b> (idênticas ao clássico — só muda a estrutura/cabeçalhos); (3) <b>impressão</b> a partir
dos itens de conclusão; (4) <b>1 casa decimal</b>. NOTA: achados fora do catálogo (free-slots, LLM)
não aparecem aqui — estes casos cobrem só o catálogo determinístico.</p></div>
${cards}
</body></html>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/abdomen-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
