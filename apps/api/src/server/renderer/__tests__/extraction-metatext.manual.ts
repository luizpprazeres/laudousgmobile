/**
 * Guard de metatexto do extrator (renderer/extractionMetatext.ts) — casos reais
 * da bancada do W4 (Haiku 5.5 como extrator), sem dado de paciente identificável.
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/renderer/__tests__/extraction-metatext.manual.ts
 */
import assert from "node:assert/strict";
import { cleanExtractionMetatext, stripExtractionMetatext as strip } from "../extractionMetatext";
import { EXTRACTORS } from "../extraction";

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}\n  ${err instanceof Error ? err.message : String(err)}`);
  }
}

check("rótulo 'Conclusão do médico:' sai, o conteúdo fica", () => {
  assert.equal(
    strip("Conclusão do médico: diagnóstico mais provável de cisto sebáceo. Não se trata de linfonodo."),
    "Diagnóstico mais provável de cisto sebáceo. Não se trata de linfonodo.",
  );
});
check("cláusula 'conforme conclusão do médico' sai", () => {
  assert.equal(strip("Litíase vesical, conforme conclusão do médico."), "Litíase vesical.");
});
check("frase de comentário sobre o ditado sai inteira; a clínica fica", () => {
  assert.equal(
    strip('Miomas com imagem hipoecoica heterogênea. Ditado "Cúbicos" não identificado com segurança; não estruturado — conferir com o médico.'),
    "Miomas com imagem hipoecoica heterogênea.",
  );
  assert.equal(strip('Medidas uterinas ditadas de forma ilegível ("10.76 0.8, por 6.3 por"); não extraídas — conferir [L, AP, T] antes de emitir o laudo.'), "");
  assert.equal(strip("Conferir com o médico: (1) o útero foi ditado com quatro valores."), "");
});
check("dado sem campo próprio: a explicação sai, os números ficam", () => {
  assert.equal(
    strip("Índices de resistividade (IR) ditados, não cabem no esquema: CCA D 0,74; ICA D 0,78; ECA D 0,64."),
    "Índices de resistividade (IR): CCA D 0,74; ICA D 0,78; ECA D 0,64.",
  );
  assert.equal(
    strip("Índices de resistividade ditados (sem campo próprio no esquema). Direita: CCA IR 0,71; ICA IR 0,53."),
    "Índices de resistividade. Direita: CCA IR 0,71; ICA IR 0,53.",
  );
});
check("parêntese que comenta o ditado sai; parêntese clínico fica", () => {
  assert.equal(
    strip("Ovário direito: apresentando 7 imagens (ditado com repetição; confirmar), 7 folículos antrais."),
    "Ovário direito: apresentando 7 imagens, 7 folículos antrais.",
  );
  const clinical = "Ausência de imagem do rim direito (rim direito não visualizado; paciente submetida a nefrectomia parcial).";
  assert.equal(strip(clinical), clinical);
});
check("'ditado de/como' vira texto de laudo, sem maiúscula no meio de frase", () => {
  assert.equal(strip("Mioma subseroso com volume ditado de 66.0."), "Mioma subseroso com volume de 66.0.");
  assert.equal(strip("margem ditada como regular"), "margem regular");
});
check("texto clínico comum é intocado (mesma referência)", () => {
  for (const t of [
    "Imagem anecoica no lobo direito medindo 1,2 x 0,8 cm, de paredes finas.",
    "Vesícula biliar com cálculo de 1,2 cm, com sombra acústica posterior.",
    "Linfonodo de aspecto reacional na cadeia IIA esquerda, medindo 1,1 x 0,5 cm.",
    "",
  ]) assert.equal(strip(t), t);
});
check("campo de texto cru (medida_invalida): fica o trecho citado do ditado", () => {
  assert.equal(
    strip("distância ditada como 'distando 0,6 cm do 60 até a perna' — ilegível; não convertida em dist_mamilo_cm", { raw: true }),
    "distando 0,6 cm do 60 até a perna",
  );
});
check("guiado pelo schema: limpa string livre, não toca enum, vazio vira null", () => {
  const schema = {
    type: "object",
    properties: {
      achados_adicionais: { type: ["string", "null"] },
      lado: { type: ["string", "null"], enum: ["direito", "esquerdo", null] },
      lista: { type: "array", items: { type: "string" } },
      nodulos: { type: "array", items: { type: "object", properties: { descricao: { type: "string" } } } },
    },
  };
  const { value, changed } = cleanExtractionMetatext(
    {
      achados_adicionais: "Trecho incompreensível no ditado; não extraído.",
      lado: "direito",
      lista: ["Litíase vesical, conforme ditado.", "Ditado com repetição; conferir com o médico."],
      nodulos: [{ descricao: "Conclusão do médico: nódulo sólido." }],
      extra: "Conclusão do médico: fora do schema, intocado",
    },
    schema,
  );
  assert.deepEqual(value, {
    achados_adicionais: null,
    lado: "direito",
    lista: ["Litíase vesical."],
    nodulos: [{ descricao: "Nódulo sólido." }],
    extra: "Conclusão do médico: fora do schema, intocado",
  });
  assert.equal(changed.length, 4);
});
check("schemas reais: extração sem metatexto passa idêntica", () => {
  const schema = EXTRACTORS.TIREOIDE!.jsonSchema;
  const sample = { achados_adicionais: "Linfonodo reacional no nível III direito, medindo 0,9 x 0,4 cm." };
  assert.deepEqual(cleanExtractionMetatext(sample, schema).value, sample);
});

console.log(`\nextraction-metatext: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
