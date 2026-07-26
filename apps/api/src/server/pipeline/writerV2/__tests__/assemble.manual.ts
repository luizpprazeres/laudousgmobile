/**
 * Teste manual do motor determinístico do Writer V2 (assemble + audit).
 * Roda: pnpm -s tsx apps/api/src/server/pipeline/writerV2/__tests__/assemble.manual.ts
 * Valida contra o GABARITO (o que o renderer produz) sem chamar LLM.
 */
import { loadSpecV2 } from "../loadSpec";
import { assemble } from "../assemble";
import { auditFidelity } from "../audit";
import { editPlanSchema } from "../types";

const spec = loadSpecV2("ABDOMEN_TOTAL");
if (!spec) throw new Error("spec ABDOMEN_TOTAL não carregou");

let pass = true;
function check(nome: string, cond: boolean, extra?: string) {
  if (!cond) {
    pass = false;
    console.log(`  ✗ ${nome}${extra ? " — " + extra : ""}`);
  } else {
    console.log(`  ✓ ${nome}`);
  }
}

// --- Cenário 1: NORMAL (plano vazio) → conclusão item único SEM número ---
const laudoNormal = assemble(spec, editPlanSchema.parse({}));
check("normal: título correto", laudoNormal.startsWith("ULTRASSONOGRAFIA DO ABDOME TOTAL"));
check(
  "normal: conclusão item único sem número",
  /CONCLUSÃO:\nÓrgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas\.\s*$/.test(
    laudoNormal,
  ),
);
check("normal: sem '1.' na conclusão", !/CONCLUSÃO:\n1\./.test(laudoNormal));

// --- Cenário 2: esteatose moderada + cálculo vesícula (2 achados) ---
const plan2 = editPlanSchema.parse({
  slots: [
    {
      slotId: "figado",
      corpo:
        "Fígado de dimensões normais, apresentando aumento difuso da ecogenicidade parenquimatosa e atenuação sonora.",
    },
    {
      slotId: "vesicula",
      corpo:
        "Vesícula biliar de topografia usual e parede fina, apresentando imagem hiperecoica, móvel, medindo 1,2 cm no seu maior eixo, ocasionando sombra acústica.",
    },
  ],
  conclusao: ["Esteatose hepática, grau moderado.", "Litíase da vesícula biliar."],
});
const laudo2 = assemble(spec, plan2);
check("2 achados: corpo troca fígado (esteatose)", laudo2.includes("aumento difuso da ecogenicidade"));
check("2 achados: corpo troca vesícula (sem 'cálculo' no corpo)", laudo2.includes("imagem hiperecoica, móvel, medindo 1,2 cm"));
check("2 achados: vias biliares mantém frase normal", laudo2.includes("Canal hepático e canal colédoco de calibre normal."));
check(
  "2 achados: conclusão numerada 1. 2. + fechamento 3.",
  laudo2.includes("1. Esteatose hepática, grau moderado.") &&
    laudo2.includes("2. Litíase da vesícula biliar.") &&
    laudo2.includes("3. Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas."),
);

// audit: a medida 1,2 cm está no laudo → sem divergência
const div2 = auditFidelity({ ditadoCru: "cálculo de 1,2 cm na vesícula", laudo: laudo2, spec, plan: plan2 });
check("2 achados: auditoria sem divergência (medida presente)", div2.length === 0, JSON.stringify(div2));

// --- Cenário 3: auditoria PEGA medida omitida ---
const planOmite = editPlanSchema.parse({
  slots: [{ slotId: "vesicula", corpo: "Vesícula biliar apresentando imagem hiperecoica, móvel, ocasionando sombra acústica." }],
  conclusao: ["Litíase da vesícula biliar."],
});
const laudoOmite = assemble(spec, planOmite);
const divOmite = auditFidelity({ ditadoCru: "cálculo de 0,8 cm na vesícula", laudo: laudoOmite, spec, plan: planOmite });
check("auditoria detecta medida omitida (0,8)", divOmite.some((d) => d.tipo === "medida_ausente" && d.detalhe.includes("0,8")));

console.log(pass ? "\nwriterV2 assemble+audit: PASS" : "\nwriterV2 assemble+audit: FAIL");
if (!pass) process.exit(1);
