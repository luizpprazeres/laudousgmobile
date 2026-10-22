/**
 * Instagram F1: mapeamento do calendário, fuso, idempotência da importação (SQL real no PGlite),
 * regra de aprovação, validação de upload, rotas só com admin e CSP.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { rotaPublica, rotaSemSessao } from "../src/lib/auth/acesso";
import { SELECOES } from "../src/lib/data/colunas";
import type { ConfigServidor } from "../src/lib/env";
import { lerCalendario } from "../src/lib/social/calendario";
import { fonteImagensSocial, urlPublicaSocial } from "../src/lib/social/csp";
import { dataValida, instanteNoFuso, intervaloCalendario, navegar, noFuso } from "../src/lib/social/datas";
import { dimensoesJpeg, lerEdicao, motivoBloqueioAprovacao, validarImagem } from "../src/lib/social/regras";
import { criarRotasSocial } from "../src/lib/social/rotas";
import type { RepositorioSocial } from "../src/lib/social/servidor";
import type { Formato, PostImportado } from "../src/lib/social/tipos";

const RAIZ = join(__dirname, "..");
const fixture = () => JSON.parse(readFileSync(join(RAIZ, "tests", "fixtures", "social", "calendario.json"), "utf8")) as Record<string, unknown> & { feed: Record<string, unknown>[]; stories: Record<string, unknown>[] };
const MIGRACAO = "20261022205957_admin_social.sql";

/** JPEG mínimo: SOI, APP0, SOF0 com as dimensões, EOI (só o cabeçalho importa para a validação). */
function jpeg(largura: number, altura: number, extra = 0): Uint8Array<ArrayBuffer> {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, altura >> 8, altura & 255, largura >> 8, largura & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const b = new Uint8Array(2 + app0.length + sof.length + extra + 2);
  b.set([0xff, 0xd8], 0);
  b.set(app0, 2);
  b.set(sof, 2 + app0.length);
  b.set([0xff, 0xd9], b.length - 2);
  return b;
}

// ---------- mapeamento do calendário ----------

test("calendário: formato, manual, fuso, notas e alt do slide", () => {
  const { posts, erros } = lerCalendario(fixture());
  assert.deepEqual(erros, []);
  const por = Object.fromEntries(posts.map((p) => [p.id, p]));
  assert.equal(por["s1-01"]?.format, "image"); // foto
  assert.equal(por["s1-02"]?.format, "carousel"); // carrossel com 5 slides
  assert.equal(por["s1-03"]?.format, "image"); // viral com 1 slide
  assert.equal(por["st-1026-1"]?.format, "story");
  assert.equal(por["s1-02"]?.slides.length, 5);
  assert.deepEqual(por["s1-02"]?.slides.map((s) => s.position), [1, 2, 3, 4, 5]);
  // 26/10/2026 12:15 em São Paulo (UTC−3) = 15:15 UTC
  assert.equal(por["s1-01"]?.scheduled_at, "2026-10-26T15:15:00.000Z");
  assert.equal(por["st-1026-1"]?.scheduled_at, "2026-10-26T10:30:00.000Z");
  assert.equal(por["st-1026-1"]?.manual, false);
  assert.equal(por["st-1026-3"]?.manual, true);
  assert.deepEqual(por["st-1026-3"]?.interaction, { tipo: "enquete", opcoes: ["Digito", "Dito"] });
  assert.equal(por["st-1026-3"]?.pillar, "interação");
  assert.equal(por["st-1026-3"]?.slides[0]?.slide_text, "Como você faz seus laudos hoje?");
  assert.equal(por["s1-02"]?.notes.length, 1);
  assert.equal(por["s1-01"]?.slides[0]?.alt_text, por["s1-01"]?.alt_text);
  assert.ok(por["s1-01"]?.alt_text);
  assert.equal(por["s1-01"]?.pillar, "lançamento");
  assert.equal(por["s1-01"]?.angle, "achados-na-voz");
});

test("calendário: tudo ou nada, com erros legíveis", () => {
  const casos: [string, (c: ReturnType<typeof fixture>) => void, RegExp][] = [
    ["fuso", (c) => (c.fuso = "America/Manaus"), /fuso/],
    ["id repetido", (c) => (c.stories[0]!.id = "s1-01"), /id repetido: s1-01/],
    ["id inválido", (c) => (c.feed[0]!.id = "S1 01"), /id inválido/],
    ["data", (c) => (c.feed[0]!.data = "2026-02-30"), /data\/hora inválida/],
    ["hora", (c) => (c.stories[0]!.hora = "25:00"), /data\/hora inválida/],
    ["formato", (c) => (c.feed[0]!.formato = "reels"), /formato "reels"/],
    ["foto com 2 slides", (c) => (c.feed[0]!.slides = [{ n: 1, texto: "a" }, { n: 2, texto: "b" }]), /foto com mais de um slide/],
    ["slides fora de ordem", (c) => (c.feed[1]!.slides = [{ n: 1 }, { n: 3 }]), /numerados/],
    ["legenda longa", (c) => (c.feed[0]!.legenda = "x".repeat(2190)), /2200/],
    ["hashtags demais", (c) => (c.feed[0]!.hashtags = Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" ")), /30 hashtags/],
    ["publicacao", (c) => (c.stories[1]!.publicacao = "talvez"), /publicacao/],
  ];
  for (const [nome, mexer, erro] of casos) {
    const c = fixture();
    mexer(c);
    const r = lerCalendario(c);
    assert.equal(r.posts.length, 0, nome);
    assert.ok(r.erros.some((e) => erro.test(e)), `${nome}: ${r.erros.join(" | ")}`);
  }
  assert.deepEqual(lerCalendario([]).posts, []);
  assert.ok(lerCalendario({ feed: [], stories: [] }).erros.length > 0);
});

test("calendário real (copy/calendario-instagram.json) importa inteiro, se disponível", (t) => {
  const caminho = [process.env.CALENDARIO_INSTAGRAM, join(RAIZ, "..", "..", "copy", "calendario-instagram.json")].find((c): c is string => !!c && existsSync(c));
  if (!caminho) {
    t.skip("calendário não está neste checkout (defina CALENDARIO_INSTAGRAM)");
    return;
  }
  const json = JSON.parse(readFileSync(caminho, "utf8")) as { feed: unknown[]; stories: { publicacao: string }[] };
  const { posts, erros } = lerCalendario(json);
  assert.deepEqual(erros, []);
  assert.equal(posts.length, json.feed.length + json.stories.length);
  assert.equal(posts.filter((p) => p.manual).length, json.stories.filter((s) => s.publicacao === "manual").length);
});

// ---------- fuso e calendário ----------

test("fuso de São Paulo: conversão, volta e intervalos de semana/mês", () => {
  assert.equal(instanteNoFuso("2026-10-26", "00:00"), "2026-10-26T03:00:00.000Z");
  assert.equal(instanteNoFuso("2026-12-31", "23:30"), "2027-01-01T02:30:00.000Z");
  assert.deepEqual(noFuso("2026-10-27T02:59:00Z"), { data: "2026-10-26", hora: "23:59" });
  assert.equal(dataValida("2026-02-29"), false);
  assert.equal(dataValida("2028-02-29"), true);
  assert.throws(() => instanteNoFuso("2026-10-26", "7:30"));
  const s = intervaloCalendario("semana", "2026-10-29"); // quinta
  assert.equal(s.dias[0], "2026-10-26"); // segunda
  assert.equal(s.dias.length, 7);
  assert.equal(s.inicio, "2026-10-26T03:00:00.000Z");
  assert.equal(s.fim, "2026-11-02T03:00:00.000Z");
  const m = intervaloCalendario("mes", "2026-11-15");
  assert.equal(m.dias[0], "2026-10-26"); // novembro/2026 começa num domingo
  assert.equal(m.dias.length % 7, 0);
  assert.ok(m.dias.includes("2026-11-30"));
  assert.equal(navegar("mes", "2026-01-31", 1), "2026-02-01");
  assert.equal(navegar("semana", "2026-10-26", -1), "2026-10-19");
});

// ---------- SQL real (PGlite) ----------

async function banco() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`);
  await db.exec(readFileSync(join(RAIZ, "..", "..", "supabase", "migrations", MIGRACAO), "utf8"));
  return db;
}
const importar = async (db: PGlite, posts: PostImportado[]) =>
  (await db.query<{ r: { criados: number; atualizados: number; preservados: number; orfaos: string[] } }>("select public.social_import($1::jsonb) r", [JSON.stringify(posts)])).rows[0]!.r;
const um = async <T>(db: PGlite, sql: string, args: unknown[] = []) => (await db.query<{ v: T }>(sql, args)).rows[0]!.v;
const caminho = (id: string, n: number) => `posts/${id}/${n.toString(16).padStart(32, "0")}.jpg`;
async function comImagens(db: PGlite, id: string) {
  const n = await um<number>(db, "select count(*)::int v from public.social_media_items where post_id=$1", [id]);
  for (let p = 1; p <= n; p++)
    assert.deepEqual(await um(db, "select public.social_set_media($1,$2,$3,$4) v", [id, p, caminho(id, p), `https://x.supabase.co/storage/v1/object/public/social/${caminho(id, p)}`]), { resultado: "ok", anterior: null });
}

test("SQL: RLS sem policies, nada para anon/authenticated, bucket só JPEG e colunas da allowlist", async () => {
  const db = await banco();
  try {
    const t = await db.query<{ relname: string; rls: boolean; anon: boolean; auth: boolean; svc: boolean }>(
      `select c.relname, c.relrowsecurity rls,
        has_table_privilege('anon',c.oid,'SELECT') or has_table_privilege('anon',c.oid,'INSERT') anon,
        has_table_privilege('authenticated',c.oid,'SELECT') or has_table_privilege('authenticated',c.oid,'UPDATE') auth,
        has_table_privilege('service_role',c.oid,'SELECT') svc
       from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1`,
    );
    assert.deepEqual(t.rows.map((r) => r.relname), ["social_accounts", "social_media_items", "social_posts"]);
    for (const r of t.rows) assert.deepEqual([r.rls, r.anon, r.auth, r.svc], [true, false, false, true], r.relname);
    assert.equal((await db.query("select 1 from pg_policies where schemaname='public'")).rows.length, 0);
    for (const f of ["social_import(jsonb)", "social_save_post(text,timestamptz,text,text,text,jsonb)", "social_move_item(text,integer,integer)", "social_set_media(text,integer,text,text)", "social_set_status(text,text)"]) {
      for (const papel of ["anon", "authenticated"]) assert.equal(await um(db, `select has_function_privilege('${papel}','public.${f}','EXECUTE') v`), false, `${papel} ${f}`);
      assert.equal(await um(db, `select has_function_privilege('service_role','public.${f}','EXECUTE') v`), true, f);
    }
    const b = (await db.query<{ public: boolean; file_size_limit: number; allowed_mime_types: string[] }>("select public, file_size_limit, allowed_mime_types from storage.buckets where id='social'")).rows[0];
    assert.deepEqual(b, { public: true, file_size_limit: 8388608, allowed_mime_types: ["image/jpeg"] });
    // Token cru não entra; só o envelope cifrado.
    await assert.rejects(db.query("insert into public.social_accounts(ig_user_id,token_ciphertext) values ('1','IGQVJ-token-cru')"));
    await db.query("insert into public.social_accounts(ig_user_id,token_ciphertext) values ('1',$1)", [`v1.${"a".repeat(16)}.${"b".repeat(22)}.${"c".repeat(40)}`]);
    for (const tabela of ["social_posts", "social_media_items"] as const) {
      const cols = (await db.query<{ c: string }>("select column_name c from information_schema.columns where table_schema='public' and table_name=$1", [tabela])).rows.map((r) => r.c);
      for (const c of SELECOES[tabela]) assert.ok(cols.includes(c), `${tabela}.${c}`);
    }
  } finally {
    await db.close();
  }
});

test("SQL: importação idempotente por id e nunca rebaixa approved/published", async () => {
  const db = await banco();
  try {
    const { posts } = lerCalendario(fixture());
    assert.deepEqual(await importar(db, posts), { criados: 5, atualizados: 0, preservados: 0, orfaos: [] });
    const foto = async () => (await db.query("select * from public.social_posts order by id")).rows.map((r) => ({ ...(r as object), updated_at: null, created_at: null }));
    const antes = await foto();
    assert.deepEqual(await importar(db, posts), { criados: 0, atualizados: 5, preservados: 0, orfaos: [] });
    assert.deepEqual(await foto(), antes);
    assert.equal(await um(db, "select count(*)::int v from public.social_media_items"), 1 + 5 + 1 + 1 + 1);
    assert.equal(await um(db, "select count(*)::int v from public.social_posts where status='draft'"), 5);

    // aprova s1-01 (imagem + horário futuro) e marca s1-03 como publicado
    await db.query("update public.social_posts set scheduled_at = now() + interval '2 days' where id='s1-01'");
    await comImagens(db, "s1-01");
    assert.equal(await um(db, "select public.social_set_status('s1-01','approved') v"), "ok");
    await db.query("update public.social_posts set status='published' where id='s1-03'");

    const mudado = posts.map((p) => ({ ...p, caption: `${p.caption} (v2)`, slides: p.slides.map((s) => ({ ...s, slide_text: `${s.slide_text} v2` })) }));
    assert.deepEqual(await importar(db, mudado), { criados: 0, atualizados: 3, preservados: 2, orfaos: [] });
    const r = await db.query<{ id: string; status: string; caption: string }>("select id, status, caption from public.social_posts order by id");
    const por = Object.fromEntries(r.rows.map((x) => [x.id, x]));
    assert.equal(por["s1-01"]?.status, "approved");
    assert.doesNotMatch(por["s1-01"]?.caption ?? "", /\(v2\)/);
    assert.equal(por["s1-03"]?.status, "published");
    assert.match(por["s1-02"]?.caption ?? "", /\(v2\)$/);
    assert.equal(por["s1-02"]?.status, "draft");
    // imagem do slide aprovado continua lá
    assert.equal(await um(db, "select storage_path v from public.social_media_items where post_id='s1-01'"), caminho("s1-01", 1));

    // rascunho perde slides além do calendário e devolve o arquivo órfão; os demais mantêm a imagem
    await comImagens(db, "s1-02");
    const menor = mudado.map((p) => (p.id === "s1-02" ? { ...p, slides: p.slides.slice(0, 4) } : p));
    const r2 = await importar(db, menor);
    assert.deepEqual(r2.orfaos, [caminho("s1-02", 5)]);
    assert.equal(await um(db, "select count(storage_path)::int v from public.social_media_items where post_id='s1-02'"), 4);
  } finally {
    await db.close();
  }
});

test("SQL: aprovação exige imagem em todos os slides (stories manuais também) e horário futuro", async () => {
  const db = await banco();
  try {
    await importar(db, lerCalendario(fixture()).posts);
    await db.query("update public.social_posts set scheduled_at = now() + interval '1 day'");
    const status = (id: string, para: string) => um<string>(db, "select public.social_set_status($1,$2) v", [id, para]);
    assert.equal(await status("s1-02", "approved"), "sem_imagem");
    assert.equal(await status("st-1026-3", "approved"), "sem_imagem"); // story manual
    // carrossel com só parte das imagens continua bloqueado
    await um(db, "select public.social_set_media('s1-02',1,$1,'https://x/1') v", [caminho("s1-02", 1)]);
    assert.equal(await status("s1-02", "approved"), "sem_imagem");
    await comImagens(db, "st-1026-3");
    await db.query("update public.social_posts set scheduled_at = now() - interval '1 minute' where id='st-1026-3'");
    assert.equal(await status("st-1026-3", "approved"), "passado");
    await db.query("update public.social_posts set scheduled_at = now() + interval '1 hour' where id='st-1026-3'");
    assert.equal(await status("st-1026-3", "approved"), "ok");
    // aprovado não edita, não troca imagem nem reordena
    assert.equal(await um(db, "select public.social_save_post('st-1026-3', now() + interval '2 hours', '', '', 'x', '[]'::jsonb) v"), "status");
    assert.deepEqual(await um(db, "select public.social_set_media('st-1026-3',1,$1,'https://x/2') v", [caminho("st-1026-3", 9)]), { resultado: "status" });
    assert.equal(await status("st-1026-3", "approved"), "status");
    assert.equal(await status("st-1026-3", "draft"), "ok");
    assert.equal(await status("st-1026-3", "draft"), "status");
    assert.equal(await status("st-1026-3", "published"), "status");
    assert.equal(await status("nao-existe", "approved"), "nao_encontrado");
    // troca de ordem leva imagem e texto juntos
    await um(db, "select public.social_set_media('s1-02',2,$1,'https://x/2') v", [caminho("s1-02", 2)]);
    const antes = (await db.query<{ slide_text: string }>("select slide_text from public.social_media_items where post_id='s1-02' order by position")).rows.map((r) => r.slide_text);
    assert.equal(await um(db, "select public.social_move_item('s1-02',1,1) v"), "ok");
    const depois = (await db.query<{ slide_text: string; storage_path: string }>("select slide_text, storage_path from public.social_media_items where post_id='s1-02' order by position")).rows;
    assert.deepEqual([depois[0]?.slide_text, depois[1]?.slide_text], [antes[1], antes[0]]);
    assert.deepEqual([depois[0]?.storage_path, depois[1]?.storage_path], [caminho("s1-02", 2), caminho("s1-02", 1)]);
    assert.equal(await um(db, "select public.social_move_item('s1-02',1,-1) v"), "limite");
  } finally {
    await db.close();
  }
});

test("regra de aprovação (espelho em TypeScript)", () => {
  const agora = new Date("2026-10-22T12:00:00Z");
  const futuro = "2026-10-26T15:15:00.000Z";
  const img = { storage_path: "posts/a/x.jpg" };
  const sem = { storage_path: null };
  assert.equal(motivoBloqueioAprovacao({ status: "draft", format: "image", scheduled_at: futuro }, [], agora), "sem_imagem");
  assert.equal(motivoBloqueioAprovacao({ status: "draft", format: "story", scheduled_at: futuro }, [sem], agora), "sem_imagem");
  assert.equal(motivoBloqueioAprovacao({ status: "draft", format: "carousel", scheduled_at: futuro }, [img, sem, img], agora), "sem_imagem");
  assert.equal(motivoBloqueioAprovacao({ status: "draft", format: "carousel", scheduled_at: futuro }, [img], agora), "slides");
  assert.equal(motivoBloqueioAprovacao({ status: "draft", format: "image", scheduled_at: futuro }, [img, img], agora), "slides");
  assert.equal(motivoBloqueioAprovacao({ status: "draft", format: "story", scheduled_at: "2026-10-22T11:59:00Z" }, [img], agora), "passado");
  assert.equal(motivoBloqueioAprovacao({ status: "approved", format: "image", scheduled_at: futuro }, [img], agora), "status");
  assert.equal(motivoBloqueioAprovacao({ status: "draft", format: "carousel", scheduled_at: futuro }, [img, img], agora), null);
});

// ---------- upload ----------

test("upload: só JPEG de verdade, até 8 MB, tamanho exato por formato", () => {
  assert.deepEqual(dimensoesJpeg(jpeg(1080, 1350)), { largura: 1080, altura: 1350 });
  assert.deepEqual(validarImagem(jpeg(1080, 1350), "image/jpeg", "image"), { ok: true });
  assert.deepEqual(validarImagem(jpeg(1080, 1350), "image/jpeg", "carousel"), { ok: true });
  assert.deepEqual(validarImagem(jpeg(1080, 1920), "image/jpeg", "story"), { ok: true });
  assert.deepEqual(validarImagem(jpeg(1080, 1920), "image/jpeg", "image"), { ok: false, erro: "dimensao" });
  assert.deepEqual(validarImagem(jpeg(1080, 1350), "image/jpeg", "story"), { ok: false, erro: "dimensao" });
  assert.deepEqual(validarImagem(jpeg(1080, 1080), "image/jpeg", "image"), { ok: false, erro: "dimensao" });
  assert.deepEqual(validarImagem(jpeg(1080, 1350), "image/png", "image"), { ok: false, erro: "tipo" });
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assert.deepEqual(validarImagem(png, "image/jpeg", "image"), { ok: false, erro: "tipo" });
  assert.deepEqual(validarImagem(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg", "image"), { ok: false, erro: "tipo" });
  assert.deepEqual(validarImagem(new Uint8Array(), "image/jpeg", "image"), { ok: false, erro: "vazio" });
  assert.deepEqual(validarImagem(jpeg(1080, 1350, 8 * 1024 * 1024), "image/jpeg", "image"), { ok: false, erro: "grande" });
  assert.deepEqual(validarImagem(jpeg(1080, 1350, 8 * 1024 * 1024 - 64), "image/jpeg", "image"), { ok: true });
});

test("editor: data no fuso, limites de legenda/hashtags e alt da foto única", () => {
  const f = (o: Record<string, string>) => ({ get: (n: string) => o[n] ?? null });
  const ok = lerEdicao(f({ quando: "2026-10-26T12:15", legenda: "Oi\r\nmundo", hashtags: "#a   #b", alt: "Alt" }), [1]);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.edicao.scheduled_at, "2026-10-26T15:15:00.000Z");
    assert.equal(ok.edicao.caption, "Oi\nmundo");
    assert.equal(ok.edicao.hashtags, "#a #b");
    assert.deepEqual(ok.edicao.slide_alts, [{ position: 1, alt_text: "Alt" }]);
  }
  const car = lerEdicao(f({ quando: "2026-10-26T12:15", alt: "post", alt_1: "um", alt_2: "dois" }), [1, 2]);
  assert.ok(car.ok && car.edicao.slide_alts[1]?.alt_text === "dois");
  assert.deepEqual(lerEdicao(f({ quando: "2026-13-01T10:00" }), [1]), { ok: false, erro: "data" });
  assert.deepEqual(lerEdicao(f({ quando: "2026-10-26T12:15", legenda: "x".repeat(2201) }), [1]), { ok: false, erro: "legenda" });
  assert.deepEqual(lerEdicao(f({ quando: "2026-10-26T12:15", hashtags: Array.from({ length: 31 }, (_, i) => `#h${i}`).join(" ") }), [1]), { ok: false, erro: "hashtags" });
});

// ---------- rotas ----------

const CFG = { origemPublica: "https://app.laudousg.com.br", supabaseUrl: "https://x.supabase.co" } as ConfigServidor;
function repoFalso(formato: Formato = "image") {
  const chamadas: string[] = [];
  const repo: RepositorioSocial = {
    formato: async () => (chamadas.push("formato"), formato),
    importar: async (p) => (chamadas.push(`importar:${p.length}`), { criados: p.length, atualizados: 0, preservados: 0, orfaos: [] }),
    salvar: async (id) => (chamadas.push(`salvar:${id}`), "ok"),
    mover: async (id, p, d) => (chamadas.push(`mover:${id}:${p}:${d}`), "ok"),
    mudarStatus: async (id, s) => (chamadas.push(`status:${id}:${s}`), s === "approved" ? "sem_imagem" : "ok"),
    enviarImagem: async (id, p, b) => (chamadas.push(`imagem:${id}:${p}:${b.length}`), "ok"),
  };
  return { repo, chamadas };
}
function post(caminho: string, campos: Record<string, string | Blob>): Request {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return new Request(`https://app.laudousg.com.br/admin/api/social/${caminho}`, { method: "POST", headers: { origin: "https://app.laudousg.com.br" }, body: f });
}
const destino = (r: Response) => new URL(r.headers.get("location") ?? "about:blank");

test("rotas: sem admin → 404 e o banco nem é chamado", async () => {
  const { repo, chamadas } = repoFalso();
  const rotas = criarRotasSocial({ autorizar: async () => null, repo: () => repo });
  for (const [nome, h] of Object.entries(rotas)) {
    const r = await h(post(nome, { id: "s1-01", posicao: "1", para: "approved", direcao: "cima" }));
    assert.equal(r.status, 404, nome);
  }
  assert.deepEqual(chamadas, []);
  for (const p of ["/api/social/importar", "/api/social/midia", "/api/social/salvar", "/api/social/status", "/api/social/ordem"]) {
    assert.equal(rotaSemSessao(p), false, p);
    assert.equal(rotaPublica(p), false, p);
  }
});

test("rotas: importar, aprovar, ordenar e enviar imagem com o admin", async () => {
  const { repo, chamadas } = repoFalso("story");
  const rotas = criarRotasSocial({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repo });
  const cal = new Blob([JSON.stringify(fixture())], { type: "application/json" });
  let r = await rotas.importar(post("importar", { arquivo: cal }));
  assert.equal(r.status, 303);
  assert.equal(destino(r).origin + destino(r).pathname, "https://app.laudousg.com.br/admin/instagram");
  assert.equal(destino(r).searchParams.get("importado"), "5-0-0");
  assert.equal(destino(r).searchParams.get("em"), "2026-10-26T10:30:00.000Z");

  r = await rotas.importar(post("importar", { arquivo: new Blob(["{nao é json"]) }));
  assert.equal(destino(r).searchParams.get("erro"), "json");
  const ruim = fixture();
  ruim.fuso = "UTC";
  r = await rotas.importar(post("importar", { arquivo: new Blob([JSON.stringify(ruim)]) }));
  assert.equal(destino(r).searchParams.get("erro"), "calendario");
  assert.match(destino(r).searchParams.get("msg") ?? "", /fuso/);
  r = await rotas.importar(post("importar", { arquivo: new Blob(["x".repeat(1024 * 1024 + 1)]) }));
  assert.equal(destino(r).searchParams.get("erro"), "arquivo_grande");

  r = await rotas.status(post("status", { id: "s1-01", para: "approved" }));
  assert.equal(destino(r).pathname, "/admin/instagram/s1-01");
  assert.equal(destino(r).searchParams.get("erro"), "sem_imagem");
  assert.equal((await rotas.status(post("status", { id: "s1-01", para: "published" }))).status, 404);
  assert.equal((await rotas.status(post("status", { id: "../x", para: "draft" }))).status, 404);

  r = await rotas.ordem(post("ordem", { id: "s1-02", posicao: "2", direcao: "cima" }));
  assert.equal(destino(r).searchParams.get("ok"), "ordem");

  r = await rotas.salvar(post("salvar", { id: "s1-01", posicoes: "1", quando: "ontem" }));
  assert.equal(destino(r).searchParams.get("erro"), "data");
  r = await rotas.salvar(post("salvar", { id: "s1-01", posicoes: "1", quando: "2026-10-26T12:15", legenda: "Oi" }));
  assert.equal(destino(r).searchParams.get("ok"), "salvo");

  // o formato vem do banco (story): 1080×1350 é recusado mesmo com JPEG válido
  const feed = new Blob([jpeg(1080, 1350)], { type: "image/jpeg" });
  r = await rotas.midia(post("midia", { id: "st-1026-3", posicao: "1", arquivo: feed, formato: "image" }));
  assert.equal(destino(r).searchParams.get("erro"), "dimensao");
  r = await rotas.midia(post("midia", { id: "st-1026-3", posicao: "1", arquivo: new Blob([jpeg(1080, 1920)], { type: "image/png" }) }));
  assert.equal(destino(r).searchParams.get("erro"), "tipo");
  r = await rotas.midia(post("midia", { id: "st-1026-3", posicao: "1", arquivo: new Blob([jpeg(1080, 1920)], { type: "image/jpeg" }) }));
  assert.equal(destino(r).searchParams.get("ok"), "imagem");

  assert.deepEqual(chamadas.filter((c) => !c.startsWith("formato")), [
    "importar:5",
    "status:s1-01:approved",
    "mover:s1-02:2:-1",
    "salvar:s1-01",
    "imagem:st-1026-3:1:" + jpeg(1080, 1920).length,
  ]);
});

test("rotas no código: todas checam a sessão de novo e o service role fica no servidor", () => {
  const dir = join(RAIZ, "src", "app", "api", "social");
  const rotas = readdirSync(dir);
  assert.deepEqual(rotas.sort(), ["importar", "midia", "ordem", "salvar", "status"]);
  for (const r of rotas) assert.match(readFileSync(join(dir, r, "route.ts"), "utf8"), new RegExp(`export const POST = rotasSocial\\.${r};`));
  const fonte = readFileSync(join(RAIZ, "src", "lib", "social", "rotas.ts"), "utf8");
  assert.match(fonte, /contextoPost\(/);
  assert.match(fonte, /verificarSessao\(ctx\.sessao, ctx\.cfg\)/);
  assert.match(fonte, /decisao === "permitir"/);
  const social = readdirSync(join(RAIZ, "src", "lib", "social")).map((f) => readFileSync(join(RAIZ, "src", "lib", "social", f), "utf8"));
  for (const txt of social) {
    assert.doesNotMatch(txt, /NEXT_PUBLIC_|"use client"/);
    assert.doesNotMatch(txt, /from\("social_accounts"\)/); // token nunca é lido nesta fase
  }
  const telas = [join(RAIZ, "src", "components", "Instagram.tsx"), join(RAIZ, "src", "app", "(painel)", "instagram", "page.tsx"), join(RAIZ, "src", "app", "(painel)", "instagram", "[id]", "page.tsx")];
  for (const t of telas) assert.doesNotMatch(readFileSync(t, "utf8"), /"use client"|SERVICE_ROLE/);
});

// ---------- CSP ----------

test("CSP: img-src libera só o caminho público do bucket social", async () => {
  assert.equal(fonteImagensSocial("https://abc.supabase.co"), "https://abc.supabase.co/storage/v1/object/public/social/");
  assert.equal(fonteImagensSocial("https://abc.supabase.co/rest/v1"), "https://abc.supabase.co/storage/v1/object/public/social/");
  assert.equal(fonteImagensSocial("http://abc.supabase.co"), null);
  assert.equal(fonteImagensSocial("http://127.0.0.1:54321"), "http://127.0.0.1:54321/storage/v1/object/public/social/");
  assert.equal(fonteImagensSocial("javascript:alert(1)"), null);
  assert.equal(fonteImagensSocial(undefined), null);
  assert.equal(urlPublicaSocial("https://abc.supabase.co", "posts/s1-01/ab.jpg"), "https://abc.supabase.co/storage/v1/object/public/social/posts/s1-01/ab.jpg");

  const antes = process.env.SUPABASE_URL;
  process.env.SUPABASE_URL = "https://abc.supabase.co";
  try {
    const cfg = (await import("../next.config")).default as { headers: () => Promise<{ headers: { key: string; value: string }[] }[]> };
    const csp = (await cfg.headers())[0]!.headers.find((h) => h.key === "Content-Security-Policy")!.value;
    const img = csp.split("; ").find((d) => d.startsWith("img-src"));
    assert.equal(img, "img-src 'self' data: https://abc.supabase.co/storage/v1/object/public/social/");
    for (const d of csp.split("; ").filter((x) => !x.startsWith("img-src"))) assert.doesNotMatch(d, /supabase/, d);
  } finally {
    if (antes === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = antes;
  }
});
