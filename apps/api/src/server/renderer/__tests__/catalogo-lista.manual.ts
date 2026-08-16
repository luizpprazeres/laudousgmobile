/**
 * LISTA SINTÉTICA DO CATÁLOGO — a visão de revisão que o Dr. Luiz pediu.
 *
 * Imprime, para uma categoria, TODOS os slots com TODAS as suas variantes, cada
 * uma com a frase que sai no corpo e o item que sai na conclusão. É a forma de
 * ver e aprovar o catálogo de alterações/patologias de uma vez, em vez de
 * descobrir uma a uma montando achados à mão.
 *
 * Também é o mapa do que FALTA: variante montada pelo motor sem `exemplo`
 * aparece como «sem exemplo» — e sem exemplo ela é invisível na Biblioteca.
 *
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/__tests__/catalogo-lista.manual.ts [CATEGORIA] [ESTILO]
 */
import { describeCatalog } from "../catalog/describe";
import { flagsDeProducao, paresComCatalogo, resolveCatalogo } from "../catalog/registry";

const categoria = process.argv[2] ?? "OBSTETRICA";
const estilo = process.argv[3] ?? "CLASSICO_COMPLETO";

const entrada = resolveCatalogo(categoria, estilo);
if (!entrada) {
  console.error(`\nSem catálogo para ${categoria} × ${estilo}.`);
  console.error("Pares disponíveis:", paresComCatalogo().map((p) => `${p.categoria}/${p.estilo}`).join(", "));
  process.exit(1);
}

const flags = flagsDeProducao();
const d = describeCatalog(
  entrada.catalog,
  [
    {
      nome: "Gestação padrão",
      ctx: { findings: entrada.samples[0]!.findings, fetoIndex: 0, gemelar: false, flags },
    },
  ],
  entrada.renderizarExemplo,
);

const ordem = d.ordens[0]?.slots ?? [];
const porId = new Map(d.slots.map((s) => [s.id, s]));
/** Slots na ordem do laudo primeiro; o que sobrar (condicionais) no fim. */
const ordenados = [
  ...ordem.map((id) => porId.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s)),
  ...d.slots.filter((s) => !ordem.includes(s.id)),
];
const vistos = new Set<string>();

let comExemplo = 0;
let semExemplo = 0;
let editaveis = 0;

console.log(`\n${"═".repeat(78)}`);
console.log(`CATÁLOGO  ${d.categoria} × ${d.estilo}   (v${d.versao})`);
console.log(`${"═".repeat(78)}`);
console.log(`\nFlags de produção: ${JSON.stringify(flags)}`);
console.log(`Variáveis disponíveis: ${d.variaveis.join(", ")}\n`);

for (const slot of ordenados) {
  if (vistos.has(slot.id)) continue;
  vistos.add(slot.id);

  const marcas = [
    slot.obrigatorio ? "obrigatório" : null,
    slot.condicional ? "condicional" : null,
    slot.placeholdersObrigatorios.length
      ? `exige ${slot.placeholdersObrigatorios.map((p) => `{${p}}`).join(" ")}`
      : null,
  ].filter(Boolean);

  console.log(`${"─".repeat(78)}`);
  console.log(`■ ${slot.id}${marcas.length ? `   (${marcas.join(" · ")})` : ""}`);

  for (const v of slot.variantes) {
    const tags = [v.padrao ? "padrão" : null, v.editavel ? "editável" : "motor"].filter(Boolean);
    console.log(`\n  ▸ ${v.id}   [${tags.join(" · ")}]`);
    if (v.editavel) editaveis++;

    if (v.frase) console.log(`      frase     │ ${v.frase.trim()}`);
    if (v.corpoExemplo) console.log(`      corpo     │ ${v.corpoExemplo}`);
    if (v.conclusaoExemplo) console.log(`      conclusão │ ${v.conclusaoExemplo}`);

    if (v.corpoExemplo || v.conclusaoExemplo) comExemplo++;
    else if (!v.frase) {
      semExemplo++;
      console.log(`      ⚠ sem exemplo — invisível na Biblioteca. Falta \`exemplo\` na variante.`);
    }
    if (v.motivo) console.log(`      por quê   │ ${v.motivo}`);
  }
  console.log();
}

const totalVariantes = comExemplo + semExemplo + (editaveis > 0 ? 0 : 0);
console.log(`${"═".repeat(78)}`);
console.log(`${vistos.size} slots · ${d.slots.reduce((n, s) => n + s.variantes.length, 0)} variantes`);
console.log(`  ${editaveis} editáveis pelo médico`);
console.log(`  ${comExemplo} com exemplo renderizado`);
console.log(`  ${semExemplo} SEM exemplo  ← ${semExemplo === 0 ? "nenhuma pendência" : "invisíveis na Biblioteca"}`);
console.log(`${"═".repeat(78)}\n`);
void totalVariantes;
