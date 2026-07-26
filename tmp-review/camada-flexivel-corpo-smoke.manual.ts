/**
 * SMOKE (LLM real) — o caso matador do free_slots OBSTETRICA: o médico dita a
 * biometria E manda "adicione uma frase sobre as adrenais fetais". Confirma que a
 * extração captura a observação em observacoes_corpo_livres (SEM a palavra de
 * comando) e que o renderer a insere no CORPO, sem dropar nem duplicar.
 * Rodar: tsx src/server/renderer/__tests__/camada-flexivel-corpo-smoke.manual.ts
 */
import { config } from "dotenv";
config({ path: "/Users/luizprazeres/laudousgmobile-def/.env" });

import { runRendererExtraction } from "../extraction";
import { renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";

const RAW = `Feto único cefálico, dorso à esquerda, batimentos 148. DBP 5,2 centímetros, circunferência da cabeça 19 centímetros, circunferência abdominal 17 centímetros, fêmur 3,8 centímetros. Placenta anterior. Maior bolsão vertical de 4,2 centímetros. Adicione uma frase dizendo que as adrenais fetais têm morfologia e dimensões normais. Voltando, comparado ao exame anterior de 12 de maio, evolução normal da gestação.`;

let pass = 0, fail = 0;
const ck = (n: boolean, t: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}`); };

async function main() {
  const ex = await runRendererExtraction({ categoryCode: "OBSTETRICA", rawInput: RAW });
  const f = ex.findings as ObstetricaFindings;
  console.log("observacoes_corpo_livres:", JSON.stringify(f.observacoes_corpo_livres));
  console.log("itens_conclusao_livres:", JSON.stringify(f.itens_conclusao_livres));

  ck((f.observacoes_corpo_livres ?? []).some((s) => /adrenais/i.test(s)), "extração: adrenais em observacoes_corpo_livres");
  ck(!(f.observacoes_corpo_livres ?? []).some((s) => /adicione|frase dizendo/i.test(s)), "extração: SEM a palavra de comando");
  ck((f.itens_conclusao_livres ?? []).some((s) => /comparad|anterior|evolu/i.test(s)), "extração: comparação em itens_conclusao_livres");

  const laudo = renderObstetrica(f, null, { flexivel: true });
  console.log("\n" + "─".repeat(70) + "\n" + laudo + "\n" + "─".repeat(70));
  const [corpo, concl] = laudo.split("CONCLUSÃO:");
  ck(/adrenais/i.test(corpo ?? ""), "render: adrenais no CORPO");
  ck(!/adrenais/i.test(concl ?? ""), "render: adrenais NÃO na conclusão");
  ck(/comparad|evolu[çc]/i.test(concl ?? ""), "render: comparação na CONCLUSÃO");
  ck(!/adicione|frase dizendo/i.test(laudo), "render: comando NÃO vazou");
  ck(/f[êe]mur.*3,8\s*cm|3,8\s*cm/i.test(laudo) || /38\s*mm/.test(laudo), "render: biometria preservada (fêmur)");

  console.log(`\n${pass} ok, ${fail} avisos (smoke LLM não-determinístico)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
