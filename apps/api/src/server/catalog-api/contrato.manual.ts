/**
 * O CONTRATO que a web vai consumir — as duas rotas do catálogo.
 *
 * Exercita os handlers diretamente, sem subir servidor: o que se afirma é o
 * contrato (status, forma da resposta, recusas), não o transporte.
 *
 *   pnpm exec tsx --env-file=../../.env src/server/catalog-api/contrato.manual.ts
 */
import { GET } from "@/app/api/catalog/[category]/route";
import { POST } from "@/app/api/catalog/[category]/render/route";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, cond: boolean, extra = "") => {
  if (cond) ok++;
  else falhas.push(`${nome}${extra ? `\n        ${extra}` : ""}`);
};

const TOKEN = "token-de-teste-com-tamanho-suficiente-1234";
const params = (category: string) => ({ params: Promise.resolve({ category }) });
const get = (cat: string, qs = "", token: string | null = TOKEN) =>
  GET(new Request(`https://x/api/catalog/${cat}${qs}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }), params(cat));
const post = (cat: string, body: unknown, token: string | null = TOKEN) =>
  POST(new Request(`https://x/api/catalog/${cat}/render`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }), params(cat));

/**
 * O mesmo POST, com o corpo em STRING crua.
 *
 * Existe por causa do bloco 11: `JSON.stringify({ __proto__: … })` não emite a
 * chave, porque num literal JavaScript `__proto__` define o protótipo em vez de
 * criar propriedade própria. Sem enviar a string à mão, o teste de poluição de
 * protótipo nunca envia nada e passa por vacuidade.
 */
const postCru = (cat: string, corpo: string, token: string | null = TOKEN) =>
  POST(new Request(`https://x/api/catalog/${cat}/render`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo,
  }), params(cat));

async function main() {
  console.log("\n1 · FAIL-CLOSED: sem token configurado, ninguém entra\n");
  delete process.env.CATALOG_SERVICE_TOKEN;
  t("sem CATALOG_SERVICE_TOKEN, GET dá 503", (await get("TIREOIDE")).status === 503);
  t("sem CATALOG_SERVICE_TOKEN, POST dá 503", (await post("TIREOIDE", {})).status === 503);
  // Um segredo curto é tão ruim quanto nenhum — e é o que aparece quando
  // alguém "preenche pra destravar".
  process.env.CATALOG_SERVICE_TOKEN = "curto";
  t("segredo curto é recusado como não configurado", (await get("TIREOIDE")).status === 503);

  process.env.CATALOG_SERVICE_TOKEN = TOKEN;

  console.log("2 · a porta\n");
  t("sem Authorization dá 401", (await get("TIREOIDE", "", null)).status === 401);
  t("token errado dá 401", (await get("TIREOIDE", "", "outro-token-qualquer-com-tamanho")).status === 401);
  t("token de tamanho igual e conteúdo errado dá 401",
    (await get("TIREOIDE", "", "X".repeat(TOKEN.length))).status === 401);
  t("token certo entra", (await get("TIREOIDE")).status === 200);

  console.log("3 · o catálogo que a web recebe\n");
  {
    const r = await get("TIREOIDE");
    const j = await r.json();
    t("traz o modelo padrão", typeof j.modelo_padrao === "string" && j.modelo_padrao.length > 50);
    t("…com os dados como lacuna", j.modelo_padrao.includes("____"));
    t("traz a projeção do catálogo", Array.isArray(j.catalogo?.slots) && j.catalogo.slots.length > 0);
    t("traz as alterações", Array.isArray(j.alteracoes) && j.alteracoes.length >= 8, `${j.alteracoes?.length}`);
    t("cada alteração diz o que entra e o que sai",
      j.alteracoes.every((a: { entram: string[]; saem: string[]; nome: string }) =>
        a.nome && Array.isArray(a.entram) && Array.isArray(a.saem)));
    t("traz id e versão do catálogo", Boolean(j.catalog_id) && typeof j.versao === "number");
    // Nada de usuário atravessa esta rota — é o que a torna segura sem identidade.
    t("nenhum dado de usuário na resposta",
      !JSON.stringify(j).match(/user_id|email|"cpf"|paciente/i));
  }

  console.log("4 · o estilo é primeira classe\n");
  {
    const c = await (await get("TIREOIDE", "?estilo=CLASSICO_COMPLETO")).json();
    const o = await (await get("TIREOIDE", "?estilo=OBJETIVO")).json();
    t("o objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO", /T[ÉE]CNICA:/.test(o.modelo_padrao));
    t("o clássico usa COMENTÁRIOS", /COMENT[ÁA]RIOS:/.test(c.modelo_padrao));
    t("os dois modelos são diferentes", c.modelo_padrao !== o.modelo_padrao);
    t("as alterações valem nos dois estilos", o.alteracoes.length === c.alteracoes.length);
    t("estilo inventado dá 400", (await get("TIREOIDE", "?estilo=INVENTADO")).status === 400);
  }
  t("categoria sem modelo dá 404", (await get("NAO_EXISTE")).status === 404);

  console.log("5 · o laudo é montado pelo RENDERER\n");
  {
    const vazio = await (await post("TIREOIDE", { alteracoes: [] })).json();
    t("sem alteração, sai o modelo normal", vazio.laudo.includes("ecotextura normais"));

    /**
     * O nódulo entra por `dados` — ele é PRESET, não alteração clicável (bloco
     * 12). A combinação que interessa aqui continua sendo a mesma: um achado
     * nodular convivendo com um achado de linfonodo, e a CLASSIFICAÇÃO saindo
     * do renderer.
     */
    const r = await post("TIREOIDE", {
      alteracoes: ["linfonodos_alterados"],
      dados: {
        lobo_direito: {
          nodulos: [{
            ecogenicidade: "hipoecoica", margem: "irregular", halo: "sem_halo",
            forma: "mais_alta_que_larga", calcificacoes: "micro", vascularizacao: "exclusiva_central",
            medidas_cm: [1.3, 1.0, 1.2], diametro_transverso_cm: null,
            localizacao: null, descricao_raw: null,
            nota_domingos_ditada: null, ti_rads_ditado: null,
          }],
        },
      },
    });
    t("a combinação renderiza", r.status === 200, `${r.status}`);
    const j = await r.json();
    t("o nódulo entrou", /hipoecoica/.test(j.laudo));
    t("os linfonodos entraram", /Linfonodos cervicais/.test(j.laudo));
    // A prova do desenho: a CLASSIFICAÇÃO não veio da tela nem do payload.
    t("o renderer classificou sozinho", /TI-RADS \d/.test(j.laudo), j.laudo.slice(-200));
    t("…e numerou a conclusão", /(^|\n)\s*[23][.)]/.test(j.laudo.split(/CONCLUS[ÃA]O:/)[1] ?? ""));
  }

  console.log("6 · o DADO DO MÉDICO é o laudo — e ele é o DONO da lista\n");
  {
    /**
     * O nódulo entra pela LISTA ABERTA em `dados`, sem id de alteração.
     *
     * Este bloco já cobrou o contrário — preset selecionado E `dados`
     * sobrescrevendo o nódulo dele — e isso mudou de propósito em 20/08. O
     * preset é modelo de preenchimento: a tela lê os eixos dele e manda a lista
     * completa. Ter dois donos da mesma lista foi o que permitiu apagar o
     * achado selecionado sem ninguém notar (ver o bloco 8).
     */
    const r = await post("TIREOIDE", {
      dados: {
        lobo_direito: {
          medidas_cm: [5.1, 1.7, 1.6], volume_ml: 7.2,
          nodulos: [{
            ecogenicidade: "hipoecoica", margem: "irregular", halo: "sem_halo",
            forma: "mais_alta_que_larga", calcificacoes: "micro", vascularizacao: "exclusiva_central",
            medidas_cm: [1.8, 1.4, 1.6], diametro_transverso_cm: null,
            localizacao: "no terço inferior", descricao_raw: null,
            nota_domingos_ditada: null, ti_rads_ditado: null,
          }],
        },
      },
    });
    t("renderiza com o dado digitado", r.status === 200, `${r.status}`);
    const j = await r.json();
    t("a MEDIDA dele aparece no laudo", /1,8/.test(j.laudo ?? ""), (j.laudo ?? "").split("\n").find((l: string) => /hipoecoica/.test(l))?.slice(0, 120));
    const linhaDele = (j.laudo ?? "").split("\n").find((l: string) => /Lobo direito/.test(l)) ?? "";
    t("…e a linha dele não tem lacuna", !/____/.test(linhaDele), linhaDele.slice(0, 120));
    t("o que ele NÃO mediu segue como lacuna", /Lobo esquerdo medindo ____/.test(j.laudo ?? ""));
    t("a LOCALIZAÇÃO dele está no laudo", /terço inferior/.test(j.laudo ?? ""));
    t("a CLASSIFICAÇÃO é calculada pelo renderer", /NOTA FINAL|TI-RADS/.test(j.laudo ?? ""),
      (j.laudo ?? "").split("\n").find((l: string) => /TI-RADS/.test(l))?.slice(0, 140));
  }

  console.log("\n8 · o cenário não pode ser APAGADO pelo que se digita\n");
  {
    /**
     * A regressão do defeito mais perigoso do dia (Codex, 20/08).
     *
     * Selecionar "nódulo suspeito" e mandar `nodulos: []` devolvia 200 e um
     * laudo concluindo "sem evidência de imagem nodular" — o médico clicava um
     * achado e recebia o laudo que o nega. Idem para a tireoidite apagada por
     * um `ecotextura_alterada: null` vindo da tela.
     */
    /**
     * Proteção em CAMADAS. O caminho pelo preset nem chega ao guard — ele é
     * recusado antes, por não ser alteração clicável (bloco 12). O guard do
     * array continua provado em `alteracoes.manual.ts`, chamando
     * `renderizarSelecao` direto; aqui o que se prova é que a porta anterior
     * já está fechada.
     */
    const apagaNodulo = await post("TIREOIDE", {
      alteracoes: ["nodulo_solido_suspeito"],
      dados: { lobo_direito: { nodulos: [] } },
    });
    t("nem chega ao guard — o preset é barrado antes", apagaNodulo.status === 400, `${apagaNodulo.status}`);

    const apagaTireoidite = await post("TIREOIDE", {
      alteracoes: ["tireoidite_cronica"],
      dados: { lobo_direito: { ecotextura_alterada: null } },
    });
    t("apagar a tireoidite é RECUSADO", apagaTireoidite.status === 409, `${apagaTireoidite.status}`);

    const convivem = await post("TIREOIDE", {
      alteracoes: ["tireoidite_cronica"],
      dados: { lobo_direito: { medidas_cm: [5.2, 1.7, 1.6], volume_ml: 7.1 } },
    });
    t("…mas MEDIR o lobo continua valendo", convivem.status === 200, `${convivem.status}`);
    const jc = await convivem.json();
    t("…com a tireoidite de pé", /micronodula/.test(jc.laudo ?? ""));
    t("…e a medida digitada no lugar", /5,2/.test(jc.laudo ?? ""));
  }

  console.log("\n9 · o CONTRATO DA TELA chega à tela\n");
  {
    /**
     * As `lacunas` diziam ao servidor o que podia ser sobrescrito e não diziam
     * à tela o que perguntar — a declaração existia e não chegava a quem
     * deveria usá-la.
     */
    const r = await get("TIREOIDE");
    const j = await r.json();
    const linf = (j.alteracoes ?? []).find((a: { id: string }) => a.id === "linfonodos_alterados");
    t("a prévia traz o campo `lacunas`", Array.isArray(linf?.lacunas), JSON.stringify(linf?.lacunas));
    t("…com rótulo e tipo", (linf?.lacunas ?? []).every((l: { rotulo: string; tipo: string }) => !!l.rotulo && !!l.tipo));
  }

  console.log("\n11 · chave de protótipo não atravessa o merge\n");
  {
    /**
     * `mesclarFundo` é recursivo e o patch vem de corpo de request. Um
     * `__proto__` aceito polui o protótipo de Object e afeta o processo
     * inteiro, não só este laudo — e acontece ANTES do Zod, que valida o objeto
     * já montado. (Codex, 20/08.)
     */
    /**
     * JSON CRU, não literal JavaScript.
     *
     * `{ __proto__: {...} }` num literal DEFINE o protótipo do objeto; não cria
     * propriedade própria, e o `JSON.stringify` a descarta antes de sair. O
     * teste passaria sem nunca ter enviado a chave. (Codex, 20/08 — o teste que
     * eu escrevi era vazio.) Só `JSON.parse` de uma string produz `__proto__`
     * como chave de verdade.
     */
    const antes = ({} as Record<string, unknown>).poluido;
    const r = await postCru(
      "TIREOIDE",
      '{"dados":{"__proto__":{"poluido":"sim"},"lobo_direito":{"__proto__":{"poluido":"sim"},"constructor":{"poluido":"sim"}}}}',
    );
    /**
     * Pela ROTA só dá para provar que a requisição não derruba nada — a
     * contaminação real é no objeto de achados, e ela é afirmada no bloco 11 de
     * `alteracoes.manual.ts`, que chama `mesclarFundo` direto e REPROVA quando
     * o guard é desligado. Um teste de segurança que não sabe falhar não é
     * teste, e este aqui não saberia.
     */
    t("a requisição com chave de protótipo não derruba a rota",
      r.status === 200 || r.status === 400 || r.status === 409, `${r.status}`);
    void antes;
  }

  console.log("\n12 · PRESET não é alteração clicável\n");
  {
    /**
     * Os presets de nódulo vivem em `lobo_direito` e os nomes não dizem
     * "direito": aceitá-los em `alteracoes[]` punha um nódulo à direita sem o
     * médico ter escolhido o lobo.
     */
    const r = await post("TIREOIDE", { alteracoes: ["nodulo_solido_suspeito"] });
    t("preset em `alteracoes[]` é RECUSADO", r.status === 400, `${r.status}`);
    const j = await r.json();
    t("…dizendo como usar", typeof j.comoUsar === "string", String(j.comoUsar).slice(0, 80));

    const g = await get("TIREOIDE");
    const jg = await g.json();
    const preset = (jg.alteracoes ?? []).find((a: { id: string }) => a.id === "nodulo_solido_suspeito");
    t("o GET marca o preset", preset?.kind === "preset", String(preset?.kind));
    t("…e entrega o TEMPLATE para a tela preencher", !!preset?.template, JSON.stringify(preset?.template)?.slice(0, 110));
    /**
     * DESEMBRULHADO: o template descreve o achado, não onde ele mora. Vir como
     * `{ lobo_direito: { nodulos: [...] } }` obrigaria a tela a herdar o lobo
     * que o cenário escolheu — a mesma confusão que fez o preset poder pôr um
     * nódulo à direita sem o médico decidir.
     */
    t("…com o ITEM, não o lobo em volta",
      preset?.template?.ecogenicidade === "hipoecoica" && !("lobo_direito" in (preset?.template ?? {})),
      Object.keys(preset?.template ?? {}).join(","));
    const alt = (jg.alteracoes ?? []).find((a: { id: string }) => a.id === "tireoidite_cronica");
    t("a alteração de verdade continua clicável", alt?.kind === "alteracao", String(alt?.kind));
  }

  console.log("\n13 · os EIXOS do nódulo chegam à tela\n");
  {
    /**
     * O contrato que destrava o D2. A tela classificava por conta própria
     * porque não tinha os enums do renderer; com eles, ela oferece os seis
     * eixos e o `/render` calcula.
     */
    const j = await (await get("TIREOIDE")).json();
    const eixos = j.eixos?.nodulo ?? [];
    t("o GET publica os eixos do nódulo", eixos.length === 6, `${eixos.length}`);
    const eco = eixos.find((e: { campo: string }) => e.campo === "ecogenicidade");
    t("a ecogenicidade é obrigatória", eco?.obrigatorio === true);
    t("…e traz os 9 valores do renderer", eco?.opcoes?.length === 9, `${eco?.opcoes?.length}`);
    t("…com rótulo legível", eco?.opcoes?.[0]?.rotulo?.includes("anecoica"), eco?.opcoes?.[0]?.rotulo);
    /**
     * Os PONTOS não saem. Publicá-los convidaria o navegador a antecipar o
     * escore — a segunda autoridade que este desenho existe para evitar.
     */
    t("os PONTOS não são publicados", !JSON.stringify(eixos).includes("pts"));

    const usandoOsEixos = await post("TIREOIDE", {
      dados: {
        lobo_direito: {
          nodulos: [{
            ecogenicidade: eco.opcoes.find((o: { valor: string }) => o.valor === "hipoecoica").valor,
            margem: "irregular", halo: "sem_halo", forma: "mais_alta_que_larga",
            calcificacoes: "micro", vascularizacao: "exclusiva_central",
            medidas_cm: [1.8, 1.2, 1.4], diametro_transverso_cm: null, localizacao: null,
            descricao_raw: null, nota_domingos_ditada: null, ti_rads_ditado: null,
          }],
        },
      },
    });
    t("um nódulo montado com os eixos publicados renderiza", usandoOsEixos.status === 200, `${usandoOsEixos.status}`);
    const ju = await usandoOsEixos.json();
    t("…e o RENDERER classifica", /TI-RADS \d/.test(ju.laudo ?? ""),
      (ju.laudo ?? "").split("\n").find((l: string) => /TI-RADS/.test(l))?.slice(0, 130));
  }

  console.log("\n14 · alteração que não existe no estilo é RECUSADA\n");
  {
    /**
     * O defeito falhava do pior jeito: `protese` vale só no clássico, e
     * selecioná-la no objetivo devolvia **200 e um laudo normal**. O achado
     * sumia sem erro, sem aviso e sem rastro — o médico via um laudo plausível,
     * sem a prótese que marcou. (Codex, 20/08.)
     */
    const r = await post("MAMARIA", { estilo: "OBJETIVO", alteracoes: ["protese"] });
    t("prótese no estilo objetivo é recusada", r.status === 400, `${r.status}`);
    const j = await r.json();
    t("…nomeando o estilo", /OBJETIVO/.test(JSON.stringify(j.conflitos ?? j)), JSON.stringify(j.conflitos ?? j).slice(0, 140));

    const ok = await post("MAMARIA", { estilo: "CLASSICO_COMPLETO", alteracoes: ["protese"] });
    t("…e no clássico continua valendo", ok.status === 200, `${ok.status}`);
    const jo = await ok.json();
    t("…com a prótese no laudo", /pr[óo]tese/i.test(jo.laudo ?? ""));
  }

  console.log("\n15 · linfonodos: os três estados, nos DOIS estilos\n");
  {
    /**
     * D4 como asserção automática, não como repro manual. O estado perigoso é
     * o do meio: alterado SEM descrição escrevia a frase de normalidade no
     * corpo e "alterado" na conclusão — o laudo se contradizia.
     */
    for (const estilo of ["CLASSICO_COMPLETO", "OBJETIVO"]) {
      const normal = await (await post("TIREOIDE", { estilo, dados: { linfonodos_descritos: true, linfonodos_alterados: false } })).json();
      t(`${estilo}: normal descrito não diz "alterado"`, !/aspecto alterado/i.test(normal.laudo ?? ""));

      const semDesc = await (await post("TIREOIDE", { estilo, alteracoes: ["linfonodos_alterados"] })).json();
      const txt = semDesc.laudo ?? "";
      t(`${estilo}: alterado sem descrição não escreve normalidade`,
        !/morfologia preservada|Não há evidência de linfonodomegalias/i.test(txt),
        txt.split("\n").find((l: string) => /linfonodo/i.test(l))?.slice(0, 110));
      t(`${estilo}: …e diz que está alterado`, /alterado/i.test(txt));

      const comDesc = await (await post("TIREOIDE", {
        estilo,
        alteracoes: ["linfonodos_alterados"],
        dados: { linfonodos_descricao: "Linfonodo cervical à direita com perda do hilo." },
      })).json();
      t(`${estilo}: a descrição do médico vence`, /perda do hilo/.test(comDesc.laudo ?? ""));
    }
  }

  console.log("\n16 · TODO preset entrega item limpo\n");
  {
    /**
     * A extração do item é heurística (`itemDoPreset`); um preset com forma
     * diferente cairia de volta no seed inteiro, e a tela herdaria o lobo.
     * Por isso a afirmação é sobre TODOS os presets, não sobre um.
     */
    const j = await (await get("TIREOIDE")).json();
    const presets = (j.alteracoes ?? []).filter((a: { kind: string }) => a.kind === "preset");
    t("há presets publicados", presets.length === 4, `${presets.length}`);
    for (const p of presets) {
      const chaves = Object.keys(p.template ?? {});
      t(`${p.id}: sem o órgão em volta`,
        !chaves.some((k) => /^lobo_|^istmo$|^achados$|^miomas$/.test(k)), chaves.join(","));
      const cru = JSON.stringify(p.template ?? {});
      t(`${p.id}: sem número, lado ou topografia`,
        !/\d/.test(cru) && !/"(direita|esquerda|bilateral)"/.test(cru) && !/ter[çc]o|quadrante|horas/.test(cru),
        cru.slice(0, 110));
    }
  }

  console.log("\n10 · o que não combina é recusado com o motivo\n");
  {
    const r = await post("TIREOIDE", { alteracoes: ["volume_aumentado", "volume_reduzido"] });
    t("combinação impossível dá 409", r.status === 409, `${r.status}`);
    const j = await r.json();
    t("…e diz quais conflitam", Array.isArray(j.conflitos) && j.conflitos.length === 1, JSON.stringify(j));
    t("…com motivo legível", /grupo|alteram/.test(j.conflitos?.[0]?.motivo ?? ""));

    const d = await post("TIREOIDE", { alteracoes: ["nao_existe"] });
    t("alteração inexistente dá 400", d.status === 400);
    t("…e nomeia a desconhecida", (await d.json()).desconhecidas?.[0] === "nao_existe");
  }

  const total = ok + falhas.length;
  console.log(`\n${"═".repeat(74)}`);
  if (falhas.length === 0) console.log(`✓ ${ok}/${total} — o contrato do catálogo está de pé`);
  else {
    console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
    for (const f of falhas) console.log(`  • ${f}`);
  }
  console.log(`${"═".repeat(74)}\n`);
  process.exit(falhas.length === 0 ? 0 : 1);
}

void main();
