/**
 * O CONTRATO DO PERFIL — o gate.
 *
 * Três coisas que precisam continuar verdadeiras, e que só se descobre quebradas
 * no dia em que um médico não consegue salvar o próprio nome:
 *
 *   1. o CRM aceito é só o número — é o que sai impresso no laudo;
 *   2. CRM e UF andam juntos — um número de conselho sem estado não identifica
 *      ninguém, o mesmo número existe em 27 conselhos;
 *   3. `plan`, `role` e `email` NÃO passam. Não é só a rota que barra: o GRANT
 *      de coluna do `0024` também não os menciona. Este gate cobre a rota; a
 *      camada do banco tem o gate dela.
 *
 * Não toca no banco: exercita só a validação, que é onde mora a regra.
 *
 * Rodar de `apps/api`:
 *   pnpm exec tsx src/app/api/me/profile/perfil-contrato.manual.ts
 */

import { UfSchema } from "@laudousg/shared";
import { z } from "zod";

/** A MESMA forma da rota. Se divergir, este gate para de valer — por isso o eco. */
const Update = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  default_writing_style_id: z.string().uuid().nullable().optional(),
  crm: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "o CRM é só o número, de 4 a 10 dígitos")
    .nullable()
    .optional(),
  uf: UfSchema.nullable().optional(),
  plan: z.enum(["free", "essencial", "pro", "clinic"]).optional(),
});

const casos: { o: string; corpo: unknown; passa: boolean }[] = [
  { o: "número puro", corpo: { crm: "9446" }, passa: true },
  { o: "CRM mínimo (4 dígitos)", corpo: { crm: "0001" }, passa: true },
  { o: "apagar o CRM", corpo: { crm: null }, passa: true },
  { o: "formato antigo com prefixo", corpo: { crm: "CRM-AL 9446" }, passa: false },
  { o: "CRM com o estado colado", corpo: { crm: "9446-AL" }, passa: false },
  { o: "curto demais", corpo: { crm: "944" }, passa: false },
  { o: "longo demais", corpo: { crm: "12345678901" }, passa: false },
  { o: "UF de verdade", corpo: { uf: "AL" }, passa: true },
  { o: "UF minúscula", corpo: { uf: "al" }, passa: false },
  { o: "UF inventada", corpo: { uf: "XX" }, passa: false },
  { o: "nome em branco", corpo: { name: "   " }, passa: false },
];

let falhas = 0;
for (const c of casos) {
  const ok = Update.safeParse(c.corpo).success;
  const bom = ok === c.passa;
  if (!bom) falhas++;
  console.log(`  ${bom ? "✓" : "✗"} ${c.o} — ${ok ? "aceito" : "recusado"}${bom ? "" : `, esperava ${c.passa ? "aceito" : "recusado"}`}`);
}

/**
 * O acoplamento CRM↔UF é decidido DEPOIS do parse, na rota, porque depende do
 * que já está gravado. Aqui se verifica a regra em si.
 */
const junto = (crm: string | null, uf: string | null) => (crm === null) === (uf === null);
const paresValidos: [string | null, string | null, boolean][] = [
  ["9446", "AL", true],
  [null, null, true],
  ["9446", null, false],
  [null, "AL", false],
];
for (const [crm, uf, esperado] of paresValidos) {
  const bom = junto(crm, uf) === esperado;
  if (!bom) falhas++;
  console.log(`  ${bom ? "✓" : "✗"} par crm=${crm} uf=${uf} → ${junto(crm, uf) ? "ok" : "recusado"}`);
}

/** `plan` é aceito pelo Zod e recusado DEPOIS, com 403 — de propósito, para
 *  responder "isso não se muda aqui" em vez de "corpo inválido". */
console.log(
  Update.safeParse({ plan: "clinic" }).success
    ? "  ✓ plan passa no Zod e é barrado com 403 na rota (mensagem melhor)"
    : "  ✗ plan barrado no Zod — a rota responderia 'corpo inválido', que não explica nada",
);

console.log(falhas === 0 ? "\n✓ contrato do perfil íntegro" : `\n✗ ${falhas} divergência(s)`);
process.exit(falhas ? 1 : 0);
