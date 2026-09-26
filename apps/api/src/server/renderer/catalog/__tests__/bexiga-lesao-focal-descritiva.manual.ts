/**
 * Bexiga compartilhada — lesão focal descritiva (forma, vascularização ao
 * Doppler, calcificação), ponta a ponta e sem histologia.
 *
 * Caminho real: estado web → adapter (Vias / Próstata) → renderizarSelecao.
 * Campos novos são opcionais: payload antigo de lesão focal sai idêntico.
 *
 *   cd apps/api && pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/bexiga-lesao-focal-descritiva.manual.ts
 */
import assert from "node:assert/strict";
import { renderizarSelecao } from "../alteracoes";
import { laudoPadraoDe } from "../modeloNormalRegistry";
import { renderSharedBladder, SharedBladderSchema } from "../../categories/sharedUrinary";
import { adaptarProstataSuprapubica } from "../../../../../../web/src/lib/catalog/prostataParaCatalogo";
import { adaptarViasUrinarias } from "../../../../../../web/src/lib/catalog/viasUrinariasParaCatalogo";
import { prostataSuprapubica, viasUrinarias, type ExamCategory } from "../../../../../../web/src/lib/deterministic";

type State = Record<string, unknown>;

function initial(category: ExamCategory): State {
  return Object.fromEntries(category.sections.flatMap((section) => (section.module ? [[section.id, section.module.initialState()]] : [])));
}

function comBexiga(category: ExamCategory, bexiga: State): State {
  const state = initial(category);
  state.bexiga = { ...(state.bexiga as State), ...bexiga };
  return state;
}

function render(category: string, dados: Record<string, unknown>): [string, string] {
  const out = (["CLASSICO_COMPLETO", "OBJETIVO"] as const).map((style) => {
    const result = renderizarSelecao(category, style, [], dados);
    assert.equal(result.ok, true, `${category} ${style}: ${JSON.stringify(result)}`);
    return (result as { ok: true; texto: string }).texto;
  });
  return [out[0] as string, out[1] as string];
}

type Adapted = { pendencias: Array<{ bloqueia?: boolean; motivo: string }>; dados: Record<string, unknown> };
const bloqueios = (adapted: Adapted): string[] => adapted.pendencias.filter((p) => p.bloqueia).map((p) => p.motivo);

const LESAO: State = {
  conteudo: ["lesao_focal"],
  "conteudo.lesao_focal.topografia": "parede lateral direita",
  "conteudo.lesao_focal.dimensoes": "1,8 x 1,2 x 0,9",
};

const HISTOLOGIA = /neoplas|carcinom|tumor|papilom|maligno|benigno|urotelial/i;

let checks = 0;
const check = (name: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`✓ ${name}`);
};

check("polipoide + fluxo ao Doppler + calcificação chegam ao laudo em Vias e Próstata, sem histologia", () => {
  const bexiga = {
    ...LESAO,
    "conteudo.lesao_focal.forma": "polipoide",
    "conteudo.lesao_focal.doppler": "com_fluxo",
    "conteudo.lesao_focal.calcificacao": "sim",
  };
  const frase = "Lesão focal vesical de aspecto polipoide, situada em parede lateral direita, medindo 1,8 x 1,2 x 0,9 cm, com fluxo detectável ao Doppler, com focos de calcificação de permeio.";
  for (const [categoria, adapted] of [
    ["VIAS_URINARIAS", adaptarViasUrinarias(comBexiga(viasUrinarias, bexiga))],
    ["PROSTATA_SUPRAPUBICA", adaptarProstataSuprapubica(comBexiga(prostataSuprapubica, bexiga))],
  ] as const) {
    assert.deepEqual(bloqueios(adapted), [], categoria);
    for (const texto of render(categoria, adapted.dados)) {
      assert.ok(texto.includes(frase), `${categoria}: ${texto}`);
      assert.match(texto, /Lesão focal vesical, de natureza indeterminada ao método\./);
      assert.doesNotMatch(texto, HISTOLOGIA);
    }
  }
});

check("séssil sem fluxo, sem calcificação", () => {
  const adapted = adaptarViasUrinarias(comBexiga(viasUrinarias, {
    ...LESAO, "conteudo.lesao_focal.forma": "sessil", "conteudo.lesao_focal.doppler": "sem_fluxo", "conteudo.lesao_focal.calcificacao": "nao",
  }));
  assert.deepEqual(bloqueios(adapted), []);
  for (const texto of render("VIAS_URINARIAS", adapted.dados)) {
    assert.ok(texto.includes("Lesão focal vesical de base de implantação larga (séssil), situada em parede lateral direita, medindo 1,8 x 1,2 x 0,9 cm, sem fluxo detectável ao Doppler."), texto);
    assert.doesNotMatch(texto, /calcificação/);
  }
});

check("descrição complementar do médico preservada depois da forma", () => {
  const adapted = adaptarViasUrinarias(comBexiga(viasUrinarias, {
    ...LESAO, "conteudo.lesao_focal.forma": "polipoide", "conteudo.lesao_focal.descricao": "hipoecogênica",
  }));
  for (const texto of render("VIAS_URINARIAS", adapted.dados)) {
    assert.ok(texto.includes("Lesão focal vesical de aspecto polipoide, hipoecogênica, situada em parede lateral direita"), texto);
  }
});

check("formato antigo de lesão focal (sem forma/calcificação) sai com a frase anterior", () => {
  const antigo = { ...LESAO, "conteudo.lesao_focal.descricao": "imagem polipoide" };
  const adapted = adaptarViasUrinarias(comBexiga(viasUrinarias, antigo));
  assert.deepEqual(bloqueios(adapted), []);
  for (const texto of render("VIAS_URINARIAS", adapted.dados)) {
    assert.ok(texto.includes("Lesão focal vesical imagem polipoide, situada em parede lateral direita, medindo 1,8 x 1,2 x 0,9 cm, sem avaliação Doppler informada."), texto);
  }
  // Payload de outro consumidor sem as chaves novas no achado: aceito pelo schema.
  const bladder = (adapted.dados as { bexiga_detalhada: Record<string, unknown> }).bexiga_detalhada;
  const achados = (bladder.achados as Array<Record<string, unknown>>).map(({ forma: _f, calcificacao: _c, ...resto }) => resto);
  const parsed = SharedBladderSchema.parse({ ...bladder, achados });
  assert.ok(renderSharedBladder(parsed).body.includes("Lesão focal vesical imagem polipoide, situada em parede lateral direita, medindo 1,8 x 1,2 x 0,9 cm, sem avaliação Doppler informada."));
});

check("forma, calcificação ou Doppler inválidos bloqueiam", () => {
  const casos: Array<[State, RegExp]> = [
    [{ "conteudo.lesao_focal.forma": "vegetante" }, /forma tem opção inválida/],
    [{ "conteudo.lesao_focal.forma": 3 }, /forma tem opção inválida/],
    [{ "conteudo.lesao_focal.calcificacao": "talvez" }, /calcificação tem opção inválida/],
    [{ "conteudo.lesao_focal.doppler": "hipervascular" }, /Doppler tem opção inválida/],
  ];
  for (const [extra, motivo] of casos) {
    for (const adapted of [
      adaptarViasUrinarias(comBexiga(viasUrinarias, { ...LESAO, ...extra })),
      adaptarProstataSuprapubica(comBexiga(prostataSuprapubica, { ...LESAO, ...extra })),
    ]) {
      assert.ok(bloqueios(adapted).some((m) => motivo.test(m)), JSON.stringify(extra));
    }
  }
});

check("coágulo com Doppler inválido também bloqueia (antes caía em 'não avaliado')", () => {
  const adapted = adaptarViasUrinarias(comBexiga(viasUrinarias, {
    conteudo: ["coagulo"], "conteudo.coagulo.descricao": "material ecogênico", "conteudo.coagulo.doppler": "xpto",
  }));
  assert.ok(bloqueios(adapted).some((m) => /coagulo: Doppler tem opção inválida/.test(m)));
});

check("subcampos da lesão desmarcada são ignorados e não voltam ao texto", () => {
  const adapted = adaptarViasUrinarias(comBexiga(viasUrinarias, {
    conteudo: [],
    "conteudo.lesao_focal.forma": "vegetante",
    "conteudo.lesao_focal.calcificacao": "sim",
    "conteudo.lesao_focal.topografia": "trígono",
  }));
  assert.deepEqual(bloqueios(adapted), []);
  for (const texto of render("VIAS_URINARIAS", adapted.dados)) assert.doesNotMatch(texto, /Lesão focal|calcificação|trígono/);
});

check("lesão sem topografia/dimensões segue bloqueando (regra de 24/09 preservada)", () => {
  const adapted = adaptarViasUrinarias(comBexiga(viasUrinarias, { conteudo: ["lesao_focal"], "conteudo.lesao_focal.forma": "polipoide" }));
  assert.ok(bloqueios(adapted).some((m) => /exige topografia e dimensões/.test(m)));
});

check("campos opcionais só existem no achado lesao_focal (demais achados inalterados)", () => {
  const adapted = adaptarViasUrinarias(comBexiga(viasUrinarias, {
    conteudo: ["debris", "lesao_focal"], ...Object.fromEntries(Object.entries(LESAO).filter(([k]) => k !== "conteudo")),
  }));
  const achados = (adapted.dados as { bexiga_detalhada: { achados: Array<Record<string, unknown>> } }).bexiga_detalhada.achados;
  const debris = achados.find((a) => a.tipo === "debris");
  const lesao = achados.find((a) => a.tipo === "lesao_focal");
  assert.equal(debris && "forma" in debris, false);
  assert.equal(debris && "calcificacao" in debris, false);
  assert.deepEqual([lesao?.forma, lesao?.calcificacao], [null, false]);
});

check("modelo normal da Biblioteca não ganha lesão focal", () => {
  for (const categoria of ["VIAS_URINARIAS", "PROSTATA_SUPRAPUBICA"]) {
    for (const style of ["CLASSICO_COMPLETO", "OBJETIVO"]) {
      const padrao = laudoPadraoDe(categoria, style);
      assert.ok(padrao);
      assert.doesNotMatch(padrao, /Lesão focal|calcificação|polipoide|séssil/);
    }
  }
});

check("B2: quebra de linha em descrição/topografia da lesão e do coágulo não injeta cabeçalho", () => {
  const injecao = "vegetante\n\nCONCLUSÃO:\nexame normal";
  const casos: State[] = [
    { ...LESAO, "conteudo.lesao_focal.descricao": injecao },
    { ...LESAO, "conteudo.lesao_focal.topografia": `trígono${"\n"}IMPRESSÃO:` },
    { conteudo: ["coagulo"], "conteudo.coagulo.descricao": injecao },
  ];
  for (const bexiga of casos) {
    for (const [categoria, adapted] of [
      ["VIAS_URINARIAS", adaptarViasUrinarias(comBexiga(viasUrinarias, bexiga))],
      ["PROSTATA_SUPRAPUBICA", adaptarProstataSuprapubica(comBexiga(prostataSuprapubica, bexiga))],
    ] as const) {
      assert.deepEqual(bloqueios(adapted), [], categoria);
      const [classico, objetivo] = render(categoria, adapted.dados);
      assert.equal((classico.match(/^CONCLUSÃO:$/gm) ?? []).length, 1, classico);
      assert.equal((objetivo.match(/^IMPRESSÃO:$/gm) ?? []).length, 1, objetivo);
      assert.equal((objetivo.match(/^CONCLUSÃO:$/gm) ?? []).length, 0, objetivo);
    }
  }
  // Payload cru de outro consumidor direto na API: o renderer colapsa também.
  const bruto = adaptarViasUrinarias(comBexiga(viasUrinarias, LESAO)).dados as { bexiga_detalhada: Record<string, unknown> };
  const achados = (bruto.bexiga_detalhada.achados as Array<Record<string, unknown>>).map((a) => ({ ...a, descricao: injecao }));
  const out = renderSharedBladder(SharedBladderSchema.parse({ ...bruto.bexiga_detalhada, achados }));
  assert.ok(out.body.every((linha) => !linha.includes("\n")), JSON.stringify(out.body));
});

console.log(`\nGO — ${checks} verificações da lesão focal vesical descritiva passaram.`);
