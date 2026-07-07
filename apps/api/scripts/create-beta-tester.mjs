// Cria conta de beta tester com plano pro, conforme runbooks
// auth-account-provisioning.md e beta-tester-onboarding.md.
// Uso: node apps/api/scripts/create-beta-tester.mjs <email> <senha> <"Nome Completo"> ["CRM-UF 0000"]
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(apiRoot, "package.json"));
const { createClient } = require("@supabase/supabase-js");

const [EMAIL, PASSWORD, NAME, CRM] = process.argv.slice(2);
if (!EMAIL || !PASSWORD || !NAME) {
  console.error('Uso: node create-beta-tester.mjs <email> <senha> <"Nome Completo"> ["CRM-UF 0000"]');
  process.exit(1);
}

const envFile = readFileSync(join(apiRoot, ".env.local"), "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) Admin API oficial (nunca SQL direto em auth.users — bug GoTrue de colunas NULL)
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: CRM ? { name: NAME, crm: CRM } : { name: NAME },
});
if (createErr) {
  console.error("ERRO createUser:", createErr.message);
  process.exit(1);
}
const uid = created.user.id;
console.log("createUser OK:", uid);

// 2) Trigger handle_new_user espelha em public.profiles — aguarda e promove a pro
await new Promise((r) => setTimeout(r, 1500));
const { data: prof, error: updErr } = await admin
  .from("profiles")
  .update({ name: NAME, plan: "pro", updated_at: new Date().toISOString() })
  .eq("id", uid)
  .select("id,email,name,plan,role")
  .single();
if (updErr) {
  console.error("ERRO update profile:", updErr.message);
  process.exit(1);
}
console.log("profile:", JSON.stringify(prof));

// 3) Login real com anon key — audita o bug GoTrue na prática
const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: login, error: loginErr } = await anon.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (loginErr) {
  console.error("ERRO login:", loginErr.message);
  process.exit(1);
}
console.log("login OK, access_token presente:", !!login.session?.access_token);
console.log("\nPronto. Lembretes: adicionar o e-mail à lista de testadores no Play Console e gerar o convite (beta-tester-onboarding.md).");
