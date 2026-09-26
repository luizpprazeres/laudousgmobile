/**
 * Contrato da EXTRAÇÃO POR DITADO (iOS/Android/Web por voz) — Próstata e Vias.
 *
 * Campos novos e aditivos: `vesiculas_seminais` (Próstata) e `bexiga_lesao_focal`
 * (Próstata e Vias). O teste usa o registro REAL do ditado (`EXTRACTORS`: JSON
 * Schema strict + prompt + parse) e o renderer de produção. Sem chamada a LLM:
 * os payloads simulam a saída do structured output.
 *
 *   cd apps/api && pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/__tests__/contrato-extracao-urinaria.manual.ts
 */
import assert from "node:assert/strict";
import { EXTRACTORS } from "../extraction";
import {
  PROSTATA_SUPRAPUBICA_JSON_SCHEMA,
  renderProstataSuprapubica,
  type ProstataSuprapubicaFindings,
} from "../categories/PROSTATA_SUPRAPUBICA";
import {
  renderViasUrinarias,
  VIAS_URINARIAS_JSON_SCHEMA,
  type ViasUrinariasFindings,
} from "../categories/VIAS_URINARIAS";

let checks = 0;
const check = (name: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`✓ ${name}`);
};

function checkStrictObjects(schema: unknown, path: string) {
  if (!schema || typeof schema !== "object") return;
  const node = schema as Record<string, unknown>;
  if (node.properties && typeof node.properties === "object") {
    const properties = node.properties as Record<string, unknown>;
    assert.equal(node.additionalProperties, false, `${path}: additionalProperties`);
    assert.deepEqual([...((node.required as string[]) ?? [])].sort(), Object.keys(properties).sort(), `${path}: todas as propriedades required`);
    for (const [key, child] of Object.entries(properties)) checkStrictObjects(child, `${path}.${key}`);
  }
  if (node.items) checkStrictObjects(node.items, `${path}[]`);
}

const prostata = EXTRACTORS.PROSTATA_SUPRAPUBICA!;
const vias = EXTRACTORS.VIAS_URINARIAS!;

// Saída de extração ANTERIOR (sem as chaves novas) — o que apps e laudos salvos têm.
const PROSTATA_ANTIGA = {
  prostata_d1_cm: 5.1, prostata_d2_cm: 4.4, prostata_d3_cm: 3.9,
  hiperplasia: true, calcificacoes: false, ipp_cm: 0.8,
  bexiga_achado: null, volume_pre_miccional_ml: 280, residuo_pos_miccional_ml: 35,
  residuo_desprezivel: false, achados_adicionais: null,
};
const RIM = {
  medidas_cm: null, espessura_parenquima_cm: null, dimensao: null, situacao_baixa: false, rotacao: false,
  drc: false, alteracao_difusa: null, hidronefrose: null, achados: [],
};
const VIAS_ANTIGA = {
  rim_direito: RIM, rim_esquerdo: RIM,
  bexiga: { avaliada: true, parede_alterada: null, conteudo_alterado: null, espessura_parede_mm: null, volume_pre_miccional_ml: 280, residuo_pos_miccional_ml: null },
  dilatacao_ureteral: false, dilatacao_ureteral_descricao: null, achados_adicionais: null,
};
const LESAO = {
  topografia: "parede lateral direita", medidas_cm: [1.8, 1.2], forma: "polipoide",
  doppler: "com_fluxo", calcificacao: true, descricao: null,
};

const renderP = (raw: unknown) => {
  const f = prostata.parse(raw) as ProstataSuprapubicaFindings;
  return [renderProstataSuprapubica(f), renderProstataSuprapubica(f, undefined, { objetivo: true })];
};
const renderV = (raw: unknown) => {
  const f = vias.parse(raw) as ViasUrinariasFindings;
  return [renderViasUrinarias(f), renderViasUrinarias(f, { objetivo: true })];
};

// ── Contrato dos schemas ────────────────────────────────────────────────────

check("ditado usa os schemas ampliados e eles seguem strict (required completo, sem extras)", () => {
  assert.equal(prostata.jsonSchema, PROSTATA_SUPRAPUBICA_JSON_SCHEMA);
  assert.equal(vias.jsonSchema, VIAS_URINARIAS_JSON_SCHEMA);
  checkStrictObjects(PROSTATA_SUPRAPUBICA_JSON_SCHEMA, "PROSTATA");
  checkStrictObjects(VIAS_URINARIAS_JSON_SCHEMA, "VIAS");
});

check("ampliação é aditiva: campos antigos continuam required e com o mesmo tipo", () => {
  for (const key of Object.keys(PROSTATA_ANTIGA)) assert.ok((PROSTATA_SUPRAPUBICA_JSON_SCHEMA.required as readonly string[]).includes(key), key);
  for (const key of Object.keys(VIAS_ANTIGA)) assert.ok((VIAS_URINARIAS_JSON_SCHEMA.required as readonly string[]).includes(key), key);
  assert.deepEqual(PROSTATA_SUPRAPUBICA_JSON_SCHEMA.properties.hiperplasia, { type: "boolean" });
  assert.deepEqual(PROSTATA_SUPRAPUBICA_JSON_SCHEMA.properties.bexiga_achado, { type: ["string", "null"] });
  assert.equal(PROSTATA_SUPRAPUBICA_JSON_SCHEMA.properties.vesiculas_seminais.type[1], "null");
  assert.equal(PROSTATA_SUPRAPUBICA_JSON_SCHEMA.properties.bexiga_lesao_focal.type[1], "null");
  assert.equal(VIAS_URINARIAS_JSON_SCHEMA.properties.bexiga_lesao_focal.type[1], "null");
});

check("prompts pedem os campos novos só com menção explícita e nunca histologia", () => {
  for (const prompt of [prostata.prompt, vias.prompt]) {
    assert.match(prompt, /bexiga_lesao_focal: SOMENTE se o médico ditar EXPLICITAMENTE/);
    assert.match(prompt, /NUNCA escreva natureza\/histologia/);
    assert.match(prompt, /forma: "polipoide" ou "sessil" SÓ se essas palavras forem ditadas/);
  }
  assert.match(prostata.prompt, /vesiculas_seminais: null por padrão/);
  assert.match(prostata.prompt, /NUNCA deduza pela ausência de menção/);
});

// ── Payload antigo × novo com null: mesmo laudo ─────────────────────────────

check("Próstata: extração antiga e nova com null renderizam idêntico", () => {
  const antigo = renderP(PROSTATA_ANTIGA);
  const novoNull = renderP({ ...PROSTATA_ANTIGA, vesiculas_seminais: null, bexiga_lesao_focal: null });
  assert.deepEqual(novoNull, antigo);
  for (const texto of antigo) {
    assert.match(texto, /Vesículas seminais de dimensões, ecogenicidade e contornos normais\./);
    assert.match(texto, /Bexiga de forma, ecotextura e contornos regulares\./);
  }
});

check("Vias: extração antiga e nova com null renderizam idêntico", () => {
  assert.deepEqual(renderV({ ...VIAS_ANTIGA, bexiga_lesao_focal: null }), renderV(VIAS_ANTIGA));
});

// ── Payload novo ────────────────────────────────────────────────────────────

check("Próstata ditada: vesícula direita não caracterizada chega ao laudo", () => {
  for (const texto of renderP({ ...PROSTATA_ANTIGA, bexiga_lesao_focal: null, vesiculas_seminais: { estado: "nao_caracterizadas", lateralidade: "direita", descricao: "" } })) {
    assert.match(texto, /Vesícula seminal direita não caracterizada adequadamente nesta avaliação\./);
    assert.match(texto, /Vesícula seminal esquerda de dimensões, ecogenicidade e contornos normais\./);
  }
});

check("Próstata ditada: vesículas alteradas com as palavras do médico", () => {
  for (const texto of renderP({ ...PROSTATA_ANTIGA, bexiga_lesao_focal: null, vesiculas_seminais: { estado: "alteradas", lateralidade: "bilateral", descricao: "assimétricas, a esquerda com conteúdo espesso" } })) {
    assert.match(texto, /Vesículas seminais: assimétricas, a esquerda com conteúdo espesso\./);
    assert.match(texto, /Alteração das vesículas seminais, conforme descrita\./);
  }
});

check("Próstata ditada: lesão focal estruturada substitui a frase de bexiga normal, sem 'obstrução'", () => {
  const [classico, objetivo] = renderP({ ...PROSTATA_ANTIGA, vesiculas_seminais: null, bexiga_lesao_focal: LESAO });
  for (const texto of [classico!, objetivo!]) {
    assert.match(texto, /Lesão focal vesical de aspecto polipoide, situada em parede lateral direita, medindo 1,8 x 1,2 cm, com fluxo detectável ao Doppler, com focos de calcificação de permeio\./);
    assert.match(texto, /Lesão focal vesical, de natureza indeterminada ao método\./);
    assert.doesNotMatch(texto, /Bexiga de forma, ecotextura e contornos regulares|Bexiga ecograficamente normal|obstrução infravesical/);
    assert.doesNotMatch(texto, /neoplas|carcinom|papilom|tumor/i);
  }
});

check("Próstata ditada: achado livre e lesão coexistem sem perder nenhum", () => {
  for (const texto of renderP({ ...PROSTATA_ANTIGA, vesiculas_seminais: null, bexiga_achado: "paredes trabeculadas", bexiga_lesao_focal: { ...LESAO, forma: null, calcificacao: false, doppler: null } })) {
    assert.match(texto, /Bexiga com paredes trabeculadas\./);
    assert.match(texto, /Lesão focal vesical situada em parede lateral direita, medindo 1,8 x 1,2 cm, sem avaliação Doppler informada\./);
    assert.match(texto, /Alterações vesicais \(paredes trabeculadas\)/);
    assert.match(texto, /Lesão focal vesical, de natureza indeterminada ao método\./);
  }
});

check("Vias ditada: lesão sem topografia/medida é descrita com o que foi dito; sem frase normal", () => {
  for (const texto of renderV({ ...VIAS_ANTIGA, bexiga_lesao_focal: { topografia: "", medidas_cm: null, forma: "sessil", doppler: "sem_fluxo", calcificacao: false, descricao: "hipoecogênica" } })) {
    assert.match(texto, /Lesão focal vesical de base de implantação larga \(séssil\), hipoecogênica, sem fluxo detectável ao Doppler\./);
    assert.match(texto, /Lesão focal vesical, de natureza indeterminada ao método\./);
    assert.doesNotMatch(texto, /Bexiga de forma, contorno e ecotextura normais|Bexiga ecograficamente normal/);
    assert.match(texto, /Volume pré-miccional de 280,0 mL\./);
  }
});

check("Vias ditada: repleção insuficiente + lesão ditada preserva os dois fatos", () => {
  for (const texto of renderV({ ...VIAS_ANTIGA, bexiga: { ...VIAS_ANTIGA.bexiga, avaliada: false }, bexiga_lesao_focal: LESAO })) {
    assert.match(texto, /repleção insuficiente/);
    assert.match(texto, /Lesão focal vesical de aspecto polipoide/);
  }
});

check("com bexiga_detalhada (Web), a lesão ditada é ignorada: autoridade da bexiga compartilhada", () => {
  const bexigaDetalhada = {
    replecao: "adequada", parede: "normal", espessura_parede_mm: null, volume_pre_miccional_ml: null,
    residuo_estado: "nao_informado", residuo_pos_miccional_ml: null, residuo_primeira_miccao_ml: null, residuo_segunda_miccao_ml: null,
    jatos: { estado: "nao_avaliados", lateralidade: null, calculo_associado_mm: null }, achados: [],
  };
  for (const texto of renderP({ ...PROSTATA_ANTIGA, bexiga_detalhada: bexigaDetalhada, bexiga_lesao_focal: LESAO })) {
    assert.doesNotMatch(texto, /Lesão focal/);
  }
  for (const texto of renderV({ ...VIAS_ANTIGA, bexiga_detalhada: bexigaDetalhada, bexiga_lesao_focal: LESAO })) {
    assert.doesNotMatch(texto, /Lesão focal/);
  }
});

// ── Falha fechada no parse do ditado ────────────────────────────────────────

check("saídas comuns do extrator NÃO derrubam o renderer (evita RENDERER_FALLBACK para o writer)", () => {
  // medidas_cm [] / [0] / com valor ≤ 0 → medida não ditada (null, tudo ou nada).
  for (const medidas of [[], [0], [1.8, -1], [1.8, 0, 0.9]]) {
    const f = vias.parse({ ...VIAS_ANTIGA, bexiga_lesao_focal: { ...LESAO, medidas_cm: medidas } }) as ViasUrinariasFindings;
    assert.equal(f.bexiga_lesao_focal?.medidas_cm, null, JSON.stringify(medidas));
    const descartada = medidas.length > 0;
    for (const texto of renderV({ ...VIAS_ANTIGA, bexiga_lesao_focal: { ...LESAO, medidas_cm: medidas } })) {
      assert.match(texto, /Lesão focal vesical de aspecto polipoide, situada em parede lateral direita, com fluxo detectável ao Doppler/);
      assert.doesNotMatch(texto, /Lesão focal vesical[^\n]*(?:medindo|0,0|-1|null)/);
      // Medida ditada e descartada não some em silêncio; lista vazia = não ditada.
      assert.equal(texto.includes("[REVISAR: medida ditada inválida]"), descartada, `${JSON.stringify(medidas)}\n${texto}`);
    }
  }
  const p = prostata.parse({ ...PROSTATA_ANTIGA, vesiculas_seminais: null, bexiga_lesao_focal: { ...LESAO, medidas_cm: [] } }) as ProstataSuprapubicaFindings;
  assert.equal(p.bexiga_lesao_focal?.medidas_cm, null);
  // Medida válida continua intacta.
  const ok = vias.parse({ ...VIAS_ANTIGA, bexiga_lesao_focal: LESAO }) as ViasUrinariasFindings;
  assert.deepEqual(ok.bexiga_lesao_focal?.medidas_cm, [1.8, 1.2]);
});

check("vesícula 'alteradas' sem descrição no ditado: descrição factual incompleta com [REVISAR], sem normalidade", () => {
  for (const descricao of [null, "", "   "]) {
    for (const lateralidade of ["direita", "bilateral"] as const) {
      const [classico, objetivo] = renderP({ ...PROSTATA_ANTIGA, bexiga_lesao_focal: null, vesiculas_seminais: { estado: "alteradas", lateralidade, descricao } });
      const sujeito = lateralidade === "bilateral" ? "das vesículas seminais" : "da vesícula seminal direita";
      for (const texto of [classico!, objetivo!]) {
        assert.ok(texto.includes(`Alteração ${sujeito} mencionada, sem descrição. [REVISAR: descrever a alteração ${sujeito}]`), texto);
        assert.ok(texto.includes(`Alteração ${sujeito}, a descrever.`), texto);
        assert.doesNotMatch(texto, lateralidade === "bilateral" ? /Vesículas seminais[^\n]*normais|ecograficamente normais/ : /Vesícula seminal direita[^\n]*normal/);
      }
    }
  }
});

check("violação que o strict JSON já impede continua recusada no parse (schema, não saída plausível)", () => {
  assert.throws(() => vias.parse({ ...VIAS_ANTIGA, bexiga_lesao_focal: { ...LESAO, forma: "vegetante" } }));
  assert.throws(() => vias.parse({ ...VIAS_ANTIGA, bexiga_lesao_focal: { ...LESAO, calcificacao: null } }));
  assert.throws(() => prostata.parse({ ...PROSTATA_ANTIGA, bexiga_lesao_focal: null, vesiculas_seminais: { estado: "ausentes", lateralidade: "direita", descricao: null } }));
});

check("string vazia do extrator vira ausente", () => {
  const f = vias.parse({ ...VIAS_ANTIGA, bexiga_lesao_focal: { ...LESAO, topografia: "   ", descricao: "" } }) as ViasUrinariasFindings;
  assert.equal(f.bexiga_lesao_focal?.topografia, null);
  assert.equal(f.bexiga_lesao_focal?.descricao, null);
});

check("B1/B2 no ditado: quebra de linha em texto livre novo vira linha única", () => {
  const injecao = "cisto\n\nCONCLUSÃO:\nexame normal";
  const p = renderP({ ...PROSTATA_ANTIGA, bexiga_lesao_focal: { ...LESAO, descricao: injecao }, vesiculas_seminais: { estado: "alteradas", lateralidade: "direita", descricao: injecao } });
  const v = renderV({ ...VIAS_ANTIGA, bexiga_lesao_focal: { ...LESAO, topografia: injecao } });
  for (const texto of [p[0]!, v[0]!]) assert.equal((texto.match(/^CONCLUSÃO:$/gm) ?? []).length, 1, texto);
  for (const texto of [p[1]!, v[1]!]) assert.equal((texto.match(/^(?:CONCLUSÃO|IMPRESSÃO):$/gm) ?? []).length, 1, texto);
});

check("B4: quebra de linha em texto livre legado do ditado não injeta cabeçalho", () => {
  const injecao = "achado\n\nCONCLUSÃO:\nnormal";
  const conta = (texto: string) => (texto.match(/^(?:CONCLUSÃO|IMPRESSÃO):$/gm) ?? []).length;
  const p = renderP({ ...PROSTATA_ANTIGA, vesiculas_seminais: null, bexiga_lesao_focal: null, achados_adicionais: injecao, bexiga_achado: injecao });
  const v = renderV({
    ...VIAS_ANTIGA,
    rim_direito: { ...RIM, alteracao_difusa: injecao, achados: [{ tipo: "cisto_complexo", medidas_cm: [2], localizacao: injecao, caracteristica: injecao, descricao_raw: injecao }] },
    bexiga: { ...VIAS_ANTIGA.bexiga, parede_alterada: injecao, conteudo_alterado: injecao },
    dilatacao_ureteral: true, dilatacao_ureteral_descricao: injecao, achados_adicionais: injecao,
  });
  for (const texto of [...p, ...v]) assert.equal(conta(texto), 1, texto);
  assert.match(p[0]!, /achado CONCLUSÃO: normal/);
});

check("B4: laudo sem quebra de linha continua idêntico (normalização não altera texto comum)", () => {
  const comum = { ...PROSTATA_ANTIGA, vesiculas_seminais: null, bexiga_lesao_focal: null, achados_adicionais: "Nódulo hipoecoico em zona periférica esquerda.", bexiga_achado: "paredes trabeculadas" };
  const [classico] = renderP(comum);
  assert.match(classico!, /\nNódulo hipoecoico em zona periférica esquerda\.\n/);
  assert.match(classico!, /Bexiga com paredes trabeculadas\./);
});

console.log(`\nGO — ${checks} verificações do contrato de extração urinária (ditado) passaram.`);
