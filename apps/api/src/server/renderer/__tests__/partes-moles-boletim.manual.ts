/**
 * Boletim de avaliação clínica de PARTES MOLES estilo CLÁSSICO — render
 * DETERMINÍSTICO. Gera um HTML com casos representativos: feições montadas à mão
 * → laudo clássico completo (TÍTULO / COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM
 * OBSERVADOS / CONCLUSÃO). Serve para o Luiz validar a descrição morfológica e a
 * interpretação diagnóstica por tipo de lesão. NÃO usa LLM.
 *
 * Rodar: tsx src/server/renderer/__tests__/partes-moles-boletim.manual.ts
 * Saída: docs/partes-moles-boletim.html
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

type Caso = {
  nome: string;
  feicoes: string;
  esperado: string;
  findings: PartesMolesFindings;
};

const CASES: Caso[] = [
  {
    nome: "1. Normal (sem achados)",
    feicoes: "Planos musculares e subcutâneo normais; sem lesão focal.",
    esperado: "CONCLUSÃO 'Ausência de alterações detectáveis pelo método.'",
    findings: F({ regiao: "antebraço direito" }),
  },
  {
    nome: "2. Nódulo sólido (a esclarecer)",
    feicoes: "Nódulo sólido hipoecoico, contornos irregulares, plano muscular, com fluxo, 2,1 x 1,4 x 1,0 cm.",
    esperado: "Imagem nodular sólida a esclarecer; correlacionar clínica.",
    findings: F({
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
  },
  {
    nome: "3. Lipoma",
    feicoes: "Nódulo hiperecoico homogêneo, contornos regulares, subcutâneo, 3,0 x 1,5 x 0,8 cm.",
    esperado: "Achados compatíveis com lipoma.",
    findings: F({
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
  },
  {
    nome: "4. Cisto de inclusão epidérmica",
    feicoes: "Imagem cística anecoica com finos ecos internos, paredes finas, 1,2 x 1,0 x 0,9 cm.",
    esperado: "Podendo corresponder a cisto de inclusão epidérmica.",
    findings: F({
      regiao: "região cervical posterior",
      lesoes: [
        Les({
          tipo: "cisto",
          ecogenicidade: "anecoica",
          conteudo: "com finos ecos internos",
          paredes: "de paredes finas",
          medidas_cm: [1.2, 1.0, 0.9],
          localizacao: "na região cervical posterior",
        }),
      ],
    }),
  },
  {
    nome: "5. Coleção (abscesso)",
    feicoes: "Coleção com ecos internos, paredes espessas, natureza ditada abscesso, 4,0 x 2,5 x 2,0 cm.",
    esperado: "Coleção podendo corresponder a abscesso.",
    findings: F({
      regiao: "região glútea direita",
      lesoes: [
        Les({
          tipo: "colecao",
          conteudo: "com ecos internos",
          paredes: "de paredes espessas",
          natureza_colecao: "abscesso",
          doppler: "com_fluxo",
          medidas_cm: [4.0, 2.5, 2.0],
          localizacao: "na região glútea direita",
        }),
      ],
    }),
  },
  {
    nome: "6. Hérnia incisional",
    feicoes: "Solução de continuidade da aponeurose, herniação de gordura, redutível, 1,8 cm.",
    esperado: "Hérnia incisional.",
    findings: F({
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
      ],
    }),
  },
  {
    nome: "7. Corpo estranho",
    feicoes: "Imagem linear hiperecoica com reverberação posterior, subcutâneo, 1,5 cm.",
    esperado: "Imagem compatível com corpo estranho.",
    findings: F({
      regiao: "pé direito",
      lesoes: [
        Les({
          tipo: "corpo_estranho",
          plano: "subcutaneo",
          medidas_cm: [1.5],
          localizacao: "na região plantar do pé direito",
        }),
      ],
    }),
  },
  {
    nome: "8. Múltiplas lesões (lipoma + cisto)",
    feicoes: "Lipoma no braço direito + cisto no braço esquerdo.",
    esperado: "Conclusão numerada (1. lipoma; 2. cisto).",
    findings: F({
      regiao: "membros superiores",
      lesoes: [
        Les({ tipo: "lipoma", ecogenicidade: "hiperecoica", contornos: "regulares", plano: "subcutaneo", medidas_cm: [2.0, 1.0, 0.5], localizacao: "no braço direito" }),
        Les({ tipo: "cisto", ecogenicidade: "anecoica", paredes: "de paredes finas", medidas_cm: [1.0, 0.8, 0.7], localizacao: "no braço esquerdo" }),
      ],
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map((c) => {
  const laudo = renderPartesMoles(c.findings);
  return `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado (clínico):</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>PARTES MOLES CLÁSSICO — Boletim de avaliação (DET-5)</title>
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
<h1>PARTES MOLES CLÁSSICO — Boletim de avaliação (DET-5, render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>feições montadas à mão</b> → <b>laudo clássico completo</b> gerado por construção
  (TÍTULO / COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM OBSERVADOS / CONCLUSÃO). Valide:
  (1) a <b>descrição morfológica</b> (sem diagnóstico no corpo); (2) a <b>interpretação diagnóstica</b>
  na CONCLUSÃO por tipo de lesão; (3) a <b>fidelidade das frases</b> e o uso de <code>____</code> quando
  uma medida não foi ditada. Silêncio → normalidade; nada é inventado.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/partes-moles-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
