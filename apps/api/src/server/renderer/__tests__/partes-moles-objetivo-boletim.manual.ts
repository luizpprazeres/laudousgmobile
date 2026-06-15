/**
 * Boletim de avaliação clínica de PARTES MOLES estilo OBJETIVO — render
 * DETERMINÍSTICO (sem LLM). Gera HTML com casos representativos para o Luiz
 * validar fidelidade das frases (TÉCNICA/ACHADOS/IMPRESSÃO), reuso integral da
 * lógica/frases por tipo de lesão do clássico, 1 casa decimal e concordância.
 *
 * Rodar: tsx src/server/renderer/__tests__/partes-moles-objetivo-boletim.manual.ts
 * Saída: docs/partes-moles-objetivo-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderPartesMoles,
  type PartesMolesFindings,
  type PartesMolesLesao,
} from "../categories/PARTES_MOLES";

const F = (p: Partial<PartesMolesFindings>): PartesMolesFindings => ({
  regiao: null,
  lesoes: [],
  achados_adicionais: null,
  ...p,
});
const Les = (p: Partial<PartesMolesLesao> & { tipo: PartesMolesLesao["tipo"] }): PartesMolesLesao => ({
  ecogenicidade: null,
  contornos: null,
  plano: null,
  doppler: null,
  conteudo: null,
  paredes: null,
  reducao: null,
  conteudo_hernia: null,
  parede_hernia: null,
  tipo_hernia: null,
  natureza_colecao: null,
  medidas_cm: null,
  localizacao: null,
  descricao_raw: null,
  ...p,
});

const render = (f: PartesMolesFindings) => renderPartesMoles(f, { objetivo: true });

type Caso = { nome: string; descricao: string; laudo: string };

const CASES: Caso[] = [
  {
    nome: "1. Partes moles normais",
    descricao: "Sem lesão focal → silêncio = normalidade. Impressão sem alterações significativas.",
    laudo: render(F({ regiao: "antebraço direito" })),
  },
  {
    nome: "2. Lipoma do subcutâneo",
    descricao: "Nódulo hiperecoico homogêneo, contornos regulares → compatível com lipoma.",
    laudo: render(
      F({
        regiao: "dorso",
        lesoes: [
          Les({
            tipo: "lipoma",
            ecogenicidade: "hiperecoica",
            contornos: "regulares",
            plano: "subcutaneo",
            medidas_cm: [3.0, 1.5, 0.8],
            localizacao: "no dorso, à direita",
          }),
        ],
      }),
    ),
  },
  {
    nome: "3. Nódulo sólido a esclarecer (Doppler)",
    descricao: "Nódulo hipoecoico, contornos irregulares, no plano muscular, com fluxo ao Doppler.",
    laudo: render(
      F({
        regiao: "coxa esquerda",
        lesoes: [
          Les({
            tipo: "nodulo_solido",
            ecogenicidade: "hipoecoica",
            contornos: "irregulares",
            plano: "muscular",
            doppler: "com_fluxo",
            medidas_cm: [2.1, 1.4, 1.0],
            localizacao: "na região da coxa esquerda",
          }),
        ],
      }),
    ),
  },
  {
    nome: "4. Coleção (suspeita de abscesso)",
    descricao: "Coleção com ecos internos, paredes espessas, natureza ditada (abscesso).",
    laudo: render(
      F({
        regiao: "região glútea direita",
        lesoes: [
          Les({
            tipo: "colecao",
            conteudo: "com ecos internos",
            paredes: "de paredes espessas",
            natureza_colecao: "abscesso",
            plano: "subcutaneo",
            doppler: "sem_fluxo",
            medidas_cm: [4.0, 2.5, 2.0],
            localizacao: "na região glútea direita",
          }),
        ],
      }),
    ),
  },
  {
    nome: "5. Hérnia da parede + corpo estranho (múltiplas lesões)",
    descricao: "Hérnia incisional redutível + corpo estranho → impressão numerada.",
    laudo: render(
      F({
        regiao: "parede abdominal",
        lesoes: [
          Les({
            tipo: "hernia",
            parede_hernia: "aponeurose",
            conteudo_hernia: "gordura",
            reducao: "redutível à compressão",
            tipo_hernia: "incisional",
            medidas_cm: [1.8],
            localizacao: "na linha média infraumbilical",
          }),
          Les({
            tipo: "corpo_estranho",
            plano: "subcutaneo",
            medidas_cm: [1.5],
            localizacao: "na região plantar do pé direito",
          }),
        ],
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
<title>PARTES MOLES OBJETIVO — Boletim de avaliação</title>
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
<h1>PARTES MOLES OBJETIVO — Boletim de avaliação (render determinístico)</h1>
<div class="intro"><p>Cada caso: <b>achados montados à mão</b> → <b>laudo objetivo</b>
(TÉCNICA / ACHADOS / IMPRESSÃO). Valide: (1) <b>silêncio → normalidade</b> (nunca inventa lesão);
(2) <b>mesma descrição/conclusão por tipo</b> do clássico (nódulo/lipoma/cisto/coleção/hérnia/corpo
estranho/linfonodo); (3) <b>1 casa decimal</b> nas medidas; (4) <b>concordância de gênero</b>.</p></div>
${cards}
</body></html>`;

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/partes-moles-objetivo-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
