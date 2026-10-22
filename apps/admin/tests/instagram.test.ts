/**
 * Instagram F2: chave e cifra do token, state assinado, ponte do callback (sem cookie), conclusão
 * da conexão, publicação de uma foto com fetch simulado (nunca a API real) e a trava de status.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartaoConta } from "../src/components/Instagram";
import { rotaPublica, rotaSemSessao } from "../src/lib/auth/acesso";
import { colunas, SELECOES } from "../src/lib/data/colunas";
import type { ConfigServidor } from "../src/lib/env";
import { cifrar, decifrar, ENVELOPE, lerChaveSocial } from "../src/lib/social/cifra";
import { configInstagram, type ConfigInstagram } from "../src/lib/social/config";
import type { RepositorioConta } from "../src/lib/social/conta";
import { conferirState, criarState, VALIDADE_STATE_S } from "../src/lib/social/estado";
import { limpar } from "../src/lib/social/instagram";
import { publicarPost, repositorioPublicacao } from "../src/lib/social/publicacao";
import { criarRotasInstagram, type AdminAutorizado, type DependenciasInstagram } from "../src/lib/social/rotas-instagram";
import {
  ADMIN,
  casa,
  CFG,
  CHAVE,
  CHAVE_B64,
  CODE,
  contaMemoria,
  contaValida,
  fetchFalso,
  G,
  graphFalso,
  IG,
  IMG,
  ORIGEM,
  postAprovado,
  publicacaoMemoria,
  relogio,
  type Resposta,
  SECRET,
  semToken,
  T0,
  TOKEN,
  TOKEN_CURTO,
} from "./fixtures/instagram";

// O tsx compila o JSX no modo clássico (React.createElement) fora do Next.
Object.assign(globalThis, { React });

const RAIZ = join(__dirname, "..");
const MIGRACAO = readFileSync(join(RAIZ, "..", "..", "supabase", "migrations", "20261022212039_admin_social.sql"), "utf8");
const MIGRACAO_F3 = readFileSync(join(RAIZ, "..", "..", "supabase", "migrations", "20261022225129_admin_social_f3.sql"), "utf8");

// ---------- chave ----------

test("SOCIAL_TOKEN_KEY: base64 com e sem '=' final, com espaços nas pontas; o resto falha fechado", () => {
  assert.equal(CHAVE_B64.length, 44);
  assert.ok(lerChaveSocial(CHAVE_B64)?.equals(CHAVE));
  assert.ok(lerChaveSocial(CHAVE_B64.replace(/=$/, ""))?.equals(CHAVE), "sem padding (43 caracteres)");
  assert.ok(lerChaveSocial(`  ${CHAVE_B64}\n`)?.equals(CHAVE), "com espaço e quebra de linha");
  assert.ok(lerChaveSocial(`\t${CHAVE_B64.replace(/=$/, "")}\r\n`)?.equals(CHAVE));
  for (const ruim of [
    undefined,
    "",
    "   ",
    randomBytes(16).toString("base64"), // 16 bytes
    randomBytes(31).toString("base64"),
    randomBytes(33).toString("base64"),
    randomBytes(48).toString("base64"),
    CHAVE.toString("hex"), // 64 hex
    CHAVE_B64.slice(0, 10) + "-" + CHAVE_B64.slice(11), // alfabeto base64url (- e _) não é base64 padrão
    CHAVE_B64.slice(0, 10) + "_" + CHAVE_B64.slice(11).replace(/=$/, ""),
    CHAVE_B64.slice(0, 42) + "B=", // último caractere com bits sobrando: não canônico
    CHAVE_B64 + "=",
    CHAVE_B64.slice(0, 20) + " " + CHAVE_B64.slice(20),
  ]) {
    assert.equal(lerChaveSocial(ruim), null, String(ruim));
  }
});

test("config: falta app id, secret, chave válida ou origem pública → indisponível", () => {
  const env = { INSTAGRAM_APP_ID: "1518730570317495", INSTAGRAM_APP_SECRET: SECRET, SOCIAL_TOKEN_KEY: CHAVE_B64.replace(/=$/, "") };
  const ok = configInstagram(ORIGEM, env);
  assert.ok(ok);
  assert.equal(ok.redirectUri, "https://app.laudousg.com.br/admin/api/social/callback");
  assert.ok(ok.chave.equals(CHAVE));
  assert.equal(configInstagram(null, env), null);
  for (const k of Object.keys(env) as (keyof typeof env)[]) {
    assert.equal(configInstagram(ORIGEM, { ...env, [k]: "" }), null, k);
    assert.equal(configInstagram(ORIGEM, { ...env, [k]: undefined }), null, k);
  }
  assert.equal(configInstagram(ORIGEM, { ...env, SOCIAL_TOKEN_KEY: "curta" }), null);
  assert.equal(configInstagram(ORIGEM, { ...env, INSTAGRAM_APP_ID: "abc" }), null);
  // A tela mostra "Conexão indisponível".
  const html = renderToStaticMarkup(CartaoConta({ disponivel: false, conta: null }));
  assert.match(html, /Conexão indisponível/);
  assert.doesNotMatch(html, /api\/social\/conectar/);
});

// ---------- cifra ----------

test("cifra: ida e volta, envelope casa com o CHECK da migração, chave errada e adulteração falham", () => {
  const check = /token_ciphertext ~ '([^']+)'/.exec(MIGRACAO)?.[1];
  assert.ok(check);
  const reCheck = new RegExp(check);
  assert.equal(ENVELOPE.source, reCheck.source);
  for (const t of [TOKEN, "IGAA" + "z".repeat(12), "çãõ-ünicode-" + "k".repeat(20)]) {
    const env = cifrar(t, CHAVE);
    assert.match(env, reCheck);
    assert.ok(!env.includes(t));
    assert.equal(decifrar(env, CHAVE), t);
  }
  const env = cifrar(TOKEN, CHAVE);
  assert.notEqual(cifrar(TOKEN, CHAVE), env, "IV aleatório");
  assert.throws(() => decifrar(env, randomBytes(32)), /envelope/);
  const [v, iv, tag, c] = env.split(".");
  const trocar = (s: string) => (s[0] === "A" ? "B" : "A") + s.slice(1);
  assert.throws(() => decifrar([v, iv, tag, trocar(c!)].join("."), CHAVE));
  assert.throws(() => decifrar([v, iv, trocar(tag!), c].join("."), CHAVE));
  assert.throws(() => decifrar([v, trocar(iv!), tag, c].join("."), CHAVE));
  assert.throws(() => decifrar("v2." + env.slice(3), CHAVE));
  assert.throws(() => decifrar(TOKEN, CHAVE));
  assert.throws(() => cifrar("curto", CHAVE), /envelope/); // a cifra sairia menor que o CHECK aceita
  assert.throws(() => cifrar(TOKEN, randomBytes(16)));
  // nenhuma mensagem de erro carrega o token
  try {
    decifrar(env, randomBytes(32));
  } catch (e) {
    assert.ok(!String((e as Error).message).includes(TOKEN));
  }
});

// ---------- state ----------

test("state: válido para o admin certo; adulterado, vencido, de outro admin ou outra chave é recusado", () => {
  const s = criarState(ADMIN, CHAVE, T0);
  assert.deepEqual(conferirState(s, ADMIN, CHAVE, T0 + 60_000), { ok: true });
  assert.deepEqual(conferirState(s, ADMIN, CHAVE, T0 + VALIDADE_STATE_S * 1000 - 1000), { ok: true });
  assert.deepEqual(conferirState(s, ADMIN, CHAVE, T0 + VALIDADE_STATE_S * 1000 + 1000), { ok: false, motivo: "vencido" });
  assert.deepEqual(conferirState(s, "99999999-2222-3333-4444-555555555555", CHAVE, T0), { ok: false, motivo: "admin" });
  assert.deepEqual(conferirState(s, ADMIN, randomBytes(32), T0), { ok: false, motivo: "assinatura" });
  const [dados, sig] = s.split(".") as [string, string];
  // dados trocados (outro admin) com a assinatura antiga
  const forjado = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(dados, "base64url").toString()), a: "outro" })).toString("base64url");
  assert.deepEqual(conferirState(`${forjado}.${sig}`, "outro", CHAVE, T0), { ok: false, motivo: "assinatura" });
  const virar = (x: string, i: number) => x.slice(0, i) + (x[i] === "A" ? "B" : "A") + x.slice(i + 1);
  assert.equal(conferirState(`${virar(dados, 5)}.${sig}`, ADMIN, CHAVE, T0).ok, false);
  assert.equal(conferirState(`${dados}.${virar(sig, 3)}`, ADMIN, CHAVE, T0).ok, false);
  for (const lixo of ["", "abc", `${dados}`, `${dados}.${sig}.x`, `${dados}.${sig}=`, "<script>.x"]) assert.deepEqual(conferirState(lixo, ADMIN, CHAVE, T0), { ok: false, motivo: "formato" }, lixo);
  // nonce: dois states do mesmo admin no mesmo instante são diferentes
  assert.notEqual(criarState(ADMIN, CHAVE, T0), criarState(ADMIN, CHAVE, T0));
});

// ---------- publicação ----------

test("publicação: sucesso percorre approved → publishing → published e grava id, link e data", async () => {
  const posts = [postAprovado()];
  const pub = publicacaoMemoria(posts);
  const { buscar, chamadas } = graphFalso({ status: ["IN_PROGRESS", "IN_PROGRESS", "FINISHED"] });
  const r = relogio();
  const out = await publicarPost("s1-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar, esperar: r.esperar }, agora: r.agora });
  assert.deepEqual(out, { resultado: "publicado", permalink: "https://www.instagram.com/p/ABC123/" });
  assert.deepEqual(pub.transicoes, ["s1-01:publishing", "s1-01:publish_pedido", "s1-01:published"]);
  assert.equal(posts[0]!.publish_requested_at, new Date(T0 + 6000).toISOString(), "marcador gravado antes do media_publish");
  assert.equal(posts[0]!.ig_media_id, "18000000000000009");
  assert.equal(posts[0]!.permalink, "https://www.instagram.com/p/ABC123/");
  assert.equal(posts[0]!.published_at, new Date(T0 + 6000).toISOString());
  assert.deepEqual(r.esperas, [3000, 3000]);
  // Corpo do container: URL pública, legenda = caption + "\n\n" + hashtags, alt do post (slide sem alt).
  const container = chamadas.find((c) => c.metodo === "POST" && c.url.endsWith("/media"))!;
  assert.deepEqual(JSON.parse(container.corpo), { image_url: IMG, caption: "Laudo pela voz.\n\n#ultrassom #laudo", alt_text: "Tela do app" });
  assert.deepEqual(JSON.parse(chamadas.find((c) => c.url.endsWith("/media_publish"))!.corpo), { creation_id: "17900000000000001" });
  for (const c of chamadas) {
    assert.equal(c.headers.authorization, `Bearer ${TOKEN}`, c.url);
    assert.ok(!c.url.includes(TOKEN), "token nunca na URL das chamadas do Graph");
  }
  assert.deepEqual(chamadas.map((c) => `${c.metodo} ${new URL(c.url).pathname}`), [
    "GET /v26.0/17841400000000000/content_publishing_limit",
    "POST /v26.0/17841400000000000/media",
    "GET /v26.0/17900000000000001",
    "GET /v26.0/17900000000000001",
    "GET /v26.0/17900000000000001",
    "POST /v26.0/17841400000000000/media_publish",
    "GET /v26.0/18000000000000009",
  ]);
});

test("publicação (manual): container ERROR, tempo esgotado, erro HTTP e rede no publish viram failed sem token", async () => {
  const casos: [string, ReturnType<typeof graphFalso>, RegExp, "falhou" | "incerto"][] = [
    ["container ERROR", graphFalso({ status: ["IN_PROGRESS", "ERROR"] }), /container ERROR/, "falhou"],
    ["container EXPIRED", graphFalso({ status: ["EXPIRED"] }), /container EXPIRED/, "falhou"],
    ["tempo esgotado", graphFalso({ status: ["IN_PROGRESS"] }), /tempo esgotado/, "falhou"],
    [
      "HTTP 400 no container",
      graphFalso({ media: { status: 400, json: { error: { message: `Invalid OAuth access token - ${TOKEN}`, type: "OAuthException", code: 190, error_subcode: 463 } } } }),
      /container: HTTP 400 · OAuthException · código 190\/463 · Invalid OAuth access token - \[oculto\]/,
      "falhou",
    ],
    ["HTTP 500 no publish", graphFalso({ publicar: { status: 500, json: { error: { message: "erro" } } } }), /Resultado incerto.*publicar: HTTP 500/, "incerto"],
    ["rede no publish", graphFalso({ publicar: "rede" }), /Resultado incerto.*publicar: sem resposta/, "incerto"],
  ];
  for (const [nome, g, erro, resultado] of casos) {
    const posts = [postAprovado({ attempts: 2 })];
    const pub = publicacaoMemoria(posts);
    const r = relogio();
    const out = await publicarPost("s1-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: r.esperar, limiteMs: 15_000, intervaloMs: 3_000 }, agora: r.agora });
    assert.equal(out.resultado, resultado, nome);
    assert.deepEqual(pub.transicoes, resultado === "incerto" ? ["s1-01:publishing", "s1-01:publish_pedido", "s1-01:failed"] : ["s1-01:publishing", "s1-01:failed"], nome);
    assert.equal(posts[0]!.status, "failed", nome);
    assert.equal(posts[0]!.attempts, 3, nome);
    assert.match(posts[0]!.last_error ?? "", erro, nome);
    assert.ok((posts[0]!.last_error ?? "").length <= 300, nome);
    assert.equal(posts[0]!.ig_media_id, null, nome);
    semToken(posts[0]!.last_error);
    if (nome === "tempo esgotado") assert.ok(r.agora() - T0 <= 15_000, "respeita o limite");
  }
});

test("publicação (F3): limite atingido no clique manual volta para aprovado sem contar tentativa", async () => {
  const posts = [postAprovado({ attempts: 1 })];
  const pub = publicacaoMemoria(posts);
  const g = graphFalso({ limite: { data: [{ quota_usage: 50, config: { quota_total: 50, quota_duration: 86400 } }] } });
  const out = await publicarPost("s1-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0 });
  assert.equal(out.resultado, "limite");
  assert.deepEqual(pub.transicoes, ["s1-01:publishing", "s1-01:approved"]);
  assert.equal(posts[0]!.status, "approved");
  assert.equal(posts[0]!.attempts, 1, "não conta tentativa");
  assert.match(posts[0]!.last_error ?? "", /Aguardando: limite: limite de publicações em 24 h atingido \(50\/50\)/);
  assert.ok(!g.chamadas.some((c) => c.url.endsWith("/media")), "nem cria container");
});

test("publicação: falha só no permalink ainda conta como publicado (nunca volta para failed)", async () => {
  const posts = [postAprovado()];
  const pub = publicacaoMemoria(posts);
  const g = fetchFalso([
    casa("GET", /content_publishing_limit/, { json: { quota_usage: 0, config: { quota_total: 50 } } }),
    casa("POST", /\/media$/, { json: { id: "17900000000000001" } }),
    casa("GET", /17900000000000001\?/, { json: { status_code: "FINISHED" } }),
    casa("POST", /media_publish$/, { json: { id: "18000000000000009" } }),
    casa("GET", /18000000000000009\?fields=permalink/, { status: 500, json: {} }),
  ]);
  const out = await publicarPost("s1-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0 });
  assert.deepEqual(out, { resultado: "publicado", permalink: null });
  assert.equal(posts[0]!.status, "published");
  assert.equal(posts[0]!.ig_media_id, "18000000000000009");
});

test("trava: o segundo pedido (em série ou simultâneo) não publica de novo", async () => {
  const posts = [postAprovado()];
  const pub = publicacaoMemoria(posts);
  const g = graphFalso();
  const deps = { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0 };
  const [a, b] = await Promise.all([publicarPost("s1-01", deps), publicarPost("s1-01", deps)]);
  assert.deepEqual([a.resultado, b.resultado].sort(), ["publicado", "status"]);
  assert.equal((await publicarPost("s1-01", deps)).resultado, "status");
  assert.equal(g.chamadas.filter((c) => c.url.endsWith("/media_publish")).length, 1);
  // rascunho, falha e post manual (story com sticker) não travam
  for (const p of [postAprovado({ id: "d", status: "draft" }), postAprovado({ id: "m", format: "story", manual: true }), postAprovado({ id: "f", status: "failed" })]) {
    posts.push(p);
    assert.equal((await publicarPost(p.id, deps)).resultado, "status", p.id);
    assert.equal(p.status, p.id === "f" ? "failed" : p.id === "d" ? "draft" : "approved");
  }
});

test("publicação: sem conta, token vencido ou ilegível não trava o post nem chama o Instagram", async () => {
  const g = graphFalso();
  const casos: [string, RepositorioConta, string][] = [
    ["sem conta", contaMemoria(null).repo, "sem_conta"],
    ["vencido", contaMemoria({ igUserId: "17841400000000000", tokenCifrado: cifrar(TOKEN, CHAVE), expiraEm: new Date(T0 - 1000).toISOString() }).repo, "token_vencido"],
    ["outra chave", contaMemoria({ igUserId: "17841400000000000", tokenCifrado: cifrar(TOKEN, randomBytes(32)), expiraEm: null }).repo, "token_invalido"],
  ];
  for (const [nome, conta, esperado] of casos) {
    const posts = [postAprovado()];
    const pub = publicacaoMemoria(posts);
    const out = await publicarPost("s1-01", { repo: pub.repo, conta, chave: CHAVE, opcoes: { buscar: g.buscar }, agora: () => T0 });
    assert.equal(out.resultado, esperado, nome);
    assert.equal(posts[0]!.status, "approved", nome);
  }
  assert.equal(g.chamadas.length, 0);
});

test("limpar: tira segredos conhecidos e sequências com cara de token", () => {
  const t = limpar(`falhou com ${TOKEN} e code=${CODE} secret ${SECRET} EAAB${"q".repeat(40)}`, [CODE, SECRET]);
  semToken(t);
  assert.ok(!t.includes("EAAB"));
  assert.ok(t.length <= 200);
});

// ---------- repositório real: o UPDATE condicional (cadeia do PostgREST) ----------

test("repositório: a trava filtra por approved, não manual e os três formatos; conclusão e falha só saem de publishing", async () => {
  const log: string[] = [];
  const cadeia = (rows: unknown[]) => {
    const c: Record<string, unknown> = {};
    for (const m of ["update", "eq", "in", "is", "lte", "gte", "order", "limit", "select", "maybeSingle"]) {
      c[m] = (...args: unknown[]) => {
        log.push(`${m}(${args.map((a) => JSON.stringify(a)).join(",")})`);
        return m === "maybeSingle" ? Promise.resolve({ data: rows[0] ?? null, error: null }) : c;
      };
    }
    c.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok);
    return c;
  };
  let linhas: unknown[] = [{ id: "s1-01", caption: "c", hashtags: "", alt_text: "", attempts: 0 }];
  const sb = { from: (t: string) => (log.push(`from(${t})`), cadeia(linhas)) } as unknown as Parameters<typeof repositorioPublicacao>[1];
  const repo = repositorioPublicacao(CFG, sb);
  assert.equal((await repo.travar("s1-01"))?.id, "s1-01");
  assert.deepEqual(log.splice(0), [
    "from(social_posts)",
    'update({"status":"publishing","publish_requested_at":null})',
    'eq("id","s1-01")',
    'eq("status","approved")',
    'eq("manual",false)',
    'in("format",["image","carousel","story"])',
    `select(${JSON.stringify(colunas("social_posts"))})`,
  ]);
  // no cron, a trava também exige o horário dentro da janela
  await repo.travar("s1-01", { ate: "2026-10-22T15:00:00.000Z", desde: "2026-10-22T09:00:00.000Z" });
  assert.deepEqual(log.splice(0).slice(6, 8), ['lte("scheduled_at","2026-10-22T15:00:00.000Z")', 'gte("scheduled_at","2026-10-22T09:00:00.000Z")']);
  linhas = [];
  assert.equal(await repo.travar("s1-01"), null);
  log.splice(0);
  linhas = [{ id: "s1-01" }];
  assert.equal(await repo.concluir("s1-01", { mediaId: "1", permalink: null, publishedAt: "2026-10-22T15:00:00.000Z" }), true);
  assert.ok(log.includes('eq("status","publishing")'));
  log.splice(0);
  await repo.falhar("s1-01", "x", 1);
  assert.deepEqual(log.splice(0).slice(1), ['update({"status":"failed","last_error":"x","attempts":1})', 'eq("id","s1-01")', 'eq("status","publishing")']);
  // devolver para a fila exige que o media_publish não tenha sido pedido
  await repo.devolver("s1-01", "y", 2);
  assert.deepEqual(log.splice(0).slice(1), ['update({"status":"approved","last_error":"y","attempts":2})', 'eq("id","s1-01")', 'eq("status","publishing")', 'is("publish_requested_at",null)']);
  // o marcador do publish só grava uma vez, e só em publishing
  linhas = [{ id: "s1-01" }];
  assert.equal(await repo.marcarPublish("s1-01", "2026-10-22T15:00:00.000Z"), true);
  assert.deepEqual(log.splice(0).slice(1, 5), ['update({"publish_requested_at":"2026-10-22T15:00:00.000Z"})', 'eq("id","s1-01")', 'eq("status","publishing")', 'is("publish_requested_at",null)']);
  // imagem fora do bucket social (em qualquer slide) é recusada
  linhas = [{ position: 1, public_url: IMG, alt_text: "" }, { position: 2, public_url: "https://evil.example/x.jpg", alt_text: "" }];
  assert.equal(await repo.itens("s1-01"), null);
  linhas = [{ position: 1, public_url: IMG, alt_text: "a" }];
  assert.deepEqual(await repo.itens("s1-01"), [{ position: 1, public_url: IMG, alt_text: "a" }]);
});

test("SQL real (PGlite): trava atômica, colunas gravadas cabem nos CHECKs e o envelope entra em social_accounts", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`);
    await db.exec(MIGRACAO);
    await db.exec(MIGRACAO_F3);
    await db.query(`insert into public.social_posts(id,scheduled_at,format,status,manual) values ('s1-01', now() + interval '1 day', 'image', 'approved', false), ('c1', now() + interval '1 day', 'carousel', 'approved', false), ('m1', now(), 'story', 'approved', true)`);
    // O mesmo UPDATE que o PostgREST executa para repo.travar.
    const travar = (id: string) =>
      db.query(`update public.social_posts set status='publishing', publish_requested_at=null where id=$1 and status='approved' and manual=false and format in ('image','carousel','story') returning id, attempts`, [id]);
    const [a, b] = await Promise.all([travar("s1-01"), travar("s1-01")]);
    assert.deepEqual([a.rows.length, b.rows.length].sort(), [0, 1]);
    assert.equal((await travar("m1")).rows.length, 0, "story manual não trava");
    await db.query(`update public.social_posts set status='published', ig_media_id='18000000000000009', permalink='https://www.instagram.com/p/ABC123/', published_at=now(), last_error=null where id='s1-01' and status='publishing'`);
    assert.equal((await db.query<{ status: string }>(`select status from public.social_posts where id='s1-01'`)).rows[0]!.status, "published");
    // last_error de até 300 caracteres cabe (CHECK 500)
    assert.equal((await travar("c1")).rows.length, 1, "carrossel trava na F3");
    await db.query(`update public.social_posts set status='failed', last_error=$1, attempts=attempts+1 where id='c1'`, ["x".repeat(300)]);
    // o envelope real passa no CHECK; o token cru, não
    await db.query(`insert into public.social_accounts(ig_user_id,username,token_ciphertext,token_expires_at) values ('17841400000000000','laudousg',$1, now() + interval '60 days')`, [cifrar(TOKEN, CHAVE)]);
    await assert.rejects(db.query(`insert into public.social_accounts(ig_user_id,token_ciphertext) values ('2',$1)`, [TOKEN]));
    const cols = (await db.query<{ c: string }>(`select column_name c from information_schema.columns where table_schema='public' and table_name='social_accounts'`)).rows.map((r) => r.c);
    for (const c of SELECOES.social_accounts) assert.ok(cols.includes(c), c);
    const colsPost = (await db.query<{ c: string }>(`select column_name c from information_schema.columns where table_schema='public' and table_name='social_posts'`)).rows.map((r) => r.c);
    for (const c of SELECOES.social_posts) assert.ok(colsPost.includes(c), c);
    assert.ok(!(SELECOES.social_accounts as readonly string[]).includes("token_ciphertext"), "o token fica fora da allowlist da tela");
  } finally {
    await db.close();
  }
});

// ---------- rotas ----------

const admin = (userId = ADMIN): AdminAutorizado => ({ cfg: CFG, userId, cookies: null });
function rotas(o: Partial<DependenciasInstagram> & { semAdmin?: boolean } = {}) {
  const conta = o.conta ? null : contaMemoria(null);
  const r = criarRotasInstagram({
    autorizar: async () => (o.semAdmin ? null : admin()),
    servidor: () => CFG,
    instagram: () => IG,
    conta: () => conta!.repo,
    publicacao: () => publicacaoMemoria([]).repo,
    buscar: async () => {
      throw new Error("a API não deveria ser chamada");
    },
    agora: () => T0,
    ...o,
  });
  return { r, conta };
}
const get = (caminho: string, headers: Record<string, string> = {}) => new Request(`${ORIGEM}/admin/api/social/${caminho}`, { headers });
const destino = (r: Response) => new URL(r.headers.get("location") ?? "about:blank");

test("conectar: sem admin → 404; com admin → Instagram com client_id, redirect exato, escopos e state do admin", async () => {
  assert.equal((await rotas({ semAdmin: true }).r.conectar(get("conectar"))).status, 404);
  assert.equal((await rotas({ instagram: () => null }).r.conectar(get("conectar"))).status, 404);
  const res = await rotas().r.conectar(get("conectar"));
  assert.equal(res.status, 303);
  const u = destino(res);
  assert.equal(u.origin + u.pathname, "https://www.instagram.com/oauth/authorize");
  assert.equal(u.searchParams.get("client_id"), "1518730570317495");
  assert.equal(u.searchParams.get("redirect_uri"), "https://app.laudousg.com.br/admin/api/social/callback");
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("scope"), "instagram_business_basic,instagram_business_content_publish");
  assert.deepEqual(conferirState(u.searchParams.get("state")!, ADMIN, CHAVE, T0), { ok: true });
  assert.ok(!res.headers.get("location")!.includes(SECRET));
  assert.ok(!res.headers.get("location")!.includes(CHAVE_B64));
});

test("callback: fora da sessão, não lê cookie, só a ponte recebe o code; erro do Instagram vai pela ponte", async () => {
  assert.equal(rotaSemSessao("/api/social/callback"), true);
  for (const p of ["/api/social/conectar", "/api/social/concluir", "/api/social/desconectar", "/api/social/publicar"]) {
    assert.equal(rotaSemSessao(p), false, p);
    assert.equal(rotaPublica(p), false, p);
  }
  const { r } = rotas({
    autorizar: async () => {
      throw new Error("callback não pode checar sessão");
    },
  });
  const state = criarState(ADMIN, CHAVE, T0);
  // Request espiã: falha o teste se o handler tocar em cookies ou cabeçalhos.
  const espia = (req: Request) =>
    new Proxy(req, {
      get(alvo, prop) {
        if (prop === "cookies" || prop === "headers") throw new Error(`callback leu ${String(prop)}`);
        const v = Reflect.get(alvo, prop, alvo);
        return typeof v === "function" ? v.bind(alvo) : v;
      },
    });
  const res = await r.callback(espia(get(`callback?code=${CODE}%23_&state=${state}`, { cookie: "admin-sb=segredo" })));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("location"), null);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.match(res.headers.get("content-security-policy") ?? "", /default-src 'none'/);
  const html = await res.text();
  const ponte = `/admin/api/social/concluir?code=${CODE}&amp;state=${state}`;
  assert.ok(html.includes(`<meta http-equiv="refresh" content="0;url=${ponte}">`), html);
  assert.ok(html.includes(`<a href="${ponte}">`));
  assert.equal(html.split(CODE).length - 1, 2, "o code aparece só na ponte (meta + link)");
  assert.doesNotMatch(html, /<script|segredo|#_|%23_/i);
  for (const [k, v] of res.headers) assert.ok(!v.includes(CODE), k);

  const neg = await r.callback(espia(get(`callback?error=access_denied&error_reason=user_denied&error_description=The+user+denied+your+request`)));
  const h2 = await neg.text();
  assert.ok(h2.includes("/admin/api/social/concluir?error=access_denied&amp;error_reason=user_denied"));
  assert.doesNotMatch(h2, /denied your request/);

  for (const ruim of [`callback?code=${CODE}`, `callback?code=<b>x</b>&state=${state}`, `callback?code=${CODE}&state=lixo`, "callback", `callback?error=<script>`]) {
    const x = await r.callback(espia(get(ruim)));
    assert.equal(x.status, 400, ruim);
    assert.doesNotMatch(await x.text(), /script|<b>/);
  }
  assert.equal((await rotas({ instagram: () => null }).r.callback(get(`callback?code=${CODE}&state=${state}`))).status, 404);
  assert.equal((await rotas({ servidor: () => null }).r.callback(get(`callback?code=${CODE}&state=${state}`))).status, 404);
});

function oauthFalso(o: { token?: Resposta; perfil?: Resposta } = {}) {
  return fetchFalso([
    casa("POST", /^https:\/\/api\.instagram\.com\/oauth\/access_token$/, o.token ?? { json: { data: [{ access_token: TOKEN_CURTO, user_id: "9000", permissions: "instagram_business_basic,instagram_business_content_publish" }] } }),
    casa("GET", /^https:\/\/graph\.instagram\.com\/access_token\?/, { json: { access_token: TOKEN, token_type: "bearer", expires_in: 5183944 } }),
    casa("GET", new RegExp(`^${G}/me\\?fields=user_id,username$`), o.perfil ?? { json: { data: [{ user_id: "17841400000000000", username: "laudousg" }] } }),
  ]);
}

test("concluir: sem sessão → 404 sem chamar o Instagram; com o admin certo grava o token cifrado", async () => {
  const state = criarState(ADMIN, CHAVE, T0);
  const q = `concluir?code=${CODE}&state=${state}`;
  const f0 = oauthFalso();
  assert.equal((await rotas({ semAdmin: true, buscar: f0.buscar }).r.concluir(get(q))).status, 404);
  assert.equal((await rotas({ instagram: () => null, buscar: f0.buscar }).r.concluir(get(q))).status, 404);
  assert.equal(f0.chamadas.length, 0);

  const f = oauthFalso();
  const conta = contaMemoria(null);
  const res = await rotas({ buscar: f.buscar, conta: () => conta.repo }).r.concluir(get(q));
  assert.equal(res.status, 303);
  assert.equal(destino(res).pathname, "/admin/instagram");
  assert.equal(destino(res).searchParams.get("ok"), "conectado");
  semToken(res.headers.get("location"));
  const l = conta.linha()!;
  assert.equal(l.igUserId, "17841400000000000");
  assert.equal(l.username, "laudousg");
  assert.match(l.tokenCifrado, ENVELOPE);
  assert.equal(decifrar(l.tokenCifrado, CHAVE), TOKEN, "grava o token de longa duração, não o curto");
  assert.equal(l.expiraEm, new Date(T0 + 5183944 * 1000).toISOString());
  // Pedidos conforme a documentação.
  const [t, longo, me] = f.chamadas;
  assert.equal(t!.headers["content-type"], "application/x-www-form-urlencoded");
  assert.deepEqual(Object.fromEntries(new URLSearchParams(t!.corpo)), { client_id: "1518730570317495", client_secret: SECRET, grant_type: "authorization_code", redirect_uri: "https://app.laudousg.com.br/admin/api/social/callback", code: CODE });
  const ul = new URL(longo!.url);
  assert.equal(ul.searchParams.get("grant_type"), "ig_exchange_token");
  assert.equal(ul.searchParams.get("access_token"), TOKEN_CURTO);
  assert.equal(me!.headers.authorization, `Bearer ${TOKEN}`);

  // Reconectar substitui (uma conta só).
  const f2 = oauthFalso({ perfil: { json: { user_id: "17841499999999999", username: "outra.conta" } } });
  await rotas({ buscar: f2.buscar, conta: () => conta.repo }).r.concluir(get(`concluir?code=${CODE}&state=${criarState(ADMIN, CHAVE, T0)}`));
  assert.equal(conta.linha()!.username, "outra.conta");
  assert.deepEqual(conta.log, ["salvar:17841400000000000", "salvar:17841499999999999"]);
});

test("concluir: state de outro admin, vencido ou adulterado, erro do Instagram e falha HTTP não gravam nada nem vazam", async () => {
  const avisos: unknown[][] = [];
  const warn = console.warn;
  console.warn = (...a: unknown[]) => void avisos.push(a);
  try {
    const casos: [string, string, Partial<DependenciasInstagram>, Record<string, string>][] = [
      ["outro admin", `concluir?code=${CODE}&state=${criarState("outro-admin", CHAVE, T0)}`, {}, { erro: "state" }],
      ["vencido", `concluir?code=${CODE}&state=${criarState(ADMIN, CHAVE, T0 - 11 * 60_000)}`, {}, { erro: "state_vencido" }],
      ["outra chave", `concluir?code=${CODE}&state=${criarState(ADMIN, randomBytes(32), T0)}`, {}, { erro: "state" }],
      ["sem state", `concluir?code=${CODE}`, {}, { erro: "state" }],
      ["negado", "concluir?error=access_denied&error_reason=user_denied", {}, { erro: "ig_negado" }],
      ["outro erro", "concluir?error=server_error", {}, { erro: "ig_erro" }],
      [
        "HTTP 400 na troca",
        `concluir?code=${CODE}&state=${criarState(ADMIN, CHAVE, T0)}`,
        { buscar: oauthFalso({ token: { status: 400, json: { error_type: "OAuthException", code: 400, error_message: `code ${CODE} já usado; secret ${SECRET}` } } }).buscar },
        { erro: "conexao", etapa: "token" },
      ],
      [
        "sem permissão de publicar",
        `concluir?code=${CODE}&state=${criarState(ADMIN, CHAVE, T0)}`,
        { buscar: oauthFalso({ token: { json: { access_token: TOKEN_CURTO, user_id: 1, permissions: "instagram_business_basic" } } }).buscar },
        { erro: "conexao", etapa: "token" },
      ],
      ["rede no perfil", `concluir?code=${CODE}&state=${criarState(ADMIN, CHAVE, T0)}`, { buscar: oauthFalso({ perfil: "rede" }).buscar }, { erro: "conexao", etapa: "perfil" }],
    ];
    for (const [nome, q, deps, esperado] of casos) {
      const conta = contaMemoria(null);
      const res = await rotas({ ...deps, conta: () => conta.repo }).r.concluir(get(q));
      assert.equal(res.status, 303, nome);
      const u = destino(res);
      assert.equal(u.pathname, "/admin/instagram", nome);
      assert.deepEqual(Object.fromEntries(u.searchParams), esperado, nome);
      assert.equal(conta.linha(), null, nome);
      semToken(res.headers.get("location"));
    }
    for (const a of avisos) semToken(a.map(String).join(" "));
  } finally {
    console.warn = warn;
  }
});

function form(caminho: string, campos: Record<string, string>): Request {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return new Request(`${ORIGEM}/admin/api/social/${caminho}`, { method: "POST", headers: { origin: ORIGEM }, body: f });
}

test("publicar (rota): sem admin → 404; confirmação errada não toca no post; certa publica e volta ao editor", async () => {
  const posts = [postAprovado()];
  const pub = publicacaoMemoria(posts);
  const g = graphFalso();
  const conta = contaValida();
  const base = { publicacao: () => pub.repo, conta: () => conta.repo, buscar: g.buscar, opcoes: { esperar: async () => {} } };
  assert.equal((await rotas({ ...base, semAdmin: true }).r.publicar(form("publicar", { id: "s1-01", confirmacao: "s1-01" }))).status, 404);
  assert.equal((await rotas({ ...base, instagram: () => null }).r.publicar(form("publicar", { id: "s1-01", confirmacao: "s1-01" }))).status, 404);
  assert.equal((await rotas(base).r.publicar(form("publicar", { id: "../x", confirmacao: "../x" }))).status, 404);
  for (const c of ["", "s1-0", "S1-01", "s1-01 x", "sim"]) {
    const res = await rotas(base).r.publicar(form("publicar", { id: "s1-01", confirmacao: c }));
    assert.equal(destino(res).searchParams.get("erro"), "confirmacao", c);
  }
  assert.equal(posts[0]!.status, "approved");
  assert.equal(g.chamadas.length, 0);
  const res = await rotas(base).r.publicar(form("publicar", { id: "s1-01", confirmacao: " s1-01 " }));
  assert.equal(destino(res).pathname, "/admin/instagram/s1-01");
  assert.equal(destino(res).searchParams.get("ok"), "publicado");
  assert.equal(posts[0]!.status, "published");
  const de_novo = await rotas(base).r.publicar(form("publicar", { id: "s1-01", confirmacao: "s1-01" }));
  assert.equal(destino(de_novo).searchParams.get("erro"), "pub_status");
  semToken(res.headers.get("location"));
});

test("desconectar: sem admin → 404; com admin apaga a conta", async () => {
  const conta = contaValida();
  assert.equal((await rotas({ semAdmin: true, conta: () => conta.repo }).r.desconectar(form("desconectar", {}))).status, 404);
  assert.ok(conta.linha());
  const res = await rotas({ conta: () => conta.repo }).r.desconectar(form("desconectar", {}));
  assert.equal(destino(res).searchParams.get("ok"), "desconectado");
  assert.equal(conta.linha(), null);
});

test("código: rotas novas ligadas às instâncias, token só em conta.ts e nenhum log com variável sensível", () => {
  const dir = join(RAIZ, "src", "app", "api", "social");
  assert.deepEqual(readdirSync(dir).sort(), ["callback", "concluir", "conectar", "desconectar", "destravar", "importar", "lote", "manual", "midia", "ordem", "publicar", "salvar", "status"]);
  const metodo: Record<string, string> = { conectar: "GET", callback: "GET", concluir: "GET", desconectar: "POST", publicar: "POST", destravar: "POST", manual: "POST" };
  for (const [r, m] of Object.entries(metodo)) assert.match(readFileSync(join(dir, r, "route.ts"), "utf8"), new RegExp(`export const ${m} = rotasInstagram\\.${r};`), r);
  assert.match(readFileSync(join(dir, "publicar", "route.ts"), "utf8"), /maxDuration = 120/);
  const libDir = join(RAIZ, "src", "lib", "social");
  for (const f of readdirSync(libDir)) {
    const txt = readFileSync(join(libDir, f), "utf8");
    if (f !== "conta.ts") assert.doesNotMatch(txt, /token_ciphertext"|from\("social_accounts"\)/, f);
    // console.* só com textos fixos (e, no máximo, a etapa).
    for (const m of txt.matchAll(/console\.(?:log|warn|error|info)\(([^)]*)\)/g)) assert.match(m[1]!, /^"[^"]*"(, etapa)?$/, `${f}: ${m[0]}`);
  }
  const fonte = readFileSync(join(libDir, "rotas-instagram.ts"), "utf8");
  const callback = fonte.slice(fonte.indexOf("callback: async"), fonte.indexOf("concluir: async"));
  assert.doesNotMatch(callback, /cookie|autorizar|headers\.get/i);
  const telas = [join(RAIZ, "src", "components", "Instagram.tsx"), join(RAIZ, "src", "app", "(painel)", "instagram", "page.tsx"), join(RAIZ, "src", "app", "(painel)", "instagram", "[id]", "page.tsx")];
  for (const t of telas) assert.doesNotMatch(readFileSync(t, "utf8"), /"use client"|SERVICE_ROLE|lerComToken|confirm\(/, t);
  const env = readFileSync(join(RAIZ, ".env.example"), "utf8");
  for (const k of ["INSTAGRAM_APP_ID=", "INSTAGRAM_APP_SECRET=", "SOCIAL_TOKEN_KEY="]) assert.ok(env.includes(`\n${k}\n`), k);
});

test("tela: conta conectada mostra @usuario, validade e Desconectar; sem conta mostra Conectar", () => {
  const h = renderToStaticMarkup(CartaoConta({ disponivel: true, conta: { ig_user_id: "1", username: "laudousg", token_expires_at: "2026-12-21T15:00:00.000Z", connected_at: "2026-10-22T15:00:00.000Z" }, agora: T0 }));
  assert.match(h, /@laudousg/);
  assert.match(h, /válido até/);
  assert.match(h, /\/admin\/api\/social\/desconectar/);
  const v = renderToStaticMarkup(CartaoConta({ disponivel: true, conta: { ig_user_id: "1", username: "laudousg", token_expires_at: "2026-10-01T15:00:00.000Z", connected_at: "2026-08-01T15:00:00.000Z" }, agora: T0 }));
  assert.match(v, /Vencido/);
  const n = renderToStaticMarkup(CartaoConta({ disponivel: true, conta: null }));
  assert.match(n, /href="\/admin\/api\/social\/conectar"/);
  assert.match(n, /Conectar Instagram/);
});
