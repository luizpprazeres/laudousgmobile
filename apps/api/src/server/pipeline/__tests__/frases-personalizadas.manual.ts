/**
 * A redação do médico aplicada ao laudo — as garantias que a tornam segura.
 *
 * O que se afirma:
 *   1. TROCA   — a frase dele sai no laudo, com o dado daquele exame
 *   2. DADO    — nenhuma medida se perde na troca
 *   3. ACHADO  — laudo com patologia sai intocado (a linha normal não existe)
 *   4. ORDEM   — o laudo não é reordenado nem remontado
 *   5. RECUSA  — a validação barra a frase que apagaria um dado
 *
 *   pnpm exec tsx src/server/pipeline/__tests__/frases-personalizadas.manual.ts
 */
import {
  aplicarFrasesPersonalizadas,
  validarFrase,
  type FrasePersonalizada,
} from "../frasesPersonalizadas";
import { contarDados, idDaFrase, mascararDados } from "@/server/renderer/catalog/modeloNormal";

let ok = 0;
const falhas: string[] = [];
function t(nome: string, cond: boolean, detalhe = "") {
  if (cond) ok++;
  else falhas.push(`${nome}${detalhe ? `\n        ${detalhe}` : ""}`);
}

const f = (base: string, nova: string | null): FrasePersonalizada => ({ id: idDaFrase(base), base, nova });

// ------------------------------------------------------------ 0 · identidade
console.log("0 · a identidade da frase ignora o dado, não a redação");
t("mesma redação, medidas diferentes → mesmo id",
  idDaFrase("Diâmetro biparietal (DBP) de 78 mm.") === idDaFrase("Diâmetro biparietal (DBP) de 74 mm."));
t("modelo com lacuna casa com laudo com número",
  idDaFrase("Diâmetro biparietal (DBP) de ____ mm.") === idDaFrase("Diâmetro biparietal (DBP) de 78 mm."));
t("decimal com vírgula também",
  idDaFrase("Maior bolsão vertical de ____ cm.") === idDaFrase("Maior bolsão vertical de 4,2 cm."));
t("a numeração da conclusão não faz parte da frase",
  idDaFrase("1) Gestação em torno de 32 semanas.") === idDaFrase("2) Gestação em torno de 30 semanas."));
t("redação diferente → id diferente",
  idDaFrase("Fígado de dimensões normais.") !== idDaFrase("Baço de dimensões normais."));
t("conta os dados certo", contarDados("Lobo medindo ____ x ____ x ____ cm (volume de ____ ml).") === 4,
  mascararDados("Lobo medindo ____ x ____ x ____ cm (volume de ____ ml)."));

// ---------------------------------------------------------------- 1 · troca
console.log("1 · a frase do médico sai no laudo, com o dado do exame");
{
  const laudo = [
    "ULTRASSONOGRAFIA DO ABDOME SUPERIOR", "", "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    "Fígado de dimensões normais, contornos regulares e ecotextura homogênea.",
    "Baço de dimensões normais e ecotextura sólida e homogênea.",
  ].join("\n");
  const r = aplicarFrasesPersonalizadas(laudo, [
    f("Fígado de dimensões normais, contornos regulares e ecotextura homogênea.",
      "Fígado com dimensões, contornos e ecotextura preservados."),
  ]);
  t("a redação nova entra", r.texto.includes("Fígado com dimensões, contornos e ecotextura preservados."));
  t("a antiga sai", !r.texto.includes("Fígado de dimensões normais, contornos"));
  t("o resto fica intocado", r.texto.includes("Baço de dimensões normais e ecotextura sólida e homogênea."));
  t("contabiliza a aplicação", r.aplicadas === 1 && r.naoAplicadas.length === 0);
}

// ----------------------------------------------------------------- 2 · dado
console.log("2 · a medida do exame sobrevive à troca");
{
  const laudo = "Diâmetro biparietal (DBP) de 78 mm.\nCircunferência da cabeça (CC) de 285 mm.";
  const r = aplicarFrasesPersonalizadas(laudo, [
    f("Diâmetro biparietal (DBP) de ____ mm.", "DBP: ____ mm."),
  ]);
  t("a medida do exame entra na frase nova", r.texto.includes("DBP: 78 mm."),
    JSON.stringify(r.texto));
  t("e não vaza a lacuna", !r.texto.includes("____"));
}
{
  // Várias medidas, em ordem.
  const laudo = "Lobo direito medindo 4,2 x 1,8 x 1,5 cm (volume de 5,6 ml), de ecogenicidade normal.";
  const r = aplicarFrasesPersonalizadas(laudo, [
    f("Lobo direito medindo ____ x ____ x ____ cm (volume de ____ ml), de ecogenicidade normal.",
      "Lobo D: ____ x ____ x ____ cm — ____ ml, ecogenicidade normal."),
  ]);
  t("quatro medidas, na ordem certa", r.texto.includes("Lobo D: 4,2 x 1,8 x 1,5 cm — 5,6 ml"),
    JSON.stringify(r.texto));
}
{
  // Conclusão numerada: o número é do motor, não da frase.
  const laudo = "CONCLUSÃO:\n1) Gestação em torno de 32 semanas e 2 dias.\n2) Líquido amniótico em quantidade normal.";
  const r = aplicarFrasesPersonalizadas(laudo, [
    f("1) Gestação em torno de ____ semanas e ____ dias.", "Gestação de ____ semanas e ____ dias."),
  ]);
  t("a numeração é preservada pelo motor", r.texto.includes("1) Gestação de 32 semanas e 2 dias."),
    JSON.stringify(r.texto));
}

// --------------------------------------------------------------- 3 · achado
console.log("3 · laudo com achado sai INTOCADO");
{
  // O médico personalizou a frase de fígado normal. Este exame tem esteatose:
  // a frase de normalidade não existe no laudo, então nada pode ser trocado.
  const comAchado = [
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    "Fígado de dimensões aumentadas, com ecotextura difusamente hiperecogênica, compatível com esteatose.",
    "Baço de dimensões normais e ecotextura sólida e homogênea.",
  ].join("\n");
  const r = aplicarFrasesPersonalizadas(comAchado, [
    f("Fígado de dimensões normais, contornos regulares e ecotextura homogênea.",
      "Fígado com dimensões, contornos e ecotextura preservados."),
  ]);
  t("o laudo é byte-idêntico", r.texto === comAchado, JSON.stringify(r.texto.slice(0, 90)));
  t("nada foi aplicado", r.aplicadas === 0);
  t("e a não-aplicação é reportada para a auditoria", r.naoAplicadas.length === 1);
}
{
  // Remover: mesma regra. Com achado, a linha não existe e nada some.
  const r = aplicarFrasesPersonalizadas(
    "Vesícula biliar com cálculo de 8 mm em seu interior.",
    [f("Vesícula biliar de topografia usual e de parede fina, sem cálculo.", null)],
  );
  t("remover não apaga a linha do achado", r.texto.includes("com cálculo de 8 mm"));
}

// ---------------------------------------------------------------- 4 · ordem
console.log("4 · o laudo não é remontado");
{
  const laudo = ["A um.", "B dois.", "C três.", "D quatro."].join("\n");
  const r = aplicarFrasesPersonalizadas(laudo, [f("C três.", "C reescrito.")]);
  t("a ordem é a mesma", r.texto.split("\n").map((l) => l[0]).join("") === "ABCD");
  t("só a linha alvo mudou", r.texto === "A um.\nB dois.\nC reescrito.\nD quatro.");
}
{
  const laudo = ["A um.", "B dois.", "C três."].join("\n");
  const r = aplicarFrasesPersonalizadas(laudo, [f("B dois.", null)]);
  t("remover tira só aquela linha", r.texto === "A um.\nC três.");
}
{
  // Frase repetida: uma regra, uma linha. Rim direito e esquerdo têm redações
  // próprias e não podem ser trocados os dois pela mesma personalização.
  const laudo = "Medida do rim direito: 10,2 cm.\nMedida do rim direito: 10,2 cm.";
  const r = aplicarFrasesPersonalizadas(laudo, [f("Medida do rim direito: ____ cm.", "Rim D: ____ cm.")]);
  t("troca só a primeira ocorrência", r.texto === "Rim D: 10,2 cm.\nMedida do rim direito: 10,2 cm.",
    JSON.stringify(r.texto));
}

// --------------------------------------------------------------- 5 · recusa
console.log("5 · a validação barra a frase que apagaria um dado");
t("frase sem a lacuna obrigatória é recusada",
  validarFrase("Diâmetro biparietal (DBP) de ____ mm.", "Biometria dentro da normalidade.").length === 1);
t("frase com a lacuna passa",
  validarFrase("Diâmetro biparietal (DBP) de ____ mm.", "DBP: ____ mm.").length === 0);
t("faltando uma de quatro é recusada",
  validarFrase("Lobo medindo ____ x ____ x ____ cm (volume de ____ ml).", "Lobo: ____ x ____ x ____ cm.").length === 1);
t("lacuna a mais é recusada (sairia ____ no laudo)",
  validarFrase("Fígado normal.", "Fígado ____ normal.").length === 1);
t("frase vazia é recusada", validarFrase("Fígado normal.", "").length === 1);
t("cabeçalho de seção é recusado", validarFrase("Fígado normal.", "CONCLUSÃO: normal").length === 1);
t("mais de uma linha é recusada", validarFrase("Fígado normal.", "Fígado normal.\nBaço normal.").length === 1);
t("remover é sempre permitido", validarFrase("Fígado normal.", null).length === 0);
t("frase sem dado, redação livre", validarFrase("Fígado normal.", "Fígado sem alterações.").length === 0);

// -------------------------------------------------------- 6 · não casa, não mexe
console.log("6 · o que não casa não é tocado");
{
  const laudo = "Fígado de dimensões normais.";
  // Mesmo id (redação igual), mas a base não casa com a linha: nada acontece.
  const r = aplicarFrasesPersonalizadas(laudo, [
    { id: idDaFrase("Fígado de dimensões normais."), base: "Baço de dimensões normais.", nova: "X." },
  ]);
  t("id igual mas base diferente não troca", r.texto === laudo);
}
{
  const r = aplicarFrasesPersonalizadas("Qualquer coisa.", []);
  t("sem personalização, texto idêntico", r.texto === "Qualquer coisa." && r.aplicadas === 0);
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} garantias`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const x of falhas) console.log(`  • ${x}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
