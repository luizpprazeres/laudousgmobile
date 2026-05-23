import { env } from "@/server/env";

// Whitelist controlada via env var BETA_TESTER_EMAILS (CSV: a@x.com,b@y.com).
// Pra esses emails, /api/me/profile retorna plan='pro' sem tocar no DB —
// permite testers TestFlight verem tudo liberado sem passar pelo paywall.
// Apple Reviewer também deve estar nessa lista durante o submit.
export function isBetaTester(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = env().BETA_TESTER_EMAILS;
  if (!raw) return false;
  const normalized = email.trim().toLowerCase();
  const list = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(normalized);
}
