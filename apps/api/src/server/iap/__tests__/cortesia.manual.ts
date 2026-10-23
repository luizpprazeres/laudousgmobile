/**
 * GATE — cortesia (convite do painel): vigência, revogação, sem prazo, maior tier
 * e a combinação com o plano do site, a assinatura Apple e a whitelist beta.
 *
 *   tsx --tsconfig apps/api/tsconfig.json --env-file=apps/api/.env.local apps/api/src/server/iap/__tests__/cortesia.manual.ts
 * (a seção da whitelist lê `env()`, que valida o .env inteiro)
 */

import { cortesiaOut, cortesiaVigente, maiorTier, type CortesiaRecord } from "../cortesia";
import { resolveEffectivePlan, type ProfilePlan } from "../entitlement";
import { isBetaTester } from "../betaWhitelist";
import type { SubscriptionTier } from "../types";
import { check, finish, section } from "./harness";
import { DAY } from "./fixtures";

const agora = new Date("2026-10-23T12:00:00Z");
const em = (dias: number) => new Date(agora.getTime() + dias * DAY);
const c = (p: Partial<CortesiaRecord>): CortesiaRecord => ({ tier: "pro", origem: "convite", inicio: em(-1), fim: em(29), revogadaEm: null, ...p });

section("Vigência");
check("convite de 30 dias no meio ⇒ vale", cortesiaVigente([c({})], agora) !== null);
check("fim exatamente agora ⇒ não vale", cortesiaVigente([c({ fim: agora })], agora) === null);
check("vencida ⇒ não vale", cortesiaVigente([c({ inicio: em(-40), fim: em(-10) })], agora) === null);
check("começa amanhã ⇒ ainda não vale", cortesiaVigente([c({ inicio: em(1), fim: em(31) })], agora) === null);
check("revogada ⇒ não vale", cortesiaVigente([c({ revogadaEm: em(-0.5) })], agora) === null);
check("sem prazo ⇒ vale", cortesiaVigente([c({ fim: null })], agora)?.fim === null);
check("nenhuma ⇒ null", cortesiaVigente([], agora) === null);

section("Escolha entre várias");
const essencialLonga = c({ tier: "essencial", fim: em(300) });
const proCurta = c({ tier: "pro", fim: em(3) });
check("maior tier vence prazo maior", cortesiaVigente([essencialLonga, proCurta], agora) === proCurta);
const proLonga = c({ fim: em(60) });
check("empate de tier ⇒ a que vence mais tarde", cortesiaVigente([proCurta, proLonga], agora) === proLonga);
const semPrazo = c({ fim: null, origem: "cortesia" });
check("empate com sem prazo ⇒ sem prazo", cortesiaVigente([proLonga, semPrazo], agora) === semPrazo);
check("revogada não ganha de vigente menor", cortesiaVigente([c({ revogadaEm: em(-1), fim: null }), essencialLonga], agora) === essencialLonga);

section("Saída da API");
const out = cortesiaOut(proLonga);
check("cortesiaOut: tier, fim ISO e origem", out?.tier === "pro" && out.fim === em(60).toISOString() && out.origem === "convite", out);
check("cortesiaOut(null) ⇒ null", cortesiaOut(null) === null);

section("Plano efetivo = max(site, Apple, cortesia)");
const matriz: [ProfilePlan, SubscriptionTier | null, SubscriptionTier | null, ProfilePlan][] = [
  ["free", null, null, "free"],
  ["free", null, "pro", "clinic"], // convite Pro aparece como o Pro da Apple (o iOS aceita clinic/pro)
  ["free", null, "essencial", "essencial"],
  ["free", "essencial", "pro", "clinic"],
  ["free", "pro", "essencial", "clinic"],
  ["essencial", null, "pro", "clinic"],
  ["clinic", null, "essencial", "clinic"], // site maior fica
  ["pro", null, "pro", "clinic"],
];
for (const [web, apple, cort, esperado] of matriz) {
  const r = resolveEffectivePlan(web, maiorTier(apple, cort));
  check(`site=${web} + apple=${apple ?? "—"} + cortesia=${cort ?? "—"} ⇒ ${esperado}`, r === esperado, r);
}
check("maiorTier sem nada ⇒ null", maiorTier(null, undefined) === null);

section("Whitelist beta continua por cima (a rota testa isBetaTester antes)");
const antes = process.env.BETA_TESTER_EMAILS;
process.env.BETA_TESTER_EMAILS = "beta@exemplo.com";
check("beta sem cortesia ⇒ pro pela whitelist", isBetaTester("Beta@Exemplo.com"));
check("não-beta depende da cortesia", !isBetaTester("outro@exemplo.com"));
if (antes === undefined) delete process.env.BETA_TESTER_EMAILS;
else process.env.BETA_TESTER_EMAILS = antes;

finish();
