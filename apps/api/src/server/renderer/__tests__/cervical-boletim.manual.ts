/**
 * Boletim de avaliação clínica da CERVICAL estilo CLÁSSICO (DET-5) — render
 * DETERMINÍSTICO. Gera um HTML com N casos representativos: achados montados à mão
 * → laudo clássico completo (TÍTULO / COMENTÁRIOS / OS SEGUINTES ASPECTOS / CONCLUSÃO).
 * Serve para o Luiz validar a lógica de NÍVEIS de Robbins, linfonodos normais vs
 * suspeitos, glândulas salivares e a fidelidade das frases. NÃO usa LLM.
 *
 * Rodar: tsx src/server/renderer/__tests__/cervical-boletim.manual.ts
 * Saída: docs/cervical-boletim.html
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderCervical,
  type CervicalFindings,
  type CervicalLinfonodoAlterado,
  type CervicalGlandula,
} from "../categories/CERVICAL";

const F = (over: Partial<CervicalFindings> = {}): CervicalFindings => ({
  com_doppler: false,
  niveis_normais: [],
  linfonodos_alterados: [],
  submandibulares: [],
  parotidas: [],
  tireoide_descrita: false,
  tireoide_alterada: false,
  tireoide_descricao: null,
  achados_adicionais: null,
  ...over,
});
const LN = (over: Partial<CervicalLinfonodoAlterado> = {}): CervicalLinfonodoAlterado => ({
  nivel: "IIA",
  medidas_cm: null,
  forma: null,
  hilo: null,
  vascularizacao: null,
  suspeito: false,
  descricao_raw: null,
  ...over,
});
const G = (over: Partial<CervicalGlandula> = {}): CervicalGlandula => ({
  lado: "direita",
  alterada: false,
  descricao: null,
  ...over,
});

type Caso = {
  nome: string;
  achados: string;
  esperado: string;
  findings: CervicalFindings;
};

const CASES: Caso[] = [
  {
    nome: "1. Normal (sem achados)",
    achados: "Cadeias cervicais sem alterações; nenhum nível citado.",
    esperado: "Modelo base normal (lista IA..VI + 'Ausência de alterações detectáveis').",
    findings: F({}),
  },
  {
    nome: "2. Níveis normais ditados (IIA, III)",
    achados: "Linfonodos de aspecto normal nos níveis IIA e III.",
    esperado: "Frase canônica nos níveis + 'demais níveis' sem alteração.",
    findings: F({ niveis_normais: ["IIA", "III"] }),
  },
  {
    nome: "3. Linfonodo suspeito (nível IIA)",
    achados: "Linfonodo aumentado nível IIA, 1,8 x 1,2 x 1,0 cm, arredondado, sem hilo.",
    esperado: "Descrição completa no corpo + item de suspeição na conclusão.",
    findings: F({
      linfonodos_alterados: [
        LN({ nivel: "IIA", medidas_cm: [1.8, 1.2, 1.0], forma: "arredondada", hilo: "ausente", suspeito: true }),
      ],
    }),
  },
  {
    nome: "4. Linfonodo suspeito com Doppler (nível III)",
    achados: "Nível III, 2,0 x 1,4 x 1,1 cm, arredondado, sem hilo, vascularização periférica.",
    esperado: "Título com DOPPLER; vascularização ao Doppler no corpo.",
    findings: F({
      com_doppler: true,
      linfonodos_alterados: [
        LN({ nivel: "III", medidas_cm: [2.0, 1.4, 1.1], forma: "arredondada", hilo: "ausente", vascularizacao: "periferica", suspeito: true }),
      ],
    }),
  },
  {
    nome: "5. Linfonodo proeminente reacional (nível IB)",
    achados: "Nível IB, 1,2 x 0,6 x 0,5 cm, oval, hilo preservado, NÃO suspeito.",
    esperado: "Conclusão 'proeminente de aspecto reacional' (sem 'suspeito').",
    findings: F({
      linfonodos_alterados: [
        LN({ nivel: "IB", medidas_cm: [1.2, 0.6, 0.5], forma: "oval", hilo: "presente", suspeito: false }),
      ],
    }),
  },
  {
    nome: "6. Glândulas salivares (normais + parótida alterada)",
    achados: "Submandibulares normais bilateralmente; parótida direita com sialoadenite.",
    esperado: "Glândulas normais com frase padrão; alterada verbatim + item na conclusão.",
    findings: F({
      submandibulares: [G({ lado: "direita" }), G({ lado: "esquerda" })],
      parotidas: [
        G({ lado: "direita", alterada: true, descricao: "Glândula parótida direita aumentada de volume, com ecotextura heterogênea e hipoecogênica, com aumento da vascularização ao Doppler colorido" }),
        G({ lado: "esquerda" }),
      ],
      com_doppler: true,
    }),
  },
  {
    nome: "7. Misto: nível normal + suspeito + achado adicional",
    achados: "Nível IB normal; nível IV suspeito (sem hilo); cisto cervical à direita.",
    esperado: "Bloco linfonodal + 'demais níveis' + achado adicional na conclusão.",
    findings: F({
      niveis_normais: ["IB"],
      linfonodos_alterados: [
        LN({ nivel: "IV", medidas_cm: [1.6, 1.1, 0.9], forma: "arredondada", hilo: "ausente", suspeito: true }),
      ],
      achados_adicionais: "Cisto cervical lateral à direita, medindo 2,0 x 1,5 cm",
    }),
  },
  {
    nome: "8. Tireoide descrita e alterada (nódulo)",
    achados: "Tireoide com nódulo sólido em lobo direito.",
    esperado: "Bloco tireoidiano no corpo + item de alteração tireoidiana na conclusão.",
    findings: F({
      tireoide_descrita: true,
      tireoide_alterada: true,
      tireoide_descricao: "Glândula tireoide com nódulo sólido hipoecoico em lobo direito, medindo 1,2 x 1,0 x 0,9 cm",
    }),
  },
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cards = CASES.map((c) => {
  const laudo = renderCervical(c.findings);
  return `
  <section class="card">
    <header><h2>${esc(c.nome)}</h2></header>
    <p class="meta"><b>Achados:</b> ${esc(c.achados)}<br/><b>Esperado:</b> ${esc(c.esperado)}</p>
    <pre>${esc(laudo)}</pre>
  </section>`;
}).join("\n");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>CERVICAL CLÁSSICO — Boletim de avaliação (DET-5)</title>
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
<h1>CERVICAL CLÁSSICO — Boletim de avaliação (DET-5, render determinístico)</h1>
<div class="intro">
  <p>Cada caso: <b>achados montados à mão</b> → <b>laudo clássico</b>
  (TÍTULO / COMENTÁRIOS / OS SEGUINTES ASPECTOS FORAM OBSERVADOS / CONCLUSÃO).
  Valide: (1) a <b>lógica de NÍVEIS de Robbins</b> (IA, IB, IIA, IIB, III, IV, VA, VB, VI);
  (2) linfonodos <b>normais</b> (frase canônica) vs <b>suspeitos</b> (medidas/forma/hilo/vascularização);
  (3) glândulas salivares e tireoide opcionais (silêncio → omitir); (4) fidelidade das frases.</p>
</div>
${cards}
</body></html>`;

// __dirname = apps/api/src/server/renderer/__tests__ → repo root = 6 níveis acima.
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../../../../docs/cervical-boletim.html");
writeFileSync(out, html, "utf-8");
console.log(`✓ boletim gerado: ${out}`);
console.log(`  ${CASES.length} casos renderizados`);
