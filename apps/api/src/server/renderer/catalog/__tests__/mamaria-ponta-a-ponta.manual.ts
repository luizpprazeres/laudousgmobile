/**
 * MAMÁRIA — o gate da 3ª categoria da troca de motor.
 *
 * A última das que já tinham catálogo canônico pronto. Chegou em condição bem
 * melhor que as outras duas: a tela já classifica pelos EIXOS do BI-RADS
 * (ecogenicidade, forma, margem, orientação, sombra, calcificações), que são os
 * mesmos que o renderer usa para calcular. Não há aqui a inversão de escala que
 * bloqueou o nódulo da tireoide — BI-RADS é BI-RADS dos dois lados.
 *
 * O que se prova, então, são duas coisas:
 *
 * 1. **Cobertura de campo** — toda chave que a tela produz é lida pelo
 *    adaptador. É a prova contra o pior modo de falha: o campo que o médico
 *    preenche e o adaptador ignora, sumindo do laudo sem erro nenhum. Um diff
 *    de texto não pega isso num caso que ninguém pensou em escrever.
 * 2. **Casos clínicos** contra o canônico, com asserções positivas e negativas.
 *    A negativa importa mais: um laudo de mama que AFIRMA benignidade onde há
 *    achado suspeito é o pior desfecho possível desta categoria.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/mamaria-ponta-a-ponta.manual.ts
 */

import { readFileSync } from "node:fs";
import { renderizarSelecao } from "../alteracoes";
import { alteracoesDe } from "../alteracoes/index";
import { adaptarMamaria } from "../../../../../../web/src/lib/catalog/mamariaParaCatalogo";
import { mamaria } from "../../../../../../web/src/lib/deterministic";

const ESTILO = "CLASSICO_COMPLETO";

type Caso = {
  nome: string;
  porque: string;
  estado: Record<string, unknown>;
  exige?: string[];
  exigeNaConclusao?: string[];
  proibe?: string[];
  proibeNaConclusao?: string[];
  pendente?: string;
};

function inicial(): Record<string, unknown> {
  const st: Record<string, unknown> = {};
  for (const s of mamaria.sections) if (s.module) st[s.id] = s.module.initialState();
  return st;
}
const com = (b: Record<string, unknown>, secao: string, patch: Record<string, unknown>) => ({
  ...b,
  [secao]: { ...(b[secao] as object), ...patch },
});

/** Um nódulo BENIGNO clássico: oval, circunscrito, paralelo, com reforço. */
const NODULO_BENIGNO = {
  md_tipo: "nodulo",
  "md_tipo.nodulo.medidas": "1,2 x 1,0 x 0,8",
  "md_tipo.nodulo.eco": "hipoecoico",
  "md_tipo.nodulo.forma": "oval",
  "md_tipo.nodulo.margem": "circunscrita",
  "md_tipo.nodulo.orientacao": "paralela",
  "md_tipo.nodulo.posterior": "reforco",
  "md_tipo.nodulo.local": "quadrante superolateral",
};

/** O mesmo nódulo com os descritores SUSPEITOS trocados, um a um. */
const NODULO_SUSPEITO = {
  ...NODULO_BENIGNO,
  "md_tipo.nodulo.forma": "irregular",
  "md_tipo.nodulo.margem": "espiculada",
  "md_tipo.nodulo.orientacao": "nao_paralela",
  "md_tipo.nodulo.posterior": "sombra",
};

const CASOS: Caso[] = [
  {
    nome: "exame normal",
    porque: "o mais comum. Se este divergir em capacidade, não há piloto.",
    estado: inicial(),
    proibeNaConclusao: ["nódulo", "suspeit"],
  },
  {
    nome: "nódulo sólido benigno à direita",
    porque:
      "prova a tradução do TIPO: a tela diz `nodulo`, o canônico `nodulo_solido`. Chave desconhecida faz o Zod recusar o laudo INTEIRO — não é detalhe de nome.",
    estado: com(inicial(), "mamas", NODULO_BENIGNO),
    exige: ["1,2", "superolateral"],
    proibeNaConclusao: ["suspeit"],
  },
  {
    /**
     * O caso que mais importa. Todos os eixos suspeitos marcados: se a
     * conclusão sair benigna, o laudo tranquiliza sobre um achado que pede
     * biópsia.
     */
    nome: "nódulo com TODOS os descritores suspeitos",
    porque: "a conclusão não pode tranquilizar sobre um achado que pede investigação.",
    estado: com(inicial(), "mamas", NODULO_SUSPEITO),
    exige: ["espiculada"],
    proibeNaConclusao: ["provavelmente benign", "achado benigno", "BI-RADS 2"],
  },
  {
    nome: "cisto simples",
    porque: "o achado benigno mais comum; tem de sair como tal.",
    estado: com(inicial(), "mamas", {
      md_tipo: "cisto_simples",
      "md_tipo.cisto_simples.medidas": "0,8 x 0,6 x 0,5",
      "md_tipo.cisto_simples.local": "quadrante superomedial",
    }),
    exige: ["0,8"],
  },
  {
    nome: "cistos múltiplos, bilaterais",
    porque: "um achado em cada mama — os dois têm de sobreviver.",
    estado: com(inicial(), "mamas", {
      md_tipo: "multiplos_cistos",
      "md_tipo.multiplos_cistos.medidas": "0,7 x 0,5 x 0,5",
      me_tipo: "multiplos_cistos",
      "me_tipo.multiplos_cistos.medidas": "0,6 x 0,5 x 0,4",
    }),
    exige: ["0,7", "0,6"],
  },
  {
    nome: "calcificações grosseiras",
    porque:
      "prova a segunda tradução: a tela diz `grosseiras`, o canônico `grosseiras_benignas`.",
    estado: com(inicial(), "mamas", {
      md_tipo: "calcificacoes",
      "md_tipo.calcificacoes.calc_sub": "grosseiras",
      "md_tipo.calcificacoes.local": "quadrante inferolateral",
    }),
    proibeNaConclusao: ["suspeit"],
  },
  {
    nome: "microcalcificações",
    porque: "o extremo oposto do caso acima — não pode sair como benigno.",
    estado: com(inicial(), "mamas", {
      md_tipo: "calcificacoes",
      "md_tipo.calcificacoes.calc_sub": "microcalcificacoes",
    }),
    proibeNaConclusao: ["BI-RADS 2"],
  },
  {
    nome: "BI-RADS forçado pelo médico",
    porque:
      "a tela deixa forçar e o canônico aceita `birads_ditado`. Diferente da tireoide, aqui é seguro: a escala é a mesma (ACR) dos dois lados. Prova que a decisão dele vence o cálculo.",
    estado: com(inicial(), "mamas", { ...NODULO_BENIGNO, "md_tipo.nodulo.birads": "4A" }),
    exigeNaConclusao: ["4A"],
  },
  {
    nome: "axilas avaliadas e normais",
    porque: "o título só menciona axilas quando elas foram olhadas.",
    estado: com(inicial(), "axilas", { axilas: "normais" }),
    exige: ["AXILARES"],
  },
  {
    nome: "axilas NÃO avaliadas",
    porque:
      "o inverso, e é o que protege: sem isto o laudo se anunciaria como exame das regiões axilares num exame em que ninguém as olhou.",
    estado: inicial(),
    proibe: ["AXILARES"],
  },
  {
    nome: "axilas alteradas",
    porque: "o achado axilar tem de chegar à conclusão, não só ao corpo.",
    estado: com(inicial(), "axilas", {
      axilas: "alteradas",
      "axilas.alteradas.desc": "Linfonodo com cortical espessada de 0,6 cm à direita.",
    }),
    exige: ["0,6 cm"],
  },
  {
    nome: "mama de fundo adiposo",
    porque: "a ecotextura de fundo é escolha da tela e vira texto no canônico.",
    estado: com(inicial(), "mamas", { fundo: "adiposo" }),
    exige: ["adiposa"],
  },
];

// ---------------------------------------------------------------------------

/**
 * TODA CHAVE DA TELA É LIDA PELO ADAPTADOR?
 *
 * O estado é um `Record<string, unknown>`: nada é garantido pelo compilador. Um
 * campo novo, ou renomeado, não quebra o build — ele para de chegar ao laudo,
 * em silêncio.
 */
function camposCobertos(): number {
  const tela = readFileSync(
    new URL("../../../../../../web/src/lib/deterministic/organs/mamaria.ts", import.meta.url),
    "utf8",
  );
  const adaptador = readFileSync(
    new URL("../../../../../../web/src/lib/catalog/mamariaParaCatalogo.ts", import.meta.url),
    "utf8",
  );
  const chaves = [...new Set([...tela.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]!))];

  /** Ausências que são DECISÃO, não esquecimento. */
  const foraDePropósito: Record<string, string> = {
    desc: "chega por `axilas.alteradas.desc`, lido pelo nome completo",
  };

  let faltando = 0;
  for (const k of chaves) {
    if (k in foraDePropósito) continue;
    if (!new RegExp(`\\b${k}\\b`).test(adaptador)) {
      console.log(`  ✗ CAMPO ÓRFÃO: a tela tem "${k}" e o adaptador não o lê — sumiria do laudo em silêncio`);
      faltando++;
    }
  }
  console.log(
    faltando === 0
      ? `  ✓ ${chaves.length} campos da tela, todos lidos pelo adaptador`
      : `  ✗ ${faltando} campo(s) órfão(s)`,
  );
  return faltando;
}

let falhas = 0;
let pendentes = 0;
const linhas = (t: string) => t.split("\n").filter((l) => l.trim() !== "");

console.log("═".repeat(74));
console.log("MAMÁRIA — a travessia para o renderer canônico");
console.log("═".repeat(74));
console.log("\n▸ cobertura de campo");
falhas += camposCobertos();

for (const caso of CASOS) {
  console.log(`\n\n▸ ${caso.nome}`);
  console.log(`  ${caso.porque}`);

  const { dados, alteracoes, pendencias } = adaptarMamaria(caso.estado);

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
    .map((id) => alteracoesDe("MAMARIA").find((s) => s.id === id))
    .filter((s) => s !== undefined);

  const r = renderizarSelecao("MAMARIA", ESTILO, specs, dados as never);
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
  console.log(`  conclusão: ${conclusao.replace(/\n/g, " | ").slice(0, 190)}`);
}

console.log("\n\n" + "═".repeat(74));
console.log(falhas === 0 ? "✓ nenhum achado perdido nem invertido em silêncio" : `✗ ${falhas} falha(s)`);
console.log(`  ${pendentes} caso(s) o canônico ainda NÃO cobre — o médico os perderia hoje.`);
console.log("═".repeat(74));
process.exit(falhas ? 1 : 0);
