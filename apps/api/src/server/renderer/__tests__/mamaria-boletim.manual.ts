/**
 * Boletim de avaliação clínica da MAMARIA (DET-5) — render DETERMINÍSTICO.
 *
 * Gera um HTML com N casos representativos: feições → BI-RADS calculado pelo
 * código → laudo completo. Serve para o Luiz validar a gradação (escalada do
 * sólido 4A/4B/4C/5, maior-vence, override ditado) e a fidelidade das frases.
 * NÃO usa LLM (a extração ditado→findings é outra etapa); aqui os findings são
 * montados à mão para exercitar a heurística de BI-RADS e as frases.
 *
 * Rodar: npx tsx src/server/renderer/__tests__/mamaria-boletim.manual.ts
 * Saída: docs/mamaria-boletim-avaliacao.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderMamaria,
  type MamariaFindings,
  type MamariaPreferences,
} from "../categories/MAMARIA";
import { A, F } from "./mamaria-fixtures";

// Medidas/local padrão p/ um nódulo ficar realista no texto.
const loc = {
  medidas_cm: [1.2, 1.0, 0.9],
  localizacao: "quadrante superolateral",
  horario: "10 horas",
  dist_pele_cm: 0.8,
  dist_mamilo_cm: 3.0,
};

type Caso = {
  nome: string;
  feicoes: string; // resumo clínico p/ o revisor
  esperado: string; // o que clinicamente se espera (p/ comparar)
  findings: MamariaFindings;
  prefs?: Partial<MamariaPreferences>;
};

const CASES: Caso[] = [
  {
    nome: "1. Normal (sem achados)",
    feicoes: "Mamas sem lesões; título com axilas.",
    esperado: "BI-RADS 1",
    findings: F({}),
  },
  {
    nome: "2. Cisto simples unilateral",
    feicoes: "Anecoico, margem circunscrita, mama direita.",
    esperado: "BI-RADS 2",
    findings: F({
      achados: [A({ tipo: "cisto_simples", ecogenicidade: "anecoico", margem: "circunscrita", ...loc })],
    }),
  },
  {
    nome: "3. Cistos bilaterais (a maior de cada mama)",
    feicoes: "Múltiplos cistos em ambas as mamas, subcentimétricos (um achado por mama).",
    esperado: "BI-RADS 2 — conclusão 'bilateralmente, subcentimétricos'",
    findings: F({
      achados: [
        A({ tipo: "multiplos_cistos", lado: "direita", ecogenicidade: "anecoico", margem: "circunscrita", medidas_cm: [0.6, 0.5, 0.5], localizacao: "quadrante superolateral", horario: "11 horas", dist_pele_cm: 0.9, dist_mamilo_cm: 1.4 }),
        A({ tipo: "multiplos_cistos", lado: "esquerda", ecogenicidade: "anecoico", margem: "circunscrita", medidas_cm: [0.7, 0.6, 0.5], localizacao: "quadrante inferomedial", horario: "04 horas", dist_pele_cm: 0.8, dist_mamilo_cm: 2.0 }),
      ],
    }),
  },
  {
    nome: "4. Microcistos agrupados",
    feicoes: "Microcistos agrupados, mama esquerda.",
    esperado: "BI-RADS 3",
    findings: F({ achados: [A({ tipo: "microcistos_agrupados", lado: "esquerda", ...loc })] }),
  },
  {
    nome: "5. Cisto complicado",
    feicoes: "Cisto com finos ecos internos que formam nível líquido-líquido, mama direita.",
    esperado: "BI-RADS 3 — 'Cisto de conteúdo espesso'",
    findings: F({ achados: [A({ tipo: "cisto_complicado", descritores: "com finos ecos internos que formam nível líquido-líquido", ...loc })] }),
  },
  {
    nome: "6. Linfonodo intramamário",
    feicoes: "Imagem oval com hilo, mama esquerda.",
    esperado: "BI-RADS 2",
    findings: F({ achados: [A({ tipo: "linfonodo_intramamario", lado: "esquerda", ...loc })] }),
  },
  {
    nome: "7. Calcificações grosseiras benignas",
    feicoes: "Calcificações grosseiras com sombra, mama esquerda.",
    esperado: "BI-RADS 2",
    findings: F({ achados: [A({ tipo: "calcificacoes", lado: "esquerda", calcificacoes: "grosseiras_benignas", medidas_cm: [0.4, 0, 0] })] }),
  },
  {
    nome: "8. Microcalcificações",
    feicoes: "Microcalcificações agrupadas, mama direita.",
    esperado: "≥ BI-RADS 4 (suspeita)",
    findings: F({ achados: [A({ tipo: "calcificacoes", calcificacoes: "microcalcificacoes", medidas_cm: [0.2, 0, 0] })] }),
  },
  {
    nome: "9. Sólido benigno (tripé)",
    feicoes: "Sólido oval + circunscrito + paralelo, sem sombra.",
    esperado: "BI-RADS 3",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "oval", margem: "circunscrita", orientacao: "paralela", posterior: "nenhuma", ...loc })],
    }),
  },
  {
    nome: "10. Sólido → 4A (sem feições moderadas/fortes)",
    feicoes: "Sólido redondo, margem circunscrita, paralelo (não bate o tripé por não ser oval).",
    esperado: "4A?",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "isoecoico", forma: "redonda", margem: "circunscrita", orientacao: "paralela", posterior: "nenhuma", ...loc })],
    }),
  },
  {
    nome: "11. Sólido → 4B (2 feições moderadas, 0 fortes)",
    feicoes: "Forma oval, margem microlobulada + orientação não-paralela (2 moderadas; sem forte).",
    esperado: "4B?",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "oval", margem: "microlobulada", orientacao: "nao_paralela", posterior: "nenhuma", ...loc })],
    }),
  },
  {
    nome: "12. Sólido → 4C (1 feição forte)",
    feicoes: "Margem espiculada (1 forte).",
    esperado: "4C?",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "oval", margem: "espiculada", orientacao: "paralela", posterior: "nenhuma", ...loc })],
    }),
  },
  {
    nome: "13. Sólido → 5 (2 feições fortes)",
    feicoes: "Margem espiculada + forma irregular (2 fortes).",
    esperado: "5?",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "irregular", margem: "espiculada", orientacao: "nao_paralela", posterior: "sombra", ...loc })],
    }),
  },
  {
    nome: "14. Override ditado (vence o cálculo)",
    feicoes: "Sólido com tripé benigno (calcularia 3), mas médico ditou BI-RADS 5.",
    esperado: "5 (ditado vence)",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "oval", margem: "circunscrita", orientacao: "paralela", birads_ditado: "5", ...loc })],
    }),
  },
  {
    nome: "15. Maior-vence (cisto 2 + sólido 4B)",
    feicoes: "Cisto simples (2) + sólido oval microlobulado/não-paralelo (4B) na mesma paciente.",
    esperado: "Estudo 4B; só o sólido leva o rótulo",
    findings: F({
      achados: [
        A({ tipo: "cisto_simples", lado: "direita", ecogenicidade: "anecoico", margem: "circunscrita", medidas_cm: [0.7, 0.6, 0.5], localizacao: "quadrante inferomedial", horario: "04 horas" }),
        A({ tipo: "nodulo_solido", lado: "esquerda", ecogenicidade: "hipoecoico", forma: "oval", margem: "microlobulada", orientacao: "nao_paralela", ...loc }),
      ],
    }),
  },
  {
    nome: "16. NML (achado não-nodular)",
    feicoes: "Área heterogênea sem configuração nodular, 2,4 por 2,0 cm.",
    esperado: "BI-RADS 4 — 2 medidas, formato 'Área heterogênea de mama…'",
    findings: F({
      achados: [A({ tipo: "achado_nao_nodular", medidas_cm: [2.4, 2.0], localizacao: "quadrante superolateral", horario: "11 horas" })],
    }),
  },
  {
    nome: "17. Ginecomastia (mama masculina)",
    feicoes: "Aumento fibroglandular retroareolar, à esquerda.",
    esperado: "Sem BI-RADS",
    findings: F({ mama_masculina: true, achados: [A({ tipo: "ginecomastia", lado: "esquerda" })] }),
  },
  {
    nome: "18. Próteses (plano cirúrgico opcional)",
    feicoes: "Próteses retromusculares, sem rotura. Frase 'Não há sinais…' deve permanecer.",
    esperado: "Sem categoria; plano cirúrgico ditado aparece",
    findings: F({ com_protese: true, achados: [A({ tipo: "proteses", lado: "bilateral", descritores: "predominantemente retromusculares" })] }),
  },
  {
    nome: "19. Correlação com mamografia (reclassifica)",
    feicoes: "Sólido 4A + mamografia que reclassifica para BI-RADS 2.",
    esperado: "Frase de correlação",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "isoecoico", forma: "oval", margem: "circunscrita", orientacao: "paralela", ...loc })],
      correlacao: { tipo_exame: "mamografia", data: "10/05/2026", efeito: "reclassifica", birads_final: "2" },
    }),
  },
  {
    nome: "20. Conduta ligada (toggle) — sólido 4C",
    feicoes: "Mesmo caso 12, com show_conduct_recommendation = true.",
    esperado: "Linha de conduta sugerida ao final",
    findings: F({
      achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "oval", margem: "espiculada", orientacao: "paralela", ...loc })],
    }),
    prefs: { show_conduct_recommendation: true },
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const biradsDoLaudo = (laudo: string): string => {
  const matches = [...laudo.matchAll(/Categoria BI-RADS® ([0-9][A-C]?)/g)].map((m) => m[1]);
  return matches.length ? matches.join(", ") : "—";
};

const cards = CASES.map((c) => {
  const laudo = renderMamaria(c.findings, c.prefs);
  const calc = biradsDoLaudo(laudo);
  return `
  <section class="card">
    <header>
      <h2>${esc(c.nome)}</h2>
      <span class="badge">BI-RADS no laudo: <b>${esc(calc)}</b></span>
    </header>
    <p class="meta"><b>Feições:</b> ${esc(c.feicoes)}<br/><b>Esperado (clínico):</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>MAMARIA — Boletim de avaliação (DET-5)</title>
<style>
  body{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;max-width:880px;margin:0 auto;padding:32px;color:#1c1917;background:#fafaf9}
  h1{font-size:24px}
  .intro{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px}
  .card{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:18px 20px;margin:18px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .card header{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #f5f5f4;padding-bottom:8px}
  .card h2{font-size:16px;margin:0}
  .badge{font-size:12px;background:#eef2ff;color:#3730a3;border:1px solid #e0e7ff;border-radius:999px;padding:3px 10px;white-space:nowrap}
  .meta{font-size:13px;color:#57534e;margin:10px 0}
  pre{white-space:pre-wrap;background:#fafaf9;border:1px solid #f0efee;border-radius:8px;padding:14px;font:13px/1.55 ui-monospace,Menlo,monospace;margin:0}
</style></head><body>
<h1>MAMARIA — Boletim de avaliação clínica (DET-5, render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>feições montadas à mão</b> → <b>BI-RADS que o código colocou</b> → <b>laudo completo</b>.
  Valide: (1) a <b>gradação</b> — sobretudo a escalada do sólido (casos 9–13) e o maior-vence (15);
  (2) a <b>fidelidade das frases</b> (preposição "de mama", margens nunca "regulares", títulos/axilas, rodapé).
  Marque o que ajustar — eu altero a heurística e viramos golden.</p>
  <p style="font-size:13px;color:#57534e">Heurística atual do sólido: <b>tripé benigno</b> (oval+circunscrita+paralela, sem sombra/microcalc) → 3.
  Senão pondera — <b>fortes</b> (espiculada · irregular · microcalc/calc em nódulo · sombra+não-paralela) e
  <b>moderadas</b> (microlobulada/angular/indistinta · não-paralela · sombra): 2+ fortes → 5 · 1 forte → 4C · 2+ moderadas → 4B · senão → 4A.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/mamaria-boletim-avaliacao.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
