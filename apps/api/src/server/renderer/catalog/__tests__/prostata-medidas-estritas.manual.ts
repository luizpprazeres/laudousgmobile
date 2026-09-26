/**
 * Próstata transabdominal — medidas estritas e falha fechada, ponta a ponta.
 *
 * Caminho real da web: estado da seção → adaptarProstataSuprapubica → renderizarSelecao.
 * Toda asserção de texto lê o laudo renderizado nos dois estilos. A guarda do
 * renderer da API (consumido também por iOS/Android via extração) é exercida
 * direto em renderProstataSuprapubica.
 *
 *   cd apps/api && pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/prostata-medidas-estritas.manual.ts
 */
import assert from "node:assert/strict";
import { renderizarSelecao } from "../alteracoes";
import { laudoPadraoDe } from "../modeloNormalRegistry";
import { adaptarProstataSuprapubica } from "../../../../../../web/src/lib/catalog/prostataParaCatalogo";
import { prostataSuprapubica } from "../../../../../../web/src/lib/deterministic";
import {
  lerMedidaProstataCm,
  prostataInputIssues,
} from "../../../../../../web/src/lib/deterministic/organs/prostataSuprapubica";
import {
  renderProstataSuprapubica,
  type ProstataSuprapubicaFindings,
} from "../../categories/PROSTATA_SUPRAPUBICA";

type State = Record<string, unknown>;

function initial(): State {
  return Object.fromEntries(
    prostataSuprapubica.sections.flatMap((section) => (section.module ? [[section.id, section.module.initialState()]] : [])),
  );
}

function comProstata(values: State, bexiga?: State): State {
  const state = initial();
  state.prostata = { ...(state.prostata as State), ...values };
  if (bexiga) state.bexiga = { ...(state.bexiga as State), ...bexiga };
  return state;
}

function bloqueios(adapted: ReturnType<typeof adaptarProstataSuprapubica>): string[] {
  return adapted.pendencias.filter((item) => item.bloqueia).map((item) => item.motivo);
}

function renderEstilo(dados: Record<string, unknown>, style: "CLASSICO_COMPLETO" | "OBJETIVO"): string {
  const result = renderizarSelecao("PROSTATA_SUPRAPUBICA", style, [], dados);
  assert.equal(result.ok, true, `PROSTATA_SUPRAPUBICA ${style} deveria renderizar: ${JSON.stringify(result)}`);
  return (result as { ok: true; texto: string }).texto;
}

/** [clássico, objetivo] pelo caminho da rota (modelo normal + dados mesclados). */
function render(dados: Record<string, unknown>): [string, string] {
  return [renderEstilo(dados, "CLASSICO_COMPLETO"), renderEstilo(dados, "OBJETIVO")];
}

let checks = 0;
const check = (name: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`✓ ${name}`);
};

// ── Positivos ───────────────────────────────────────────────────────────────

check("três medidas em cm com IPP e calcificações chegam ao laudo sem pendência", () => {
  const adapted = adaptarProstataSuprapubica(comProstata({
    d1: "5,1", d2: "4,4", d3: "3,9", volume: "aumentada", "volume.aumentada.ipp": "0,8", extra: ["calcificacoes"],
  }));
  assert.deepEqual(bloqueios(adapted), []);
  for (const texto of render(adapted.dados)) {
    assert.match(texto, /Próstata aumentada de volume, medindo 5,1 x 4,4 x 3,9 cm\./);
    assert.match(texto, /peso aproximado de 48,1 gramas/);
    assert.match(texto, /Índice de protrusão prostática \(IPP\) mede 0,8 cm\./);
    assert.match(texto, /Protrusão prostática intravesical de 0,8 cm \(Grau 2\)/);
    assert.match(texto, /Calcificações prostáticas/);
  }
});

check("mm explícito converte para cm (inclusive IPP) e dá o mesmo peso", () => {
  const adapted = adaptarProstataSuprapubica(comProstata({
    d1: "51 mm", d2: "44mm", d3: " 39 MM ", volume: "aumentada", "volume.aumentada.ipp": "8 mm",
  }));
  assert.deepEqual(bloqueios(adapted), []);
  assert.deepEqual([adapted.dados.prostata_d1_cm, adapted.dados.prostata_d2_cm, adapted.dados.prostata_d3_cm], [5.1, 4.4, 3.9]);
  assert.equal(adapted.dados.ipp_cm, 0.8);
  for (const texto of render(adapted.dados)) {
    assert.match(texto, /medindo 5,1 x 4,4 x 3,9 cm/);
    assert.match(texto, /peso aproximado de 48,1 gramas/);
  }
});

check("sufixo cm e ponto decimal são aceitos; número JS também", () => {
  assert.equal(lerMedidaProstataCm("5.1 cm"), 5.1);
  assert.equal(lerMedidaProstataCm("5,1cm"), 5.1);
  assert.equal(lerMedidaProstataCm(5.1), 5.1);
  assert.equal(lerMedidaProstataCm(""), null);
  assert.equal(lerMedidaProstataCm("   "), null);
  assert.equal(lerMedidaProstataCm(undefined), null);
});

check("estado inicial não bloqueia e mantém o placeholder histórico (sem medida inventada)", () => {
  const adapted = adaptarProstataSuprapubica(initial());
  assert.deepEqual(bloqueios(adapted), []);
  assert.equal(adapted.dados.prostata_d1_cm, null);
  for (const texto of render(adapted.dados)) {
    assert.match(texto, /Próstata medindo ____ cm\./);
    assert.match(texto, /peso não calculável \(medidas incompletas\)/);
    assert.doesNotMatch(texto, /peso aproximado/);
  }
});

check("IPP oculto (volume normal) é ignorado mesmo inválido: não bloqueia nem aparece", () => {
  const adapted = adaptarProstataSuprapubica(comProstata({
    d1: "5", d2: "4", d3: "4", volume: "normal", "volume.aumentada.ipp": "1,2abc",
  }));
  assert.deepEqual(bloqueios(adapted), []);
  assert.equal(adapted.dados.ipp_cm, null);
  for (const texto of render(adapted.dados)) assert.doesNotMatch(texto, /IPP|Protrusão/);
});

check("formato antigo (bexiga legada achados/residuo) continua aceito e renderiza igual", () => {
  // Payload gravado antes da bexiga compartilhada: a seção inteira no formato
  // antigo (sem as chaves novas, que teriam autoridade se presentes).
  const state = comProstata({
    d1: "5,1", d2: "4,4", d3: "3,9", volume: "aumentada", "volume.aumentada.ipp": "0,8", extra: ["calcificacoes"],
  });
  state.bexiga = { achados: ["trabeculacao"], volume_pre: "280", residuo: "valor", "residuo.valor.ml": "80" };
  const adapted = adaptarProstataSuprapubica(state);
  assert.deepEqual(bloqueios(adapted), []);
  assert.equal(adapted.dados.volume_pre_miccional_ml, 280);
  assert.equal(adapted.dados.residuo_pos_miccional_ml, 80);
  for (const texto of render(adapted.dados)) {
    assert.match(texto, /peso aproximado de 48,1 gramas/);
    assert.match(texto, /Protrusão prostática intravesical de 0,8 cm \(Grau 2\)/);
    assert.match(texto, /Resíduo pós-miccional de 80 mL/);
    assert.match(texto, /Trabeculação da parede vesical/);
  }
});

check("estado antigo sem a chave volume nem extra continua aceito", () => {
  const state = initial();
  state.prostata = { d1: "4,0", d2: "3,5", d3: "3,0" };
  const adapted = adaptarProstataSuprapubica(state);
  assert.deepEqual(bloqueios(adapted), []);
  for (const texto of render(adapted.dados)) assert.match(texto, /Próstata medindo 4,0 x 3,5 x 3,0 cm\./);
});

// ── Negativos: falha fechada ────────────────────────────────────────────────

const INVALIDAS: Array<[string, unknown]> = [
  ["lixo após número", "5abc"],
  ["lixo antes do número", "abc5"],
  ["negativo", "-5"],
  ["zero", "0"],
  ["zero com unidade", "0,0 cm"],
  ["duas dimensões num campo", "5 x 4"],
  ["unidade de volume", "5 ml"],
  ["unidade desconhecida", "5 pol"],
  ["duas vírgulas", "5,1,2"],
  ["NaN numérico", Number.NaN],
  ["arredonda para 0,0 (mm)", "0,4 mm"],
  ["arredonda para 0,0 (cm)", "0,04"],
  ["objeto", { valor: 5 }],
];

for (const [nome, valor] of INVALIDAS) {
  check(`medida inválida (${nome}) bloqueia e não vira número no contrato`, () => {
    assert.equal(lerMedidaProstataCm(valor), "invalida");
    const adapted = adaptarProstataSuprapubica(comProstata({ d1: valor, d2: "4,4", d3: "3,9" }));
    const motivos = bloqueios(adapted);
    assert.ok(motivos.some((m) => /medida 1 da próstata tem formato inválido/.test(m)), JSON.stringify(motivos));
    assert.equal(adapted.dados.prostata_d1_cm, null);
    assert.equal(adapted.dados.prostata_d2_cm, null, "medida parcial não pode seguir sozinha");
  });
}

check("medida parcial (2 de 3) bloqueia em vez de descartar os valores digitados", () => {
  const adapted = adaptarProstataSuprapubica(comProstata({ d1: "5,1", d2: "4,4", d3: "" }));
  assert.deepEqual(bloqueios(adapted), ["medidas da próstata incompletas: informe as três dimensões ou nenhuma"]);
  assert.deepEqual([adapted.dados.prostata_d1_cm, adapted.dados.prostata_d2_cm, adapted.dados.prostata_d3_cm], [null, null, null]);
});

check("IPP visível inválido bloqueia (volume aumentado)", () => {
  for (const ipp of ["1,2abc", "-0,3", "1 x 2"]) {
    const adapted = adaptarProstataSuprapubica(comProstata({
      d1: "5", d2: "4", d3: "4", volume: "aumentada", "volume.aumentada.ipp": ipp,
    }));
    assert.ok(bloqueios(adapted).some((m) => /IPP tem formato inválido/.test(m)), ipp);
    assert.equal(adapted.dados.ipp_cm, null);
  }
});

check("opção de volume desconhecida bloqueia em vez de virar 'dimensões normais'", () => {
  for (const volume of ["gigante", "", 1, null]) {
    const motivos = prostataInputIssues({ d1: "5", d2: "4", d3: "4", volume });
    assert.ok(motivos.includes("volume da próstata tem opção inválida"), String(volume));
  }
});

check("achado desconhecido ou formato não-lista bloqueia em vez de sumir", () => {
  const adapted = adaptarProstataSuprapubica(comProstata({ d1: "5", d2: "4", d3: "4", extra: ["calcificacoes", "nodulo"] }));
  assert.deepEqual(bloqueios(adapted), ["achados da próstata têm opção inválida: nodulo"]);
  assert.deepEqual(prostataInputIssues({ extra: "calcificacoes" }), ["achados da próstata têm formato inválido"]);
  assert.deepEqual(prostataInputIssues({ extra: [7] }), ["achados da próstata têm opção inválida: 7"]);
});

check("pendência de bexiga e de próstata convivem, cada uma com seu 'onde'", () => {
  const adapted = adaptarProstataSuprapubica(comProstata({ d1: "5abc", d2: "4", d3: "4" }, { volume_pre: "abc" }));
  const onde = adapted.pendencias.filter((p) => p.bloqueia).map((p) => p.onde);
  assert.ok(onde.includes("bexiga"));
  assert.ok(onde.includes("próstata"));
});

// ── Renderer da API: guarda para qualquer consumidor ────────────────────────

const BASE: ProstataSuprapubicaFindings = {
  prostata_d1_cm: 5.1,
  prostata_d2_cm: 4.4,
  prostata_d3_cm: 3.9,
  hiperplasia: true,
  calcificacoes: false,
  ipp_cm: 0.8,
  bexiga_achado: null,
  volume_pre_miccional_ml: null,
  residuo_pos_miccional_ml: null,
  residuo_desprezivel: false,
  achados_adicionais: null,
};

check("renderer: medida zero, negativa ou NaN nunca é impressa nem calcula peso", () => {
  for (const ruim of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    for (const objetivo of [false, true]) {
      const texto = renderProstataSuprapubica({ ...BASE, prostata_d2_cm: ruim }, undefined, { objetivo });
      assert.match(texto, /medindo ____ cm\./, String(ruim));
      assert.match(texto, /peso não calculável/);
      assert.doesNotMatch(texto, /-5,0|0,0 x|NaN|Infinity|peso aproximado/);
    }
  }
});

check("renderer: IPP negativo ou NaN é omitido; IPP válido segue graduado", () => {
  for (const ruim of [-0.3, Number.NaN]) {
    const texto = renderProstataSuprapubica({ ...BASE, ipp_cm: ruim });
    assert.doesNotMatch(texto, /IPP|Protrusão|NaN/);
  }
  assert.match(renderProstataSuprapubica(BASE), /Protrusão prostática intravesical de 0,8 cm \(Grau 2\)/);
});

check("renderer: payload válido mantém redação histórica (peso, IPP, via)", () => {
  const texto = renderProstataSuprapubica(BASE);
  assert.match(texto, /Próstata aumentada de volume, medindo 5,1 x 4,4 x 3,9 cm\./);
  assert.match(texto, /Próstata de volume aumentado \(peso aproximado de 48,1 gramas\)\./);
  assert.match(texto, /Observação: a avaliação por via transabdominal/);
});

// ── Vesículas seminais: limitação factual e alteração descrita ──────────────

function comVesiculas(vesiculas: State): State {
  const state = comProstata({ d1: "4,0", d2: "3,5", d3: "3,0" });
  state.vesiculas_seminais = vesiculas;
  return state;
}

check("vesículas: estado normal/antigo não envia campo novo e mantém frase histórica", () => {
  for (const vesiculas of [{ estado: "normal" }, {}, { estado: "normal", "estado.alteradas.descricao": "cisto 8 mm", "estado.alteradas.lado": "xpto" }]) {
    const adapted = adaptarProstataSuprapubica(comVesiculas(vesiculas));
    assert.deepEqual(bloqueios(adapted), [], JSON.stringify(vesiculas));
    assert.equal("vesiculas_seminais" in adapted.dados, false, "payload normal deve ficar igual ao antigo");
    for (const texto of render(adapted.dados)) {
      assert.match(texto, /Vesículas seminais de dimensões, ecogenicidade e contornos normais\./);
      assert.doesNotMatch(texto, /cisto 8 mm/);
    }
  }
});

check("vesículas não caracterizadas (ambas): não afirma normalidade em corpo nem impressão", () => {
  const adapted = adaptarProstataSuprapubica(comVesiculas({ estado: "nao_caracterizadas" }));
  assert.deepEqual(bloqueios(adapted), []);
  const [classico, objetivo] = render(adapted.dados);
  for (const texto of [classico, objetivo]) {
    assert.match(texto, /Vesículas seminais não caracterizadas adequadamente nesta avaliação\./);
    assert.match(texto, /Vesículas seminais não adequadamente caracterizadas nesta avaliação\./);
    assert.doesNotMatch(texto, /Vesículas? semina(?:is|l)[^.\n]*(?:normais|normal)\./);
  }
});

check("vesícula direita não caracterizada: esquerda segue normal; objetivo omite só o normal da impressão", () => {
  const adapted = adaptarProstataSuprapubica(comVesiculas({ estado: "nao_caracterizadas", "estado.nao_caracterizadas.lado": "direita" }));
  assert.deepEqual(bloqueios(adapted), []);
  const [classico, objetivo] = render(adapted.dados);
  for (const texto of [classico, objetivo]) {
    assert.match(texto, /Vesícula seminal direita não caracterizada adequadamente nesta avaliação\./);
    assert.match(texto, /Vesícula seminal esquerda de dimensões, ecogenicidade e contornos normais\./);
    assert.match(texto, /Vesícula seminal direita não adequadamente caracterizada nesta avaliação\./);
  }
  assert.match(classico, /Vesícula seminal esquerda ecograficamente normal\./);
  assert.doesNotMatch(objetivo, /Vesícula seminal esquerda ecograficamente normal\./);
});

check("vesícula alterada: descrição do médico no corpo, lado preservado, sem rótulo diagnóstico", () => {
  const adapted = adaptarProstataSuprapubica(comVesiculas({
    estado: "alteradas", "estado.alteradas.lado": "esquerda", "estado.alteradas.descricao": "formação cística de 0,8 cm.",
  }));
  assert.deepEqual(bloqueios(adapted), []);
  for (const texto of render(adapted.dados)) {
    assert.match(texto, /Vesícula seminal esquerda: formação cística de 0,8 cm\./);
    assert.match(texto, /Alteração da vesícula seminal esquerda, conforme descrita\./);
    assert.match(texto, /Vesícula seminal direita de dimensões, ecogenicidade e contornos normais\./);
    assert.doesNotMatch(texto, /\.\./);
  }
});

check("vesículas: opção, lado ou descrição inválidos bloqueiam", () => {
  const casos: Array<[State, RegExp]> = [
    [{ estado: "ausentes" }, /opção inválida/],
    [{ estado: 3 }, /opção inválida/],
    [{ estado: "nao_caracterizadas", "estado.nao_caracterizadas.lado": "ambos" }, /lado inválido/],
    [{ estado: "alteradas", "estado.alteradas.descricao": "   " }, /exige descrição/],
    [{ estado: "alteradas" }, /exige descrição/],
    [{ estado: "alteradas", "estado.alteradas.descricao": { x: 1 } }, /formato inválido/],
  ];
  for (const [vesiculas, motivo] of casos) {
    const adapted = adaptarProstataSuprapubica(comVesiculas(vesiculas));
    assert.ok(bloqueios(adapted).some((m) => motivo.test(m)), JSON.stringify(vesiculas));
    assert.equal("vesiculas_seminais" in adapted.dados, false);
  }
});

check("vesículas: subcampo da opção não selecionada é ignorado (reset/troca)", () => {
  const adapted = adaptarProstataSuprapubica(comVesiculas({
    estado: "nao_caracterizadas",
    "estado.alteradas.descricao": "texto antigo",
    "estado.alteradas.lado": "direita",
  }));
  assert.deepEqual(bloqueios(adapted), []);
  assert.deepEqual(adapted.dados.vesiculas_seminais, { estado: "nao_caracterizadas", lateralidade: "bilateral", descricao: null });
  for (const texto of render(adapted.dados)) assert.doesNotMatch(texto, /texto antigo/);
});

check("modelo normal (achadoNormalDe) e payload legado/null não materializam 'não caracterizadas'", () => {
  // Regressão da integração: `.optional()` sem `.nullable()` fazia o laudo
  // padrão descer no enum e sair "não caracterizadas" sem o médico marcar nada.
  for (const style of ["CLASSICO_COMPLETO", "OBJETIVO"] as const) {
    const padrao = laudoPadraoDe("PROSTATA_SUPRAPUBICA", style);
    assert.ok(padrao, style);
    assert.match(padrao, /Vesículas seminais de dimensões, ecogenicidade e contornos normais\./);
    assert.doesNotMatch(padrao, /não (?:adequadamente )?caracterizad/);
  }
  const legado = adaptarProstataSuprapubica(comProstata({ d1: "4,0", d2: "3,5", d3: "3,0" })).dados;
  const [semCampo, semCampoObjetivo] = render(legado);
  const [comNull, comNullObjetivo] = render({ ...legado, vesiculas_seminais: null });
  assert.equal(comNull, semCampo);
  assert.equal(comNullObjetivo, semCampoObjetivo);
  assert.match(semCampo, /Vesículas seminais de dimensões, ecogenicidade e contornos normais\./);
  assert.match(semCampo, /Vesículas seminais ecograficamente normais\./);
});

check("API direta: alteração sem descrição sai com [REVISAR] (a Web bloqueia antes, no adapter)", () => {
  const result = renderizarSelecao("PROSTATA_SUPRAPUBICA", "CLASSICO_COMPLETO", [], {
    ...adaptarProstataSuprapubica(initial()).dados,
    vesiculas_seminais: { estado: "alteradas", lateralidade: "direita", descricao: null },
  });
  assert.equal(result.ok, true);
  const texto = (result as { ok: true; texto: string }).texto;
  assert.match(texto, /\[REVISAR: descrever a alteração da vesícula seminal direita\]/);
  assert.doesNotMatch(texto, /Vesícula seminal direita[^\n]*normal/);
});

// ── QA 26/09 (B1, B3, R2) ───────────────────────────────────────────────────

const cabecalhos = (texto: string) => (texto.match(/^(?:CONCLUSÃO|IMPRESSÃO|ACHADOS|TÉCNICA|COMENTÁRIOS):?$/gmu) ?? []).length;

check("B1: quebra de linha na descrição das vesículas não injeta cabeçalho (Web e API)", () => {
  const injecao = "cisto de 0,8 cm\n\nCONCLUSÃO:\nexame normal";
  const adapted = adaptarProstataSuprapubica(comVesiculas({
    estado: "alteradas", "estado.alteradas.lado": "direita", "estado.alteradas.descricao": injecao,
  }));
  assert.deepEqual(bloqueios(adapted), []);
  const [classico, objetivo] = render(adapted.dados);
  assert.equal(cabecalhos(classico), 2, classico); // só COMENTÁRIOS e CONCLUSÃO
  assert.equal((classico.match(/^CONCLUSÃO:$/gm) ?? []).length, 1);
  assert.equal((objetivo.match(/^IMPRESSÃO:$/gm) ?? []).length, 1);
  assert.equal((objetivo.match(/^CONCLUSÃO:$/gm) ?? []).length, 0);
  assert.match(classico, /Vesícula seminal direita: cisto de 0,8 cm CONCLUSÃO: exame normal\./);
  // Consumidor da API mandando o texto cru: o renderer também colapsa.
  const direto = renderProstataSuprapubica({ ...BASE, vesiculas_seminais: { estado: "alteradas", lateralidade: "direita", descricao: injecao } });
  assert.equal((direto.match(/^CONCLUSÃO:$/gm) ?? []).length, 1);
});

check("B3/R2: IPP que arredonda para 0,0 ou zero bloqueia na Web e é omitido na API", () => {
  for (const ipp of ["0,3 mm", "0,04", "0"]) {
    const adapted = adaptarProstataSuprapubica(comProstata({ d1: "5", d2: "4", d3: "4", volume: "aumentada", "volume.aumentada.ipp": ipp }));
    assert.ok(bloqueios(adapted).some((m) => /IPP tem formato inválido \(use valor em cm ou mm, a partir de 0,05 cm\)/.test(m)), ipp);
  }
  for (const ruim of [0, 0.04]) {
    for (const objetivo of [false, true]) {
      const texto = renderProstataSuprapubica({ ...BASE, ipp_cm: ruim }, undefined, { objetivo });
      assert.doesNotMatch(texto, /IPP|Protrusão|0,0 cm/, String(ruim));
    }
  }
  assert.match(renderProstataSuprapubica({ ...BASE, ipp_cm: 0.05 }), /Protrusão prostática intravesical de 0,1 cm \(Grau 1\)/);
});

check("B3: dimensão que arredonda para 0,0 não é impressa pela API", () => {
  const texto = renderProstataSuprapubica({ ...BASE, prostata_d1_cm: 0.04 });
  assert.match(texto, /medindo ____ cm\./);
  assert.doesNotMatch(texto, /0,0 x|peso aproximado/);
});

console.log(`\nGO — ${checks} verificações de próstata (estritas, falha fechada e formato antigo) passaram.`);
