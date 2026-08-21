/**
 * PELVE FEMININA — o gate da 2ª categoria da troca de motor.
 *
 * A categoria foi escolhida pelo USO REAL, não por palpite: 336 laudos em 90
 * dias, a maior entre as que já têm catálogo canônico (medido em 21/08).
 *
 * ## Por que este NÃO é diferencial, e o que ficou no lugar
 *
 * O da tireoide comparava os dois motores lado a lado. Aqui isso não é possível
 * e é bom que não seja: `composeReport` passou a RECUSAR categoria migrada, no
 * mesmo trabalho — chamá-lo para a pelve estoura de propósito, para nenhum
 * caminho novo colher um laudo do motor aposentado sem perceber.
 *
 * Uma primeira versão deste arquivo importava `composeReport` e nunca o
 * chamava, com um cabeçalho afirmando que comparava dois caminhos. Passava
 * verde descrevendo algo que não fazia.
 *
 * O que prova a travessia, então, são duas coisas:
 *
 * 1. **Cobertura de CAMPO** (`camposCobertos`, abaixo): toda chave que a tela
 *    consegue produzir é LIDA pelo adaptador. É a prova que importa contra o
 *    pior modo de falha — o campo que o médico preenche e o adaptador ignora,
 *    sumindo do laudo sem erro nenhum. Um diff de texto não pegaria isso num
 *    caso que o autor do teste não pensou em escrever.
 * 2. **Casos clínicos** contra o canônico, com asserções positivas e negativas.
 *
 * ## Como se lê
 *
 * Divergência de TEXTO não é falha — o canônico ganha a redação, uma fonte só.
 * O que se procura é:
 *
 * - **B não renderiza** — o canônico recusa um caso que a web aceita.
 * - **B perde um ACHADO** — sai texto, sem o que o médico marcou. O pior modo,
 *   porque parece sucesso.
 * - **B AFIRMA o contrário** — a conclusão nega o achado.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/pelve-ponta-a-ponta.manual.ts
 */

import { renderizarSelecao } from "../alteracoes";
import { alteracoesDe } from "../alteracoes/index";
import { adaptarPelve } from "../../../../../../web/src/lib/catalog/pelveParaCatalogo";
import { pelveFeminina } from "../../../../../../web/src/lib/deterministic";
import { readFileSync } from "node:fs";

const ESTILO = "CLASSICO_COMPLETO";

type Caso = {
  nome: string;
  porque: string;
  estado: Record<string, unknown>;
  opcoes?: Record<string, string | string[]>;
  exige?: string[];
  exigeNaConclusao?: string[];
  proibe?: string[];
  proibeNaConclusao?: string[];
  pendente?: string;
};

/** O estado inicial de cada seção, como a tela o cria. */
function inicial(): Record<string, unknown> {
  const st: Record<string, unknown> = {};
  for (const s of pelveFeminina.sections) {
    if (s.module) st[s.id] = s.module.initialState();
  }
  return st;
}

/** O caso normal com útero e ovários medidos — a base de quase tudo. */
function medida(): Record<string, unknown> {
  const st = inicial();
  st.utero = { ...(st.utero as object), medidas: "7,8 x 4,2 x 4,8" };
  st.endometrio = { ...(st.endometrio as object), espessura: "0,7" };
  st.ovario_direito = { ...(st.ovario_direito as object), medidas: "3,1 x 2,0 x 1,8" };
  st.ovario_esquerdo = { ...(st.ovario_esquerdo as object), medidas: "2,9 x 1,9 x 1,7" };
  return st;
}

function com(base: Record<string, unknown>, secao: string, patch: Record<string, unknown>) {
  return { ...base, [secao]: { ...(base[secao] as object), ...patch } };
}

const CASOS: Caso[] = [
  {
    nome: "normal, útero e ovários medidos",
    porque: "o caso mais comum. Se este divergir em capacidade, não há piloto.",
    estado: medida(),
    exige: ["7,8", "3,1", "2,9"],
  },
  {
    nome: "menopausa (controle de categoria)",
    porque:
      "menopausa é controle de CATEGORIA e o módulo do endométrio tem a própria lista de frases. Confere que o controle do topo vence — senão a conclusão sai com a correlação de menacme.",
    estado: medida(),
    opcoes: { via: "ta_tv", menopausa: ["sim"] },
    proibeNaConclusao: ["menacme"],
  },
  {
    nome: "mioma individualizado",
    porque:
      "o mioma tem dados próprios (medidas, classificação, parede, FIGO) — é lista aberta em `dados`, não cenário fixo.",
    estado: com(medida(), "utero", {
      mioma: ["sim"],
      "mioma.sim.medidas": "2,4 x 2,1 x 1,9",
      "mioma.sim.classificacao": "intramural",
    }),
    exige: ["2,4"],
    /**
     * A asserção é sobre o MIOMÉTRIO, não sobre a conclusão inteira.
     *
     * A primeira versão proibia "normais" em qualquer lugar da conclusão e
     * reprovava por causa de "Ovários ecograficamente normais" — uma frase
     * correta, sobre outro órgão. Proibição ampla demais reprova o certo e
     * treina quem lê o gate a ignorá-lo.
     */
    exigeNaConclusao: ["Miométrio"],
  },
  {
    nome: "útero miomatoso (difuso)",
    porque: "nódulos não individualizáveis — campo booleano, não lista.",
    estado: com(medida(), "utero", { miomatoso: ["sim"] }),
    exigeNaConclusao: ["miomatoso"],
  },
  {
    nome: "adenomiose",
    porque:
      "É ALTERAÇÃO, não campo: o canônico precisa da FRASE que descreve o achado. Marcar `adenomiose: true` sozinho produziria um laudo que 'tem adenomiose' e não a menciona. Prova também que o adaptador não apaga `miometrio_descricao` do cenário.",
    estado: com(medida(), "utero", { adenomiose: ["sim"] }),
    exige: ["heterogênea"],
    exigeNaConclusao: ["denomiose"],
  },
  {
    nome: "cisto simples no ovário direito",
    porque: "achado focal com medida própria — lista aberta por ovário.",
    estado: com(medida(), "ovario_direito", {
      achado: "cisto_simples",
      "achado.cisto_simples.medidas": "3,2 x 2,8 x 2,6",
    }),
    exige: ["3,2"],
    proibeNaConclusao: ["ovários de dimensões normais"],
  },
  {
    nome: "endometrioma no ovário esquerdo",
    porque: "o tipo tem de sobreviver — 'endometrioma' não pode virar 'cisto'.",
    estado: com(medida(), "ovario_esquerdo", {
      achado: "endometrioma",
      "achado.endometrioma.medidas": "4,1 x 3,5 x 3,2",
    }),
    exige: ["4,1"],
  },
  {
    nome: "DIU",
    porque: "acessório com enum próprio no canônico.",
    estado: com(medida(), "endometrio", { diu: ["sim"] }),
    exige: ["DIU"],
  },
  {
    nome: "achado endometrial em texto livre",
    porque:
      "a tela tem campo verbatim; o canônico aceita em `endometrio_achado`. É dívida conhecida (redação clínica em campo livre) e o que o gate exige é só que o texto não SUMA.",
    estado: com(medida(), "endometrio", { achado: "Imagem ecogênica de 0,8 cm na cavidade." }),
    exige: ["0,8 cm"],
  },
  {
    nome: "só transvaginal",
    porque: "a via muda título e técnica; confere que a escolha atravessa.",
    estado: medida(),
    opcoes: { via: "tv" },
    proibe: ["transabdominal e transvaginal"],
  },
  {
    nome: "ovário direito não visualizado",
    porque:
      "o canônico tem `visualizado: false`. Se ele sair descrito como normal, o laudo afirma uma avaliação que não houve.",
    estado: com(medida(), "ovario_direito", { visualizado: "nao", medidas: "" }),
    proibe: ["Ovário direito medindo"],
  },
];

// ---------------------------------------------------------------------------

/**
 * TODA CHAVE DA TELA É LIDA PELO ADAPTADOR?
 *
 * O sistema genérico guarda o estado num `Record<string, unknown>`: nada aqui é
 * garantido pelo compilador. Um campo novo na tela, ou renomeado, não quebra o
 * build — ele simplesmente para de chegar ao laudo, em silêncio.
 *
 * Esta verificação lê as chaves declaradas nos módulos da pelve e confere que
 * cada uma aparece no adaptador. É grosseira de propósito: prefere acusar de
 * mais (uma chave que existe por outro motivo) a deixar passar de menos.
 */
function camposCobertos(): number {
  const tela = readFileSync(
    new URL("../../../../../../web/src/lib/deterministic/organs/pelveFeminina.ts", import.meta.url),
    "utf8",
  );
  const adaptador = readFileSync(
    new URL("../../../../../../web/src/lib/catalog/pelveParaCatalogo.ts", import.meta.url),
    "utf8",
  );
  const chaves = [...new Set([...tela.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]))];

  /**
   * `estado` (bexiga) e `via`/`menopausa` (controles) não passam pelo adaptador
   * como chave de seção: a via e a menopausa chegam por `opcoes`, e a bexiga o
   * canônico descreve sozinho. Declarados aqui para a ausência ser uma DECISÃO
   * registrada, não um esquecimento que o gate não viu.
   */
  const foraDePropósito: Record<string, string> = {
    via: "chega por `opcoes`, é controle de categoria",
    menopausa: "chega por `opcoes`, é controle de categoria",
    estado: "bexiga — o canônico a descreve sem campo da tela",
  };

  let faltando = 0;
  for (const k of chaves) {
    if (k in foraDePropósito) continue;
    /**
     * A chave conta como lida se aparece como PALAVRA no adaptador — entre
     * aspas (`texto(u, "posicao")`), como acesso de propriedade
     * (`s.visualizado`) ou como sufixo de uma chave achatada
     * (`"mioma.sim.classificacao"`). As três formas são usadas, e a primeira
     * versão desta verificação só procurava a primeira: acusou quatro campos
     * que o adaptador lia perfeitamente.
     *
     * Limite conhecido e aceito: uma chave de nome comum (`medidas`) conta como
     * lida por aparecer em qualquer lugar. Isto pega o campo ACRESCENTADO ou
     * RENOMEADO — que é o caso real — não o campo lido do objeto errado.
     */
    if (!new RegExp(`\\b${k}\\b`).test(adaptador)) {
      console.log(`  ✗ CAMPO ÓRFÃO: a tela tem "${k}" e o adaptador não o lê — sumiria do laudo em silêncio`);
      faltando++;
    }
  }
  console.log(
    faltando === 0
      ? `  ✓ ${chaves.length} campos da tela, todos lidos pelo adaptador (${Object.keys(foraDePropósito).length} fora de propósito, declarados)`
      : `  ✗ ${faltando} campo(s) órfão(s)`,
  );
  return faltando;
}

let falhas = 0;
let pendentes = 0;
const linhas = (t: string) => t.split("\n").filter((l) => l.trim() !== "");

console.log("═".repeat(74));
console.log("PELVE FEMININA — a travessia para o renderer canônico");
console.log("═".repeat(74));
console.log("\n▸ cobertura de campo");
falhas += camposCobertos();

for (const caso of CASOS) {
  console.log(`\n\n▸ ${caso.nome}`);
  console.log(`  ${caso.porque}`);

  const opcoes = caso.opcoes ?? { via: "ta_tv" };
  const { dados, alteracoes, pendencias } = adaptarPelve(caso.estado, opcoes);

  for (const p of pendencias) {
    console.log(`  ${p.bloqueia ? "⛔ BLOQUEIA" : "⚠ degrada"} — ${p.onde}: ${p.valor}`);
    console.log(`    ${p.motivo}`);
  }
  if (pendencias.some((p) => p.bloqueia)) {
    if (caso.pendente) pendentes += 1;
    else { falhas += 1; console.log("  ✗ bloqueado sem decisão registrada"); }
    continue;
  }

  const specs = alteracoes
    .map((id) => alteracoesDe("PELVE_FEMININA").find((s) => s.id === id))
    .filter((s) => s !== undefined);
  if (specs.length !== alteracoes.length) {
    console.log(`  ✗ alteração inexistente no catálogo: ${alteracoes.join(", ")}`);
    falhas += 1;
    continue;
  }

  const r = renderizarSelecao("PELVE_FEMININA", ESTILO, specs, dados as never);
  if (!r.ok) {
    const motivo = "conflitos" in r ? r.conflitos.map((c) => c.motivo).join(" · ") : r.erro;
    if (caso.pendente) { console.log(`  ⏸ NÃO RENDERIZA (previsto): ${motivo}`); pendentes += 1; }
    else { console.log(`  ✗ NÃO RENDERIZA: ${motivo}`); falhas += 1; }
    continue;
  }

  const b = r.texto;
  const registrar = (msg: string) => {
    if (caso.pendente) console.log(`  ⏸ perda confirmada — ${msg}`);
    else { console.log(`  ✗ ${msg}`); falhas += 1; }
  };

  for (const t of caso.exige ?? []) if (!b.includes(t)) registrar(`PERDEU: não contém "${t}"`);
  for (const t of caso.proibe ?? []) {
    if (b.toLowerCase().includes(t.toLowerCase())) registrar(`AFIRMA INDEVIDAMENTE: "${t}"`);
  }

  const conclusao = b.split(/CONCLUS[ÃA]O:\n/)[1]?.split("\n\n")[0] ?? "";
  for (const t of caso.exigeNaConclusao ?? []) {
    if (!conclusao.includes(t)) registrar(`PERDEU NA CONCLUSÃO: "${t}"`);
  }
  for (const t of caso.proibeNaConclusao ?? []) {
    if (conclusao.toLowerCase().includes(t.toLowerCase())) {
      registrar(`AFIRMA O CONTRÁRIO: a conclusão diz "${t}"`);
    }
  }

  if (caso.pendente) { console.log(`  ⏸ pendente: ${caso.pendente}`); pendentes += 1; }
  console.log(`  ✓ renderiza · ${linhas(b).length} linhas`);
  console.log(`  conclusão: ${conclusao.replace(/\n/g, " | ").slice(0, 200)}`);
}

console.log("\n\n" + "═".repeat(74));
console.log(falhas === 0 ? "✓ nenhum achado perdido nem invertido em silêncio" : `✗ ${falhas} falha(s)`);
console.log(`  ${pendentes} caso(s) o canônico ainda NÃO cobre — o médico os perderia hoje.`);
console.log("═".repeat(74));
process.exit(falhas ? 1 : 0);
