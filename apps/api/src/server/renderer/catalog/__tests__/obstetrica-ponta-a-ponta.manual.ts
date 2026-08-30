/**
 * OBSTÉTRICA — o gate da 4ª categoria da troca de motor.
 *
 * A de maior volume entre as que têm renderer canônico: 697 laudos em 90 dias.
 * E a de maior distância entre os dois lados — o contrato canônico conhece
 * gemelaridade, gestação inicial, cordão, percentil, achados de crânio e
 * ovário; a tela cobre a gestação ÚNICA de 2º/3º trimestre.
 *
 * Essa distância não é perda na travessia: é o alcance que a tela sempre teve.
 * O que este gate persegue é o contrário — que tudo o que ela SABE dizer chegue
 * inteiro, e que nada seja afirmado a partir de campo vazio.
 *
 * ## O que mais importa aqui
 *
 * Esta é a categoria com o histórico mais pesado de falso-normal em produção:
 * oligoâmnio inventado a partir de MBV vazio, feto perdido em gemelar, cordão
 * normal enxertado em 100% dos laudos. Por isso quase todo caso tem asserção
 * NEGATIVA, e há um bloco inteiro sobre o que NÃO pode ser afirmado.
 *
 * ## ⚠️ Rode com as flags de PRODUÇÃO
 *
 * ```bash
 * IG_REFERENCE_CORRECTION=true GRANNUM_PLACENTA=true FLEXIBLE_CONCLUSION=true \
 *   pnpm exec tsx --env-file=../../.env \
 *   src/server/renderer/catalog/__tests__/obstetrica-ponta-a-ponta.manual.ts
 * ```
 *
 * As três estão LIGADAS em produção e mudam o laudo: sem `IG_REFERENCE_CORRECTION`
 * a frase da primeira ultrassonografia nem aparece, e o gate acusaria uma perda
 * que não existe. Comparar contra um renderer que produção nenhuma executa é o
 * erro que o `equivalencia-real` já evita da mesma forma.
 */

import { readFileSync } from "node:fs";
import { renderizarSelecao } from "../alteracoes";
import { alteracoesDe } from "../alteracoes/index";
import { adaptarObstetrica } from "../../../../../../web/src/lib/catalog/obstetricaParaCatalogo";
import { obstetrica } from "../../../../../../web/src/lib/deterministic";

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
  for (const s of obstetrica.sections) if (s.module) st[s.id] = s.module.initialState();
  return st;
}
const com = (b: Record<string, unknown>, secao: string, patch: Record<string, unknown>) => ({
  ...b,
  [secao]: { ...(b[secao] as object), ...patch },
});

/** Uma gestação de 32 semanas com tudo medido — a base de quase todo caso. */
function medida(): Record<string, unknown> {
  let st = inicial();
  st = com(st, "ig", { bio_sem: "32", bio_dias: "2" });
  st = com(st, "feto", { apresentacao: "cefálica", bcf: "142", dorso: "à esquerda" });
  st = com(st, "biometria", { dbp: "82", cc: "295", ca: "285", cf: "62", peso: "1900" });
  return st;
}

const CASOS: Caso[] = [
  {
    nome: "gestação de 32 semanas, tudo medido",
    porque: "o caso mais comum. Se este divergir em capacidade, não há piloto.",
    estado: medida(),
    exige: ["82", "295", "285", "62", "142"],
    exigeNaConclusao: ["32 semanas"],
  },
  {
    nome: "sem NENHUMA medida",
    porque:
      "a tela em branco não pode virar um laudo que afirma normalidade. O renderer deixa lacuna; o que não pode é sair número inventado nem conclusão de normalidade.",
    estado: inicial(),
    proibeNaConclusao: ["peso adequado", "crescimento adequado"],
  },
  {
    /**
     * O DEFEITO DE PRODUÇÃO que este gate existe para nunca deixar voltar:
     * MBV escolhido e vazio virava oligoâmnio.
     */
    nome: "MBV escolhido e DEIXADO EM BRANCO",
    porque:
      "o falso oligoâmnio. Escolher a medida e não preenchê-la não pode virar diagnóstico — foi defeito real de produção (boletim 30/06).",
    estado: com(medida(), "liquido", { tipo: "mbv", "tipo.mbv.cm": "" }),
    proibeNaConclusao: ["Oligoâmnio", "oligoâmnio", "Polidrâmnio"],
  },
  {
    nome: "ILA escolhido e DEIXADO EM BRANCO",
    porque: "o mesmo pelo outro campo.",
    estado: com(medida(), "liquido", { tipo: "ila", "tipo.ila.cm": "" }),
    proibeNaConclusao: ["Oligoâmnio", "oligoâmnio", "Polidrâmnio"],
  },
  {
    nome: "MBV de 5,6 cm (normal)",
    porque: "com a medida presente, a classe sai do RENDERER, não da tela.",
    estado: com(medida(), "liquido", { tipo: "mbv", "tipo.mbv.cm": "5,6" }),
    exige: ["5,6"],
    proibeNaConclusao: ["Oligoâmnio", "Polidrâmnio"],
  },
  {
    nome: "ILA de 4 cm — oligoâmnio de verdade",
    porque:
      "o inverso do falso-normal: com medida baixa de verdade, o diagnóstico TEM de sair. Um gate que só proíbe acaba proibindo o certo.",
    estado: com(medida(), "liquido", { tipo: "ila", "tipo.ila.cm": "4" }),
    exigeNaConclusao: ["ligoâmnio"],
  },
  {
    nome: "ILA de 30 cm — polidrâmnio",
    porque: "a outra ponta da mesma régua.",
    estado: com(medida(), "liquido", { tipo: "ila", "tipo.ila.cm": "30" }),
    exigeNaConclusao: ["olidrâmnio"],
  },
  {
    nome: "placenta detalhada",
    porque:
      "localização, grau e ecotextura são três campos livres na tela. O grau vem como 'II' ou 'grau II' e o canônico quer só o algarismo.",
    estado: com(medida(), "placenta", {
      estado: "detalhar",
      "estado.detalhar.localizacao": "anterior",
      "estado.detalhar.grau": "grau II",
      "estado.detalhar.ecotextura": "homogênea",
    }),
    exige: ["anterior"],
  },
  {
    nome: "referência por US precoce",
    porque:
      "a regra do Dr. Domingos vive no RENDERER: biometria de hoje é a âncora, correção só acima de cinco dias. A tela informa a fonte e os dados, não o julgamento.",
    estado: com(medida(), "ig", {
      referencia: "usg",
      "referencia.usg.us_data": "12/01/2026",
      "referencia.usg.us_ig_sem": "8",
      "referencia.usg.us_ig_dias": "2",
      "referencia.usg.exame_data": "20/06/2026",
    }),
    exige: ["12/01/2026"],
  },
  {
    nome: "referência por DUM",
    porque: "a outra fonte; não pode virar a primeira em silêncio.",
    estado: com(medida(), "ig", {
      referencia: "dum",
      "referencia.dum.dum_data": "01/01/2026",
      "referencia.dum.exame_data": "20/06/2026",
    }),
    proibe: ["primeira ultrassonografia realizada 01/01/2026"],
  },
  {
    nome: "apresentação pélvica",
    porque: "o achado mais simples de perder, e o que muda conduta.",
    estado: com(medida(), "feto", { apresentacao: "pélvica" }),
    exige: ["pélvica"],
    proibe: ["cefálica"],
  },
  {
    nome: "achado adicional em texto livre",
    porque: "verbatim do médico — o que não pode é sumir.",
    estado: com(medida(), "achados", {
      texto: "Observa-se imagem cística anexial à direita, medindo 3,0 cm.",
    }),
    exige: ["3,0 cm"],
  },
  {
    nome: "cervicometria complementar sem trocar de categoria",
    porque:
      "a auxiliar ativa o complemento dentro da Obstétrica; a via entra na técnica, a medida no fim do corpo e a interpretação no fim da conclusão.",
    estado: com(medida(), "cervicometria", {
      realizada: "sim",
      "realizada.sim.colo_cm": "2,2",
      "realizada.sim.orificio": "fechado",
      "realizada.sim.placenta_cm": "4,0",
      "realizada.sim.placenta_distante": "nao",
      "realizada.sim.cerclagem": "sim",
      "realizada.sim.observacoes": "",
    }),
    exige: ["via transvaginal", "CERVICOMETRIA:", "2,2 cm"],
    exigeNaConclusao: ["Colo uterino um pouco curto", "Pontos de cerclagem"],
  },
  {
    /**
     * A tela não tem cordão, e o canônico tem. Este caso trava o defeito
     * histórico: cordão de três vasos afirmado em 100% dos laudos, sem ninguém
     * ter olhado (restaurado no gate `equivalencia-real` em 16/08).
     */
    nome: "o cordão NÃO pode ser afirmado",
    porque:
      "a tela não pergunta sobre o cordão. Afirmar três vasos sem ninguém ter olhado foi defeito real, e este caso impede que volte pela porta da web.",
    estado: medida(),
    proibe: ["três vasos", "3 vasos"],
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
    new URL("../../../../../../web/src/lib/deterministic/organs/obstetrica.ts", import.meta.url),
    "utf8",
  );
  const adaptador = readFileSync(
    new URL("../../../../../../web/src/lib/catalog/obstetricaParaCatalogo.ts", import.meta.url),
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
console.log("OBSTÉTRICA — a travessia para o renderer canônico");
console.log("═".repeat(74));
console.log("\n▸ cobertura de campo");
falhas += camposCobertos();

for (const caso of CASOS) {
  console.log(`\n\n▸ ${caso.nome}`);
  console.log(`  ${caso.porque}`);

  const { dados, alteracoes, pendencias } = adaptarObstetrica(caso.estado);

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
    .map((id) => alteracoesDe("OBSTETRICA").find((s) => s.id === id))
    .filter((s) => s !== undefined);

  const r = renderizarSelecao("OBSTETRICA", ESTILO, specs, dados as never);
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
