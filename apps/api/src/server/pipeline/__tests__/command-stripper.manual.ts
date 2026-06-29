/**
 * Golden do stripper pré-geração (DET-6 fase 3). Garante que remove SÓ os spans de
 * comando, preservando 100% do conteúdo clínico (review dex1: over-strip é o risco).
 * Rodar: tsx src/server/pipeline/__tests__/command-stripper.manual.ts
 */
import { stripCommandSpans } from "../commandStripper";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass += 1; console.log(`✓ ${name}`); }
  else { fail += 1; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}
const TYPED = { typedEngine: true };

// ── 43657c4b: "acrescente após comentários, que ..." (typedEngine) → removido ──
{
  const { clean, stripped } = stripCommandSpans(
    "Total normal. Acrescente após comentários, que o exame foi realizado em 1 recém-nascido de 3 dias de vida.",
    TYPED,
  );
  check("43657c4b: clean mantém 'Total normal'", /Total normal/i.test(clean), clean);
  check("43657c4b: clean SEM o comando (comentários/recém-nascido)", !/coment[áa]rios|recém-nascido/i.test(clean), clean);
  check("43657c4b: span capturado", stripped.some((s) => /coment[áa]rios/i.test(s)), JSON.stringify(stripped));
}

// ── 89de6e68: "no lugar da frase do resíduo escreva ..." (typedEngine) → removido ──
{
  const { clean } = stripCommandSpans(
    "Próstata medindo 3.6 por 3.7 por 5.3, volume pré-miccional de 463. Na conclusão, no lugar da frase do resíduo pós-miccional, escreva, não foi possível aferir o resíduo.",
    TYPED,
  );
  check("89de6e68: clean mantém clínico (próstata/463)", /pr[óo]stata/i.test(clean) && /463/.test(clean), clean);
  check("89de6e68: clean SEM 'no lugar'/'escreva'", !/no\s+lugar|escreva/i.test(clean), clean);
}

// ── 88543eea: "na conclusão, pode colocar como cisto de óleo" → removido (verbo "pode colocar") ──
{
  const { clean } = stripCommandSpans(
    "Imagem hipoecoica de mama direita medindo 0.7 por 0.4. É na conclusão, pode colocar como cisto de óleo.",
  );
  check("88543eea: clean mantém o nódulo (hipoecoica/0.7)", /hipoecoica/i.test(clean) && /0\.7/.test(clean), clean);
  check("88543eea: clean SEM 'na conclusão, pode colocar'", !/na\s+conclus[ãa]o|pode colocar/i.test(clean), clean);
}

// ── CONTROLE: ditado SEM comando → byte-idêntico ──
{
  const raw = "Fígado de dimensões normais. Baço normal. Rins de aspecto normal.";
  const { clean, stripped } = stripCommandSpans(raw, TYPED);
  check("sem comando: clean === raw", clean === raw, `clean='${clean}'`);
  check("sem comando: nada removido", stripped.length === 0, JSON.stringify(stripped));
}

// ══ ADVERSARIAIS dex1: NÃO pode over-stripar conteúdo clínico ══
{
  const raw = "Na conclusão do exame físico, paciente refere dor no hipocôndrio direito.";
  const { clean } = stripCommandSpans(raw, TYPED);
  check("adv1: 'na conclusão do exame físico' NÃO removido", clean === raw, clean);
}
{
  const raw = "Imagem nodular recomendar controle evolutivo medindo 0,8 cm na mama direita.";
  const { clean } = stripCommandSpans(raw, TYPED);
  check("adv2: 'recomendar' solto NÃO remove o achado/medida", /0,8\s*cm/i.test(clean) && /mama direita/i.test(clean), clean);
}
{
  const raw = "O laudo prévio inclui comentários sobre cisto renal simples.";
  const { clean } = stripCommandSpans(raw, TYPED);
  check("adv3: 'inclui comentários sobre' NÃO removido", clean === raw, clean);
}
{
  const raw = "Na conclusão, paciente refere melhora dos sintomas.";
  const { clean } = stripCommandSpans(raw, TYPED);
  check("adv4: 'na conclusão,' sem verbo de comando NÃO removido", clean === raw, clean);
}

// ── flag-combo: SEM typedEngine, comentário/replace NÃO são removidos (evita lost-command) ──
{
  const raw = "Total normal. Acrescente nos comentários que exame em recém-nascido.";
  const { clean } = stripCommandSpans(raw); // sem typedEngine
  check("sem typedEngine: comentário NÃO removido (lost-command guard)", /coment[áa]rios/i.test(clean), clean);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
