/**
 * TIREOIDE — a PROVA DIFERENCIAL do piloto: a web de hoje × o renderer canônico.
 *
 * Este gate existe para responder uma pergunta só, e responder antes de alguém
 * escrever tela: **o que o médico perde no dia em que a web parar de compor o
 * texto e passar a pedir o laudo ao `/render`?**
 *
 * O desenho é o do §3.2 de `docs/plano-web-workspace-2026-08-20.md`: um caso
 * clínico é escrito UMA vez, no estado da tela, e percorre os dois caminhos.
 *
 *   caso → composeTireoide(...)                        → texto A (a web de hoje)
 *   caso → adaptarTireoide(...) → renderizarSelecao(…) → texto B (o canônico)
 *
 * ## Como se lê o resultado
 *
 * Divergência de TEXTO não é falha — é o objetivo. O canônico ganha a redação,
 * sempre; uma fonte só. O que este gate procura é outra coisa:
 *
 * - **B não renderiza** — o caminho canônico recusa um caso que a web aceita.
 *   É bloqueador: o médico perde a capacidade de laudar aquilo.
 * - **B perde um ACHADO** — o texto sai, mas sem o que o médico marcou. É o
 *   pior modo de falhar, porque parece sucesso.
 * - **B AFIRMA o contrário** — a conclusão nega o achado, ou afirma um exame
 *   que não foi feito. É o modo que este gate mais persegue.
 *
 * Os casos vieram de duas leituras independentes do mesmo par de
 * implementações (Claude rodando, Codex lendo, 20/08) e são exatamente os que
 * quebravam quando foram escritos.
 *
 * ## ⚠️ Rode com as flags de PRODUÇÃO
 *
 * ```bash
 * TIREOIDE_PICO_OMIT=true pnpm exec tsx --env-file=../../.env \
 *   src/server/renderer/catalog/__tests__/tireoide-ponta-a-ponta.manual.ts
 * ```
 *
 * Sem elas a comparação é contra um renderer que produção nenhuma executa —
 * a mesma exigência que o `equivalencia-real` já faz. `TIREOIDE_PICO_OMIT` está
 * ligada em produção e decide se o Doppler com um pico só estampa "____ cm/s"
 * no lado que ninguém mediu.
 */

import { renderizarSelecao } from "../alteracoes";
import { alteracoesDe } from "../alteracoes/index";
import {
  composeTireoide,
  initialTireoideState,
  type NoduloTireoide,
  type TireoideState,
} from "../../../../../../web/src/lib/deterministic/organs/tireoide";
import { adaptarTireoide } from "../../../../../../web/src/lib/catalog/tireoideParaCatalogo";

const ESTILO = "CLASSICO_COMPLETO";

/**
 * O piloto é só no clássico, por decisão registrada.
 *
 * O estilo objetivo tem três impedimentos que não são deste piloto: o título
 * não identifica o Doppler, os TI-RADS `4a/4b/4c` ditados não vencem o cálculo,
 * e ele afirma "Não há evidência de linfonodomegalias" mesmo quando a cadeia
 * não foi avaliada — afirmar exame que não houve é pior que omitir.
 */

type Caso = {
  nome: string;
  /** Por que este caso está aqui — o que ele quebrava quando foi escrito. */
  porque: string;
  estado: TireoideState;
  /**
   * Termos que o laudo canônico TEM de conter. É aqui que "perdeu o achado"
   * vira falha em vez de virar diff bonito.
   */
  exige?: string[];
  /**
   * Termos que ele NÃO pode conter. Cobre o modo de falha mais perigoso: o
   * laudo que afirma o contrário do que o médico marcou.
   */
  proibe?: string[];
  /**
   * Termos que têm de estar **na CONCLUSÃO**, não em qualquer lugar do laudo.
   *
   * A distinção existe porque um achado no corpo e ausente da conclusão é uma
   * perda clínica real que `exige` não pega: o Hashimoto sai descrito no corpo
   * e a conclusão diz "Tireoide de volume normal" e mais nada. Quem lê só a
   * conclusão — que é como se lê laudo com pressa — não fica sabendo.
   * (Subcontagem apontada pelo Codex, 20/08.)
   */
  exigeNaConclusao?: string[];
  /**
   * Este caso ainda não passa, e sabemos por quê. Documentado em vez de
   * silenciado: um `esperado_falhar` sem motivo é um teste desligado.
   */
  pendente?: string;
};

function lobo(a: string, b: string, c: string) {
  return { a, b, c, ecotextura: "normal" as const };
}

function nodulo(over: Partial<NoduloTireoide>): NoduloTireoide {
  return {
    id: "n1",
    lobo: "lobo_direito",
    ecogenicidade: "isoecoica",
    margens: "regulares",
    dimensao: "1,2 x 0,9 x 0,8",
    notaDomingos: "3",
    tirads: "3",
    ...over,
  };
}

/** O estado normal com os três lobos medidos — a base de quase todo caso. */
function medido(): TireoideState {
  return {
    ...initialTireoideState(),
    lobo_direito: lobo("5,2", "1,7", "1,6"),
    lobo_esquerdo: lobo("4,9", "1,5", "1,4"),
    istmo: lobo("1,5", "0,9", "0,4"),
  };
}

const CASOS: Caso[] = [
  {
    nome: "normal, três lobos medidos",
    porque: "o caso mais comum. Se este divergir em capacidade, não há piloto.",
    estado: medido(),
    exige: ["Lobo direito", "Istmo", "CONCLUSÃO"],
  },
  {
    nome: "normal SEM nenhuma medida",
    porque:
      "a web escreve 'de dimensões habituais' e conclui sem volume; o canônico imprime lacunas. É decisão de produto, não bug — o gate registra o custo.",
    estado: initialTireoideState(),
  },
  {
    nome: "DOIS nódulos no mesmo lobo",
    porque:
      "os cenários fixos do catálogo são mutuamente exclusivos por grupo — não sabem representar isto. Prova que a lista aberta em `dados` é o caminho certo.",
    estado: {
      ...medido(),
      nodulos: [
        nodulo({ id: "a", ecogenicidade: "hipoecoica", margens: "irregulares", dimensao: "1,8 x 1,2 x 1,4", notaDomingos: "5", tirads: "4c" }),
        nodulo({ id: "b", ecogenicidade: "anecoica", margens: "regulares", dimensao: "0,6 x 0,5 x 0,4", notaDomingos: "1", tirads: "2" }),
      ],
    },
    pendente: "escalas de NOTA incompatíveis — o nódulo não migra até a tela ter os seis eixos (D2)",
  },
  {
    nome: "nódulos em lobos diferentes",
    porque: "a conclusão canônica agrupa por lobo; confere que nenhum some.",
    estado: {
      ...medido(),
      nodulos: [
        nodulo({ id: "a", dimensao: "1,4 x 1,1 x 1,0" }),
        nodulo({ id: "b", lobo: "lobo_esquerdo", dimensao: "0,9 x 0,7 x 0,6" }),
      ],
    },
    pendente: "idem — escalas de NOTA incompatíveis (D2)",
  },
  {
    nome: "Hashimoto + medidas digitadas",
    porque:
      "O CASO QUE MOTIVOU O GUARD. O merge raso trocava o lobo inteiro e o laudo saía 'sem evidência de alteração ecotextural' — o achado clicado virava o seu contrário, em silêncio.",
    estado: { ...medido(), tireoidite: "hashimoto" },
    exige: ["difusamente heterogênea", "5,2"],
    proibe: ["sem evidência de alteração ecotextural"],
    /**
     * Esta asserção FALHA hoje, e é o objetivo dela. O corpo descreve a
     * tireoidite; a conclusão não a menciona. Enquanto o D1 não entrar, o caso
     * é uma perda contada, não um verde.
     */
    exigeNaConclusao: ["tireoid"],
    pendente: "D1 — a tireoidite sai no corpo e SOME da conclusão (defeito de produção)",
  },
  {
    nome: "Hashimoto + nódulo + medidas",
    porque:
      "tireoidite e nódulo tocavam a mesma chave de topo e a seleção era recusada, embora o renderer saiba escrever os dois juntos.",
    estado: {
      ...medido(),
      tireoidite: "hashimoto",
      nodulos: [nodulo({ id: "a", dimensao: "1,3 x 1,0 x 0,9" })],
    },
    exige: ["difusamente heterogênea"],
    proibe: ["sem evidência de alteração ecotextural"],
    pendente: "o nódulo em si não migra (D2); o que este caso prova é que tireoidite + nódulo CONVIVEM no merge",
  },
  {
    nome: "tireoidite de Riedel",
    porque:
      "o catálogo canônico só tem Hashimoto. As outras três patologias da web não têm cenário — o adaptador tem de DIZER isso, não sumir com o diagnóstico.",
    estado: { ...medido(), tireoidite: "riedel" },
    /**
     * `proibe` além da pendência: se um dia alguém tirar o bloqueio do
     * adaptador, este caso tem de reprovar pelo TEXTO — o laudo não pode
     * concluir normalidade num exame que o médico marcou como tireoidite.
     */
    proibe: ["sem evidência de alteração ecotextural"],
    pendente: "sem AlteracaoSpec canônica — o adaptador BLOQUEIA (D1)",
  },
  {
    nome: "Doppler com UM pico só",
    porque:
      "a web omite o lado não preenchido; o canônico escreve '____ cm/s'. O renderer tem `omitPicoNull`; quem não o passa é o registry.",
    estado: { ...medido(), doppler: true, picoDireito: "22" },
    /**
     * D5 resolvido: o registry passou a ler `TIREOIDE_PICO_OMIT`, a mesma flag
     * que a produção lê. A asserção é condicional à flag porque o gate roda nos
     * dois estados — e é justamente a divergência entre eles que o defeito era.
     */
    ...(process.env.TIREOIDE_PICO_OMIT === "true"
      ? { proibe: ["esquerda de ____"], exige: ["22"] }
      : { pendente: "rode com TIREOIDE_PICO_OMIT=true para conferir a política de produção (D5)" }),
  },
  {
    nome: "linfonodos suspeitos",
    porque:
      "no canônico, `alterados=true` sem descrição faz o CORPO escrever a frase NORMAL e a conclusão dizer 'alterados' — laudo internamente contraditório. O cenário do catálogo evita isso cravando características que o médico não informou.",
    estado: { ...medido(), avaliarLinfonodos: true, linfonodos: "suspeitos" },
    proibe: ["morfologia preservada"],
  },
  {
    nome: "linfonodos NÃO avaliados",
    porque:
      "a web tira os linfonodos do laudo inteiro. O comentário fixo do clássico continua afirmando que o exame abrangeu a cadeia cervical I a V — o laudo afirma uma avaliação que a tela desligou.",
    estado: { ...medido(), avaliarLinfonodos: false },
    /**
     * D4-ii resolvido: `comentarios(f.linfonodos_descritos)` deixou de afirmar
     * a cadeia I–V quando ela não foi avaliada. Virou asserção — uma pendência
     * que já não existe infla o placar e esconde as que existem.
     */
    proibe: ["cadeia ganglionar cervical"],
  },
  {
    nome: "bócio (volume aumentado)",
    porque:
      "a web SEMPRE conclui 'volume normal' quando há qualquer volume; o canônico tem estado explícito. A tela precisa perguntar — o navegador não deve inferir normalidade de um número.",
    estado: medido(),
    pendente: "a tela não tem o controle de estado glandular (D-extra)",
  },
];

// ---------------------------------------------------------------------------

function linhas(t: string): string[] {
  return t.split("\n").map((l) => l.trim()).filter((l) => l !== "");
}

let falhas = 0;
let pendentes = 0;

console.log("\n" + "═".repeat(74));
console.log("TIREOIDE — prova diferencial: a web de hoje × o renderer canônico");
console.log("═".repeat(74));

for (const caso of CASOS) {
  console.log(`\n\n▸ ${caso.nome}`);
  console.log(`  ${caso.porque}`);

  const a = composeTireoide(caso.estado).text;
  const { dados, alteracoes, pendencias } = adaptarTireoide(caso.estado);

  const specs = alteracoes
    .map((id) => alteracoesDe("TIREOIDE").find((s) => s.id === id))
    .filter((s) => s !== undefined);

  const r = renderizarSelecao("TIREOIDE", ESTILO, specs, dados as never);

  for (const p of pendencias) {
    console.log(`  ${p.bloqueia ? "⛔ BLOQUEIA" : "⚠ degrada"} — ${p.onde}: ${p.valor}`);
    console.log(`    ${p.motivo}`);
  }

  /**
   * Uma pendência BLOQUEANTE encerra o caso aqui. Renderizar mesmo assim
   * produziria o laudo perigoso que ela descreve, e o gate imprimiria um "✓"
   * embaixo dele.
   */
  if (pendencias.some((p) => p.bloqueia)) {
    if (caso.pendente) { pendentes += 1; } else { falhas += 1; console.log("  ✗ bloqueado sem decisão registrada"); }
    continue;
  }

  if (!r.ok) {
    const motivo = "conflitos" in r ? r.conflitos.map((c) => c.motivo).join(" · ") : r.erro;
    if (caso.pendente) {
      console.log(`  ⏸ NÃO RENDERIZA (previsto): ${motivo}`);
      pendentes += 1;
    } else {
      console.log(`  ✗ NÃO RENDERIZA: ${motivo}`);
      falhas += 1;
    }
    continue;
  }

  const b = r.texto;

  /**
   * Uma asserção que falha num caso PENDENTE não é surpresa — é a perda
   * conhecida, provada de novo. Ela é impressa e contada como pendência, nunca
   * engolida: um `pendente` que suprimisse a asserção seria um teste desligado
   * com nome bonito. Se um dia a asserção passar, a pendência está resolvida e
   * alguém a remove.
   */
  const registrar = (msg: string) => {
    if (caso.pendente) {
      console.log(`  ⏸ perda confirmada — ${msg}`);
    } else {
      console.log(`  ✗ ${msg}`);
      falhas += 1;
    }
  };


  /**
   * O que o canônico DEIXA DE DIZER. Comparar linha a linha seria ruído: as
   * duas redações são diferentes de propósito. O que importa é achado ausente.
   */
  for (const termo of caso.exige ?? []) {
    if (!b.includes(termo)) registrar(`PERDEU: o laudo canônico não contém "${termo}"`);
  }
  const conclusao = b.split(/CONCLUS[ÃA]O:\n/)[1]?.split("\n\n")[0] ?? "";
  for (const termo of caso.exigeNaConclusao ?? []) {
    if (!conclusao.includes(termo)) {
      registrar(`PERDEU NA CONCLUSÃO: "${termo}" sai no corpo e a conclusão não o menciona`);
    }
  }
  for (const termo of caso.proibe ?? []) {
    if (b.includes(termo)) registrar(`AFIRMA O CONTRÁRIO: o laudo contém "${termo}"`);
  }

  if (caso.pendente) {
    console.log(`  ⏸ pendente: ${caso.pendente}`);
    pendentes += 1;
  }

  const la = linhas(a).length;
  const lb = linhas(b).length;
  console.log(`  ✓ renderiza · web ${la} linhas · canônico ${lb} linhas`);

  const conclusaoB = b.split(/CONCLUS[ÃA]O:\n/)[1]?.split("\n\n")[0] ?? "";
  console.log(`  conclusão canônica: ${conclusaoB.replace(/\n/g, " | ")}`);
}

console.log("\n\n" + "═".repeat(74));
if (falhas === 0) {
  console.log(`✓ nenhum achado perdido nem invertido em silêncio`);
  /**
   * O "✓" NÃO quer dizer que o piloto está completo.
   *
   * Ele quer dizer que nenhum caso perde achado CALADO: cada perda ou vira
   * recusa, ou vira pendência nomeada. Um verde sem esta linha seria lido como
   * "pode trocar a tela", que é o contrário do que estes casos mostram.
   */
  console.log(`  ${pendentes} caso(s) o canônico ainda NÃO cobre — o médico os perderia hoje.`);
  console.log("  Enquanto houver pendência, a categoria não migra inteira.");
} else {
  console.log(`✗ ${falhas} falha(s) · ${pendentes} pendente(s)`);
}
console.log("═".repeat(74) + "\n");

/**
 * DOIS modos, e o exit code é a diferença.
 *
 * Em auditoria (default) o gate sai zero com as pendências nomeadas: elas são o
 * relatório, e o objetivo é lê-las. Em RELEASE — antes de trocar o motor da
 * tela — pendência é bloqueio, porque quem olha só o código de saída recebia
 * aprovação de um gate que acabara de listar seis casos que o médico perderia.
 * (Codex, 20/08.)
 *
 *   PROVA_DIFERENCIAL=release pnpm exec tsx ... tireoide-ponta-a-ponta.manual.ts
 */
const release = process.env.PROVA_DIFERENCIAL === "release";
if (release && pendentes > 0) {
  console.log(`✗ modo RELEASE: ${pendentes} pendência(s) bloqueiam a troca do motor.\n`);
}
process.exit(falhas === 0 && !(release && pendentes > 0) ? 0 : 1);
