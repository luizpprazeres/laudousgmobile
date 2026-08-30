/**
 * E2E real do Doppler isolado: ditado -> extração LLM -> renderer puro.
 * O golden sem rede cobre as frases; este arquivo confere a interpretação do
 * ditado quando executado manualmente com as credenciais da API carregadas.
 */
import { runRendererExtraction } from "../extraction";
import {
  renderDopplerObstetrico,
  type DopplerObstetricoFindings,
} from "../categories/DOPPLER_OBSTETRICO";

const CASOS = [
  {
    id: "índices completos",
    raw: `Doppler obstétrico isolado.
IR e IP da artéria uterina direita 0,59 e 0,59.
IR e IP da artéria uterina esquerda 0,59 e 0,59.
Artéria umbilical com IR 0,58 e IP 1,02.
Artéria cerebral média com IR 0,81 e IP 1,75.
Ducto venoso com IR 0,40 e IP 0,72.
Ausência de incisuras, sem pré-centralização ou centralização.
Perfil hemodinâmico 0,58.`,
  },
  {
    id: "alteração hemodinâmica",
    raw: `Doppler obstétrico isolado. Artéria umbilical com IP 2,10, elevado.
Artéria cerebral média com IP 0,75. Há centralização fetal e incisura nas uterinas.
Perfil hemodinâmico 1,20.`,
  },
] as const;

let pass = 0;
let fail = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  for (const caso of CASOS) {
    console.log(`\n========== ${caso.id} ==========`);
    try {
      const extraction = await runRendererExtraction({
        categoryCode: "DOPPLER_OBSTETRICO",
        rawInput: caso.raw,
      });
      const output = renderDopplerObstetrico(
        extraction.findings as DopplerObstetricoFindings,
        null,
        { rawInput: caso.raw, umbilicalSafety: true },
      );
      console.log(`\n${output}\n`);
      check("estrutura do exame isolado", /^DOPPLERVELOCIMETRIA OBSTÉTRICA[\s\S]+COMENTÁRIOS:[\s\S]+CONCLUSÃO:/.test(output));
      check("sem biometria obstétrica", !/DBP|placenta|líquido amniótico|peso fetal/i.test(output));
      check("sem placeholders", !/____/.test(output));
      check("preserva ao menos um índice", /índice de (?:resistividade|pulsatilidade)/i.test(output));
    } catch (error) {
      fail += 1;
      console.error(`  ✗ ERRO: ${(error as Error).message}`);
    }
  }

  console.log(`\n===== ${pass} passaram, ${fail} falharam =====`);
  process.exit(fail === 0 ? 0 : 1);
}

void main();
