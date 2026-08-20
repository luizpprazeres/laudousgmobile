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

    const r = await post("TIREOIDE", { alteracoes: ["nodulo_solido_suspeito", "linfonodos_alterados"] });
    t("a combinação renderiza", r.status === 200);
    const j = await r.json();
    t("o nódulo entrou", /hipoecoica/.test(j.laudo));
    t("os linfonodos entraram", /Linfonodos cervicais/.test(j.laudo));
    // A prova do desenho: a CLASSIFICAÇÃO não veio da tela nem do payload.
    t("o renderer classificou sozinho", /TI-RADS \d/.test(j.laudo), j.laudo.slice(-200));
    t("…e numerou a conclusão", /(^|\n)\s*[23][.)]/.test(j.laudo.split(/CONCLUS[ÃA]O:/)[1] ?? ""));
  }

  console.log("6 · o DADO DO MÉDICO vence o número do cenário\n");
  {
    // O clicar-e-montar da web só serve se o que ele mede aparece no laudo. Os
    // números do cenário existem para o renderer calcular, não para o médico ler.
    const r = await post("TIREOIDE", {
      alteracoes: ["nodulo_solido_suspeito"],
      dados: {
        lobo_direito: {
          medidas_cm: [5.1, 1.7, 1.6], volume_ml: 7.2, ecotextura_alterada: null,
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
    t("a MEDIDA dele aparece no laudo", /1,8/.test(j.laudo), j.laudo.split("\n").find((l: string) => /hipoecoica/.test(l))?.slice(0, 120));
    // A LINHA dele sai preenchida; o lobo esquerdo, que ele não mediu, segue
    // com lacuna — e isso é o certo. Afirmar "nenhuma lacuna no laudo" cobrava
    // que o modelo preenchesse o que ninguém mediu.
    const linhaDele = j.laudo.split("\n").find((l: string) => /Lobo direito/.test(l)) ?? "";
    t("…e a linha dele não tem lacuna", !/____/.test(linhaDele), linhaDele.slice(0, 120));
    t("o que ele NÃO mediu segue como lacuna",
      /Lobo esquerdo medindo ____/.test(j.laudo));
    t("a LOCALIZAÇÃO dele vence a do cenário",
      /terço inferior/.test(j.laudo) && !/terço superior/.test(j.laudo));
    // E a classificação continua sendo do renderer, agora sobre o dado real.
    t("o renderer classifica a partir do que ele mediu", /TI-RADS \d/.test(j.laudo),
      j.laudo.split(/CONCLUS[ÃA]O:/)[1]?.slice(0, 120));
  }

  console.log("7 · o que não combina é recusado com o motivo\n");
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
