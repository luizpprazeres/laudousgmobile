import assert from "node:assert/strict";
import { test } from "node:test";
import { decidirAcesso, emailPermitido, lerAllowlist, origemConfere, rotaPublica, type ContextoAcesso } from "../src/lib/auth/acesso";
import { configServidor } from "../src/lib/env";

const base: ContextoAcesso = { configurado: true, email: "admin@exemplo.com", nivel: "aal2", papel: "admin", allowlist: ["admin@exemplo.com"] };

test("admin com MFA, na allowlist e com papel admin: entra", () => {
  assert.equal(decidirAcesso(base), "permitir");
});

test("sem MFA (aal1) NUNCA entra: vai para a etapa de MFA", () => {
  assert.equal(decidirAcesso({ ...base, nivel: "aal1" }), "mfa");
  assert.equal(decidirAcesso({ ...base, nivel: null }), "mfa");
  // ADMIN_REQUIRE_MFA=false: aal1 passa, mas allowlist e papel continuam valendo
  assert.equal(decidirAcesso({ ...base, nivel: "aal1", exigirMfa: false }), "permitir");
  assert.equal(decidirAcesso({ ...base, nivel: "aal1", exigirMfa: false, papel: "user" }), "negar");
  assert.equal(decidirAcesso({ ...base, nivel: "aal1", exigirMfa: false, email: "outro@exemplo.com" }), "negar");
  assert.equal(decidirAcesso({ ...base, nivel: "aal1", exigirMfa: true }), "mfa");
});

test("e-mail fora da allowlist é negado, mesmo com MFA e papel admin", () => {
  assert.equal(decidirAcesso({ ...base, email: "outro@exemplo.com" }), "negar");
  assert.equal(decidirAcesso({ ...base, email: "outro@exemplo.com", nivel: "aal1" }), "negar");
});

test("allowlist vazia nega todo mundo", () => {
  assert.equal(decidirAcesso({ ...base, allowlist: [] }), "negar");
});

test("papel diferente de admin é negado", () => {
  assert.equal(decidirAcesso({ ...base, papel: "user" }), "negar");
  assert.equal(decidirAcesso({ ...base, papel: null }), "negar");
});

test("sem sessão vai para o login; sem configuração nega (falha fechada)", () => {
  assert.equal(decidirAcesso({ ...base, email: null, nivel: null, papel: null }), "login");
  assert.equal(decidirAcesso({ ...base, configurado: false }), "negar");
});

test("allowlist normaliza caixa e espaços", () => {
  assert.deepEqual(lerAllowlist(" A@X.com, b@y.com ;; lixo,"), ["a@x.com", "b@y.com"]);
  assert.equal(emailPermitido("  A@x.COM ", ["a@x.com"]), true);
  assert.equal(emailPermitido(null, ["a@x.com"]), false);
});

test("config do servidor ausente ou sem allowlist → null (painel nega tudo)", () => {
  assert.equal(configServidor({}), null);
  assert.equal(configServidor({ SUPABASE_URL: "u", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", ADMIN_EMAILS: "" }), null);
  assert.ok(configServidor({ SUPABASE_URL: "u", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", ADMIN_EMAILS: "a@x.com" }));
  const env = { SUPABASE_URL: "u", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", ADMIN_EMAILS: "a@x.com" };
  assert.equal(configServidor(env)?.exigirMfa, true);
  assert.equal(configServidor({ ...env, ADMIN_REQUIRE_MFA: "false" })?.exigirMfa, false);
  assert.equal(configServidor({ ...env, ADMIN_REQUIRE_MFA: "no" })?.exigirMfa, true);
});

test("só login, MFA e logout são públicas; o resto exige sessão completa", () => {
  for (const r of ["/login", "/mfa", "/api/auth/login", "/api/auth/mfa", "/api/auth/logout", "/login/"]) assert.equal(rotaPublica(r), true, r);
  for (const r of ["/", "/funil", "/custos", "/api/dados", "/loginx", "/mfa/../"]) assert.equal(rotaPublica(r), false, r);
});

test("POST de outra origem é recusado", () => {
  assert.equal(origemConfere("https://app.laudousg.com.br", "app.laudousg.com.br"), true);
  assert.equal(origemConfere("https://evil.example", "app.laudousg.com.br"), false);
  assert.equal(origemConfere(null, "app.laudousg.com.br"), false);
  // atrás do rewrite: Host é o do deploy, a origem pública configurada vale; outras não
  assert.equal(origemConfere("https://app.laudousg.com.br", "laudousg-admin.vercel.app", "https://app.laudousg.com.br"), true);
  assert.equal(origemConfere("https://evil.example", "laudousg-admin.vercel.app", "https://app.laudousg.com.br"), false);
  assert.equal(origemConfere("http://app.laudousg.com.br", "laudousg-admin.vercel.app", "https://app.laudousg.com.br"), false);
});

test("origem pública: só https sem caminho", async () => {
  const { lerOrigemPublica } = await import("../src/lib/env");
  assert.equal(lerOrigemPublica("https://app.laudousg.com.br"), "https://app.laudousg.com.br");
  assert.equal(lerOrigemPublica("https://app.laudousg.com.br/"), "https://app.laudousg.com.br");
  assert.equal(lerOrigemPublica("http://app.laudousg.com.br"), null);
  assert.equal(lerOrigemPublica("https://app.laudousg.com.br/admin"), null);
  assert.equal(lerOrigemPublica("lixo"), null);
  assert.equal(lerOrigemPublica(undefined), null);
});
