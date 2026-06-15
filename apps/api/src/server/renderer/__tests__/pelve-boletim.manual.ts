/**
 * Boletim de avaliação clínica da PELVE_FEMININA (DET-5) — render DETERMINÍSTICO.
 *
 * Gera um HTML com casos representativos: feições montadas à mão → laudo
 * completo, para o Luiz validar as 4 variantes (via), os volumes calculados
 * (elipsóide L x AP x T x 0,523) e a fidelidade das frases.
 * NÃO usa LLM (a extração ditado→findings é outra etapa).
 *
 * Rodar (tsx direto, caminho absoluto):
 *   tsx /Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/__tests__/pelve-boletim.manual.ts
 * Saída: docs/pelve-boletim.html
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
    tabela_referencia: null,
  };
  return { ...base, ...over };
}

type Caso = {
  nome: string;
  feicoes: string;
  esperado: string;
  findings: PelveFemininaFindings;
};

const CASES: Caso[] = [
  {
    nome: "1. Normal — TA + TV",
    feicoes: "Bexiga, útero, endométrio (0,6 cm) e ovários normais; via TA+TV.",
    esperado: "Título TA+TV; bexiga no corpo e conclusão; item único de ovários.",
    findings: F({}),
  },
  {
    nome: "2. Normal — somente TV",
    feicoes: "Mesma normalidade, via transvaginal isolada (sem bexiga).",
    esperado: "Título PÉLVICA TRANSVAGINAL; sem bexiga; transdutor 6.5 MHz.",
    findings: F({ via: "tv" }),
  },
  {
    nome: "3. Normal — somente TA (endométrio limitado)",
    feicoes: "Via transabdominal isolada; endométrio não avaliável.",
    esperado: "Título TRANSABDOMINAL; frase de endométrio limitado no corpo e conclusão.",
    findings: F({ via: "ta", endometrio_espessura_cm: null, endometrio_frase: null }),
  },
  {
    nome: "4. Mioma uterino único (intramural, FIGO 4)",
    feicoes: "Nódulo hipoecoico intramural 2,0 x 1,8 x 1,5 cm na parede anterior.",
    esperado: "Corpo descreve o nódulo; conclusão 'diagnóstico mais provável nódulo miomatoso intramural (FIGO 4)'; rodapé FIGO.",
    findings: F({
      miomas: [{ classificacao: "intramural", medidas_cm: [2.0, 1.8, 1.5], parede: "parede anterior", relacao: "predominantemente intramural", figo: "4" }],
    }),
  },
  {
    nome: "5. Cisto ovariano simples à direita (alteração unilateral)",
    feicoes: "Ovário direito com cisto simples 3,0 x 2,8 x 2,5 cm; esquerdo normal.",
    esperado: "Itens separados de ovários na conclusão (OD alterado, OE normal).",
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
    nome: "6. Pós-abortamento COM produtos retidos",
    feicoes: "Via pós-abortamento; imagens hiperecoicas amorfas; quantidade moderada.",
    esperado: "Título PÓS-ABORTAMENTO; corpo com imagens amorfas + ausência de SG; conclusão 'Moderada quantidade de produtos retidos'.",
    findings: F({
      via: "pos_abortamento",
      endometrio_eco: "heterogêneo",
      endometrio_espessura_cm: 1.4,
      endometrio_frase: null,
      produtos_retidos: true,
      produtos_retidos_quantidade: "moderada",
    }),
  },
  {
    nome: "7. Pós-abortamento SEM produtos retidos",
    feicoes: "Via pós-abortamento; cavidade vazia.",
    esperado: "Conclusão 'Ausência de produtos retidos da concepção'.",
    findings: F({ via: "pos_abortamento", endometrio_frase: null, produtos_retidos: false }),
  },
  {
    nome: "8. Endometrioma à esquerda",
    feicoes: "Ovário esquerdo com imagem em vidro fosco.",
    esperado: "Conclusão 'endometrioma (O-RADS 2)'; itens de ovário separados.",
    findings: F({
      ovario_esquerdo: {
        visualizado: true,
        medidas_cm: [4.2, 3.8, 3.5],
        volume_ml: null,
        alterado: true,
        atrofico: false,
        achados: [{ lado: "esquerdo", tipo: "endometrioma", medidas_cm: [3.0, 2.5, 2.2], descricao: null }],
      },
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const tituloDoLaudo = (l: string): string => (l.split("\n")[0] ?? "—");

const cards = CASES.map((c) => {
  const laudo = renderPelveFeminina(c.findings);
  return `
  <section class="card">
    <header>
      <h2>${esc(c.nome)}</h2>
      <span class="badge">${esc(tituloDoLaudo(laudo))}</span>
    </header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado:</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>PELVE FEMININA — Boletim de avaliação (DET-5)</title>
<style>
  body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:880px;margin:0 auto;padding:32px;color:#1c1917;background:#fafaf9}
  h1{font-size:24px}
  .intro{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:18px 20px;margin:18px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #f5f5f4;padding-bottom:8px}
  .card h2{font-size:16px;margin:0}
  .badge{font-size:11px;background:#eef2ff;color:#3730a3;border:1px solid #e0e7ff;border-radius:999px;padding:3px 10px;white-space:nowrap}
  .meta{font-size:13px;color:#57534e;margin:10px 0}
  pre{white-space:pre-wrap;background:#fafaf9;border:1px solid #f0efee;border-radius:8px;padding:14px;font:13px/1.55 ui-monospace,Menlo,monospace;margin:0}
</style></head><body>
<h1>PELVE FEMININA — Boletim de avaliação clínica (DET-5, render determinístico)</h1>
<div class="intro">
  <p>Categoria de MAIOR uso entre as pendentes (221 laudos). Cada caso:
  <b>feições montadas à mão</b> → <b>laudo completo</b> (estilo Clássico).
  Valide: (1) as <b>4 variantes</b> (TA+TV, TV, TA, pós-abortamento) — título,
  técnica e bexiga corretos; (2) os <b>volumes calculados</b> pelo elipsóide
  (L x AP x T x 0,523); (3) a <b>fidelidade das frases</b> e a numeração contínua.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/pelve-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
