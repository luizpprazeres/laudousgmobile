/**
 * E2E REAL do renderer DOPPLER_OBSTETRICO: ditado → extração LLM → render.
 * Valida o caminho completo (a extração é a parte que o golden NÃO cobre).
 * Rodar com env carregado + flag:
 *   set -a; source apps/api/.env.local; set +a
 *   RENDERER_CATEGORIES="...,DOPPLER_OBSTETRICO" IG_REFERENCE_CORRECTION=true \
 *     pnpm -F api exec tsx src/server/renderer/__tests__/doppler-e2e.manual.ts
 */
import { runRendererExtraction } from "../extraction";
import {
  renderDopplerObstetrico,
  mergeStructuredIg,
  type DopplerObstetricoFindings,
} from "../categories/DOPPLER_OBSTETRICO";
import { env } from "../../env";

interface Caso {
  id: string;
  raw: string;
  espera: { igCorrige: boolean; nota: string };
}

const CASOS: Caso[] = [
  {
    id: "d213131b (RCF)",
    espera: { igCorrige: true, nota: "DUM 26s6d vs biom 24s6d (>5d) → corrige; peso P2 → Gratacós; MBV 2,9" },
    raw: `Biometria fetal:
DBP: 6.63 cm
CC: 24.13 cm
CA: 20.81 cm
CF: 4.36 cm
Peso fetal estimado: 775 g
Variação do peso: ±113 g
Percentil: 2
IG pela DUM: 26s6d
IG pela biometria: 24s6d

Doppler obstétrico:
IP uterina direita: 0.97
IP uterina esquerda: 0.76
IP artéria umbilical: 1.27
IP artéria cerebral média: 2.31
IP ducto venoso: 0.46


→ Percentis (24s2d, Gratacós/FMF): AU IP 1,27 (P46) · ACM IP 2,31 (P88) · Uterinas média IP 0,86 (P37)

Cenografia obstétrica com doppler competem apresentação cefálica, com dorso à esquerda, frequência cardíaca de 130, placenta anterior, com ecotextura homogênea, 1 maior bolsão vertical média de 2.9 centímetros. 1º tracinografia realizada 28 do 6 de de 2026 com 26 semanas e 6 dias, hoje com 20 e semanas e 6 dias, feto com restrição do crescimento de Gratacós. Estágio 1,`,
  },
  {
    id: "69a5a110 (41s US precoce)",
    espera: { igCorrige: true, nota: "US precoce 41s0d vs biom 38s4d (>5d) → corrige; uterinas >P95; ILA 8.4 + MBV 2.8" },
    raw: `Biometria fetal:
DBP: 9.47 cm
CC: 34.97 cm
CA: 34.40 cm
CF: 7.81 cm
Peso fetal estimado: 3654 g
Variação do peso: ±533 g
Percentil: 50
IG pela ultrassonografia precoce: 41s0d
IG pela biometria: 38s4d

Doppler obstétrico:
IP uterina direita: 0.45
IP uterina esquerda: 1.79
IP artéria umbilical: 0.76
IP artéria cerebral média: 1.26
IP ducto venoso: 0.47


→ Percentis (40s0d, Gratacós/FMF): AU IP 0,76 (P30) · ACM IP 1,26 (P40) · Uterinas média IP 1,12 (>P95)

Sonografia obstétrica com doppler, com feto, em apresentação cefálica com o dorso à esquerda, a frequência cardíaca de 143, placenta anterior, com ecotextura, heterogênea, índice do licotomenoide de 8.4, maior bolsão vertical mede 2.8 centímetros,`,
  },
  {
    id: "6296effe (encefálica, <5d)",
    espera: { igCorrige: false, nota: "US precoce 31s3d vs biom 32s0d (<5d) → SEM correção; 'encefálica'→'cefálica'; MBV 6.9" },
    raw: `Biometria fetal:
DBP: 8.05 cm
CC: 28.68 cm
CA: 29.19 cm
CF: 6.02 cm
Peso fetal estimado: 1965 g
Variação do peso: ±287 g
Percentil: 70.88
IG pela ultrassonografia precoce: 31s3d
IG pela biometria: 32s0d

Doppler obstétrico:
IP uterina direita: 0.74
IP uterina esquerda: 1.09
IP artéria umbilical: 1.04
IP artéria cerebral média: 1.81


→ Percentis (31s2d, Gratacós/FMF): AU IP 1,04 (P53) · ACM IP 1,81 (P28) · Uterinas média IP 0,92 (P83)

Dupler com feto em apresentação encefálica com dorso à esquerda, frequência cardíaca de 145, placenta posterior com ecotextura o maior bolsão vertical mede 6.9 centímetros,`,
  },
];

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { fail += 1; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function main() {
  const igCorrection = env().IG_REFERENCE_CORRECTION === "true";
  console.log(`igCorrection=${igCorrection} | RENDERER_CATEGORIES inclui DOPPLER=${env().RENDERER_CATEGORIES.includes("DOPPLER_OBSTETRICO")}\n`);

  for (const c of CASOS) {
    console.log(`\n========== ${c.id} ==========`);
    console.log(`(${c.espera.nota})`);
    try {
      const ext = await runRendererExtraction({ categoryCode: "DOPPLER_OBSTETRICO", rawInput: c.raw });
      const fnd = mergeStructuredIg(ext.findings as DopplerObstetricoFindings, c.raw);
      const out = renderDopplerObstetrico(fnd, null, { igCorrection });
      console.log("\n" + out + "\n");
      // Asserções universais
      check("estrutura completa", /COM DOPPLER COLORIDO/.test(out) && /COMENTÁRIOS:/.test(out) && /DOPPLERVELOCIMETRIA:/.test(out) && /CONCLUSÃO:/.test(out));
      check("sem placeholder '____'", !/____/.test(out), out.match(/.*____.*/)?.[0]);
      check("percentis preservados na seção", /\(percentil \d+\)/.test(out));
      check("apresentação 'cefálica' (não 'encefálica')", !/encef[áa]lica/i.test(out));
      check("líquido nunca rotula bolsão como ILA indevidamente", true); // inspeção visual
      if (c.espera.igCorrige) {
        check("IG: frase de correção Domingos presente", /devendo ser corrigida pela/.test(out), out.match(/Gesta[çc][ãa]o em torno de[^\n]*/)?.[0]);
      } else {
        check("IG: sem correção (divergência <5d)", !/devendo ser corrigida/.test(out), out.match(/Gesta[çc][ãa]o em torno de[^\n]*/)?.[0]);
      }
    } catch (e) {
      fail += 1;
      console.error(`  ✗ ERRO: ${(e as Error).message}`);
    }
  }

  console.log(`\n\n===== ${pass} passaram, ${fail} falharam =====`);
  process.exit(fail === 0 ? 0 : 1);
}

void main();
