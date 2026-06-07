/**
 * Teste manual do guard transversal de itens vazios na conclusão.
 * Rodar: npx tsx src/server/pipeline/__tests__/emptyConclusionItemsGuard.manual.ts
 */
import { removeEmptyConclusionItems } from "../emptyConclusionItemsGuard";

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

const abdomenBug = `ULTRASSONOGRAFIA DO ABDOME TOTAL

CONCLUSÃO:
1) Esteatose hepática, grau leve.
2) ____
3) ____.
4)  ____ )
5) -
6) Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.`;

const abdomenFixed = removeEmptyConclusionItems(abdomenBug);
check(
  "remove itens inteiros com placeholder",
  !/2\) ____/.test(abdomenFixed) && !/3\) ____/.test(abdomenFixed),
  abdomenFixed,
);
check(
  "renumera fechamento após remover placeholders",
  /2\) Demais órgãos e estruturas abdominais/.test(abdomenFixed),
  abdomenFixed,
);

const obstetricPlaceholder = `ULTRASSONOGRAFIA OBSTÉTRICA

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
2) ____
3) Líquido amniótico de quantidade normal.`;

const obstetricFixed = removeEmptyConclusionItems(obstetricPlaceholder);
check(
  "preserva placeholder dentro de item real",
  /1\) Gestação em torno de ____ semanas e ____ dias\./.test(obstetricFixed),
  obstetricFixed,
);
check(
  "remove só o item inteiro vazio em obstétrico",
  /2\) Líquido amniótico de quantidade normal\./.test(obstetricFixed) &&
    !/\n2\) ____/.test(obstetricFixed),
  obstetricFixed,
);

const clean = `CONCLUSÃO:
1) Esteatose hepática, grau leve.
2) Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.`;
check(
  "no-op quando não há item vazio",
  removeEmptyConclusionItems(clean) === clean,
);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
