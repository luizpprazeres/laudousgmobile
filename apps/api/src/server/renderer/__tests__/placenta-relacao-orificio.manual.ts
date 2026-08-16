/**
 * Placenta × relação com o orifício interno do colo.
 *
 * Os casos são os LAUDOS REAIS do Dr. Luiz (14/08) — ver
 * docs/plano-biblioteca-implementacao-2026-08-12.md §A.5.3. O texto esperado
 * aqui é a fonte da verdade clínica; se o renderer divergir, é o renderer que
 * está errado.
 *
 *   pnpm exec tsx src/server/renderer/__tests__/placenta-relacao-orificio.manual.ts
 */
import { buildObstetricaDoc } from "../catalog/OBSTETRICA.render";
import { serialize } from "../catalog/engine";
import { OBSTETRICA_CLASSICO } from "../catalog/OBSTETRICA.classico";
import { EMPTY_FETO, type ObstetricaFindings } from "../categories/OBSTETRICA";

let ok = 0;
let fail = 0;

function check(nome: string, achou: string, esperado: string) {
  if (achou.includes(esperado)) {
    console.log(`  ✓ ${nome}`);
    ok++;
  } else {
    console.log(`  ✗ ${nome}`);
    console.log(`      esperado conter: ${esperado}`);
    console.log(`      obtido:          ${achou.replace(/\n/g, " ⏎ ").slice(0, 400)}`);
    fail++;
  }
}

function ausente(nome: string, achou: string, proibido: string) {
  if (!achou.includes(proibido)) {
    console.log(`  ✓ ${nome}`);
    ok++;
  } else {
    console.log(`  ✗ ${nome} — não deveria conter "${proibido}"`);
    fail++;
  }
}

function base(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
    fetos: [{ ...EMPTY_FETO, dbp_mm: 80, cc_mm: 290, ca_mm: 270, cf_mm: 60 }],
    ig_semanas: 32, ig_dias: 0, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null,
    saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
    placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null,
    placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null, placenta_achado: null, placenta_achado_medidas: null,
    liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
    liquido_classe: null, achados_adicionais: null,
    itens_conclusao_livres: [], observacoes_corpo_livres: [],
    ...over,
  } as ObstetricaFindings;
}

function render(f: ObstetricaFindings): string {
  const { doc } = buildObstetricaDoc({ findings: f });
  return serialize(doc, OBSTETRICA_CLASSICO);
}

/** Só as linhas da placenta — asserção de lacuna precisa ser LOCAL, senão
 *  pega `____` de outros slots (líquido, biometria) e acusa falso positivo. */
function linhasPlacenta(t: string): string {
  return t
    .split("\n")
    .filter((l) => /placenta|borda inferior/i.test(l))
    .join("\n");
}

console.log("\nPlacenta × relação com o orifício interno — casos reais do Luiz\n");

// ---------------------------------------------------------------- caso 1
console.log("1 · inserção baixa (com distância medida)");
{
  const t = render(base({
    placenta_localizacao: "posterior",
    placenta_ecotextura: "homogênea",
    placenta_relacao_orificio: "insercao_baixa",
    placenta_distancia_orificio_mm: 12,
  }));
  check("corpo: localização → ecotextura → cláusula", t,
    "Placenta de localização posterior, com ecotextura homogênea, estendendo-se ao segmento uterino inferior.");
  check("corpo: 2ª frase com a distância", t,
    "Sua borda inferior dista cerca de 12 mm do orifício interno do colo uterino, sem recobri-lo.");
  check("conclusão sem topografia", t, "Placenta de inserção baixa.");
  ausente("conclusão não repete a topografia", t, "Placenta posterior, de inserção baixa");
}

console.log("\n1b · inserção baixa SEM distância (não ditada)");
{
  const t = render(base({
    placenta_localizacao: "posterior",
    placenta_ecotextura: "homogênea",
    placenta_relacao_orificio: "insercao_baixa",
  }));
  check("corpo mantém a 1ª frase", t, "estendendo-se ao segmento uterino inferior.");
  ausente("2ª frase não sai sem distância", t, "Sua borda inferior dista");
  ausente("nem placeholder de distância na placenta", linhasPlacenta(t), "____");
  check("conclusão continua saindo", t, "Placenta de inserção baixa.");
}

// ---------------------------------------------------------------- caso 2
console.log("\n2 · margeando o orifício, sem recobrimento");
{
  const t = render(base({
    placenta_localizacao: "anterior",
    placenta_relacao_orificio: "marginal",
  }));
  check("corpo: cláusula de margeamento", t,
    "Placenta de localização anterior, estendendo-se inferiormente e margeando o orifício interno do colo uterino, sem evidência de recobrimento.");
  check("conclusão tradicional (padrão escolhido)", t, "Placenta prévia marginal.");
}

// ---------------------------------------------------------------- caso 3
console.log("\n3 · recobrindo amplamente o orifício");
{
  const t = render(base({
    placenta_localizacao: "anterior",
    placenta_relacao_orificio: "previa",
  }));
  check("corpo: cláusula de recobrimento", t,
    "Placenta de localização anterior, estendendo-se ao segmento uterino inferior e recobrindo amplamente o orifício interno do colo uterino.");
  check("conclusão", t, "Placenta prévia.");
}

// ------------------------------------------------------- não-regressão
console.log("\n4 · sem relação ditada — comportamento ANTIGO intacto");
{
  const t = render(base({ placenta_localizacao: "anterior", placenta_ecotextura: "homogênea" }));
  check("frase descrita normal", t, "Placenta de localização anterior, com ecotextura homogênea.");
  ausente("nenhuma cláusula de extensão", t, "estendendo-se");
  ausente("placenta fora da conclusão", t, "Placenta prévia");
  ausente("nenhum item de inserção baixa", t, "inserção baixa");
}

console.log(`\n${ok} ok, ${fail} falhas\n`);
if (fail > 0) process.exit(1);
