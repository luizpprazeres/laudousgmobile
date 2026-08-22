/**
 * O MORFOLÓGICO NÃO PODE SE CONTRADIZER — o gate.
 *
 * Até 22/08 a conclusão do morfológico afirmava, incondicionalmente:
 *
 *   "Líquido amniótico de quantidade normal."
 *   "Morfologia fetal sem evidência de alteração detectável pelo método."
 *
 * Com `ila_cm: 3` e uma ventriculomegalia nos achados, o laudo descrevia a
 * malformação no corpo e negava-a na conclusão, duas linhas abaixo. Quem lê a
 * conclusão — que é o que a maioria lê — não tinha como saber.
 *
 * Este gate fixa as quatro combinações. Ele não prova que o achado CHEGA à
 * conclusão (não chega: falta canal no schema, e está registrado no código);
 * prova que a conclusão não AFIRMA O CONTRÁRIO dele.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx --env-file=../../.env \
 *     src/server/renderer/catalog/__tests__/morfologico-nao-contradiz.manual.ts
 */

import { MorfologicoFindingsSchema, renderMorfologico } from "../../categories/MORFOLOGICO";

const BASE = {
  trimestre: "2t", apresentacao: "cefálica", dorso: null, bcf_bpm: 148,
  ccn_mm: null, tn_mm: null, osso_nasal: null, ducto_venoso: null,
  uterina_ip_direita: null, uterina_ip_esquerda: null,
  dbp_mm: 51, cc_mm: 190, cerebelo_mm: 21, cisterna_magna_mm: 5, binocular_mm: 32,
  ca_mm: 168, femur_mm: 34, tibia_mm: 29, fibula_mm: 28, umero_mm: 32, radio_mm: 27,
  ulna_mm: 30, peso_g: 390, peso_variacao_g: null, percentil: 50, genitalia: null,
  placenta_localizacao: "anterior", placenta_grau: null, ila_cm: null,
  ig_semanas: 20, ig_dias: 4, dum: null, data_exame: null, primeira_us_data: null,
  primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
  ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
  referencia_fonte: null, corrigir_ig: null, achados_adicionais: null,
};

type Caso = {
  nome: string;
  porque: string;
  patch: Record<string, unknown>;
  exigeNaConclusao?: string[];
  proibeNaConclusao?: string[];
};

const CASOS: Caso[] = [
  {
    nome: "exame normal",
    porque: "o caso de todos os 279 morfológicos reais. Tem de sair idêntico ao de sempre.",
    patch: {},
    exigeNaConclusao: ["Líquido amniótico de quantidade normal", "sem evidência de alteração detectável"],
  },
  {
    nome: "ventriculomegalia nos achados",
    porque:
      "o corpo descreve a malformação. A conclusão NÃO pode dizer que não há alteração detectável.",
    patch: { achados_adicionais: "Observa-se ventriculomegalia bilateral de 12 mm." },
    proibeNaConclusao: ["sem evidência de alteração detectável"],
  },
  {
    nome: "ILA de 3 cm",
    porque: "oligoâmnio franco. A conclusão não pode chamar de normal.",
    patch: { ila_cm: 3 },
    exigeNaConclusao: ["Oligoâmnio"],
    proibeNaConclusao: ["quantidade normal"],
  },
  {
    nome: "ILA de 30 cm",
    porque: "a outra ponta.",
    patch: { ila_cm: 30 },
    exigeNaConclusao: ["Polidrâmnio"],
  },
  {
    nome: "ILA de 12 cm",
    porque:
      "dentro da faixa. O contrapeso: sem isto, alguém 'resolve' o oligoâmnio fazendo toda medida virar anormal.",
    patch: { ila_cm: 12 },
    exigeNaConclusao: ["quantidade normal"],
    proibeNaConclusao: ["Oligoâmnio", "Polidrâmnio"],
  },
  {
    nome: "achado E oligoâmnio juntos",
    porque: "as duas condições no mesmo laudo, que é o caso clínico real.",
    patch: { ila_cm: 3, achados_adicionais: "Observa-se ventriculomegalia bilateral de 12 mm." },
    exigeNaConclusao: ["Oligoâmnio"],
    proibeNaConclusao: ["sem evidência de alteração detectável", "quantidade normal"],
  },
];

let falhas = 0;
console.log("═".repeat(74));
console.log("MORFOLÓGICO — a conclusão não contradiz o corpo");
console.log("═".repeat(74));

for (const c of CASOS) {
  const f = MorfologicoFindingsSchema.parse({ ...BASE, ...c.patch });
  const texto = renderMorfologico(f, null as never, { objetivo: false });
  const conclusao = texto.split(/CONCLUS[ÃA]O:\n/)[1]?.split("\n\n")[0] ?? "";

  console.log(`\n▸ ${c.nome}`);
  console.log(`  ${c.porque}`);
  for (const t of c.exigeNaConclusao ?? []) {
    if (!conclusao.includes(t)) { console.log(`  ✗ PERDEU: a conclusão não diz "${t}"`); falhas++; }
  }
  for (const t of c.proibeNaConclusao ?? []) {
    if (conclusao.includes(t)) { console.log(`  ✗ CONTRADIZ: a conclusão diz "${t}"`); falhas++; }
  }
  console.log(`  ${conclusao.replace(/\n/g, " | ").slice(0, 150)}`);
}

console.log("\n" + "═".repeat(74));
console.log(falhas === 0 ? "✓ a conclusão nunca nega o que o corpo descreve" : `✗ ${falhas} falha(s)`);
console.log("═".repeat(74));
process.exit(falhas ? 1 : 0);
