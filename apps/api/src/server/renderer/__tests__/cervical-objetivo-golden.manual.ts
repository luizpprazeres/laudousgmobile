/**
 * GOLDEN do render CERVICAL estilo OBJETIVO (DET-5). Determinístico (sem LLM):
 * renderCervical(f, { objetivo: true }) → asserções de estrutura
 * (TÉCNICA/ACHADOS/IMPRESSÃO, NÃO usa cabeçalhos do clássico), reuso da lógica
 * clínica (níveis de Robbins normais/alterados, suspeição, reacional, glândulas,
 * tireoide, Doppler), 1 casa decimal e concordância. Falha = regressão.
 * Rodar: tsx src/server/renderer/__tests__/cervical-objetivo-golden.manual.ts
 */
import {
  renderCervical,
  type CervicalFindings,
  type CervicalLinfonodoAlterado,
  type CervicalGlandula,
} from "../categories/CERVICAL";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

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

const render = (f: CervicalFindings) => renderCervical(f, { objetivo: true });

// ── Estrutura objetivo (cabeçalhos) + normal ──
{
  const l = render(F({}));
  check("normal: título 'ULTRASSONOGRAFIA DA REGIÃO CERVICAL'", l.startsWith("ULTRASSONOGRAFIA DA REGIÃO CERVICAL"), l);
  check("normal: cabeçalho TÉCNICA:", /\nTÉCNICA:\n/.test(l), l);
  check("normal: cabeçalho ACHADOS:", /\nACHADOS:\n/.test(l), l);
  check("normal: cabeçalho IMPRESSÃO:", /\nIMPRESSÃO:\n/.test(l), l);
  check("normal: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(l), l);
  check("normal: técnica com transdutor linear", /transdutor linear de alta frequência/.test(l), l);
  check("normal: cadeias níveis IA a VI sem alterações", /Cadeias ganglionares cervicais \(níveis IA a VI\) sem evidência de linfonodomegalias/.test(l), l);
  check("normal: impressão 'dentro dos padrões da normalidade'", /Estudo ultrassonográfico dentro dos padrões da normalidade\./.test(l), l);
}

// ── Doppler (técnica reflete) ──
{
  const l = render(F({ com_doppler: true }));
  check("doppler: técnica menciona Doppler colorido", /com avaliação ao Doppler colorido/.test(l), l);
}

// ── Níveis normais ditados (frase canônica enxuta) ──
{
  const l = render(F({ niveis_normais: ["IIA", "III"] }));
  check("níveis normais: 'nos níveis IIA e III'", /Linfonodos de aspecto ecográfico normal nos níveis IIA e III \(imagens ovais, com periferia hipoecoica e centro hiperecoico\)\./.test(l), l);
  check("níveis normais: fecha com 'demais níveis'", /Demais níveis da cadeia ganglionar cervical sem alterações ecográficas\./.test(l), l);
}
{
  const l = render(F({ niveis_normais: ["IB"] }));
  check("nível normal único: 'no nível IB' (singular)", /Linfonodos de aspecto ecográfico normal no nível IB \(/.test(l), l);
}

// ── Linfonodo SUSPEITO (medidas/forma/hilo + 1 casa decimal) ──
{
  const l = render(
    F({
      linfonodos_alterados: [
        LN({ nivel: "IIA", medidas_cm: [1.8, 1.2, 1.0], forma: "arredondada", hilo: "ausente", suspeito: true }),
      ],
    }),
  );
  check("suspeito: corpo 'dimensões aumentadas no nível IIA'", /Linfonodo de dimensões aumentadas no nível IIA/.test(l), l);
  check("suspeito: 1 casa decimal '1,8 x 1,2 x 1,0 cm'", /1,8 x 1,2 x 1,0 cm/.test(l), l);
  check("suspeito: 'de forma arredondada'", /de forma arredondada/.test(l), l);
  check("suspeito: 'sem hilo ecogênico identificável'", /sem hilo ecogênico identificável/.test(l), l);
  check("suspeito: impressão 'aspecto suspeito no nível IIA'", /Linfonodo de aspecto suspeito no nível IIA\. Correlacionar com achados clínicos\./.test(l), l);
}

// ── Linfonodo com Doppler (vascularização) ──
{
  const l = render(
    F({
      com_doppler: true,
      linfonodos_alterados: [
        LN({ nivel: "III", medidas_cm: [2.0, 1.4, 1.1], forma: "arredondada", hilo: "ausente", vascularizacao: "periferica", suspeito: true }),
      ],
    }),
  );
  check("doppler: 'com vascularização periférica ao Doppler colorido'", /com vascularização periférica ao Doppler colorido/.test(l), l);
}

// ── Linfonodo proeminente NÃO suspeito (reacional) ──
{
  const l = render(
    F({ linfonodos_alterados: [LN({ nivel: "IB", medidas_cm: [1.2, 0.6, 0.5], forma: "oval", hilo: "presente", suspeito: false })] }),
  );
  check("reacional: NÃO usa 'suspeito'", !/aspecto suspeito/.test(l), l);
  check("reacional: impressão 'proeminente de aspecto reacional no nível IB'", /Linfonodo proeminente de aspecto reacional no nível IB\./.test(l), l);
}

// ── Glândulas salivares (opcionais; silêncio → omitir) ──
{
  const lSemGland = render(F({}));
  check("glândulas: omitidas quando não descritas", !/Glândula submandibular/.test(lSemGland) && !/Glândula parótida/.test(lSemGland), lSemGland);

  const l = render(
    F({
      submandibulares: [G({ lado: "direita" })],
      parotidas: [G({ lado: "direita", alterada: true, descricao: "aumentada de volume, com ecotextura heterogênea e hipoecogênica" })],
    }),
  );
  check("glândula normal: frase padrão", /Glândula submandibular direita tópica, de dimensões normais, contornos regulares e ecotextura preservada\./.test(l), l);
  check("glândula alterada: descrição verbatim no corpo", /aumentada de volume, com ecotextura heterogênea e hipoecogênica\./.test(l), l);
  check("glândula alterada: item na impressão", /Alteração da glândula parótida direita/.test(l), l);
}

// ── Tireoide (opcional) ──
{
  const lNormal = render(F({ tireoide_descrita: true, tireoide_alterada: false }));
  check("tireoide normal: frase padrão no corpo", /Glândula tireoide tópica, de dimensões normais e ecotextura preservada\./.test(lNormal), lNormal);
  check("tireoide normal: NÃO gera item na impressão", !/Alteração tireoidiana/.test(lNormal), lNormal);

  const l = render(F({ tireoide_descrita: true, tireoide_alterada: true, tireoide_descricao: "Glândula tireoide com nódulo hipoecoico no lobo direito" }));
  check("tireoide alterada: verbatim no corpo", /Glândula tireoide com nódulo hipoecoico no lobo direito\./.test(l), l);
  check("tireoide alterada: item na impressão", /Alteração tireoidiana \(Glândula tireoide com nódulo hipoecoico no lobo direito\)\./.test(l), l);
}

// ── Achados adicionais ──
{
  const l = render(F({ achados_adicionais: "Cisto cervical lateral à direita, medindo 2,0 x 1,5 cm" }));
  check("achados adicionais: aparecem no corpo", /Cisto cervical lateral à direita/.test(l), l);
  check("achados adicionais: item na impressão", /Cisto cervical lateral à direita, medindo 2,0 x 1,5 cm\./.test(l), l);
}

// ── Impressão numerada quando há múltiplos itens ──
{
  const l = render(
    F({
      linfonodos_alterados: [
        LN({ nivel: "IIA", medidas_cm: [1.8, 1.2, 1.0], forma: "arredondada", hilo: "ausente", suspeito: true }),
        LN({ nivel: "III", medidas_cm: [1.9, 1.3, 1.1], forma: "arredondada", hilo: "ausente", suspeito: true }),
      ],
    }),
  );
  check("impressão múltipla: numerada '1.' e '2.'", /1\. Linfonodo de aspecto suspeito no nível IIA/.test(l) && /2\. Linfonodo de aspecto suspeito no nível III/.test(l), l);
}

// ── Placeholder ____ quando medidas faltam ──
{
  const l = render(F({ linfonodos_alterados: [LN({ nivel: "IV", suspeito: true })] }));
  check("placeholder: '____ x ____ x ____ cm' sem medidas", /____ x ____ x ____ cm/.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
