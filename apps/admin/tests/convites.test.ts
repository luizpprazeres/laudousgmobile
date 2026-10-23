/**
 * Convites (story cortesias): formulário, senha provisória, texto do convite, situação, rotas (com
 * repositório falso) e o SQL real das migrações no PGlite (funções, grants e a migração das contas pro).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { ALFABETO_SENHA, gerarSenha, lerConvite, mailto, situacao, textoConvite, LINK_DOWNLOAD } from "../src/lib/convites/regras";
import { criarRotasConvites, type AutorizadoComId } from "../src/lib/convites/rotas";
import type { RepositorioConvites } from "../src/lib/convites/servidor";
import type { ConfigServidor } from "../src/lib/env";

const RAIZ = join(__dirname, "..");
const ORIGEM = "https://app.laudousg.com.br";
const CFG = { origemPublica: ORIGEM, supabaseUrl: "https://x.supabase.co" } as ConfigServidor;
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const SENHA = "Abcd-ef23-GHjk";

// ---------- formulário ----------

test("convite: valida nome, e-mail, CRM+UF juntos e dias", () => {
  const ok = lerConvite({ nome: "  Ana   Souza ", email: " Ana@Exemplo.COM ", crm: "12345", uf: "al", dias: "" });
  assert.deepEqual(ok, { ok: true, dados: { nome: "Ana Souza", email: "ana@exemplo.com", crm: "12345", uf: "AL", dias: 30 } });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co" }), { ok: true, dados: { nome: "Ana", email: "a@b.co", crm: null, uf: null, dias: 30 } });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co", crm: "12345" }), { ok: false, erro: "crm_e_uf_juntos" });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co", uf: "SP" }), { ok: false, erro: "crm_e_uf_juntos" });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co", crm: "CRM 123", uf: "SP" }), { ok: false, erro: "crm" });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co", crm: "1234", uf: "XX" }), { ok: false, erro: "uf" });
  assert.deepEqual(lerConvite({ nome: "", email: "a@b.co" }), { ok: false, erro: "nome" });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "sem-arroba" }), { ok: false, erro: "email" });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co", dias: "0" }), { ok: false, erro: "dias" });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co", dias: "366" }), { ok: false, erro: "dias" });
  assert.deepEqual(lerConvite({ nome: "Ana", email: "a@b.co", dias: "2.5" }), { ok: false, erro: "dias" });
});

// ---------- senha ----------

test("senha provisória: 3 grupos de 4, sem ambíguos, com maiúscula, minúscula e dígito, sem repetir", () => {
  const vistas = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const s = gerarSenha();
    assert.match(s, /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
    assert.doesNotMatch(s, /[0O1lI]/);
    for (const ch of s.replace(/-/g, "")) assert.ok(ALFABETO_SENHA.includes(ch));
    assert.ok(/[A-Z]/.test(s) && /[a-z]/.test(s) && /\d/.test(s), s);
    vistas.add(s);
  }
  assert.equal(vistas.size, 300);
  // sorteio que só devolve letra maiúscula nas primeiras tentativas: refaz até ter os três tipos
  let n = 0;
  const viciado = (m: number) => (n++ < 24 ? 0 : (n * 7) % m);
  assert.ok(/\d/.test(gerarSenha(viciado)));
});

// ---------- texto ----------

test("texto do convite: e-mail, senha, prazo em SP, link e o caminho real da troca de senha", () => {
  const { assunto, corpo } = textoConvite({ nome: "Ana Souza", email: "ana@exemplo.com", senha: SENHA, fim: "2026-11-22T02:30:00Z" });
  assert.equal(assunto, "Sua conta no LaudoUSG está pronta");
  assert.ok(corpo.startsWith("Olá, Ana!"));
  assert.ok(corpo.includes("E-mail: ana@exemplo.com") && corpo.includes(`Senha provisória: ${SENHA}`));
  assert.ok(corpo.includes("Pro já está liberado até 21/11/2026"), "fim no fuso de São Paulo");
  assert.ok(corpo.includes(LINK_DOWNLOAD));
  assert.ok(corpo.includes('"Esqueci a senha"'));
  const existente = textoConvite({ nome: "Ana", email: "ana@exemplo.com", senha: null, fim: "2026-11-22T12:00:00Z" });
  assert.ok(!existente.corpo.includes("Senha provisória"));
  const m = mailto("ana+x@exemplo.com", assunto, corpo);
  assert.ok(m.startsWith("mailto:ana%2Bx@exemplo.com?subject=Sua%20conta"));
  assert.equal(decodeURIComponent(m.split("&body=")[1]!), corpo);
});

// ---------- situação ----------

test("situação: vigente, expira em N dias, expirou, revogada, assinou, sem prazo", () => {
  const agora = Date.parse("2026-10-23T12:00:00Z");
  const dia = 86_400_000;
  const c = (fim: number | null, revogada: string | null = null) => ({ inicio: new Date(agora - dia).toISOString(), fim: fim === null ? null : new Date(fim).toISOString(), revogada_em: revogada });
  assert.equal(situacao(c(agora + 20 * dia), agora, false).rotulo, "Vigente");
  assert.equal(situacao(c(agora + 3 * dia), agora, false).rotulo, "Expira em 3 dias");
  assert.equal(situacao(c(agora + 0.5 * dia), agora, false).rotulo, "Expira em 1 dia");
  assert.equal(situacao(c(agora - dia), agora, false).rotulo, "Expirou");
  assert.equal(situacao(c(agora - dia), agora, true).rotulo, "Assinou");
  assert.equal(situacao(c(agora + 20 * dia, "2026-10-22T00:00:00Z"), agora, true).rotulo, "Revogada");
  assert.equal(situacao(c(null), agora, false).rotulo, "Vigente (sem prazo)");
});

// ---------- rotas (repositório falso) ----------

interface Registro {
  chamadas: string[];
  criados: { email: string; senha: string; nome: string; crm: string | null; uf: string | null }[];
  concedidos: unknown[][];
  apagados: string[];
}

function repoFalso(o: { existentes?: Record<string, string>; criar?: "ok" | "existe" | "falha"; conceder?: "ok" | "falha" } = {}): RepositorioConvites & { reg: Registro } {
  const reg: Registro = { chamadas: [], criados: [], concedidos: [], apagados: [] };
  const existentes = { ...(o.existentes ?? {}) };
  return {
    reg,
    async usuarioPorEmail(email) {
      reg.chamadas.push("usuarioPorEmail");
      return existentes[email] ?? null;
    },
    async criarUsuario(p) {
      reg.chamadas.push("criarUsuario");
      reg.criados.push(p);
      if (o.criar === "existe") {
        existentes[p.email] = "00000000-0000-4000-8000-0000000000e1";
        return "existe";
      }
      if (o.criar === "falha") return "falha";
      return { id: "00000000-0000-4000-8000-0000000000c1" };
    },
    async apagarUsuario(id) {
      reg.chamadas.push("apagarUsuario");
      reg.apagados.push(id);
    },
    async conceder(...args) {
      reg.chamadas.push("conceder");
      reg.concedidos.push(args);
      return o.conceder === "falha" ? { resultado: "falha" } : { resultado: "ok", fim: "2026-11-22T12:00:00.000Z" };
    },
    async estender() {
      reg.chamadas.push("estender");
      return "ok";
    },
    async revogar() {
      reg.chamadas.push("revogar");
      return "ok";
    },
    async listar() {
      return [];
    },
  };
}

const autorizado = async (): Promise<AutorizadoComId> => ({ cfg: CFG, cookies: null, userId: ADMIN });
const pedido = (corpo: unknown, tipo = "application/json") =>
  new Request(`${ORIGEM}/admin/api/convites/criar`, { method: "POST", headers: { "Content-Type": tipo, Origin: ORIGEM }, body: typeof corpo === "string" ? corpo : JSON.stringify(corpo) });

/** Captura tudo que vai ao console durante `f`. */
async function semLog<T>(f: () => Promise<T>): Promise<{ r: T; log: string }> {
  const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  let log = "";
  const pega = (...a: unknown[]) => { log += a.map(String).join(" ") + "\n"; };
  Object.assign(console, { log: pega, warn: pega, error: pega, info: pega });
  try {
    return { r: await f(), log };
  } finally {
    Object.assign(console, orig);
  }
}

test("rota sem sessão de admin → 404 e nada é tocado", async () => {
  const repo = repoFalso();
  const rotas = criarRotasConvites({ autorizar: async () => null, repo: () => repo, senha: () => SENHA });
  for (const h of [rotas.criar, rotas.estender, rotas.revogar]) {
    const r = await h(pedido({ nome: "Ana", email: "a@b.co" }));
    assert.equal(r.status, 404);
  }
  assert.deepEqual(repo.reg.chamadas, []);
});

test("e-mail novo: cria a conta com a senha gerada e libera o Pro; a senha só volta na resposta", async () => {
  const repo = repoFalso();
  const rotas = criarRotasConvites({ autorizar: autorizado, repo: () => repo, senha: () => SENHA });
  const { r, log } = await semLog(() => rotas.criar(pedido({ nome: "Ana Souza", email: "Ana@Exemplo.com", crm: "12345", uf: "SP", dias: 30 })));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const j = (await r.json()) as Record<string, unknown>;
  assert.deepEqual(j, { resultado: "criada", nome: "Ana Souza", email: "ana@exemplo.com", fim: "2026-11-22T12:00:00.000Z", senha: SENHA });
  assert.deepEqual(repo.reg.criados, [{ email: "ana@exemplo.com", senha: SENHA, nome: "Ana Souza", crm: "12345", uf: "SP" }]);
  assert.deepEqual(repo.reg.concedidos, [["00000000-0000-4000-8000-0000000000c1", 30, ADMIN]]);
  // a senha não vai para a cortesia (banco do app) nem para o log
  assert.ok(!JSON.stringify(repo.reg.concedidos).includes(SENHA));
  assert.ok(!log.includes(SENHA));
});

test("e-mail que já tem conta: não cria, não troca senha, só libera o Pro", async () => {
  const repo = repoFalso({ existentes: { "ana@exemplo.com": "00000000-0000-4000-8000-0000000000e1" } });
  let geradas = 0;
  const rotas = criarRotasConvites({ autorizar: autorizado, repo: () => repo, senha: () => (geradas++, SENHA) });
  const r = await rotas.criar(pedido({ nome: "Ana", email: "ana@exemplo.com" }));
  const j = (await r.json()) as Record<string, unknown>;
  assert.equal(j.resultado, "existente");
  assert.equal(j.senha, undefined);
  assert.equal(geradas, 0);
  assert.ok(!repo.reg.chamadas.includes("criarUsuario"));
  assert.deepEqual(repo.reg.concedidos, [["00000000-0000-4000-8000-0000000000e1", 30, ADMIN]]);
});

test("corrida: o Auth diz que o e-mail já existe → trata como existente e não devolve senha", async () => {
  const repo = repoFalso({ criar: "existe" });
  const rotas = criarRotasConvites({ autorizar: autorizado, repo: () => repo, senha: () => SENHA });
  const j = (await (await rotas.criar(pedido({ nome: "Ana", email: "ana@exemplo.com" }))).json()) as Record<string, unknown>;
  assert.equal(j.resultado, "existente");
  assert.equal(j.senha, undefined);
});

test("CRM sem UF, corpo inválido ou não-JSON → 400 sem tocar no Auth nem no banco", async () => {
  const repo = repoFalso();
  const rotas = criarRotasConvites({ autorizar: autorizado, repo: () => repo, senha: () => SENHA });
  const r1 = await rotas.criar(pedido({ nome: "Ana", email: "a@b.co", crm: "12345" }));
  assert.equal(r1.status, 400);
  assert.deepEqual(await r1.json(), { erro: "crm_e_uf_juntos" });
  assert.equal((await rotas.criar(pedido("{nao json"))).status, 400);
  assert.equal((await rotas.criar(pedido("nome=Ana&email=a@b.co", "application/x-www-form-urlencoded"))).status, 400);
  assert.equal((await rotas.criar(pedido({ nome: "Ana", email: "a@b.co", x: "y".repeat(5000) }))).status, 400);
  assert.deepEqual(repo.reg.chamadas, []);
});

test("Pro não liberado depois de criar a conta → desfaz a conta e não devolve senha", async () => {
  const repo = repoFalso({ conceder: "falha" });
  const rotas = criarRotasConvites({ autorizar: autorizado, repo: () => repo, senha: () => SENHA });
  const { r, log } = await semLog(() => rotas.criar(pedido({ nome: "Ana", email: "ana@exemplo.com" })));
  assert.equal(r.status, 503);
  const j = (await r.json()) as Record<string, unknown>;
  assert.deepEqual(j, { erro: "banco" });
  assert.deepEqual(repo.reg.apagados, ["00000000-0000-4000-8000-0000000000c1"]);
  assert.ok(!log.includes(SENHA));
});

test("Auth falhou ao criar → 502, sem cortesia", async () => {
  const repo = repoFalso({ criar: "falha" });
  const rotas = criarRotasConvites({ autorizar: autorizado, repo: () => repo, senha: () => SENHA });
  const r = await rotas.criar(pedido({ nome: "Ana", email: "ana@exemplo.com" }));
  assert.equal(r.status, 502);
  assert.ok(!repo.reg.chamadas.includes("conceder"));
});

test("estender e revogar: id inválido volta com erro; válido chama o repositório e redireciona 303", async () => {
  const repo = repoFalso();
  const rotas = criarRotasConvites({ autorizar: autorizado, repo: () => repo, senha: () => SENHA });
  const form = (url: string, campos: Record<string, string>) => new Request(`${ORIGEM}/admin/api/convites/${url}`, { method: "POST", headers: { Origin: ORIGEM }, body: new URLSearchParams(campos) });
  const ruim = await rotas.estender(form("estender", { id: "x" }));
  assert.equal(ruim.status, 303);
  assert.match(ruim.headers.get("location") ?? "", /\/admin\/convites\?erro=pedido$/);
  const id = "00000000-0000-4000-8000-000000000011";
  const ok = await rotas.estender(form("estender", { id, dias: "30" }));
  assert.match(ok.headers.get("location") ?? "", /^https:\/\/app\.laudousg\.com\.br\/admin\/convites\?ok=estendida$/);
  const rv = await rotas.revogar(form("revogar", { id }));
  assert.match(rv.headers.get("location") ?? "", /ok=revogada$/);
  assert.deepEqual(repo.reg.chamadas, ["estender", "revogar"]);
});

// ---------- SQL real (PGlite) ----------

async function banco() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.profiles(id uuid primary key, plan text not null default 'free', role text not null default 'user');
    create table public.subscriptions(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), status text not null, expires_at timestamptz not null);`);
  for (const m of ["20261023013652_cortesias.sql", "20261023013700_cortesias_migrar_pro_manual.sql"])
    await db.exec(readFileSync(join(RAIZ, "..", "..", "supabase", "migrations", m), "utf8"));
  return db;
}
const um = async <T>(db: PGlite, sql: string, args: unknown[] = []) => (await db.query<{ v: T }>(sql, args)).rows[0]!.v;
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("SQL: cortesias com RLS, sem acesso de anon/authenticated, funções só para o service_role", async () => {
  const db = await banco();
  assert.equal(await um(db, "select relrowsecurity v from pg_class where relname='cortesias'"), true);
  for (const papel of ["anon", "authenticated"]) {
    assert.equal(await um(db, `select has_table_privilege('${papel}','public.cortesias','SELECT') v`), false, papel);
    for (const f of ["cortesia_conceder(uuid,integer,uuid)", "cortesia_estender(uuid,integer)", "cortesia_revogar(uuid)"])
      assert.equal(await um(db, `select has_function_privilege('${papel}','public.${f}','EXECUTE') v`), false, `${papel} ${f}`);
  }
  for (const f of ["cortesia_conceder(uuid,integer,uuid)", "cortesia_estender(uuid,integer)", "cortesia_revogar(uuid)"])
    assert.equal(await um(db, `select has_function_privilege('service_role','public.${f}','EXECUTE') v`), true, f);
  const colunasTexto = await um<number>(db, "select count(*)::int v from information_schema.columns where table_name='cortesias' and data_type='text' and column_name not in ('tier','origem')");
  assert.equal(colunasTexto, 0, "nenhuma coluna de texto livre");
});

test("SQL: conceder, estender e revogar", async () => {
  const db = await banco();
  await db.query("insert into public.profiles(id) values ($1),($2)", [U(1), U(99)]);
  const r = await um<{ resultado: string; id: string; fim: string }>(db, "select public.cortesia_conceder($1,30,$2) v", [U(1), U(99)]);
  assert.equal(r.resultado, "ok");
  const dias = await um<number>(db, "select round(extract(epoch from (fim - now()))/86400)::int v from public.cortesias where id=$1", [r.id]);
  assert.equal(dias, 30);
  assert.equal(await um(db, "select origem v from public.cortesias where id=$1", [r.id]), "convite");
  assert.equal((await um<{ resultado: string }>(db, "select public.cortesia_conceder($1,0,null) v", [U(1)])).resultado, "dias");
  assert.equal((await um<{ resultado: string }>(db, "select public.cortesia_conceder($1,30,null) v", [U(5)])).resultado, "sem_perfil");

  assert.equal(await um(db, "select public.cortesia_estender($1,30) v", [r.id]), "ok");
  assert.equal(await um<number>(db, "select round(extract(epoch from (fim - now()))/86400)::int v from public.cortesias where id=$1", [r.id]), 60);
  // vencida: estende a partir de agora
  await db.query("update public.cortesias set inicio = now() - interval '50 days', fim = now() - interval '10 days' where id=$1", [r.id]);
  assert.equal(await um(db, "select public.cortesia_estender($1,30) v", [r.id]), "ok");
  assert.equal(await um<number>(db, "select round(extract(epoch from (fim - now()))/86400)::int v from public.cortesias where id=$1", [r.id]), 30);

  assert.equal(await um(db, "select public.cortesia_revogar($1) v", [r.id]), "ok");
  assert.equal(await um(db, "select public.cortesia_revogar($1) v", [r.id]), "revogada");
  assert.equal(await um(db, "select public.cortesia_estender($1,30) v", [r.id]), "revogada");
  assert.equal(await um(db, "select public.cortesia_revogar($1) v", [U(77)]), "nao_encontrado");
  await db.query("insert into public.cortesias(user_id, fim) values ($1, null)", [U(1)]);
  const semPrazo = await um<string>(db, "select id v from public.cortesias where fim is null");
  assert.equal(await um(db, "select public.cortesia_estender($1,30) v", [semPrazo]), "sem_prazo");
});

test("SQL: migração das contas pro manuais vira convite de 30 dias e é idempotente", async () => {
  const db = await banco(); // a migração já rodou uma vez com o banco vazio
  await db.query("insert into public.profiles(id, plan, role) values ($1,'pro','user'),($2,'pro','user'),($3,'pro','user'),($4,'pro','admin'),($5,'free','user')", [U(1), U(2), U(3), U(4), U(5)]);
  await db.query("insert into public.subscriptions(user_id,status,expires_at) values ($1,'active', now() + interval '10 days')", [U(3)]);
  const migrar = readFileSync(join(RAIZ, "..", "..", "supabase", "migrations", "20261023013700_cortesias_migrar_pro_manual.sql"), "utf8");
  await db.exec(migrar);
  const planos = (await db.query<{ id: string; plan: string }>("select id, plan from public.profiles order by id")).rows.map((r) => r.plan);
  assert.deepEqual(planos, ["free", "free", "pro", "pro", "free"], "só os pro sem assinatura e com role user");
  const cort = (await db.query<{ user_id: string; origem: string; dias: number }>("select user_id, origem, round(extract(epoch from (fim - now()))/86400)::int dias from public.cortesias order by user_id")).rows;
  assert.deepEqual(cort, [{ user_id: U(1), origem: "convite", dias: 30 }, { user_id: U(2), origem: "convite", dias: 30 }]);
  await db.exec(migrar);
  assert.equal(await um<number>(db, "select count(*)::int v from public.cortesias"), 2, "rodar de novo não duplica");
});
