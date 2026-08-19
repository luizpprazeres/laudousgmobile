/**
 * SMOKE CONTRA A API REAL — o contrato novo é aceito, e o LLM sabe usá-lo?
 *
 * Os testes de contrato são estáticos: garantem que os campos existem nos três
 * lugares. Não garantem duas coisas que só a API responde:
 *
 *   1. o modo STRICT aceita o schema (um `enum` malformado derruba a extração
 *      de OBSTETRICA **e** DOPPLER_OBSTETRICO em produção, porque o segundo
 *      herda o primeiro);
 *   2. o prompt é claro o bastante para o modelo preencher o campo certo — e,
 *      mais importante, para NÃO preencher quando o médico não disse nada.
 *
 * GASTA TOKENS. Rodar à mão, antes de mergear mudança no contrato:
 *
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/__tests__/extracao-patologias-live.manual.ts
 */
import { runRendererExtraction } from "../extraction";
import type { ObstetricaFindings } from "../categories/OBSTETRICA";

let ok = 0;
const falhas: string[] = [];
function t(nome: string, cond: boolean, detalhe = "") {
  if (cond) { ok++; console.log(`  ✓ ${nome}`); }
  else { falhas.push(nome); console.log(`  ✗ ${nome}${detalhe ? `\n      ${detalhe}` : ""}`); }
}

async function extrai(categoria: string, ditado: string): Promise<ObstetricaFindings> {
  const r = await runRendererExtraction({ categoryCode: categoria, rawInput: ditado });
  return r.findings as ObstetricaFindings;
}

async function main() {
  console.log("\nExtração LIVE dos campos de patologia (gasta tokens)\n");

  // ------------------------------------------------------------------ CASO 1
  console.log("1 · ditado COM patologias — os campos são preenchidos");
  {
    const f = await extrai(
      "OBSTETRICA",
      "Ultrassom obstétrico. Feto único, cefálico, 32 semanas e 2 dias. " +
        "Batimentos cardíacos ausentes, óbito fetal. " +
        "Ventriculomegalia com átrio ventricular medindo 12 milímetros. " +
        "Cordão umbilical com dois vasos, artéria umbilical única. " +
        "Placenta anterior, com lagos venosos. " +
        "Peso 1800 gramas.",
    );
    const ft = f.fetos[0]!;
    t("bcf_alteracao = ausente", ft.bcf_alteracao === "ausente", JSON.stringify(ft.bcf_alteracao));
    t("cranio_achado = ventriculomegalia", ft.cranio_achado === "ventriculomegalia", JSON.stringify(ft.cranio_achado));
    t("cranio_medida_mm = 12", ft.cranio_medida_mm === 12, JSON.stringify(ft.cranio_medida_mm));
    t("cordao_vasos = dois", ft.cordao_vasos === "dois", JSON.stringify(ft.cordao_vasos));
    t("placenta_achado = lagos_venosos", f.placenta_achado === "lagos_venosos", JSON.stringify(f.placenta_achado));
    t("placenta_localizacao preservada", /anterior/i.test(f.placenta_localizacao ?? ""), JSON.stringify(f.placenta_localizacao));
    // O que mais importa: com óbito, o BCF numérico não pode ser inventado.
    t("bcf_bpm continua null no óbito", ft.bcf_bpm === null, JSON.stringify(ft.bcf_bpm));
  }

  // ------------------------------------------------------------------ CASO 2
  console.log("\n2 · ditado SEM patologia — silêncio NÃO vira achado");
  {
    const f = await extrai(
      "OBSTETRICA",
      "Ultrassom obstétrico. Feto único, cefálico, dorso à esquerda, 28 semanas. " +
        "BCF 142. DBP 72, CC 265, CA 240, fêmur 53. Peso 1200 gramas. " +
        "Placenta posterior, homogênea. Maior bolsão vertical de 4,2 centímetros.",
    );
    const ft = f.fetos[0]!;
    for (const [nome, v] of [
      ["bcf_alteracao", ft.bcf_alteracao], ["movimentos_fetais", ft.movimentos_fetais],
      ["cranio_achado", ft.cranio_achado], ["cordao_vasos", ft.cordao_vasos],
      ["placenta_achado", f.placenta_achado],
      ["placenta_relacao_orificio", f.placenta_relacao_orificio],
    ] as const) {
      t(`${nome} continua null`, v === null, `veio ${JSON.stringify(v)}`);
    }
    // E a extração antiga não regrediu com os campos novos no contrato.
    t("biometria intacta", ft.dbp_mm === 72 && ft.cc_mm === 265 && ft.ca_mm === 240 && ft.cf_mm === 53,
      JSON.stringify({ dbp: ft.dbp_mm, cc: ft.cc_mm, ca: ft.ca_mm, cf: ft.cf_mm }));
    t("bolsão preserva a casa decimal", f.liquido_mbv_por_feto_cm?.[0] === 4.2,
      JSON.stringify(f.liquido_mbv_por_feto_cm));
  }

  // ------------------------------------------------------------------ CASO 3
  console.log("\n3 · GEMELAR — o achado vai no feto certo");
  {
    const f = await extrai(
      "OBSTETRICA",
      "Ultrassom obstétrico gemelar, dicoriônica e diamniótica, 31 semanas. " +
        "Feto A com batimentos de 145, peso 1600 gramas. " +
        "Feto B sem batimentos cardíacos, óbito fetal, peso 1400 gramas. " +
        "Duas placentas.",
    );
    t("dois fetos", f.fetos.length === 2, JSON.stringify(f.fetos.length));
    const a = f.fetos[0], b = f.fetos[1];
    t("feto A sem alteração", a?.bcf_alteracao === null, JSON.stringify(a?.bcf_alteracao));
    t("feto A com BCF 145", a?.bcf_bpm === 145, JSON.stringify(a?.bcf_bpm));
    t("feto B com óbito", b?.bcf_alteracao === "ausente", JSON.stringify(b?.bcf_alteracao));
    t("feto B sem BCF inventado", b?.bcf_bpm === null, JSON.stringify(b?.bcf_bpm));
  }

  // ------------------------------------------------------ CASO 3b · achados novos
  console.log("\n3b · vísceras e anexos — os campos que entraram em 19/08");
  {
    const f = await extrai(
      "OBSTETRICA",
      "Ultrassom obstétrico. Feto único, cefálico, 28 semanas. BCF 140. " +
        "DBP 72, CC 265, CA 240, fêmur 53. Peso 1200 gramas. " +
        "Pelve renal direita medindo 6,2 milímetros, pielectasia à direita. Pelve renal esquerda 3,1. " +
        "Alças intestinais hiperecogênicas. Ascite fetal. " +
        "Placenta posterior. Maior bolsão vertical de 4,2 centímetros.",
    );
    const ft = f.fetos[0]!;
    t("pielectasia à direita marcada", ft.pielectasia_direita === true, JSON.stringify(ft.pielectasia_direita));
    t("medida da pelve direita", ft.pielectasia_direita_mm === 6.2, JSON.stringify(ft.pielectasia_direita_mm));
    t("pelve ESQUERDA medida mas NÃO marcada como alterada",
      ft.pielectasia_esquerda !== true, JSON.stringify(ft.pielectasia_esquerda));
    t("intestino hiperecogênico", ft.intestino_hiperecogenico === true, JSON.stringify(ft.intestino_hiperecogenico));
    t("ascite", ft.ascite === true, JSON.stringify(ft.ascite));
    t("hidropsia NÃO deduzida de ascite", ft.hidropsia !== true, JSON.stringify(ft.hidropsia));
  }

  // ------------------------------------------------------------------ CASO 4
  console.log("\n4 · DOPPLER herda o contrato e não quebra");
  {
    const f = (await extrai(
      "DOPPLER_OBSTETRICO",
      "Ultrassom obstétrico com Doppler. Feto único, 30 semanas. BCF 140. " +
        "IP da artéria umbilical 1,10, percentil 60. IP da cerebral média 1,80. " +
        "Placenta anterior. Cordão com três vasos.",
    )) as ObstetricaFindings & { ip_umbilical: number | null };
    t("o schema strict do Doppler foi aceito", true);
    t("IP umbilical extraído", f.ip_umbilical === 1.1, JSON.stringify(f.ip_umbilical));
    t("cordao_vasos = tres", f.fetos[0]?.cordao_vasos === "tres", JSON.stringify(f.fetos[0]?.cordao_vasos));
    t("sem patologia inventada", f.fetos[0]?.bcf_alteracao === null && f.placenta_achado === null);
  }

  console.log(`\n${"═".repeat(74)}`);
  console.log(falhas.length === 0 ? `✓ ${ok}/${ok} — o contrato funciona contra a API real`
    : `✗ ${falhas.length} de ${ok + falhas.length} FALHARAM`);
  console.log(`${"═".repeat(74)}\n`);
  if (falhas.length > 0) process.exit(1);
}

void main();
