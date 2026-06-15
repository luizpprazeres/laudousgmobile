/**
 * GOLDEN de render local da CERVICAL (DET-5, estilo CLÁSSICO) — trava as decisões
 * clínicas do modelo validado (knowledge_blocks CERVICAL clássico + categoryDefaults).
 * Determinístico (sem LLM): renderCervical(findings) → asserções de presença/
 * proibição/formato. Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/cervical-golden.manual.ts
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

// Fixture base (exame globalmente normal).
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

// ── Estrutura clássica (cabeçalhos fixos, nesta ordem) ──
{
  const l = renderCervical(F({}));
  check("título 'ULTRASSONOGRAFIA CERVICAL'", l.startsWith("ULTRASSONOGRAFIA CERVICAL"), l);
  check("cabeçalho COMENTÁRIOS:", /\nCOMENTÁRIOS:\n/.test(l), l);
  check("cabeçalho OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", /\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n/.test(l), l);
  check("cabeçalho CONCLUSÃO:", /\nCONCLUSÃO:\n/.test(l), l);
  check("ordem dos cabeçalhos", l.indexOf("COMENTÁRIOS:") < l.indexOf("OS SEGUINTES ASPECTOS") && l.indexOf("OS SEGUINTES ASPECTOS") < l.indexOf("CONCLUSÃO:"), l);
  check("COMENTÁRIOS com 'transdutor de 12 MHz'", /transdutor de 12 MHz/.test(l), l);
}

// ── Modelo base NORMAL (sem achados) ──
{
  const l = renderCervical(F({}));
  check("normal: lista todos os níveis IA..VI", /níveis IA, IB, IIA, IIB, III, IV, VA, VB e VI/.test(l), l);
  check("normal: conclusão 'Ausência de alterações detectáveis pelo método.'", /Ausência de alterações detectáveis pelo método\./.test(l), l);
}

// ── Níveis normais ditados (frase canônica) ──
{
  const l = renderCervical(F({ niveis_normais: ["IIA", "III"] }));
  check("níveis normais: frase canônica (plural)", /Linfonodos de aspecto ecográfico normal nos níveis IIA e III, de imagens ovais, com periferia hipoecoica e centro hiperecoico\./.test(l), l);
  check("níveis normais: fecha com 'demais níveis'", /Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada\./.test(l), l);
}
{
  const l = renderCervical(F({ niveis_normais: ["IB"] }));
  check("nível normal único: 'no nível IB' (singular)", /Linfonodos de aspecto ecográfico normal no nível IB,/.test(l), l);
}

// ── Linfonodo SUSPEITO (medidas/forma/hilo) ──
{
  const l = renderCervical(
    F({
      linfonodos_alterados: [
        LN({ nivel: "IIA", medidas_cm: [1.8, 1.2, 1.0], forma: "arredondada", hilo: "ausente", suspeito: true }),
      ],
    }),
  );
  check("suspeito: corpo 'dimensões aumentadas no nível IIA'", /Linfonodo de dimensões aumentadas no nível IIA/.test(l), l);
  check("suspeito: P3 medidas '1,8 x 1,2 x 1,0 cm'", /1,8 x 1,2 x 1,0 cm/.test(l), l);
  check("suspeito: 'de forma arredondada'", /de forma arredondada/.test(l), l);
  check("suspeito: 'sem hilo ecogênico identificável'", /sem hilo ecogênico identificável/.test(l), l);
  check("suspeito: conclusão 'aspecto suspeito no nível IIA'", /Linfonodo de aspecto suspeito no nível IIA\. Correlacionar com achados clínicos\./.test(l), l);
}

// ── Linfonodo com Doppler (vascularização) ──
{
  const l = renderCervical(
    F({
      com_doppler: true,
      linfonodos_alterados: [
        LN({ nivel: "III", medidas_cm: [2.0, 1.4, 1.1], forma: "arredondada", hilo: "ausente", vascularizacao: "periferica", suspeito: true }),
      ],
    }),
  );
  check("doppler: título com 'DOPPLER COLORIDO'", /ULTRASSONOGRAFIA CERVICAL COM DOPPLER COLORIDO/.test(l), l);
  check("doppler: 'com vascularização periférica ao Doppler colorido'", /com vascularização periférica ao Doppler colorido/.test(l), l);
}

// ── Linfonodo proeminente NÃO suspeito (reacional) ──
{
  const l = renderCervical(
    F({ linfonodos_alterados: [LN({ nivel: "IB", medidas_cm: [1.2, 0.6, 0.5], forma: "oval", hilo: "presente", suspeito: false })] }),
  );
  check("reacional: NÃO usa 'suspeito'", !/aspecto suspeito/.test(l), l);
  check("reacional: conclusão 'proeminente de aspecto reacional no nível IB'", /Linfonodo proeminente de aspecto reacional no nível IB\./.test(l), l);
}

// ── Glândulas salivares (opcionais; silêncio → omitir) ──
{
  const lSemGland = renderCervical(F({}));
  check("glândulas: omitidas quando não descritas", !/Glândula submandibular/.test(lSemGland) && !/Glândula parótida/.test(lSemGland), lSemGland);

  const l = renderCervical(
    F({
      submandibulares: [G({ lado: "direita" }), G({ lado: "esquerda" })],
      parotidas: [G({ lado: "direita", alterada: true, descricao: "aumentada de volume, com ecotextura heterogênea e hipoecogênica" })],
    }),
  );
  check("glândula normal: frase padrão", /Glândula submandibular direita tópica, de dimensões normais, contornos regulares e ecotextura preservada\./.test(l), l);
  check("glândula alterada: descrição verbatim no corpo", /aumentada de volume, com ecotextura heterogênea e hipoecogênica\./.test(l), l);
  check("glândula alterada: item na conclusão", /Alteração da glândula parótida direita/.test(l), l);
}

// ── Achados adicionais ──
{
  const l = renderCervical(F({ achados_adicionais: "Cisto cervical lateral à direita, medindo 2,0 x 1,5 cm" }));
  check("achados adicionais: aparecem no corpo", /Cisto cervical lateral à direita/.test(l), l);
  check("achados adicionais: item numerado na conclusão", /Cisto cervical lateral à direita, medindo 2,0 x 1,5 cm\./.test(l), l);
}

// ── Conclusão numerada quando há múltiplos itens ──
{
  const l = renderCervical(
    F({
      linfonodos_alterados: [
        LN({ nivel: "IIA", medidas_cm: [1.8, 1.2, 1.0], forma: "arredondada", hilo: "ausente", suspeito: true }),
        LN({ nivel: "III", medidas_cm: [1.9, 1.3, 1.1], forma: "arredondada", hilo: "ausente", suspeito: true }),
      ],
    }),
  );
  check("conclusão múltipla: numerada '1.' e '2.'", /1\. Linfonodo de aspecto suspeito no nível IIA/.test(l) && /2\. Linfonodo de aspecto suspeito no nível III/.test(l), l);
}

// ── Placeholder ____ quando medidas faltam ──
{
  const l = renderCervical(F({ linfonodos_alterados: [LN({ nivel: "IV", suspeito: true })] }));
  check("placeholder: '____ x ____ x ____ cm' sem medidas", /____ x ____ x ____ cm/.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
