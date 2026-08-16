/**
 * MATRIZ DE INVARIANTES dos achados patológicos do catálogo.
 *
 * Por que NÃO é equivalência: o renderer clássico não conhece nenhum destes
 * campos, então não há contra-parte para comparar. A matriz de 4320 combinações
 * fixa todos eles em `null` — ou seja, **não testa nada do código novo**
 * (achado da revisão do Codex, 16/08). Este arquivo cobre o buraco.
 *
 * O que se afirma aqui são PROPRIEDADES, não textos:
 *
 *   1. COBERTURA      — toda variante nova é alcançável pelo seu `exemplo`
 *   2. EIXOS          — ditar dois eixos independentes não faz um sumir
 *   3. COERÊNCIA      — o laudo não se contradiz
 *   4. GEMELAR        — achado por feto não vira achado global
 *   5. NÃO-REGRESSÃO  — sem achado ditado, nada aparece
 *
 * Este teste foi escrito para FALHAR nos defeitos que o Codex encontrou.
 * Verde aqui é o gate para ligar qualquer coisa.
 *
 *   pnpm exec tsx src/server/renderer/__tests__/catalogo-patologias-matriz.manual.ts
 */
import { buildObstetricaDoc } from "../catalog/OBSTETRICA.render";
import { serialize } from "../catalog/engine";
import { OBSTETRICA_CLASSICO } from "../catalog/OBSTETRICA.classico";
import { EMPTY_FETO, type ObstetricaFindings } from "../categories/OBSTETRICA";

let ok = 0;
const falhas: string[] = [];
function t(grupo: string, nome: string, cond: boolean, detalhe = "") {
  if (cond) { ok++; return; }
  falhas.push(`[${grupo}] ${nome}${detalhe ? `\n        ${detalhe}` : ""}`);
}

function base(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
    fetos: [{ ...EMPTY_FETO, dbp_mm: 80, cc_mm: 290, ca_mm: 270, cf_mm: 60, bcf_bpm: 142, apresentacao: "cefálica" }],
    ig_semanas: 32, ig_dias: 0, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null,
    saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
    placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null,
    placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null,
    placenta_achado: null, placenta_achado_medidas: null,
    liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
    liquido_classe: null, achados_adicionais: null,
    itens_conclusao_livres: [], observacoes_corpo_livres: [],
    ...over,
  } as ObstetricaFindings;
}
/** Achado POR FETO — desde 16/08 vive dentro de `fetos[]`, não no exame. */
function comFeto(f: ObstetricaFindings, i: number, over: Record<string, unknown>): ObstetricaFindings {
  return { ...f, fetos: f.fetos.map((x, k) => (k === i ? { ...x, ...over } : x)) };
}
const doc = (f: ObstetricaFindings) => buildObstetricaDoc({ findings: f }).doc;
const txt = (f: ObstetricaFindings) => serialize(doc(f), OBSTETRICA_CLASSICO);
const variantesDe = (f: ObstetricaFindings, slot: string) =>
  doc(f).segments.filter((s) => s.slotId === slot).map((s) => s.variantId);

// ---------------------------------------------------------------- 1 COBERTURA
console.log("\n1 · COBERTURA — toda variante nova é alcançável pelo seu exemplo");
{
  /**
   * "Alcançável em ALGUM contexto válido" — não só no feto único. Slots como
   * `bcf_gemelar` só existem na ordem gemelar; exigir feto único acusaria
   * falso positivo.
   */
  const contextos: [string, ObstetricaFindings][] = [
    ["único", base()],
    ["gemelar", base({
      numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
      fetos: [
        { ...EMPTY_FETO, rotulo: "A", bcf_bpm: 140, dbp_mm: 80, cc_mm: 290, ca_mm: 270, cf_mm: 60 },
        { ...EMPTY_FETO, rotulo: "B", bcf_bpm: 148, dbp_mm: 83, cc_mm: 295, ca_mm: 275, cf_mm: 61 },
      ],
    })],
  ];
  for (const slot of OBSTETRICA_CLASSICO.slots) {
    for (const v of slot.variantes) {
      if (!v.exemplo) continue;
      const ex = v.exemplo as Partial<ObstetricaFindings> & { fetos?: Record<string, unknown>[] };
      const onde: string[] = [];
      for (const [nome, ctx] of contextos) {
        // mesma mesclagem do registry: rasa no exame, profunda no feto
        const f = {
          ...ctx, ...ex,
          fetos: ex.fetos
            ? ctx.fetos.map((x, i) => ({ ...x, ...(ex.fetos![i] ?? ex.fetos![0]!) }))
            : ctx.fetos,
        } as ObstetricaFindings;
        if (variantesDe(f, slot.id).includes(v.id)) onde.push(nome);
      }
      t("cobertura", `${slot.id}/${v.id} alcançável`, onde.length > 0,
        `não renderizou em nenhum contexto — variante sombreada por outra`);
    }
  }
}

// ------------------------------------------------------------------- 2 EIXOS
console.log("2 · EIXOS — ditar dois eixos não faz um sumir");
{
  // O caso que o Codex reproduziu: acretismo + prévia + anterior.
  const f = base({
    placenta_localizacao: "anterior",
    placenta_ecotextura: "homogênea",
    placenta_relacao_orificio: "previa",
    placenta_achado: "acretismo",
  });
  const s = txt(f);
  t("eixos", "achado agudo (acretismo) presente", /acretismo placent/i.test(s));
  t("eixos", "relação (prévia) NÃO some", /recobrindo amplamente|Placenta prévia/i.test(s),
    "o eixo de relação com o orifício desapareceu");
  t("eixos", "topografia (anterior) NÃO some", /localização anterior/i.test(s),
    "a topografia desapareceu");
}
{
  // Combinação mais leve: lagos venosos + inserção baixa + posterior.
  const f = base({
    placenta_localizacao: "posterior",
    placenta_relacao_orificio: "insercao_baixa",
    placenta_achado: "lagos_venosos",
  });
  const s = txt(f);
  t("eixos", "lagos venosos presente", /lagos venosos/i.test(s));
  t("eixos", "inserção baixa NÃO some", /segmento uterino inferior|inserção baixa/i.test(s));
  t("eixos", "topografia posterior NÃO some", /localização posterior/i.test(s));
}

// --------------------------------------------------------------- 3 COERÊNCIA
console.log("3 · COERÊNCIA — o laudo não se contradiz");
{
  const s = txt(comFeto(base(), 0, { bcf_alteracao: "ausente", bcf_bpm: null }));
  t("coerência", "óbito não coexiste com 'movimentos fetais são ativos'",
    !(/Óbito fetal|sem vitalidade/i.test(s) && /movimentos fetais são ativos/i.test(s)),
    "o laudo afirma óbito E movimentos ativos na mesma página");
  t("coerência", "óbito não coexiste com BCF numérico",
    !(/Óbito fetal|sem vitalidade/i.test(s) && /BCF = \d/.test(s)),
    "o laudo afirma óbito E dá um valor de BCF");
}
{
  // Bradicardia sem BCF ditado não deve afirmar frequência inventada.
  const s = txt(comFeto(base(), 0, { bcf_alteracao: "bradicardia", bcf_bpm: null }));
  t("coerência", "bradicardia sem BCF não inventa número", !/frequência de \d+ bpm/.test(s) || /____/.test(s),
    "afirmou uma frequência que não foi ditada");
}
{
  // Descolamento sem medida não deve afirmar medida.
  const s = txt(base({ placenta_achado: "descolamento" }));
  t("coerência", "descolamento sem medida usa lacuna", /____/.test(s) || !/medindo\s*,/.test(s));
}

// ----------------------------------------------------------------- 4 GEMELAR
console.log("4 · GEMELAR — achado por feto não vira achado global");
{
  const gem = base({
    numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
    fetos: [
      { ...EMPTY_FETO, rotulo: "A", bcf_bpm: 140, dbp_mm: 80, cc_mm: 290, ca_mm: 270, cf_mm: 60 },
      { ...EMPTY_FETO, rotulo: "B", bcf_bpm: 148, dbp_mm: 83, cc_mm: 295, ca_mm: 275, cf_mm: 61 },
    ],
  });
  const gemA = comFeto(gem, 0, { bcf_alteracao: "ausente", bcf_bpm: null });
  const s = txt(gemA);
  t("gemelar", "BCF ausente do feto A não é ignorado",
    /não visualizados|Ausência de batimentos|Óbito|sem vitalidade/i.test(s),
    "ditou ausência de BCF e o laudo saiu com dois BCF positivos");
  t("gemelar", "não afirma BCF positivo nos dois com ausência ditada",
    !/BCF = 140/.test(s) && /BCF = 148/.test(s),
    "feto A devia estar sem BCF e feto B com 148");
}
{
  const gem = base({
    numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
    fetos: [
      { ...EMPTY_FETO, rotulo: "A", bcf_bpm: 140, dbp_mm: 80, cc_mm: 290, ca_mm: 270, cf_mm: 60 },
      { ...EMPTY_FETO, rotulo: "B", bcf_bpm: 148, dbp_mm: 83, cc_mm: 295, ca_mm: 275, cf_mm: 61 },
    ],
  });
  const s = txt(comFeto(gem, 1, { cranio_achado: "dandy_walker", cordao_vasos: "dois" }));
  t("gemelar", "crânio não é ignorado na ordem gemelar", /Dandy-Walker|fossa posterior/i.test(s),
    "achado de crânio ditado sumiu no gemelar");
  t("gemelar", "cordão não é ignorado na ordem gemelar", /cordão umbilical/i.test(s),
    "achado de cordão ditado sumiu no gemelar");
}

// ---------------------------------------------------------- 5 NÃO-REGRESSÃO
console.log("5 · NÃO-REGRESSÃO — sem achado ditado, nada aparece");
{
  const s = txt(base());
  const proibidos: [string, RegExp][] = [
    ["cordão", /cordão umbilical/i], ["óbito", /Óbito fetal|sem vitalidade/i],
    ["bradicardia", /Bradicardia|Taquicardia/i], ["crânio", /Dandy-Walker|cisterna magna|cavum|plexo coroide/i],
    ["placenta aguda", /acretismo|lagos venosos|retroplacentária/i],
    ["movimentos alterados", /Não foram observados movimentos|Movimentos fetais reduzidos/i],
  ];
  for (const [nome, re] of proibidos) t("não-regressão", `sem ${nome} ditado, não aparece`, !re.test(s));
  t("não-regressão", "movimentos normais continuam afirmados", /movimentos fetais são ativos/i.test(s));
}
{
  // Gestação inicial sem achados — o cordão não pode entrar.
  const s = txt(base({ gestacao_inicial: true, ig_semanas: 8, saco_gestacional_mm: 20,
    fetos: [{ ...EMPTY_FETO, ccn_mm: 16, bcf_bpm: 160 }] }));
  t("não-regressão", "inicial sem cordão ditado não traz cordão", !/cordão umbilical/i.test(s));
}

// ------------------------------------------------------------------ relatório
const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) {
  console.log(`✓ ${ok}/${total} invariantes`);
} else {
  console.log(`✗ ${falhas.length} de ${total} invariantes VIOLADOS\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
