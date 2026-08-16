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

/**
 * O texto de UM slot, não o laudo inteiro.
 *
 * Afirmar sobre o laudo inteiro produz falso-verde nas asserções de lacuna: um
 * `____` vindo do DBP ausente satisfazia "a bradicardia sem BCF não inventou
 * número". Aqui a asserção olha só o segmento que está sendo julgado.
 */
const trechoDe = (f: ObstetricaFindings, slot: string, kind: "corpo" | "conclusao" = "corpo") =>
  doc(f).segments.filter((s) => s.slotId === slot && s.kind === kind).map((s) => s.text).join(" ");

/** Os slots que a categoria coloca na ordem daquele contexto. */
const slotsDaOrdem = (f: ObstetricaFindings): Set<string> => {
  const ctx = { findings: f, fetoIndex: 0, gemelar: f.numero_fetos >= 2,
    flags: { igCorrection: false, flexivel: false, grannum: false, objetivo: false } };
  const out = new Set<string>();
  for (const item of OBSTETRICA_CLASSICO.ordem(ctx)) {
    if (typeof item === "string") out.add(item);
    else for (const id of item.repetirPorFeto) out.add(id);
  }
  return out;
};

// ---------------------------------------------------------------- 1 COBERTURA
console.log("\n1 · COBERTURA — toda variante nova é alcançável pelo seu exemplo");
{
  /**
   * "Alcançável em TODO contexto onde o slot existe" — não em algum.
   *
   * A versão anterior aceitava `onde.length > 0`, e isso é falso-verde: as
   * alterações de vitalidade são compartilhadas entre `bcf` (feto único) e
   * `bcf_gemelar`. Bastava a variante funcionar num dos dois para o teste
   * passar com o outro quebrado. O critério certo não é "existe contexto que
   * funciona", é "não existe contexto onde o slot entra e a variante não sai".
   *
   * Slots que não estão na ordem daquele contexto ficam de fora da conta —
   * cobrar `bcf` no gemelar seria falso POSITIVO na direção oposta.
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
      const aplicaveis: string[] = [];
      const falhou: string[] = [];
      for (const [nome, ctx] of contextos) {
        // mesma mesclagem do registry: rasa no exame, profunda no feto
        const f = {
          ...ctx, ...ex,
          fetos: ex.fetos
            ? ctx.fetos.map((x, i) => ({ ...x, ...(ex.fetos![i] ?? ex.fetos![0]!) }))
            : ctx.fetos,
        } as ObstetricaFindings;
        // O exemplo pode MUDAR a ordem (gestacao_inicial), então a ordem é lida
        // dos findings já mesclados, não do contexto de partida.
        if (!slotsDaOrdem(f).has(slot.id)) continue;
        aplicaveis.push(nome);
        if (!variantesDe(f, slot.id).includes(v.id)) falhou.push(nome);
      }
      t("cobertura", `${slot.id}/${v.id} alcançável onde o slot existe`,
        aplicaveis.length > 0 && falhou.length === 0,
        aplicaveis.length === 0
          ? "o slot não entra em nenhum contexto testado — o exemplo não prova nada"
          : `não renderizou em: ${falhou.join(", ")} — variante sombreada por outra`);
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
  // A asserção olha o TRECHO do bcf: um "____" vindo do DBP ausente satisfazia
  // a versão anterior, que testava o laudo inteiro (falso-verde).
  const f = comFeto(base(), 0, { bcf_alteracao: "bradicardia", bcf_bpm: null });
  const trecho = trechoDe(f, "bcf");
  t("coerência", "bradicardia sem BCF não inventa número",
    trecho.includes("____") && !/frequência de \d+ bpm/.test(trecho),
    `trecho do bcf: ${JSON.stringify(trecho)}`);
  t("coerência", "…e a conclusão de bradicardia sai mesmo assim",
    trechoDe(f, "bcf", "conclusao").includes("Bradicardia fetal."));
}
{
  // Descolamento sem medida não deve afirmar medida.
  const f = base({ placenta_achado: "descolamento" });
  const trecho = trechoDe(f, "placenta_achado");
  t("coerência", "descolamento sem medida usa lacuna no PRÓPRIO trecho",
    trecho.includes("medindo ____") && !/medindo\s*[,.]/.test(trecho),
    `trecho do achado: ${JSON.stringify(trecho)}`);
}
{
  // Crânio sem medida ditada: mesma regra, no trecho do crânio.
  const f = comFeto(base(), 0, { cranio_achado: "ventriculomegalia", cranio_medida_mm: null });
  const trecho = trechoDe(f, "cranio_achado");
  t("coerência", "ventriculomegalia sem medida usa lacuna, não inventa número",
    trecho.includes("____") && !/medindo \d/.test(trecho),
    `trecho do crânio: ${JSON.stringify(trecho)}`);
}
{
  // Lateralidade não ditada não vira lado inventado.
  const f = comFeto(base(), 0, { cranio_achado: "cisto_plexo_coroide", cranio_medida_mm: 5 });
  const concl = trechoDe(f, "cranio_achado", "conclusao");
  t("coerência", "cisto de plexo coroide sem lado não escolhe um lado",
    concl.includes("____") && !/à (direita|esquerda)/.test(concl),
    `conclusão do crânio: ${JSON.stringify(concl)}`);
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

  /**
   * ATRIBUIÇÃO NA CONCLUSÃO — o corpo diz de quem é o achado (cabeçalho
   * "Feto B:"); a conclusão não tinha como dizer. "Óbito fetal." num laudo de
   * dois fetos é ambíguo no ponto em que a ambiguidade custa mais caro.
   */
  const conclusao = (f: ObstetricaFindings) => txt(f).split("CONCLUSÃO:")[1] ?? "";
  {
    const c = conclusao(comFeto(gem, 1, { bcf_alteracao: "ausente", bcf_bpm: null }));
    t("gemelar", "óbito de um feto diz QUAL feto na conclusão", /Óbito fetal \(feto B\)\./.test(c),
      `conclusão: ${JSON.stringify(c)}`);
    t("gemelar", "e não atribui ao feto errado", !/\(feto A\)/.test(c));
  }
  {
    const c = conclusao(comFeto(gem, 1, { cordao_vasos: "dois" }));
    t("gemelar", "artéria umbilical única é atribuída ao feto",
      /Artéria umbilical única \(feto B\)\./.test(c), `conclusão: ${JSON.stringify(c)}`);
  }
  {
    // A marca entra no fim da PRIMEIRA sentença — depois da conduta ela
    // atribuiria a recomendação ao feto, não o achado.
    const c = conclusao(comFeto(gem, 0, { cranio_achado: "megacisterna_magna", cranio_medida_mm: 12 }));
    t("gemelar", "a marca acompanha o achado, não a conduta",
      /Aumento da cisterna magna \(feto A\)\./.test(c) && !/evolução \(feto A\)/.test(c),
      `conclusão: ${JSON.stringify(c)}`);
  }
  {
    // Dois fetos com o mesmo achado: dois itens, cada um com o seu dono.
    const dois = comFeto(comFeto(gem, 0, { bcf_alteracao: "ausente", bcf_bpm: null }), 1,
      { bcf_alteracao: "ausente", bcf_bpm: null });
    const c = conclusao(dois);
    t("gemelar", "achado nos dois fetos gera um item por feto",
      /Óbito fetal \(feto A\)\./.test(c) && /Óbito fetal \(feto B\)\./.test(c), `conclusão: ${JSON.stringify(c)}`);
  }
  {
    // Item do EXAME não é de feto nenhum — não pode ganhar marca.
    const c = conclusao(gem);
    t("gemelar", "itens do exame (IG, líquido, ponderal) não ganham marca de feto",
      !/\(feto [AB]\)/.test(c), `conclusão: ${JSON.stringify(c)}`);
  }
}
{
  // Feto único NUNCA rotula — mesma regra P5 que o renderer já aplica ao MBV.
  const s = txt(comFeto(base(), 0, { bcf_alteracao: "ausente", bcf_bpm: null, cordao_vasos: "dois" }));
  t("gemelar", "feto único não ganha '(feto A)' em lugar nenhum", !/\(feto [A-Z]\)/.test(s),
    "alucinação gemelar em laudo de feto único");
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
{
  /**
   * CAMPO AUSENTE ≠ CAMPO NULO — o defeito que só a equivalência contra laudos
   * REAIS pegou (0/12), e que a matriz sintética não via.
   *
   * Os cenários acima partem de `EMPTY_FETO`, que crava `cordao_vasos: null`.
   * O `structured_output` que a produção grava simplesmente NÃO TRAZ a chave
   * quando o campo é novo ou a extração não o preencheu — e `undefined !== null`
   * é `true`. Com isso o slot condicional voltava a entrar em 100% dos laudos,
   * enxertando "O cordão umbilical tem aspecto normal, com duas artérias e uma
   * veia." num exame em que ninguém avaliou o cordão.
   *
   * Aqui os campos de achado são REMOVIDOS do objeto, não zerados.
   */
  const semChaves = (() => {
    const f = base();
    const feto = { ...f.fetos[0] } as Record<string, unknown>;
    for (const k of ["cordao_vasos", "cranio_achado", "cranio_medida_mm",
      "cranio_lateralidade", "movimentos_fetais", "bcf_alteracao"]) delete feto[k];
    const exame = { ...f, fetos: [feto] } as Record<string, unknown>;
    for (const k of ["placenta_achado", "placenta_achado_medidas",
      "placenta_relacao_orificio", "liquido_tipo"]) delete exame[k];
    return exame as unknown as ObstetricaFindings;
  })();
  const s = txt(semChaves);
  const proibidos: [string, RegExp][] = [
    ["cordão", /cordão umbilical/i], ["crânio", /Dandy-Walker|cisterna magna|cavum|plexo coroide/i],
    ["placenta aguda", /acretismo|lagos venosos|retroplacentária/i],
    ["movimentos alterados", /Não foram observados movimentos|Movimentos fetais reduzidos/i],
    ["óbito", /Óbito fetal|sem vitalidade/i],
  ];
  for (const [nome, re] of proibidos) {
    t("não-regressão", `campo de ${nome} AUSENTE (não nulo) não afirma nada`, !re.test(s),
      "o slot condicional entrou porque `undefined !== null` — use `!= null`");
  }
  t("não-regressão", "e o laudo continua íntegro com os campos ausentes",
    /Placenta de aspecto normal/.test(s) && /Líquido amniótico/.test(s));
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
