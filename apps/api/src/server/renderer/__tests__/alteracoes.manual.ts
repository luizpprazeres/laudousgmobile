/**
 * A FUNDAÇÃO DAS ALTERAÇÕES — piloto na TIREOIDE.
 *
 * O que se afirma aqui é o desenho inteiro (Codex, 19/08): o humano declara o
 * CENÁRIO, o renderer escreve a FRASE. Se um dia alguém colar redação clínica
 * num `AlteracaoSpec`, este gate não pega — mas os outros afirmam que o texto
 * que sai é o do renderer, e é isso que importa.
 *
 *   pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/alteracoes-tireoide.manual.ts
 */
import { mesclarFundo } from "@/server/renderer/catalog/modeloNormal";
import { previaDaAlteracao, renderizarSelecao, conflitosEntre } from "../catalog/alteracoes";
import { alteracoesDe, categoriasComAlteracoes } from "../catalog/alteracoes/index";
import { laudoPadraoDe } from "../catalog/modeloNormalRegistry";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, cond: boolean, extra = "") => {
  if (cond) ok++;
  else falhas.push(`${nome}${extra ? `\n        ${extra}` : ""}`);
};

const CAT = "TIREOIDE";
const specs = alteracoesDe(CAT);
const de = (id: string) => specs.find((s) => s.id === id)!;

console.log("\n1 · toda alteração declarada renderiza e MUDA o laudo\n");
t("a categoria-piloto tem alterações", specs.length >= 8, `${specs.length}`);
for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"]) {
  for (const s of specs) {
    const p = previaDaAlteracao(CAT, estilo, s);
    t(`${estilo} · ${s.id}: renderiza`, p !== null);
    if (p) t(`${estilo} · ${s.id}: muda alguma linha`, p.entram.length + p.saem.length > 0);
  }
}

console.log("2 · a MEDIDA vira lacuna — o modelo não crava o número do cenário\n");
{
  const p = previaDaAlteracao(CAT, "CLASSICO_COMPLETO", de("nodulo_solido_suspeito"))!;
  const linha = p.entram.find((l) => l.includes("hipoecoica"))!;
  t("a frase do nódulo aparece", Boolean(linha));
  t("…e as medidas viraram ____", linha.includes("____"), linha);
  // 1,3 / 1,0 / 1,2 são os números que EU escolhi no cenário. Nenhum deles pode
  // chegar ao médico como se fosse o padrão da casa.
  t("…sem nenhum número do seed", !/1,3|1,2 cm|0,9 x/.test(linha), linha);
}

console.log("3 · o RENDERER é quem classifica — o cenário não diz TI-RADS\n");
{
  const suspeito = previaDaAlteracao(CAT, "CLASSICO_COMPLETO", de("nodulo_solido_suspeito"))!;
  const benigno = previaDaAlteracao(CAT, "CLASSICO_COMPLETO", de("nodulo_solido_benigno"))!;
  const cSus = suspeito.entram.join(" ");
  const cBen = benigno.entram.join(" ");
  t("o suspeito recebe TI-RADS alto", /TI-RADS [45]/.test(cSus), cSus.slice(0, 110));
  t("o benigno recebe TI-RADS baixo", /TI-RADS [123]/.test(cBen), cBen.slice(0, 110));
  t("os dois recebem classificações DIFERENTES",
    (cSus.match(/TI-RADS \d/)?.[0] ?? "a") !== (cBen.match(/TI-RADS \d/)?.[0] ?? "b"));
  // A prova de que a classificação não está escrita no cenário:
  t("nenhum cenário menciona TI-RADS ou nota",
    !JSON.stringify(specs).match(/TI-RADS|NOTA FINAL/i));
}

console.log("4 · combinar duas alterações dá um laudo COERENTE\n");
{
  /**
   * Os nódulos entram por `dados` — eles são PRESET, não alteração clicável.
   *
   * Este bloco selecionava os dois presets em `alteracoes[]`, o que o desenho
   * passou a proibir em 20/08: um preset vive num lobo fixo e clicá-lo punha o
   * achado à direita sem o médico escolher o lobo. A combinação que interessa
   * aqui é a mesma — achado nodular nos dois lobos convivendo com linfonodo
   * alterado, e a conclusão RECOMPOSTA pelo renderer.
   */
  const nod = (o: Record<string, unknown>) => ({
    ecogenicidade: null, margem: null, halo: null, forma: null, calcificacoes: null,
    vascularizacao: null, medidas_cm: null, diametro_transverso_cm: null,
    localizacao: null, descricao_raw: null, nota_domingos_ditada: null, ti_rads_ditado: null, ...o,
  });
  const r = renderizarSelecao(CAT, "CLASSICO_COMPLETO", [de("linfonodos_alterados")], {
    lobo_direito: {
      nodulos: [nod({
        ecogenicidade: "hipoecoica", margem: "irregular", halo: "sem_halo",
        forma: "mais_alta_que_larga", calcificacoes: "micro", vascularizacao: "exclusiva_central",
      })],
    },
    lobo_esquerdo: {
      nodulos: [nod({
        ecogenicidade: "isoecoica", margem: "regular", halo: "fino_regular",
        forma: "mais_larga_que_alta", calcificacoes: "sem",
      })],
    },
  });
  t("a combinação renderiza", r.ok === true, JSON.stringify(r).slice(0, 120));
  if (r.ok) {
    t("o achado da direita está lá", r.texto.includes("Lobo direito") && r.texto.includes("hipoecoica"));
    t("o achado da esquerda está lá", r.texto.includes("Lobo esquerdo") && r.texto.includes("isoecoica"));
    t("os linfonodos estão lá", /Linfonodos cervicais/.test(r.texto));
    // O ponto do desenho: a conclusão é RECOMPOSTA e numerada pelo renderer,
    // não concatenada pela tela.
    const concl = r.texto.split(/CONCLUS[ÃA]O:/)[1] ?? "";
    t("a conclusão numera os quatro itens", /(^|\n)\s*4[.)]/.test(concl), concl.trim().slice(0, 140));
    t("…e traz as duas classificações", (concl.match(/TI-RADS/g) ?? []).length === 2);
  }
}

console.log("5 · o que NÃO combina é recusado, não remendado\n");
{
  const c = conflitosEntre([de("nodulo_cistico_simples"), de("nodulo_solido_suspeito")]);
  t("dois presets do mesmo lobo conflitam", c.length === 1, JSON.stringify(c));
  t("…e o motivo é legível", /mesmo grupo/.test(c[0]?.motivo ?? ""), c[0]?.motivo);

  /**
   * E a recusa que fecha a porta antes: preset não é seleção, em nenhum
   * consumidor — a proibição está no NÚCLEO, não só na rota HTTP.
   */
  const comPreset = renderizarSelecao(CAT, "CLASSICO_COMPLETO", [de("nodulo_solido_suspeito")]);
  t("preset como seleção é recusado pelo núcleo", comPreset.ok === false);
  t("…dizendo que é modelo de preenchimento",
    !comPreset.ok && "conflitos" in comPreset &&
      comPreset.conflitos.some((x) => /modelo de preenchimento/.test(x.motivo)));

  /**
   * A irmã dela: alteração pedida num estilo em que não existe. Sem esta
   * recusa, `protese` no objetivo devolvia 200 e um laudo NORMAL — o achado
   * sumia sem erro nem aviso.
   */
  const foraDoEstilo = renderizarSelecao("MAMARIA", "OBJETIVO", [
    alteracoesDe("MAMARIA").find((x) => x.id === "protese")!,
  ]);
  t("alteração fora do estilo é recusada", foraDoEstilo.ok === false);
  t("…nomeando o estilo",
    !foraDoEstilo.ok && "conflitos" in foraDoEstilo &&
      foraDoEstilo.conflitos.some((x) => /OBJETIVO/.test(x.motivo)));
  const r = renderizarSelecao(CAT, "CLASSICO_COMPLETO", [de("volume_aumentado"), de("volume_reduzido")]);
  t("volume aumentado + reduzido é recusado", r.ok === false);
  // Sem a trava, o merge raso deixaria só o último — e o médico veria o laudo
  // sem o achado que clicou.
  t("presets de lobos diferentes NÃO conflitam entre si",
    conflitosEntre([de("nodulo_solido_suspeito"), de("nodulo_lobo_esquerdo")]).length === 0);
}

console.log("6 · nenhuma seleção volta ao normal por acidente\n");
{
  const normal = laudoPadraoDe(CAT, "CLASSICO_COMPLETO")!;
  for (const s of specs) {
    const r = renderizarSelecao(CAT, "CLASSICO_COMPLETO", [s]);
    if (r.ok) t(`${s.id}: o laudo difere do normal`, r.texto !== normal);
  }
  const vazia = renderizarSelecao(CAT, "CLASSICO_COMPLETO", []);
  t("sem alteração nenhuma, sai o modelo normal", vazia.ok === true && vazia.texto === normal);
}

console.log("7 · o desenho GENERALIZA — vale para toda categoria curada\n");
{
  const cats = categoriasComAlteracoes();
  t("há mais de uma categoria curada", cats.length >= 2, cats.join(", "));
  for (const cat of cats) {
    const lista = alteracoesDe(cat);
    t(`${cat}: tem cenários`, lista.length > 0);
    // Ids repetidos fariam a tela mandar um e o servidor aplicar outro.
    t(`${cat}: os ids são únicos`, new Set(lista.map((s) => s.id)).size === lista.length);
    for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"]) {
      for (const spec of lista) {
        // Um cenário pode valer só num estilo — e declara isso. O que não pode
        // é aparecer na lista e não fazer nada ao ser clicado.
        if (spec.estilos && !spec.estilos.includes(estilo)) continue;
        const p = previaDaAlteracao(cat, estilo, spec);
        t(`${cat}/${estilo} · ${spec.id}: renderiza e muda o laudo`, p !== null);
      }
    }
    // A regra que vale em todas: nenhum cenário escreve texto clínico.
    t(`${cat}: nenhum cenário menciona classificação`,
      !JSON.stringify(lista).match(/TI-RADS|BI-RADS|NOTA FINAL|Categoria/i));
  }
}

console.log("8 · MAMÁRIA — outra classificação calculada, mesmo mecanismo\n");
{
  const m = (id: string) => alteracoesDe("MAMARIA").find((s) => s.id === id)!;
  const suspeito = previaDaAlteracao("MAMARIA", "CLASSICO_COMPLETO", m("nodulo_solido_suspeito"))!;
  const benigno = previaDaAlteracao("MAMARIA", "CLASSICO_COMPLETO", m("nodulo_solido_benigno"))!;
  const cSus = suspeito.entram.join(" ");
  const cBen = benigno.entram.join(" ");
  t("o suspeito recebe BI-RADS alto", /BI-RADS® [45]/.test(cSus), cSus.slice(0, 120));
  t("o benigno recebe BI-RADS baixo", /BI-RADS® [123]/.test(cBen), cBen.slice(0, 120));
  t("as categorias são diferentes",
    (cSus.match(/BI-RADS® \d/)?.[0] ?? "a") !== (cBen.match(/BI-RADS® \d/)?.[0] ?? "b"));
  // A frase normal "não há sinais evidentes" precisa SAIR quando há achado —
  // é o mesmo princípio de não deixar normalidade encobrir patologia.
  t("a frase de normalidade sai quando há nódulo",
    suspeito.saem.some((l) => /Não há sinais evidentes/.test(l)), suspeito.saem.join(" | "));
}

console.log("9 · o cenário difere do normal SÓ naquilo de que ele trata\n");
{
  /**
   * A armadilha que a pelve revelou: cravei [3,0 × 2,0 × 1,8] no ovário para
   * ilustrar, e 5,7 ml fica abaixo do limiar de 6 — cada cenário de ovário saía
   * com um "volume reduzido" que ninguém pediu. Um achado clínico inventado por
   * um número escolhido de enfeite.
   *
   * A regra: se o cenário não é SOBRE aquele dado, ele não o menciona.
   */
  const proibidas = /volume reduzido|volume aumentado|de volume alterado/i;
  for (const cat of categoriasComAlteracoes()) {
    for (const spec of alteracoesDe(cat)) {
      if (/volume|bocio|hipotrof/i.test(spec.id)) continue; // estes SÃO sobre volume
      const p = previaDaAlteracao(cat, "CLASSICO_COMPLETO", spec);
      if (!p) continue;
      const achou = p.entram.find((l) => proibidas.test(l));
      t(`${cat} · ${spec.id}: não inventa alteração de volume`, achou === undefined, achou);
    }
  }
}

console.log("\n10 · o que se DIGITA não pode apagar o achado do cenário\n");
{
  /**
   * A regressão do defeito mais perigoso de 20/08.
   *
   * O merge era raso: `dados.lobo_direito` substituía o objeto inteiro do
   * cenário e levava junto o achado que morava nele. O médico clicava
   * "Tireoidite crônica", digitava as medidas dos lobos, e o laudo saía
   * afirmando "sem evidência de alteração ecotextural" — o contrário do que ele
   * marcou, em silêncio.
   *
   * Merge fundo sozinho não bastava: um `null` explícito apaga com toda a razão
   * sintática. Por isso a conferência é no RESULTADO — o que o cenário afirma
   * tem de continuar de pé, ou é 409 com o caminho nomeado.
   */
  const hashimoto = alteracoesDe("TIREOIDE").find((x) => x.id === "alteracao_difusa")!;

  /**
   * Spec SINTÉTICO, não o preset de verdade.
   *
   * O guard de array precisa de um cenário que AFIRME uma lista, e o preset de
   * nódulo serviria — mas passá-lo a `renderizarSelecao` normalizaria no teste
   * um uso que a API recusa (`kind: "preset"` não vai em `alteracoes[]`).
   * Um teste não deve ensinar o caminho errado. (Codex, 20/08.)
   */
  const nodulo = {
    id: "__sintetico_nodulo",
    nome: "cenário de teste: um nódulo afirmado",
    kind: "alteracao" as const,
    seed: {
      lobo_direito: {
        nodulos: [{
          ecogenicidade: "hipoecoica", margem: "irregular", halo: "sem_halo",
          forma: "mais_alta_que_larga", calcificacoes: "micro", vascularizacao: "exclusiva_central",
          medidas_cm: null, diametro_transverso_cm: null, localizacao: null,
          descricao_raw: null, nota_domingos_ditada: null, ti_rads_ditado: null,
        }],
      },
    },
  };

  const apagaFolha = renderizarSelecao("TIREOIDE", "CLASSICO_COMPLETO", [hashimoto], {
    lobo_direito: { ecotextura_alterada: null },
  });
  t("apagar a tireoidite é recusado", !apagaFolha.ok);
  t("…nomeando o caminho",
    !apagaFolha.ok && "conflitos" in apagaFolha &&
      apagaFolha.conflitos.some((c) => c.motivo.includes("lobo_direito.ecotextura_alterada")));

  const apagaArray = renderizarSelecao("TIREOIDE", "CLASSICO_COMPLETO", [nodulo], {
    lobo_direito: { nodulos: [] },
  });
  t("apagar o nódulo do cenário é recusado", !apagaArray.ok);
  t("…nomeando o array",
    !apagaArray.ok && "conflitos" in apagaArray &&
      apagaArray.conflitos.some((c) => c.motivo.includes("lobo_direito.nodulos")));

  const convive = renderizarSelecao("TIREOIDE", "CLASSICO_COMPLETO", [hashimoto], {
    lobo_direito: { medidas_cm: [5.2, 1.7, 1.6], volume_ml: 7.1 },
  });
  t("mas MEDIR o lobo continua valendo", convive.ok);
  t("…com a alteração difusa de pé", convive.ok && convive.texto.includes("difusamente heterogênea"));
  t("…e a medida digitada no lugar", convive.ok && convive.texto.includes("5,2"));

  /**
   * O merge preserva os dois achados ao mesmo tempo — a prova que o gate de
   * migração da tela NÃO consegue dar, porque lá o nódulo é bloqueado antes
   * pela incompatibilidade de escala (D2). (Codex, 20/08.)
   */
  const juntos = renderizarSelecao("TIREOIDE", "CLASSICO_COMPLETO", [hashimoto], {
    lobo_direito: {
      medidas_cm: [5.2, 1.7, 1.6], volume_ml: 7.1,
      nodulos: [{
        ecogenicidade: "hipoecoica", margem: "irregular", halo: "sem_halo",
        forma: "mais_alta_que_larga", calcificacoes: "micro", vascularizacao: "exclusiva_central",
        medidas_cm: [1.3, 1.0, 1.2], diametro_transverso_cm: null, localizacao: null,
        descricao_raw: null, nota_domingos_ditada: null, ti_rads_ditado: null,
      }],
    },
  });
  t("tireoidite E nódulo convivem", juntos.ok);
  t("…com a alteração difusa", juntos.ok && juntos.texto.includes("difusamente heterogênea"));
  t("…com o nódulo", juntos.ok && juntos.texto.includes("hipoecoica"));
  t("…e a classificação calculada", juntos.ok && /TI-RADS \d/.test(juntos.texto));
}

console.log("\n11 · chave de protótipo não contamina o achado\n");
{
  /**
   * O que este teste prova, e o que ele NÃO prova.
   *
   * `Object.prototype` **não** é poluído globalmente, com ou sem guard: o
   * `mesclarFundo` é não-mutante (`{ ...base }`), então nunca escreve dentro do
   * protótipo compartilhado. O ataque clássico não aterrissa aqui, e um teste
   * que afirmasse o contrário passaria por vacuidade — foi o que aconteceu com
   * a primeira versão deste teste, que o Codex derrubou duas vezes: primeiro
   * por usar literal JavaScript (`{ __proto__: … }` define o protótipo em vez
   * de criar chave própria, e o `JSON.stringify` a descarta), depois por
   * medir a variável errada.
   *
   * O que ACONTECE de verdade sem o guard é contaminação por requisição: o
   * objeto de achados sai com o protótipo trocado, e um campo que o médico
   * nunca informou passa a ser LEGÍVEL nele por herança. Qualquer
   * `if (findings.x)` a jusante lê valor de terceiro. É isso que se afirma
   * abaixo — e desligar o guard faz falhar.
   */
  const patch = JSON.parse('{"__proto__":{"poluido":"sim"},"constructor":{"poluido":"sim"}}');
  const out = mesclarFundo({ a: 1 }, patch);

  t("o protótipo do achado continua sendo o de Object", Object.getPrototypeOf(out) === Object.prototype);
  t("nenhum campo herdado do atacante é legível",
    (out as Record<string, unknown>).poluido === undefined,
    String((out as Record<string, unknown>).poluido));
  t("`constructor` não vira campo do achado", !Object.keys(out).includes("constructor"), Object.keys(out).join(","));
  t("e o que era para ser mesclado foi mesclado", (out as Record<string, unknown>).a === 1);
}

const t_ = t;
console.log("\n12 · a ALTERAÇÃO DIFUSA conclui com a frase do MÉDICO\n");
{
  /**
   * D1, ancorado no corpus. Em 251 laudos reais dele
   * (`_extraction/.../tireoide_30d.md`), 62 conclusões de alteração difusa: 48
   * são exatamente "Sinais ecográficos de tireoidopatia." e as outras são
   * pontuação e variantes dela. ZERO nomeiam etiologia.
   *
   * Antes desta correção o clássico OMITIA a difusa da conclusão — um
   * Hashimoto saía com "Tireoide de volume normal" e nada mais — e o objetivo
   * escrevia "Tireoidopatia difusa (…, compatível com tireoidite crônica)",
   * afirmando uma etiologia que ele nunca afirma. O golden do objetivo passava
   * nos dois estados: não asserta essa linha. Este bloco asserta.
   */
  const difusa = { ecotextura_alterada: "difusamente heterogênea" };
  const lobo = { medidas_cm: [5.2, 1.7, 1.6], volume_ml: 7.1 };
  const istmo = { medidas_cm: [1.5, 0.9, 0.8], volume_ml: 1.2 };
  const base = { lobo_direito: { ...lobo, ...difusa }, lobo_esquerdo: { ...lobo, ...difusa }, istmo };

  for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"]) {
    const t = laudoPadraoDe(CAT, estilo, base)!;
    t_(`${estilo}: conclui com a frase do corpus`, t.includes("Sinais ecográficos de tireoidopatia."));
    t_(`${estilo}: NÃO nomeia etiologia`,
      !/hashimoto|quervain|riedel|linfoc[ií]tic|autoimune|anti-?TPO|tireoidite/i.test(t),
      t.split("\n").find((l) => /tireoid/i.test(l) && /crônic|compat/i.test(l))?.slice(0, 120));

    const comBocio = laudoPadraoDe(CAT, estilo, { ...base, volume_glandular: "aumentado" })!;
    t_(`${estilo}: com bócio usa a variante do corpus`,
      comBocio.includes("Sinais ecográficos de tireoidopatia (bócio tireoideano)."));
    t_(`${estilo}: …sem repetir o bócio em outro item`,
      (comBocio.match(/[Bb][óo]cio/g) ?? []).length === 1,
      String((comBocio.match(/[Bb][óo]cio/g) ?? []).length));
  }

  /**
   * A ORDEM: nos 12 laudos do corpus com tireoidopatia E conclusão nodular, a
   * tireoidopatia vem antes da imagem nodular em 12/12.
   */
  const comNodulo = laudoPadraoDe(CAT, "CLASSICO_COMPLETO", {
    ...base,
    lobo_direito: { ...lobo, ...difusa, nodulos: [{
      ecogenicidade: "hipoecoica", margem: "irregular", halo: "sem_halo", forma: "mais_alta_que_larga",
      calcificacoes: "micro", vascularizacao: "exclusiva_central", medidas_cm: [1.8, 1.2, 1.4],
      diametro_transverso_cm: null, localizacao: null, descricao_raw: null,
      nota_domingos_ditada: null, ti_rads_ditado: null,
    }] },
  })!;
  const iDifusa = comNodulo.indexOf("Sinais ecográficos de tireoidopatia");
  const iNodulo = comNodulo.indexOf("Lobo direito apresentando");
  t_("a tireoidopatia vem ANTES do item nodular", iDifusa > 0 && iNodulo > iDifusa, `${iDifusa} < ${iNodulo}`);

  /**
   * O que NÃO se infere. "esboços nodulares" no corpus significa que NÃO se
   * delimitam lesões focais; ler `nodulos.length > 0` para escrevê-lo
   * inverteria o significado. E "crônica" não é predito por nenhum achado
   * estruturado — depende de história, que não está aqui.
   */
  t_("não inventa \"esboços nodulares\"", !/esbo[çc]os nodulares/i.test(comNodulo));
  t_("não inventa \"crônica\"", !/tireoidopatia cr[ôo]nica/i.test(comNodulo));
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — o cenário é escrito, a frase é do renderer`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
