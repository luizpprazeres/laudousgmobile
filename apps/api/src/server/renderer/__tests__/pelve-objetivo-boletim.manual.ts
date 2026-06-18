/**
 * Boletim de avaliação clínica da PELVE_FEMININA estilo OBJETIVO — render
 * DETERMINÍSTICO. Gera um HTML com casos representativos: feições montadas à mão
 * → laudo objetivo completo (TÉCNICA/ACHADOS/IMPRESSÃO). Serve para o Luiz validar
 * a TÉCNICA por via, os volumes calculados (elipsóide L x AP x T x 0,523) e a
 * fidelidade das frases enxutas. NÃO usa LLM.
 *
 * Rodar (tsx direto, caminho absoluto):
 *   tsx /Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/__tests__/pelve-objetivo-boletim.manual.ts
 * Saída: docs/pelve-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderPelveFeminina,
  type PelveFemininaFindings,
} from "../categories/PELVE_FEMININA";

const ovNormal = (medidas: number[]): PelveFemininaFindings["ovario_direito"] => ({
  visualizado: true,
  medidas_cm: medidas,
  volume_ml: null,
  alterado: false,
  atrofico: false,
  achados: [],
});

function F(over: Partial<PelveFemininaFindings>): PelveFemininaFindings {
  const base: PelveFemininaFindings = {
    via: "ta_tv",
    utero_posicao: "anteversoflexão",
    utero_medidas_cm: [7.2, 4.0, 5.0],
    utero_volume_ml: null,
    utero_volume_classe: null,
    miometrio_descricao: null,
    miomas: [],
    utero_miomatoso: false,
    endometrio_espessura_cm: 0.6,
    endometrio_eco: null,
    endometrio_frase: "padrao",
    endometrio_motivo: null,
    endometrio_achado: null,
    endometrio_conclusao: null,
    ovario_direito: ovNormal([3.0, 2.0, 2.2]),
    ovario_esquerdo: ovNormal([3.1, 2.1, 2.0]),
    diu: null,
    diu_descricao: null,
    istmocele: false,
    istmocele_descricao: null,
    istmocele_tipo: null,
    cistos_naboth: false,
    calcificacao_arqueadas: false,
    adenomiose: false,
    adenomiose_conclusao: null,
    liquido_livre: false,
    liquido_livre_descricao: null,
    produtos_retidos: false,
    produtos_retidos_quantidade: null,
    observacoes_corpo: null,
    achados_adicionais: null,
    referencia_idade_anos: null, referencia_grande_multipara: false,
  };
  return { ...base, ...over };
}

type Caso = {
  nome: string;
  feicoes: string;
  esperado: string;
  findings: PelveFemininaFindings;
};

const render = (f: PelveFemininaFindings) => renderPelveFeminina(f, { objetivo: true });

const CASES: Caso[] = [
  {
    nome: "1. Normal — TA + TV",
    feicoes: "Útero 7,2 x 4 x 5 cm, AVF; endométrio 0,6 cm; ovários normais; sem líquido livre.",
    esperado: "TÉCNICA TA+TV (com bexiga); útero 75,3 cm³; ovários item único.",
    findings: F({ via: "ta_tv" }),
  },
  {
    nome: "2. Normal — somente TV",
    feicoes: "Mesma paciente, exame só transvaginal.",
    esperado: "TÉCNICA endocavitária; SEM bexiga nos achados/impressão.",
    findings: F({ via: "tv" }),
  },
  {
    nome: "3. Mioma intramural (FIGO 4)",
    feicoes: "Nódulo intramural 2,0 x 1,8 x 1,5 cm na parede anterior, FIGO 4.",
    esperado: "Achados: imagem hipoecoica na parede anterior; impressão: nódulo miomatoso intramural (FIGO 4); rodapé FIGO.",
    findings: F({
      miomas: [
        { classificacao: "intramural", medidas_cm: [2.0, 1.8, 1.5], parede: "parede anterior", relacao: null, figo: "4" },
      ],
    }),
  },
  {
    nome: "4. Cisto/coleção ovariana (O-RADS 2)",
    feicoes: "Ovário direito 4 x 3,5 x 3 cm com imagem anecoica de 3 x 2,8 x 2,5 cm.",
    esperado: "Impressão: ovário direito de volume aumentado (22 cm³), coleção líquida (O-RADS 2); OE normal separado.",
    findings: F({
      ovario_direito: {
        visualizado: true,
        medidas_cm: [4.0, 3.5, 3.0],
        volume_ml: null,
        alterado: true,
        atrofico: false,
        achados: [{ lado: "direito", tipo: "cisto_simples", medidas_cm: [3.0, 2.8, 2.5], descricao: null }],
      },
    }),
  },
  {
    nome: "5. Endometrioma (O-RADS 2)",
    feicoes: "Ovário esquerdo 4,5 x 4 x 3,5 cm com imagem de baixa ecogenicidade (vidro fosco) de 3,5 x 3 x 2,8 cm.",
    esperado: "Achados: imagem de baixa ecogenicidade; impressão: endometrioma (O-RADS 2) com classe+volume.",
    findings: F({
      ovario_esquerdo: {
        visualizado: true,
        medidas_cm: [4.5, 4.0, 3.5],
        volume_ml: null,
        alterado: true,
        atrofico: false,
        achados: [{ lado: "esquerdo", tipo: "endometrioma", medidas_cm: [3.5, 3.0, 2.8], descricao: null }],
      },
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map((c) => {
  const laudo = render(c.findings);
  return `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado (clínico):</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>PELVE FEMININA OBJETIVO — Boletim de avaliação</title>
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
<h1>PELVE FEMININA OBJETIVO — Boletim de avaliação (render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>feições montadas à mão</b> → <b>laudo objetivo</b>
  (TÉCNICA / ACHADOS / IMPRESSÃO). Valide: (1) a <b>TÉCNICA por via</b>
  (ta/tv/ta_tv/pós-abortamento); (2) os <b>volumes</b> uterino/ovariano calculados
  pela fórmula do elipsóide (L x AP x T x 0,523); (3) a <b>fidelidade das frases</b>
  enxutas e os ajustes clínicos (O-RADS 2, endometrioma, classe+volume do ovário
  alterado).</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/pelve-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
