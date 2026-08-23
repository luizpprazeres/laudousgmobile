/**
 * ABDOME TOTAL — o gate da 6ª categoria, e a mais diferente de todas.
 *
 * 847 laudos em 90 dias: a maior de todas. E a única em que:
 *
 *   1. **a máscara do laudo mora no BANCO** (`report_template_variants`), não
 *      no código — o renderer preenche slots em vez de montar o texto;
 *   2. **o renderer estava DORMENTE** — os 852 abdomes reais não passam por
 *      ele. Os achados guardados têm a forma do structurer genérico, não a do
 *      DET-5. No app, o abdome é escrito pela IA.
 *
 * O (2) muda o que este gate significa. Nas cinco categorias anteriores havia
 * um laudo de produção com que comparar. Aqui não há: o texto que este renderer
 * produz **nunca saiu para um paciente**. Ele foi lido e aprovado pelo Luiz em
 * 23/08, num caso com esteatose leve e cálculo de vesícula, e é essa aprovação
 * que sustenta a migração — não o corpus.
 *
 * Por isso o gate aqui persegue outra coisa: que nada que a tela oferece
 * DESAPAREÇA. É o modo de falha real desta travessia, porque o catálogo de
 * achados do canônico é FECHADO (nove tipos) e menor que a tela.
 *
 * Rodar de `apps/api` (precisa do banco — a máscara vem de lá):
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/abdome-ponta-a-ponta.manual.ts
 */

import postgres from "postgres";
import { renderizarSelecao } from "../alteracoes";
import { adaptarAbdome } from "../../../../../../web/src/lib/catalog/abdomeParaCatalogo";
import { abdomeTotal } from "../../../../../../web/src/lib/deterministic";

const ESTILO = "CLASSICO_COMPLETO";

type Caso = {
  nome: string;
  porque: string;
  estado: Record<string, unknown>;
  exige?: string[];
  exigeNaConclusao?: string[];
  proibe?: string[];
  proibeNaConclusao?: string[];
};

function inicial(): Record<string, unknown> {
  const st: Record<string, unknown> = {};
  for (const s of abdomeTotal.sections) if (s.module) st[s.id] = s.module.initialState();
  return st;
}
const com = (b: Record<string, unknown>, secao: string, patch: Record<string, unknown>) => ({
  ...b,
  [secao]: { ...(b[secao] as object), ...patch },
});

const CASOS: Caso[] = [
  {
    nome: "abdome normal",
    porque: "o mais comum. Os 11 órgãos saem, e a conclusão fecha sem achado.",
    estado: inicial(),
    exige: ["Fígado", "Vesícula", "Baço", "Pâncreas", "Rim direito", "Rim esquerdo"],
    proibeNaConclusao: ["Esteatose", "Litíase"],
  },
  {
    nome: "esteatose leve",
    porque: "tipo do catálogo fechado, com grau. O mapa da tela para o canônico.",
    estado: com(inicial(), "figado", { ecotextura: "esteatose_leve" }),
    exigeNaConclusao: ["Esteatose hepática"],
  },
  {
    nome: "colelitíase com medida",
    porque: "o achado mais comum do abdome; a medida e a mobilidade têm de sair.",
    estado: com(inicial(), "vesicula", {
      conteudo: ["colelitiase"],
      "conteudo.colelitiase.dimensao": "1,2",
      "conteudo.colelitiase.quantidade": "unico",
    }),
    exige: ["1,2"],
    exigeNaConclusao: ["Litíase"],
  },
  {
    /**
     * O caso que este gate existe para travar: conceito que o catálogo fechado
     * NÃO tem. Vira `outro` e, se o verbatim não for emitido, some do laudo.
     */
    nome: "hemangioma — conceito FORA do catálogo fechado",
    porque:
      "o canônico tem nove tipos e hemangioma não é um deles. Vira `outro`, que no app vai para o LLM. Sem o verbatim, o achado sumiria do laudo em silêncio.",
    estado: com(inicial(), "figado", { lesoes: ["hemangioma"] }),
    exige: ["hemangioma"],
  },
  {
    nome: "lama biliar e pólipo — dois `outro` no mesmo órgão",
    porque: "os dois têm de sair; um não pode engolir o outro.",
    estado: com(inicial(), "vesicula", { conteudo: ["lama", "polipos"] }),
    exige: ["lama biliar", "polipoide"],
  },
  {
    nome: "veia porta dilatada",
    porque:
      "a única travessia que MUDA DE LUGAR: porta é campo do fígado na tela e seção própria no canônico. Sem o remanejo, some.",
    estado: com(inicial(), "figado", { porta: "dilatada" }),
    exige: ["Veia porta de calibre aumentado"],
    proibe: ["Veia porta de calibre normal"],
  },
  {
    nome: "dilatação pielocalicial",
    porque: "grau que o catálogo fechado não tem — verbatim.",
    estado: com(inicial(), "rim_direito", { dilatacao: "moderada" }),
    exige: ["Dilatação pielocalicial de grau moderada"],
  },
  {
    nome: "esplenomegalia",
    porque: "a tela diz 'aumentado'; o laudo tem de dizer.",
    estado: com(inicial(), "baco", { dimensao: "aumentado" }),
    exige: ["Baço de dimensões aumentadas"],
    proibe: ["Baço de dimensões normais"],
  },
  {
    nome: "achados em TRÊS órgãos",
    porque: "a conclusão numera na ordem dos slots do template, não na do schema.",
    estado: com(
      com(com(inicial(), "figado", { ecotextura: "esteatose_moderada" }), "vesicula", { conteudo: ["colelitiase"] }),
      "baco", { dimensao: "aumentado" },
    ),
    exigeNaConclusao: ["Esteatose hepática", "Litíase"],
  },
];

// ---------------------------------------------------------------------------

const sql = postgres(process.env.DATABASE_URL ?? process.env.POSTGRES_URL!, { max: 1, prepare: false });
const linhas = (t: string) => t.split("\n").filter((l) => l.trim() !== "");

async function principal() {
const [tpl] = (await sql`
  select template_body tb from report_template_variants
   where category_code='ABDOMEN_TOTAL' and variant_key='padrao'
     and status='validated' and template_body is not null limit 1`) as unknown as { tb: string }[];

console.log("═".repeat(74));
console.log("ABDOME TOTAL — a travessia para o renderer canônico");
console.log("═".repeat(74));

if (!tpl?.tb) {
  console.log("\n✗ sem máscara validada no banco — o renderer devolve null de propósito");
  process.exit(1);
}
console.log(`\nmáscara: ${tpl.tb.length} chars · ${(tpl.tb.match(/\{\{orgao:/g) ?? []).length} slots de órgão`);

let falhas = 0;
for (const caso of CASOS) {
  console.log(`\n\n▸ ${caso.nome}`);
  console.log(`  ${caso.porque}`);

  const { dados, pendencias } = adaptarAbdome(caso.estado);
  for (const p of pendencias) console.log(`  ${p.bloqueia ? "⛔" : "⚠"} ${p.onde}: ${p.motivo}`);
  if (pendencias.some((p) => p.bloqueia)) { falhas++; console.log("  ✗ bloqueado"); continue; }

  const r = renderizarSelecao("ABDOMEN_TOTAL", ESTILO, [], dados as never, { templateBody: tpl.tb });
  if (!r.ok) {
    console.log(`  ✗ NÃO RENDERIZA: ${"conflitos" in r ? r.conflitos.map((c) => c.motivo).join(" · ") : r.erro}`);
    falhas++;
    continue;
  }
  const b = r.texto;
  const conclusao = b.split(/CONCLUS[ÃA]O:\n/)[1]?.split("\n\n")[0] ?? "";

  for (const t of caso.exige ?? []) if (!b.includes(t)) { console.log(`  ✗ PERDEU: não contém "${t}"`); falhas++; }
  for (const t of caso.proibe ?? []) if (b.includes(t)) { console.log(`  ✗ AFIRMA INDEVIDAMENTE: "${t}"`); falhas++; }
  for (const t of caso.exigeNaConclusao ?? []) if (!conclusao.includes(t)) { console.log(`  ✗ PERDEU NA CONCLUSÃO: "${t}"`); falhas++; }
  for (const t of caso.proibeNaConclusao ?? []) if (conclusao.includes(t)) { console.log(`  ✗ CONCLUSÃO AFIRMA: "${t}"`); falhas++; }

  console.log(`  ✓ renderiza · ${linhas(b).length} linhas`);
  console.log(`  conclusão: ${conclusao.replace(/\n/g, " | ").slice(0, 170)}`);
}

console.log("\n\n" + "═".repeat(74));
console.log(falhas === 0 ? "✓ nada que a tela oferece desaparece do laudo" : `✗ ${falhas} falha(s)`);
console.log("═".repeat(74));
process.exit(falhas ? 1 : 0);
}

/** `tsx` compila para CJS e não aceita await de topo. */
void principal();
