/**
 * Sprint 23C1 — matriz clínica determinística da tireoide.
 *
 * Garante que ACR TI-RADS, Nota de Domingos, texto do laudo e estado da web
 * continuem independentes e coerentes. Não chama IA nem serviços externos.
 * Rodar: pnpm validate:clinical-review:23c1
 */
import {
  calcAcrTirads,
  renderTireoide,
  TireoideFindingsSchema,
  type TireoideFindings,
  type TireoideNodulo,
} from "../categories/TIREOIDE";
import { F, L, N } from "./tireoide-objetivo-fixtures";
import { calcularTiRads } from "../../../../../web/src/lib/calculators/tiRads";
import { calcularTIRADS as calcularTIRADSMobile } from "../../../../../mobile/src/shared/calculators/tirads";
import { adaptarTireoide } from "../../../../../web/src/lib/catalog/tireoideParaCatalogo";
import {
  initialTireoideState,
  type NoduloTireoide,
} from "../../../../../web/src/lib/deterministic/organs/tireoide";

let pass = 0;
let fail = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass += 1;
    console.log(`✓ ${name}`);
    return;
  }
  fail += 1;
  console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
}

const A = (
  composicao: "cistico" | "espongiforme" | "misto" | "solido",
  ecogenicidade: "anecoico" | "hiper_ou_isoecoico" | "hipoecoico" | "muito_hipoecoico",
  forma: "mais_larga_que_alta" | "mais_alta_que_larga" = "mais_larga_que_alta",
  margem: "lisa" | "mal_definida" | "lobulada_ou_irregular" | "extensao_extratireoidiana" = "lisa",
  focos_ecogenicos: Array<"nenhum_ou_cauda_cometa" | "macrocalcificacoes" | "calcificacoes_perifericas" | "focos_puntiformes"> = ["nenhum_ou_cauda_cometa"],
) => ({ composicao, ecogenicidade, forma, margem, focos_ecogenicos });

function acrNodulo(acr: ReturnType<typeof A>, medidas: number[] = [1.2, 1.0, 0.9]): TireoideNodulo {
  return N({
    acr_tirads: acr,
    medidas_cm: medidas,
    localizacao: "no terço médio",
  });
}

// Pontos oficiais e soma cumulativa dos focos ecogênicos.
{
  const maximo = acrNodulo(
    A("solido", "muito_hipoecoico", "mais_alta_que_larga", "extensao_extratireoidiana", [
      "macrocalcificacoes",
      "calcificacoes_perifericas",
      "focos_puntiformes",
    ]),
  );
  const r = calcAcrTirads(maximo);
  check("ACR: soma todos os focos ecogênicos presentes", r?.pontos === 17 && r.categoria === 5, JSON.stringify(r));

  const comNenhum = acrNodulo(
    A("solido", "hipoecoico", "mais_larga_que_alta", "lisa", [
      "nenhum_ou_cauda_cometa",
      "macrocalcificacoes",
      "macrocalcificacoes",
    ]),
  );
  const r2 = calcAcrTirads(comNenhum);
  check("ACR: 'nenhum' não anula foco real e duplicata não soma", r2?.pontos === 5 && r2.categoria === 4, JSON.stringify(r2));
  check("ACR: grupo essencial incompleto não inventa categoria", calcAcrTirads(N({ acr_tirads: { ...A("solido", "hipoecoico"), margem: null } })) === null);
  check("ACR: categoria explicitamente ditada vence o cálculo", calcAcrTirads(N({ ti_rads_ditado: "5" }))?.categoria === 5);
}

// Mesma matemática no calculador avulso da web.
{
  const r = calcularTiRads({
    composicao: "solido",
    ecogenicidade: "muito_hipoecóico",
    forma: "mais_alto_que_largo",
    margens: "extensao_extratireoidiana",
    focosEcogenicos: ["macrocalcificacoes", "calcificacoes_perifericas", "focos_ecogenicos_puntiformes"],
    tamanhoMm: 9,
  });
  check("calculador web: mesmos 17 pontos e TR5", r.score === 17 && r.category === "TR5", JSON.stringify(r));
  check("calculador web: TR5 de 9 mm indica acompanhamento, não PAAF", /Seguimento/.test(r.management) && !/FNA indicada/.test(r.management), r.management);
  check("calculador web: calcificação periférica vale 2 pontos", calcularTiRads({ focosEcogenicos: "calcificacoes_perifericas" }).score === 2);

  const mobile = calcularTIRADSMobile({
    composicao: "Sólido ou quase totalmente sólido",
    ecogenicidade: "Muito hipoecoico",
    forma: "Mais alta que larga",
    margem: "Extensão extra-tireoideana",
    focosEcogenicos: ["Macrocalcificações", "Periféricas (contínuas)", "Punctiformes ecogênicos (microcalcificações)"],
    maiorEixoCm: 0.9,
  });
  check("calculador mobile: mesmos 17 pontos e TR5", mobile.pontos === 17 && mobile.categoria === "tr5", JSON.stringify(mobile));
  check("calculador mobile: TR5 de 0,9 cm indica seguimento anual", /anual/.test(mobile.recomendacao) && !/PAAF/.test(mobile.recomendacao), mobile.recomendacao);
}

// Limiares oficiais de conduta aparecem apenas quando a preferência está ativa.
{
  const casos = [
    { nome: "TR3 2,5 cm", acr: A("solido", "hiper_ou_isoecoico"), cm: 2.5, esperado: "PAAF" },
    { nome: "TR3 1,5 cm", acr: A("solido", "hiper_ou_isoecoico"), cm: 1.5, esperado: "acompanhamento" },
    { nome: "TR4 1,5 cm", acr: A("solido", "hipoecoico"), cm: 1.5, esperado: "PAAF" },
    { nome: "TR4 1,0 cm", acr: A("solido", "hipoecoico"), cm: 1.0, esperado: "acompanhamento" },
    { nome: "TR5 1,0 cm", acr: A("solido", "hipoecoico", "mais_alta_que_larga"), cm: 1.0, esperado: "PAAF" },
    { nome: "TR5 0,5 cm", acr: A("solido", "hipoecoico", "mais_alta_que_larga"), cm: 0.5, esperado: "acompanhamento" },
  ] as const;
  for (const caso of casos) {
    const f = F({ lobo_direito: L({ nodulos: [acrNodulo(caso.acr, [caso.cm, caso.cm * 0.8, caso.cm * 0.7])] }) });
    const laudo = renderTireoide(f, { show_conduct_recommendation: true }, { objetivo: true });
    check(`conduta: ${caso.nome}`, laudo.toLowerCase().includes(caso.esperado.toLowerCase()), laudo);
  }
  const semMedida = F({ lobo_direito: L({ nodulos: [acrNodulo(A("solido", "hipoecoico", "mais_alta_que_larga"), [])] }) });
  check(
    "conduta: sem medida mantém placeholder no corpo, mas não inventa recomendação",
    !/Conduta sugerida:/.test(renderTireoide(semMedida, { show_conduct_recommendation: true }, { objetivo: true })),
  );
}

// A web envia ecotextura heterogênea de forma estruturada, sem negar o achado.
{
  const state = initialTireoideState();
  state.lobo_direito.ecotextura = "heterogenea";
  const adaptado = adaptarTireoide(state);
  check("adapter web: clique heterogêneo atravessa para o lobo", adaptado.dados.lobo_direito.ecotextura_alterada === "com ecotextura heterogênea");
  const findings = TireoideFindingsSchema.parse({
    ...adaptado.dados,
    tireoidite_tipo: null,
    linfonodos_descricao: null,
    lobo_direito: { ecotextura_alterada: null, ...adaptado.dados.lobo_direito },
    lobo_esquerdo: { ecotextura_alterada: null, ...adaptado.dados.lobo_esquerdo },
    istmo: { ecotextura_alterada: null, ...adaptado.dados.istmo },
  });
  for (const objetivo of [false, true]) {
    const laudo = renderTireoide(findings, undefined, { objetivo });
    check(`ecotextura: estilo ${objetivo ? "objetivo" : "clássico"} descreve heterogeneidade`, /ecotextura heterogênea/i.test(laudo), laudo);
    check(`ecotextura: estilo ${objetivo ? "objetivo" : "clássico"} não conclui normalidade`, !/sem evidência de alteração ecotextural|dentro dos padrões da normalidade/i.test(laudo), laudo);
  }
}

// O mesmo conjunto ACR deve produzir a mesma categoria nos dois estilos.
{
  const nodulo = acrNodulo(A("solido", "hipoecoico", "mais_alta_que_larga", "lobulada_ou_irregular", ["focos_puntiformes"]));
  const f = F({
    com_doppler: true,
    pico_sistolico_direito_cms: 21,
    pico_sistolico_esquerdo_cms: 19,
    lobo_direito: L({ ecotextura_alterada: "com ecotextura difusamente heterogênea", nodulos: [nodulo] }),
    linfonodos_descritos: true,
    linfonodos_alterados: true,
    linfonodos_descricao: "Linfonodo cervical de aspecto suspeito no nível IV direito.",
  });
  const classico = renderTireoide(f);
  const objetivo = renderTireoide(f, undefined, { objetivo: true });
  check("paridade: clássico informa ACR TI-RADS 5", /ACR TI-RADS 5/.test(classico), classico);
  check("paridade: objetivo informa ACR TI-RADS 5", /ACR TI-RADS 5/.test(objetivo), objetivo);
  check("combinação: difusa + nódulo + Doppler + linfonodo coexistem", /heterogênea/i.test(objetivo) && /21,0 cm\/s/.test(objetivo) && /nível IV direito/.test(objetivo), objetivo);
  check("combinação: não reintroduz parênquima homogêneo", !/Parênquima tireoidiano com ecotextura homogênea/.test(objetivo), objetivo);
}

// Defaults e placeholders permanecem: dado numérico ausente não apaga a frase.
{
  const vazio: TireoideFindings = F({
    lobo_direito: L({}),
    lobo_esquerdo: L({}),
    istmo: L({}),
    linfonodos_descritos: true,
  });
  const laudo = renderTireoide(vazio, undefined, { objetivo: true });
  check("default: medidas ausentes entram como placeholders", (laudo.match(/____ x ____ x ____ cm/g) ?? []).length === 3, laudo);
  check("default: avaliação linfonodal normal permanece", /Não há evidência de linfonodomegalias/.test(laudo), laudo);
}

// O formulário entrega todos os cinco grupos oficiais sem convertê-los em Domingos.
{
  const state = initialTireoideState();
  const n: NoduloTireoide = {
    id: "n1",
    lobo: "lobo_direito",
    ecogenicidade: null,
    margem: null,
    halo: null,
    forma: null,
    calcificacoes: null,
    vascularizacao: null,
    c1: "1,2",
    c2: "1,0",
    c3: "0,8",
    localizacao: "no terço médio",
    acrComposicao: "solido",
    acrEcogenicidade: "hipoecoico",
    acrForma: "mais_alta_que_larga",
    acrMargem: "lobulada_ou_irregular",
    acrFocos: ["macrocalcificacoes", "focos_puntiformes"],
  };
  state.nodulos = [n];
  const adaptado = adaptarTireoide(state);
  const canonico = adaptado.dados.lobo_direito.nodulos[0];
  check("adapter web: preserva os cinco grupos ACR", JSON.stringify(canonico?.acr_tirads) === JSON.stringify({
    composicao: "solido",
    ecogenicidade: "hipoecoico",
    forma: "mais_alta_que_larga",
    margem: "lobulada_ou_irregular",
    focos_ecogenicos: ["macrocalcificacoes", "focos_puntiformes"],
  }), JSON.stringify(canonico?.acr_tirads));
  check("adapter web: ACR independente não fabrica Nota de Domingos", canonico?.nota_domingos_ditada === null && canonico?.ecogenicidade === null);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
if (fail > 0) process.exitCode = 1;
