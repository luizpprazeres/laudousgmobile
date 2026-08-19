/**
 * A REGRA DA COR — roxo é falta, âmbar é divergência.
 *
 * Existe porque as duas compartilhavam o roxo e o médico foi procurar, numa
 * frase completa, um dado que não estava faltando (19/08, a frase da 1ª
 * ultrassonografia). E porque os dois apps mostravam coisas diferentes para o
 * mesmo laudo: o Android pintava só um "(?)" e ignorava `____`.
 *
 *   pnpm exec tsx src/features/generate/reviewMarkers.manual.ts
 */
import { COR_FALTA, COR_REVISAR, corDaLinha, stripReviewMarkers } from "./reviewMarkers.rules";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, cond: boolean, extra = "") => {
  if (cond) ok++;
  else falhas.push(`${nome}${extra ? ` — ${extra}` : ""}`);
};

console.log("\nA cor diz o que fazer\n");

t("linha com lacuna é ROXA",
  corDaLinha("Batimentos cardíacos ritmados (BCF = ____ bpm).") === COR_FALTA);
t("linha com [REVISAR] é ÂMBAR",
  corDaLinha("Primeira ultrassonografia realizada 14/05/2026. [REVISAR: divergência implausível com a biometria atual]") === COR_REVISAR);
t("linha normal não é destacada",
  corDaLinha("Feto único, em apresentação cefálica, com dorso à direita.") === null);
// A divergência ativa pesa mais que a lacuna — e a lacuna segue visível no `____`.
t("com os DOIS, o âmbar vence",
  corDaLinha("Fêmur de ____ mm. [REVISAR — medida ambígua]") === COR_REVISAR);
// Que as duas sejam diferentes o compilador já garante (`as const`). O que ele
// NÃO garante é o formato: "#FEF3C" renderiza transparente, em silêncio.
const HEX = /^#[0-9A-Fa-f]{6}$/;
t("as quatro cores são hex de 6 dígitos",
  [COR_FALTA.bg, COR_FALTA.fg, COR_REVISAR.bg, COR_REVISAR.fg].every((c) => HEX.test(c)),
  [COR_FALTA.bg, COR_FALTA.fg, COR_REVISAR.bg, COR_REVISAR.fg].join(" "));

console.log("O texto copiado sai limpo\n");
const comMarcador = "Colo uterino de nível IB [REVISAR — nível sugerido].\nOutra linha.";
t("copiar remove o marcador", !stripReviewMarkers(comMarcador).includes("[REVISAR"));
t("…e não come o resto da frase",
  stripReviewMarkers(comMarcador).includes("Colo uterino de nível IB.") &&
  stripReviewMarkers(comMarcador).includes("Outra linha."),
  JSON.stringify(stripReviewMarkers(comMarcador)));
// A lacuna NÃO é removida: ela é parte do laudo, e some quando o médico preenche.
t("copiar preserva a lacuna", stripReviewMarkers("BCF = ____ bpm.").includes("____"));

const total = ok + falhas.length;
console.log(`${"═".repeat(64)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — roxo é falta, âmbar é divergência`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(64)}\n`);
if (falhas.length > 0) process.exit(1);
