/**
 * TIREOIDE — o gate do PILOTO, agora que o motor já foi trocado.
 *
 * Ele nasceu como prova DIFERENCIAL (a web de hoje × o canônico), para
 * responder antes de alguém escrever tela: o que o médico perde quando a web
 * parar de compor o texto? Respondida a pergunta, a troca foi feita em 21/08 e
 * **o compositor local da TIREOIDE foi apagado** — não há mais texto A com que
 * comparar, e não deve haver.
 *
 * O gate continua, com a premissa nova:
 *
 *   caso → adaptarTireoide(...) → renderizarSelecao(…) → o laudo que o médico vê
 *
 * ## Como se lê o resultado
 *
 * O que este gate procura:
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
  /**
   * O que a conclusão NÃO pode dizer.
   *
   * Existe para o modo de falha mais perigoso deste laudo: a conclusão que
   * AFIRMA o contrário do achado. Exigir a frase certa não basta — "TI-RADS 5"
   * e "provavelmente benignas" podem sair na mesma linha, e a asserção positiva
   * passaria.
   */
  proibeNaConclusao?: string[];
};

function lobo(a: string, b: string, c: string) {
  return { a, b, c, ecotextura: "normal" as const };
}

/**
 * Um nódulo pelos SEIS EIXOS canônicos (D2, 21/08).
 *
 * A base é um nódulo BENIGNO clássico — isoecoico, margem regular, halo fino,
 * mais largo que alto, sem calcificação, sem vascularização — que soma 2 pontos.
 * Cada caso muda só o eixo que quer provar, e assim a diferença de nota é
 * atribuível.
 */
function nodulo(over: Partial<NoduloTireoide>): NoduloTireoide {
  return {
    id: "n1",
    lobo: "lobo_direito",
    ecogenicidade: "isoecoica",
    margem: "regular",
    halo: "fino_regular",
    forma: "mais_larga_que_alta",
    calcificacoes: "sem",
    vascularizacao: "sem",
    c1: "1,2",
    c2: "0,9",
    c3: "0,8",
    localizacao: "",
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
    nome: "DOIS nódulos no mesmo lobo — um suspeito, um cisto",
    porque:
      "os cenários fixos do catálogo são mutuamente exclusivos por grupo e não sabem representar isto; prova que a lista aberta em `dados` é o caminho. E prova o D2: os dois nódulos são descritos pelos EIXOS e o renderer é quem pontua.",
    estado: {
      ...medido(),
      nodulos: [
        // Hipoecoico (3) + margem espiculada (2) + halo ausente (1) + mais alto
        // que largo (3) + microcalcificações (3) + vasc. central (4) = 16, o
        // teto da tabela. Tem de sair na ponta MALIGNA.
        nodulo({
          id: "a", ecogenicidade: "hipoecoica", margem: "espiculada", halo: "sem_halo",
          forma: "mais_alta_que_larga", calcificacoes: "micro", vascularizacao: "exclusiva_central",
          c1: "1,8", c2: "1,2", c3: "1,4",
        }),
        // Cisto simples: anecoico homogêneo, tudo zero.
        nodulo({
          id: "b", ecogenicidade: "anecoica_homogenea", margem: "regular", halo: "fino_regular",
          forma: "mais_larga_que_alta", calcificacoes: "sem", vascularizacao: "sem",
          c1: "0,6", c2: "0,5", c3: "0,4",
        }),
      ],
    },
    exige: ["hipoecoic", "anecoic", "1,8", "0,6"],
    exigeNaConclusao: ["NOTA FINAL"],
  },
  {
    nome: "nódulos em lobos diferentes",
    porque: "a conclusão canônica agrupa por lobo; confere que nenhum some.",
    estado: {
      ...medido(),
      nodulos: [
        nodulo({ id: "a", c1: "1,4", c2: "1,1", c3: "1,0" }),
        nodulo({ id: "b", lobo: "lobo_esquerdo", c1: "0,9", c2: "0,7", c3: "0,6" }),
      ],
    },
    exige: ["Lobo direito", "Lobo esquerdo", "1,4", "0,9"],
  },
  {
    /**
     * O CASO QUE MOTIVOU O D2 — e a prova de que ele foi resolvido.
     *
     * Na tela antiga o médico escolhia "grau 5" para dizer PROVAVELMENTE
     * MALIGNO. Repassado ao canônico como nota, 5 pontos caem em TI-RADS 2 e o
     * laudo sairia "provavelmente benignas": a inversão exata que bloqueava a
     * migração do nódulo.
     *
     * Descrito pelos eixos, o mesmo nódulo suspeito soma 16 e sai na ponta
     * certa. Este caso falha se alguém reintroduzir a travessia por nota.
     */
    nome: "o nódulo suspeito NÃO pode sair como provavelmente benigno",
    porque: "é a inversão de escala que bloqueou o piloto por um dia inteiro.",
    estado: {
      ...medido(),
      nodulos: [
        nodulo({
          ecogenicidade: "hipoecoica", margem: "espiculada", halo: "sem_halo",
          forma: "mais_alta_que_larga", calcificacoes: "micro", vascularizacao: "exclusiva_central",
        }),
      ],
    },
    proibeNaConclusao: ["provavelmente benign"],
  },
  {
    nome: "Hashimoto + medidas digitadas",
    porque:
      "O CASO QUE MOTIVOU O GUARD. O merge raso trocava o lobo inteiro e o laudo saía 'sem evidência de alteração ecotextural' — o achado clicado virava o seu contrário, em silêncio.",
    estado: { ...medido(), tireoidite: "hashimoto" },
    /**
     * A EXIGÊNCIA É CLÍNICA, NÃO LITERAL — corrigido em 21/08.
     *
     * Este caso exigia "difusamente heterogênea", que é a redação da web
     * ANTIGA. O canônico escreve "ecotextura heterogênea", e o gate marcava
     * isso como perda — contra a sua própria doutrina, que diz que divergência
     * de TEXTO não é falha e que o canônico ganha a redação. Cobrar a palavra
     * do motor aposentado é pedir que o novo imite o velho justamente onde ele
     * foi trocado.
     *
     * O que tem de sobreviver é o ACHADO: heterogeneidade no corpo, a medida
     * digitada, e o nome do diagnóstico na conclusão.
     */
    exige: ["heterogên", "5,2"],
    /**
     * A conclusão TEM de nomear o diagnóstico. Esta asserção falhava de
     * propósito enquanto o D1 não existia — a tireoidite saía no corpo e sumia
     * da conclusão. Com o D1 no ar ela passa, e passa a servir de trava.
     *
     * (A versão antiga procurava "tireoid" em minúsculas, o que nunca casaria
     * com "Tireoidite de Hashimoto" — duas chaves `exigeNaConclusao` no mesmo
     * objeto, e a segunda vencia calada.)
     */
    exigeNaConclusao: ["Hashimoto"],
    proibe: ["sem evidência de alteração ecotextural"],
  },
  {
    nome: "Hashimoto + nódulo + medidas",
    porque:
      "tireoidite e nódulo tocavam a mesma chave de topo e a seleção era recusada, embora o renderer saiba escrever os dois juntos.",
    estado: {
      ...medido(),
      tireoidite: "hashimoto",
      nodulos: [nodulo({ id: "a", c1: "1,3", c2: "1,0", c3: "0,9" })],
    },
    exige: ["heterogên"],
    exigeNaConclusao: ["Hashimoto", "NOTA FINAL"],
    proibe: ["sem evidência de alteração ecotextural"],
  },
  {
    nome: "tireoidite de Riedel",
    porque:
      "das quatro tireoidites, era a que não tinha cenário canônico — o adaptador BLOQUEAVA em vez de sumir com o diagnóstico. Com o D1 as quatro passaram a existir; este caso prova que a menos comum delas chega inteira à conclusão.",
    estado: { ...medido(), tireoidite: "riedel" },
    exigeNaConclusao: ["Riedel"],
    proibe: ["sem evidência de alteração ecotextural"],
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
      "a web concluía 'volume normal' para QUALQUER volume digitado — um bócio de 40 ml saía com a glândula descrita como normal. Resolvido em 21/08 acrescentando o controle: o estado é perguntado, nunca inferido das medidas.",
    estado: { ...medido(), volumeGlandular: "aumentado" as const },
    proibeNaConclusao: ["volume normal"],
  },
  {
    /**
     * O CONTRAPESO do caso acima — e o registro de um comportamento que
     * surpreende.
     *
     * Sem esta trava alguém "resolveria" o bócio fazendo o padrão ser
     * "aumentado", e todo exame sem resposta afirmaria glândula aumentada: o
     * mesmo erro, para o outro lado.
     *
     * ⚠️ O que este caso também documenta: em branco o renderer **não se cala**
     * — ele escreve "volume normal". Não é silêncio, é um padrão. Fica afirmado
     * aqui para ninguém precisar descobrir de novo, e para a tela poder dizer a
     * verdade ao médico no rótulo do controle.
     */
    nome: "volume glandular NÃO informado",
    porque: "prova o padrão do renderer: em branco ele conclui NORMAL, não fica calado.",
    estado: medido(),
    exigeNaConclusao: ["volume normal"],
    proibeNaConclusao: ["bócio", "aumentad"],
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
  for (const proibido of caso.proibeNaConclusao ?? []) {
    if (conclusao.toLowerCase().includes(proibido.toLowerCase())) {
      registrar(`AFIRMA O CONTRÁRIO: a conclusão diz "${proibido}"`);
    }
  }
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

  console.log(`  ✓ renderiza · ${linhas(b).length} linhas`);

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
