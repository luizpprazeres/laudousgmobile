/**
 * Validação E2E da IG determinística com DITADOS REAIS (do DB MOBILE).
 * Lê /tmp/obst-com-1aus.json (gerado via REST), roda a NOVA extração tipada e
 * renderiza com a correção IG ligada — para conferir se a IA agora CAPTURA a
 * "1ª ultrassonografia" do ditado (antes colapsava p/ DUM) e monta a correção
 * Domingos automaticamente.
 *
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/ig-real-validation.manual.ts
 */
import { readFileSync } from "node:fs";
import { runRendererExtraction } from "../extraction";
import { renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";

type Row = { created_at: string; raw_input: string; generated_output?: string };
const rows: Row[] = JSON.parse(readFileSync("/tmp/obst-com-1aus.json", "utf-8"));

function concl(laudo: string): string {
  const m = laudo.match(/(?:CONCLUSÃO|IMPRESSÃO):\s*([\s\S]*?)(?:\n\nObserva|$)/);
  return (m?.[1] ?? laudo).trim();
}

const run = async () => {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    console.log(`\n${"=".repeat(72)}\nCASO ${i + 1} (${r.created_at.slice(0, 10)})`);
    let ext;
    try {
      ext = await runRendererExtraction({ categoryCode: "OBSTETRICA", rawInput: r.raw_input });
    } catch (e) {
      console.log(`  ✗ extração falhou: ${(e as Error).message}`);
      continue;
    }
    const f = ext.findings as ObstetricaFindings;
    // Campos-chave da IG que a IA precisa capturar:
    console.log("  EXTRAÍDO:");
    console.log(`    ig (biometria atual):      ${f.ig_semanas}s ${f.ig_dias ?? 0}d`);
    console.log(`    primeira_us_data:          ${f.primeira_us_data}`);
    console.log(`    primeira_us_ig:            ${f.primeira_us_ig_semanas}s ${f.primeira_us_ig_dias ?? 0}d`);
    console.log(`    ig_referencia_hoje:        ${f.ig_referencia_hoje_semanas}s ${f.ig_referencia_hoje_dias ?? 0}d`);
    console.log(`    referencia_fonte:          ${f.referencia_fonte}`);
    console.log(`    dum:                       ${f.dum}`);
    console.log(`    corrigir_ig:               ${f.corrigir_ig}`);
    const laudo = renderObstetrica(f, null, { igCorrection: true });
    console.log("  CONCLUSÃO GERADA (nova):");
    console.log(concl(laudo).split("\n").map((l) => "    " + l).join("\n"));
    // Comparação: o que o pipeline ANTIGO gerou
    const old = r.generated_output ? concl(r.generated_output) : "(n/a)";
    console.log("  conclusão ANTIGA (em prod):");
    console.log(old.split("\n").map((l) => "    " + l).join("\n"));
  }
};

run().then(() => console.log("\n✓ validação concluída")).catch((e) => { console.error(e); process.exit(1); });
