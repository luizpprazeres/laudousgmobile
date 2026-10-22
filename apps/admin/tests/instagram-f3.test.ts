/**
 * Instagram F3: cron de publicação (seleção, carrossel, story, limite, tentativas, concorrência),
 * renovação do token, destravar, stories manuais e selos do painel. Todo `fetch` é simulado.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartaoConta, ChipPost, FaixaManual } from "../src/components/Instagram";
import { rotaSemSessao } from "../src/lib/auth/acesso";
import { cifrar, decifrar } from "../src/lib/social/cifra";
import { criarCronSocial, criarCronToken, executarFila, MAX_POR_RODADA } from "../src/lib/social/cron";
import { repositorioManual, type RepositorioManual, NOTA_DESTRAVADO } from "../src/lib/social/manual";
import { atrasado, linkInstagram, manualAgora, preso, seloPost } from "../src/lib/social/politica";
import { publicarPost } from "../src/lib/social/publicacao";
import { criarRotasInstagram, type DependenciasInstagram } from "../src/lib/social/rotas-instagram";
import { avisoToken, decidirRenovacao, executarRenovacao } from "../src/lib/social/token";
import type { LinhaItem, LinhaPost } from "../src/lib/social/tipos";
import {
  ADMIN,
  casa,
  CFG,
  CHAVE,
  contaMemoria,
  contaValida,
  fetchFalso,
  graphSimulado,
  IG,
  IG_USER,
  img,
  ORIGEM,
  postAprovado,
  publicacaoMemoria,
  relogio,
  semToken,
  T0,
  TOKEN,
  type PostMem,
} from "./fixtures/instagram";

Object.assign(globalThis, { React });

const RAIZ = join(__dirname, "..");
const MIGRACOES = ["20261022212039_admin_social.sql", "20261022233000_admin_social_f3.sql"].map((f) => readFileSync(join(RAIZ, "..", "..", "supabase", "migrations", f), "utf8"));
const SEGREDO = "cron-secreto-0123456789abcdef";
const H = 3600_000;
const iso = (t: number) => new Date(t).toISOString();
const NOVO_TOKEN = "IGAAnovo" + "z".repeat(120);

/** Captura console.* durante `f` (para provar que nada sensível vai para log). */
async function comLogs<T>(f: () => Promise<T>): Promise<{ r: T; logs: string[] }> {
  const logs: string[] = [];
  const orig = { warn: console.warn, error: console.error, log: console.log, info: console.info };
  for (const k of Object.keys(orig) as (keyof typeof orig)[]) console[k] = (...a: unknown[]) => void logs.push(a.map(String).join(" "));
  try {
    return { r: await f(), logs };
  } finally {
    Object.assign(console, orig);
  }
}

const carrossel = (o: Partial<PostMem> = {}) =>
  postAprovado({
    id: "c-01",
    format: "carousel",
    caption: "Três passos.",
    hashtags: "#laudo",
    itens: [1, 2, 3].map((n) => ({ public_url: img("c-01", n), alt_text: `Slide ${n}` })),
    ...o,
  });
const story = (o: Partial<PostMem> = {}) => postAprovado({ id: "st-01", format: "story", caption: "", hashtags: "", alt_text: "Arte", itens: [{ public_url: img("st-01", 1), alt_text: "" }], ...o });

// ---------- cron: proteção ----------

test("cron sem segredo → 404 sem ler nada; rotas fora da sessão e agendadas no vercel.json", async () => {
  const explode = () => {
    throw new Error("não deveria ler config sem o segredo");
  };
  for (const criar of [criarCronSocial, criarCronToken]) {
    for (const [env, auth] of [
      [{ CRON_SECRET: SEGREDO }, null],
      [{ CRON_SECRET: SEGREDO }, "Bearer errado"],
      [{ CRON_SECRET: SEGREDO }, SEGREDO],
      [{ CRON_SECRET: SEGREDO }, `bearer ${SEGREDO}`],
      [{ CRON_SECRET: SEGREDO }, `Bearer ${SEGREDO}x`],
      [{ CRON_SECRET: SEGREDO }, `Bearer ${SEGREDO.slice(0, -1)}`],
      [{ CRON_SECRET: "" }, "Bearer "],
      [{}, "Bearer undefined"],
    ] as [Record<string, string>, string | null][]) {
      const h = criar({ env, servidor: explode, instagram: explode, publicacao: explode, conta: explode, buscar: explode });
      const res = await h(new Request(`${ORIGEM}/admin/api/cron/social`, { headers: auth ? { authorization: auth } : {} }));
      assert.equal(res.status, 404, `${JSON.stringify(env)} ${auth}`);
      assert.equal(await res.text(), "");
    }
    // Com o segredo, mas sem config → 503 sem detalhes.
    const sem = await criar({ env: { CRON_SECRET: SEGREDO }, servidor: () => null })(new Request(`${ORIGEM}/x`, { headers: { authorization: `Bearer ${SEGREDO}` } }));
    assert.equal(sem.status, 503);
    assert.deepEqual(await sem.json(), { error: "social_not_configured" });
  }
  for (const p of ["/api/cron/social", "/api/cron/social-token"]) assert.equal(rotaSemSessao(p), true, p);
  for (const p of ["/api/cron/social-x", "/api/cron/social/1"]) assert.equal(rotaSemSessao(p), false, p);
  const vercel = JSON.parse(readFileSync(join(RAIZ, "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] };
  assert.deepEqual(vercel.crons, [
    { path: "/admin/api/cron/apple", schedule: "15 */3 * * *" },
    { path: "/admin/api/cron/social", schedule: "*/5 * * * *" },
    { path: "/admin/api/cron/social-token", schedule: "0 9 * * *" },
  ]);
  const rota = readFileSync(join(RAIZ, "src", "app", "api", "cron", "social", "route.ts"), "utf8");
  assert.match(rota, /export const GET = criarCronSocial\(\);/);
  assert.match(rota, /maxDuration = 300/);
  assert.match(readFileSync(join(RAIZ, "src", "app", "api", "cron", "social-token", "route.ts"), "utf8"), /export const GET = criarCronToken\(\);/);
});

// ---------- cron: seleção ----------

test("seleção: só approved, não manual, vencido há até 6 h, em ordem de horário, até 3 por rodada", async () => {
  const posts = [
    postAprovado({ id: "futuro", scheduled_at: iso(T0 + 60_000) }),
    postAprovado({ id: "atrasado-6h01", scheduled_at: iso(T0 - 6 * H - 60_000) }),
    postAprovado({ id: "quase-6h", scheduled_at: iso(T0 - 6 * H + 60_000) }),
    postAprovado({ id: "1h", scheduled_at: iso(T0 - H) }),
    postAprovado({ id: "manual", format: "story", manual: true, scheduled_at: iso(T0 - 2 * H) }),
    postAprovado({ id: "rascunho", status: "draft", scheduled_at: iso(T0 - H) }),
    postAprovado({ id: "falhou", status: "failed", scheduled_at: iso(T0 - H) }),
    postAprovado({ id: "agora", scheduled_at: iso(T0) }),
    postAprovado({ id: "30min", scheduled_at: iso(T0 - 30 * 60_000) }),
  ];
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const g = graphSimulado();
  const r = relogio();
  const resumo = await executarFila({ repo: pub.repo, conta: contaValida().repo, chave: CHAVE, buscar: g.buscar, opcoes: { esperar: r.esperar }, agora: r.agora });
  assert.equal(MAX_POR_RODADA, 3);
  assert.deepEqual(resumo.posts, [
    { id: "quase-6h", resultado: "publicado" },
    { id: "1h", resultado: "publicado" },
    { id: "30min", resultado: "publicado" },
  ]);
  assert.equal(resumo.fila, 3);
  const st = Object.fromEntries(posts.map((p) => [p.id, p.status]));
  assert.deepEqual(st, { futuro: "approved", "atrasado-6h01": "approved", "quase-6h": "published", "1h": "published", manual: "approved", rascunho: "draft", falhou: "failed", agora: "approved", "30min": "published" });
  // a rodada seguinte pega o que sobrou dentro da janela; o atrasado e o manual nunca
  const r2 = await executarFila({ repo: pub.repo, conta: contaValida().repo, chave: CHAVE, buscar: g.buscar, opcoes: { esperar: r.esperar }, agora: () => T0 });
  assert.deepEqual(r2.posts.map((p) => p.id), ["agora"]);
  assert.equal(posts.find((p) => p.id === "atrasado-6h01")!.status, "approved");
  assert.equal(posts.find((p) => p.id === "manual")!.status, "approved");
  assert.equal(g.publishes(), 4);
  // painel: o atrasado aparece como "Atrasado"
  assert.equal(atrasado(posts.find((p) => p.id === "atrasado-6h01")!, T0), true);
  assert.equal(atrasado(posts.find((p) => p.id === "quase-6h")!, T0), false);
});

test("seleção: orçamento de tempo adia o resto da fila para a próxima rodada", async () => {
  const posts = [1, 2, 3].map((n) => postAprovado({ id: `p${n}`, scheduled_at: iso(T0 - n * 60_000) }));
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const g = graphSimulado({ status: () => "IN_PROGRESS" });
  const r = relogio();
  const resumo = await executarFila({ repo: pub.repo, conta: contaValida().repo, chave: CHAVE, buscar: g.buscar, opcoes: { esperar: r.esperar, intervaloMs: 3000 }, agora: r.agora, orcamentoMs: 160_000 });
  // o 1º post gasta ~90 s esperando e não chega a FINISHED (volta para a fila); sobra menos que o mínimo para o 2º
  assert.deepEqual(resumo.posts, [{ id: "p3", resultado: "nova_tentativa" }]);
  assert.equal(resumo.posts.length, 1);
  assert.equal(resumo.adiados, 2);
  assert.ok(r.agora() - T0 <= 160_000, "respeita o orçamento");
  assert.equal(posts.filter((p) => p.status === "approved").length, 3);
});

// ---------- carrossel e story ----------

test("carrossel: filhos is_carousel_item com alt, espera todos, pai CAROUSEL com children e legenda só no pai", async () => {
  const posts = [carrossel()];
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const g = graphSimulado({ status: (c, n) => (c.media_type === "CAROUSEL" ? (n < 2 ? "IN_PROGRESS" : "FINISHED") : n < 3 ? "IN_PROGRESS" : "FINISHED") });
  const r = relogio();
  const out = await publicarPost("c-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: r.esperar }, agora: r.agora, modo: "cron" });
  assert.equal(out.resultado, "publicado");
  assert.equal(posts[0]!.status, "published");
  assert.match(posts[0]!.permalink ?? "", /^https:\/\/www\.instagram\.com\/p\//);
  assert.deepEqual(g.containers.map((c) => c.corpo), [
    { image_url: img("c-01", 1), is_carousel_item: true, alt_text: "Slide 1" },
    { image_url: img("c-01", 2), is_carousel_item: true, alt_text: "Slide 2" },
    { image_url: img("c-01", 3), is_carousel_item: true, alt_text: "Slide 3" },
    { media_type: "CAROUSEL", children: g.containers.slice(0, 3).map((c) => c.id).join(","), caption: "Três passos.\n\n#laudo" },
  ]);
  for (const c of g.containers.slice(0, 3)) {
    assert.equal(c.consultas, 3, "cada filho consultado até FINISHED");
    assert.ok(!("caption" in c.corpo), "filho sem legenda");
  }
  assert.equal(g.containers[3]!.consultas, 2, "o pai também espera FINISHED");
  const pai = g.containers[3]!.id;
  const publish = g.chamadas.find((c) => c.url.endsWith("/media_publish"))!;
  assert.deepEqual(JSON.parse(publish.corpo), { creation_id: pai });
  // o pai só é criado depois de todos os filhos FINISHED
  const iPai = g.chamadas.findIndex((c) => c.metodo === "POST" && c.corpo.includes("CAROUSEL"));
  const ultimaConsultaFilho = Math.max(...g.containers.slice(0, 3).map((k) => g.chamadas.map((c) => c.url.includes(`/${k.id}?`)).lastIndexOf(true)));
  assert.ok(iPai > ultimaConsultaFilho);
  assert.deepEqual(pub.transicoes, ["c-01:publishing", "c-01:publish_pedido", "c-01:published"]);
  for (const c of g.chamadas) assert.ok(!c.url.includes(TOKEN));
});

test("story: media_type STORIES com image_url, sem legenda nem alt_text", async () => {
  const posts = [story()];
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const g = graphSimulado();
  const out = await publicarPost("st-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0, modo: "cron" });
  assert.equal(out.resultado, "publicado");
  assert.deepEqual(g.containers.map((c) => c.corpo), [{ image_url: img("st-01", 1), media_type: "STORIES" }]);
  assert.equal(posts[0]!.status, "published");
});

test("carrossel: filho com ERROR, tempo esgotado e limite estourado (modo cron)", async () => {
  // filho 2 com ERROR → volta para a fila (1ª tentativa), sem criar o pai nem publicar
  {
    const posts = [carrossel()];
    const pub = publicacaoMemoria(posts, { agora: () => T0 });
    const g = graphSimulado({ status: (c) => (c.image_url === img("c-01", 2) ? "ERROR" : "FINISHED") });
    const out = await publicarPost("c-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0, modo: "cron" });
    assert.equal(out.resultado, "nova_tentativa");
    assert.equal(posts[0]!.status, "approved");
    assert.equal(posts[0]!.attempts, 1);
    assert.match(posts[0]!.last_error ?? "", /^Tentativa 1\/3 falhou: processamento: item 2 do carrossel: container ERROR/);
    assert.ok(!g.containers.some((c) => c.corpo.media_type === "CAROUSEL"), "não cria o pai");
    assert.equal(g.publishes(), 0);
  }
  // tempo esgotado: respeita o limite e volta para a fila
  {
    const posts = [carrossel()];
    const pub = publicacaoMemoria(posts, { agora: () => T0 });
    const g = graphSimulado({ status: () => "IN_PROGRESS" });
    const r = relogio();
    const out = await publicarPost("c-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: r.esperar, limiteMs: 20_000, intervaloMs: 3000 }, agora: r.agora, modo: "cron" });
    assert.equal(out.resultado, "nova_tentativa");
    assert.ok(r.agora() - T0 <= 20_000);
    assert.match(posts[0]!.last_error ?? "", /tempo esgotado/);
    assert.equal(g.publishes(), 0);
  }
  // limite estourado: volta para approved SEM contar tentativa e para a rodada
  {
    const posts = [carrossel({ attempts: 2, scheduled_at: iso(T0 - 2 * 60_000) }), postAprovado({ id: "depois", scheduled_at: iso(T0 - 60_000) })];
    const pub = publicacaoMemoria(posts, { agora: () => T0 });
    const g = graphSimulado({ limite: { data: [{ quota_usage: 50, config: { quota_total: 50, quota_duration: 86400 } }] } });
    const resumo = await executarFila({ repo: pub.repo, conta: contaValida().repo, chave: CHAVE, buscar: g.buscar, opcoes: { esperar: async () => {} }, agora: () => T0 });
    assert.deepEqual(resumo.posts, [{ id: "c-01", resultado: "limite" }]);
    assert.equal(resumo.parada, "limite");
    assert.equal(resumo.adiados, 1);
    assert.equal(posts[0]!.status, "approved");
    assert.equal(posts[0]!.attempts, 2, "limite não conta tentativa");
    assert.match(posts[0]!.last_error ?? "", /^Aguardando: limite/);
    assert.equal(posts[1]!.status, "approved", "o próximo nem é tentado");
    assert.equal(g.containers.length, 0);
  }
  // quantidade errada de imagens ou slide fora do bucket → falha antes de qualquer container
  {
    const posts = [carrossel({ itens: [{ public_url: img("c-01", 1), alt_text: "" }, { public_url: null, alt_text: "" }] })];
    const pub = publicacaoMemoria(posts, { agora: () => T0 });
    const g = graphSimulado();
    const out = await publicarPost("c-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0, modo: "cron" });
    assert.equal(out.resultado, "nova_tentativa");
    assert.match(posts[0]!.last_error ?? "", /falta imagem pública/);
    assert.equal(g.chamadas.length, 0);
  }
});

// ---------- política de tentativas ----------

test("tentativas: 1ª e 2ª falha voltam para approved, a 3ª vira failed", async () => {
  const posts = [postAprovado()];
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const g = graphSimulado({ media: () => ({ status: 400, json: { error: { message: `imagem inválida ${TOKEN}`, code: 9004 } } }) });
  const deps = { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, buscar: g.buscar, opcoes: { esperar: async () => {} }, agora: () => T0 };
  const esperado: [string, string, number][] = [
    ["nova_tentativa", "approved", 1],
    ["nova_tentativa", "approved", 2],
    ["falhou", "failed", 3],
  ];
  for (const [resultado, status, n] of esperado) {
    const r = await executarFila(deps);
    assert.deepEqual(r.posts, [{ id: "s1-01", resultado }]);
    assert.equal(posts[0]!.status, status);
    assert.equal(posts[0]!.attempts, n);
    assert.match(posts[0]!.last_error ?? "", new RegExp(`^Tentativa ${n}/3 falhou: container: HTTP 400`));
    semToken(posts[0]!.last_error);
  }
  // failed não volta para a fila
  assert.deepEqual((await executarFila(deps)).posts, []);
  assert.equal(g.publishes(), 0);
});

test("tentativas: depois do media_publish nunca volta para approved (5xx, rede, 4xx, sem id)", async () => {
  const casos: [string, Parameters<typeof graphSimulado>[0], string, RegExp][] = [
    ["5xx", { publicar: { status: 502, json: {} } }, "incerto", /^Resultado incerto, confira no Instagram/],
    ["rede", { publicar: "rede" }, "incerto", /^Resultado incerto, confira no Instagram.*sem resposta/],
    ["sem id", { publicar: { json: {} } }, "incerto", /^Resultado incerto.*resposta sem id/],
    ["4xx", { publicar: { status: 400, json: { error: { message: "media not ready", code: 9007 } } } }, "falhou", /^publicar: HTTP 400/],
  ];
  for (const [nome, o, resultado, erro] of casos) {
    const posts = [postAprovado({ attempts: 0 })];
    const pub = publicacaoMemoria(posts, { agora: () => T0 });
    const g = graphSimulado(o);
    const out = await publicarPost("s1-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0, modo: "cron" });
    assert.equal(out.resultado, resultado, nome);
    assert.equal(posts[0]!.status, "failed", nome);
    assert.equal(posts[0]!.attempts, 1, nome);
    assert.ok(posts[0]!.publish_requested_at, nome);
    assert.match(posts[0]!.last_error ?? "", erro, nome);
    assert.deepEqual(pub.transicoes, ["s1-01:publishing", "s1-01:publish_pedido", "s1-01:failed"], nome);
  }
  // mesmo que alguém tente devolver: o repositório exige publish_requested_at null
  const posts = [postAprovado({ status: "publishing", publish_requested_at: iso(T0) })];
  const pub = publicacaoMemoria(posts);
  await pub.repo.devolver("s1-01", "x", 1);
  assert.equal(posts[0]!.status, "publishing");
});

test("tentativas: se o banco não grava o marcador, o media_publish não é chamado", async () => {
  const posts = [postAprovado()];
  const pub = publicacaoMemoria(posts, { agora: () => T0, marcarFalha: true });
  const g = graphSimulado();
  const { r: out, logs } = await comLogs(() => publicarPost("s1-01", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar, esperar: async () => {} }, agora: () => T0, modo: "cron" }));
  assert.equal(out.resultado, "nova_tentativa");
  assert.equal(g.publishes(), 0);
  assert.equal(posts[0]!.status, "approved");
  assert.match(posts[0]!.last_error ?? "", /não registrou o pedido de publicação; nada foi publicado/);
  for (const l of logs) semToken(l);
});

test("concorrência: duas execuções simultâneas do cron não publicam o mesmo post", async () => {
  const posts = [postAprovado({ id: "a", scheduled_at: iso(T0 - 2 * 60_000) }), carrossel({ id: "b", scheduled_at: iso(T0 - 60_000) }), story({ id: "c", scheduled_at: iso(T0 - 30_000) })];
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const g = graphSimulado({ status: (_c, n) => (n < 2 ? "IN_PROGRESS" : "FINISHED") });
  const deps = { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, buscar: g.buscar, opcoes: { esperar: async () => {} }, agora: () => T0 };
  const [x, y, z] = await Promise.all([executarFila(deps), executarFila(deps), executarFila(deps)]);
  const publicados = [...x.posts, ...y.posts, ...z.posts].filter((p) => p.resultado === "publicado").map((p) => p.id).sort();
  assert.deepEqual(publicados, ["a", "b", "c"]);
  assert.equal(g.publishes(), 3, "um media_publish por post");
  assert.ok(posts.every((p) => p.status === "published"));
});

test("SQL real (PGlite): trava do cron com janela, devolução e destravar respeitam publish_requested_at", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`);
    for (const m of MIGRACOES) await db.exec(m);
    // O trigger toca updated_at em todo UPDATE; o INSERT grava o instante antigo direto.
    await db.query(`insert into public.social_posts(id,scheduled_at,format,status,manual,updated_at,publish_requested_at) values
      ('a', now() - interval '1 hour', 'carousel', 'approved', false, now(), null),
      ('late', now() - interval '7 hours', 'image', 'approved', false, now(), null),
      ('st', now() - interval '1 hour', 'story', 'approved', true, now(), null),
      ('preso', now() - interval '1 hour', 'image', 'publishing', false, now() - interval '20 minutes', null),
      ('preso-pub', now() - interval '1 hour', 'image', 'publishing', false, now() - interval '20 minutes', now() - interval '19 minutes'),
      ('recente', now() - interval '1 hour', 'image', 'publishing', false, now(), null)`);
    // trava do cron: approved, não manual, dentro da janela de 6 h
    const travar = (id: string) =>
      db.query(
        `update public.social_posts set status='publishing', publish_requested_at=null where id=$1 and status='approved' and manual=false and format in ('image','carousel','story') and scheduled_at <= now() and scheduled_at >= now() - interval '6 hours' returning id`,
        [id],
      );
    const [r1, r2] = await Promise.all([travar("a"), travar("a")]);
    assert.deepEqual([r1.rows.length, r2.rows.length].sort(), [0, 1]);
    assert.equal((await travar("late")).rows.length, 0, "fora da janela de 6 h");
    assert.equal((await travar("st")).rows.length, 0, "manual nunca");
    // marcador: só uma vez
    const marcar = () => db.query(`update public.social_posts set publish_requested_at=now() where id='a' and status='publishing' and publish_requested_at is null returning id`);
    assert.equal((await marcar()).rows.length, 1);
    assert.equal((await marcar()).rows.length, 0);
    // devolver para a fila com o marcador gravado: nada muda
    const devolver = (id: string) => db.query(`update public.social_posts set status='approved' where id=$1 and status='publishing' and publish_requested_at is null returning id`, [id]);
    assert.equal((await devolver("a")).rows.length, 0);
    // destravar → aprovado: só parado há 10 min e sem marcador
    const voltar = (id: string) => db.query(`update public.social_posts set status='approved', last_error=$2 where id=$1 and status='publishing' and publish_requested_at is null and updated_at <= now() - interval '10 minutes' returning id`, [id, NOTA_DESTRAVADO]);
    assert.equal((await voltar("recente")).rows.length, 0, "ainda não parou 10 min");
    assert.equal((await voltar("preso-pub")).rows.length, 0, "o publish já foi pedido");
    assert.equal((await voltar("preso")).rows.length, 1);
    // destravar → publicado: aceita com marcador, grava sem ig_media_id
    await db.query(`update public.social_posts set status='published', published_at=now(), permalink='https://www.instagram.com/p/ABC/' where id='preso-pub' and status='publishing' and updated_at <= now() - interval '10 minutes'`);
    const p = (await db.query<{ status: string; ig_media_id: string | null }>(`select status, ig_media_id from public.social_posts where id='preso-pub'`)).rows[0]!;
    assert.deepEqual(p, { status: "published", ig_media_id: null });
    // story manual marcado como publicado
    const m = await db.query(`update public.social_posts set status='published', published_at=now() where id='st' and status='approved' and manual=true returning id`);
    assert.equal(m.rows.length, 1);
    // renovação: erro com 300 caracteres cabe; 301 não
    await db.query(`insert into public.social_accounts(ig_user_id,token_ciphertext,token_issued_at) values ('1',$1, now())`, [cifrar(TOKEN, CHAVE)]);
    await db.query(`update public.social_accounts set token_refresh_error=$1, token_refresh_failed_at=now()`, ["x".repeat(300)]);
    await assert.rejects(db.query(`update public.social_accounts set token_refresh_error=$1`, ["x".repeat(301)]));
    // nenhuma permissão nova para anon/authenticated
    for (const papel of ["anon", "authenticated"]) {
      for (const t of ["social_posts", "social_accounts"]) assert.equal((await db.query<{ v: boolean }>(`select has_table_privilege('${papel}','public.${t}','SELECT') v`)).rows[0]!.v, false);
    }
  } finally {
    await db.close();
  }
});

// ---------- cron de ponta a ponta ----------

test("cron social com segredo: publica, responde só ids e resultados, sem token", async () => {
  const posts = [carrossel({ scheduled_at: iso(T0 - 60_000) })];
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const g = graphSimulado();
  const h = criarCronSocial({ env: { CRON_SECRET: SEGREDO }, servidor: () => CFG, instagram: () => IG, publicacao: () => pub.repo, conta: () => contaValida().repo, buscar: g.buscar, opcoes: { esperar: async () => {} }, agora: () => T0 });
  const res = await h(new Request(`${ORIGEM}/admin/api/cron/social`, { headers: { authorization: `Bearer ${SEGREDO}` } }));
  assert.equal(res.status, 200);
  const txt = await res.text();
  semToken(txt);
  const j = JSON.parse(txt) as { posts: { id: string; resultado: string }[] };
  assert.deepEqual(j.posts, [{ id: "c-01", resultado: "publicado" }]);
  // sem conta: nada trava, rodada para
  const p2 = [postAprovado()];
  const pub2 = publicacaoMemoria(p2, { agora: () => T0 });
  const h2 = criarCronSocial({ env: { CRON_SECRET: SEGREDO }, servidor: () => CFG, instagram: () => IG, publicacao: () => pub2.repo, conta: () => contaMemoria(null).repo, buscar: g.buscar, agora: () => T0 });
  const j2 = (await (await h2(new Request(`${ORIGEM}/x`, { headers: { authorization: `Bearer ${SEGREDO}` } }))).json()) as { parada: string };
  assert.equal(j2.parada, "sem_conta");
  assert.equal(p2[0]!.status, "approved");
});

// ---------- renovação do token ----------

test("renovação: decisão (15 dias, 24 h, vencido, validade desconhecida)", () => {
  const D = 86400_000;
  assert.equal(decidirRenovacao({ expiraEm: iso(T0 + 20 * D), emitidoEm: iso(T0 - 40 * D) }, T0), "cedo");
  assert.equal(decidirRenovacao({ expiraEm: iso(T0 + 15 * D), emitidoEm: iso(T0 - 45 * D) }, T0), "cedo");
  assert.equal(decidirRenovacao({ expiraEm: iso(T0 + 15 * D - 1), emitidoEm: iso(T0 - 45 * D) }, T0), "renovar");
  assert.equal(decidirRenovacao({ expiraEm: iso(T0 + 10 * D), emitidoEm: iso(T0 - 23 * H) }, T0), "novo_demais");
  assert.equal(decidirRenovacao({ expiraEm: iso(T0 + 10 * D), emitidoEm: iso(T0 - 24 * H) }, T0), "renovar");
  assert.equal(decidirRenovacao({ expiraEm: iso(T0 - 1), emitidoEm: iso(T0 - 61 * D) }, T0), "vencido");
  assert.equal(decidirRenovacao({ expiraEm: null, emitidoEm: iso(T0 - 2 * D) }, T0), "renovar");
  assert.equal(decidirRenovacao({ expiraEm: null, emitidoEm: null }, T0), "novo_demais");
});

test("renovação: antes de 15 dias e token < 24 h não chamam a Meta; renova e grava cifrado com a nova validade", async () => {
  const D = 86400_000;
  const nenhuma = fetchFalso([]);
  for (const [expira, emitido, esperado] of [
    [T0 + 20 * D, T0 - 40 * D, "cedo"],
    [T0 + 10 * D, T0 - 2 * H, "novo_demais"],
    [T0 - 1000, T0 - 61 * D, "vencido"],
  ] as const) {
    const c = contaValida({ expiraEm: iso(expira), emitidoEm: iso(emitido) });
    const antes = c.linha()!.tokenCifrado;
    assert.equal((await executarRenovacao({ conta: c.repo, chave: CHAVE, buscar: nenhuma.buscar, agora: () => T0 })).resultado, esperado);
    assert.equal(c.linha()!.tokenCifrado, antes);
  }
  assert.equal(nenhuma.chamadas.length, 0);
  assert.equal((await executarRenovacao({ conta: contaMemoria(null).repo, chave: CHAVE, buscar: nenhuma.buscar })).resultado, "sem_conta");

  const c = contaValida({ expiraEm: iso(T0 + 10 * D), emitidoEm: iso(T0 - 50 * D) });
  const g = fetchFalso([casa("GET", /^https:\/\/graph\.instagram\.com\/refresh_access_token\?/, { json: { access_token: NOVO_TOKEN, token_type: "bearer", expires_in: 5183944 } })]);
  const { r, logs } = await comLogs(() => executarRenovacao({ conta: c.repo, chave: CHAVE, buscar: g.buscar, agora: () => T0 }));
  assert.deepEqual(r, { resultado: "renovado", expiraEm: iso(T0 + 5183944 * 1000) });
  assert.equal(g.chamadas.length, 1);
  const u = new URL(g.chamadas[0]!.url);
  assert.equal(u.origin + u.pathname, "https://graph.instagram.com/refresh_access_token");
  assert.equal(u.searchParams.get("grant_type"), "ig_refresh_token");
  assert.equal(u.searchParams.get("access_token"), TOKEN);
  const l = c.linha()!;
  assert.equal(decifrar(l.tokenCifrado, CHAVE), NOVO_TOKEN);
  assert.ok(!l.tokenCifrado.includes(NOVO_TOKEN));
  assert.equal(l.expiraEm, iso(T0 + 5183944 * 1000));
  assert.equal(l.emitidoEm, iso(T0));
  assert.equal(l.renovadoEm, iso(T0));
  assert.equal(l.falha, null);
  assert.ok(!JSON.stringify(r).includes(NOVO_TOKEN));
  for (const x of logs) assert.ok(!x.includes(NOVO_TOKEN) && !x.includes(TOKEN));
});

test("renovação: falha preserva o token antigo, registra motivo sem token e nada vaza em log", async () => {
  const D = 86400_000;
  const casos: [string, Parameters<typeof fetchFalso>[0]][] = [
    ["HTTP 400 com o token na mensagem", [casa("GET", /refresh_access_token/, { status: 400, json: { error: { message: `Error validating access token ${TOKEN}`, type: "OAuthException", code: 190 } } })]],
    ["rede", [casa("GET", /refresh_access_token/, "rede")]],
    ["resposta sem token", [casa("GET", /refresh_access_token/, { json: { token_type: "bearer" } })]],
  ];
  for (const [nome, rotas] of casos) {
    const c = contaValida({ expiraEm: iso(T0 + 5 * D), emitidoEm: iso(T0 - 55 * D) });
    const antes = { ...c.linha()! };
    const g = fetchFalso(rotas);
    const { r, logs } = await comLogs(() => executarRenovacao({ conta: c.repo, chave: CHAVE, buscar: g.buscar, agora: () => T0 }));
    assert.equal(r.resultado, "falhou", nome);
    const l = c.linha()!;
    assert.equal(l.tokenCifrado, antes.tokenCifrado, `${nome}: token antigo preservado`);
    assert.equal(l.expiraEm, antes.expiraEm, nome);
    assert.equal(l.falhaEm, iso(T0), nome);
    assert.match(l.falha ?? "", /^Renovação recusada: renovar: /, nome);
    assert.ok((l.falha ?? "").length <= 300);
    semToken(l.falha);
    semToken(JSON.stringify(r));
    for (const x of logs) semToken(x);
  }
  // reconexão no meio (o envelope mudou): não sobrescreve
  const c = contaValida({ expiraEm: iso(T0 + 5 * D), emitidoEm: iso(T0 - 55 * D) });
  const g = fetchFalso([
    (ch) => {
      if (!ch.url.includes("refresh_access_token")) return undefined;
      void c.repo.salvar({ igUserId: IG_USER, username: "laudousg", tokenCifrado: cifrar("IGAAreconectado" + "w".repeat(60), CHAVE), expiraEm: iso(T0 + 60 * D) });
      return { json: { access_token: NOVO_TOKEN, expires_in: 5183944 } };
    },
  ]);
  assert.equal((await executarRenovacao({ conta: c.repo, chave: CHAVE, buscar: g.buscar, agora: () => T0 })).resultado, "concorrente");
  assert.equal(decifrar(c.linha()!.tokenCifrado, CHAVE), "IGAAreconectado" + "w".repeat(60));
  // banco falhou ao gravar o novo: o antigo continua, a falha é registrada
  const c2 = contaValida({ expiraEm: iso(T0 + 5 * D), emitidoEm: iso(T0 - 55 * D) });
  const repo = { ...c2.repo, renovado: async () => Promise.reject(new Error("banco")) };
  const g2 = fetchFalso([casa("GET", /refresh_access_token/, { json: { access_token: NOVO_TOKEN, expires_in: 5183944 } })]);
  assert.equal((await executarRenovacao({ conta: repo, chave: CHAVE, buscar: g2.buscar, agora: () => T0 })).resultado, "falhou");
  assert.equal(decifrar(c2.linha()!.tokenCifrado, CHAVE), TOKEN);
  assert.match(c2.linha()!.falha ?? "", /o anterior continua salvo/);
  // token que não abre (chave trocada) → registra e não chama a Meta
  const c3 = contaMemoria({ igUserId: IG_USER, tokenCifrado: cifrar(TOKEN, Buffer.alloc(32, 7)), expiraEm: iso(T0 + 5 * D), emitidoEm: iso(T0 - 55 * D) });
  const nada = fetchFalso([]);
  assert.equal((await executarRenovacao({ conta: c3.repo, chave: CHAVE, buscar: nada.buscar, agora: () => T0 })).resultado, "token_invalido");
  assert.equal(nada.chamadas.length, 0);
});

test("cron social-token: com segredo renova e responde sem token", async () => {
  const c = contaValida({ expiraEm: iso(T0 + 3 * 86400_000), emitidoEm: iso(T0 - 57 * 86400_000) });
  const g = fetchFalso([casa("GET", /refresh_access_token/, { json: { access_token: NOVO_TOKEN, expires_in: 5183944 } })]);
  const h = criarCronToken({ env: { CRON_SECRET: SEGREDO }, servidor: () => CFG, instagram: () => IG, conta: () => c.repo, buscar: g.buscar, agora: () => T0 });
  const res = await h(new Request(`${ORIGEM}/admin/api/cron/social-token`, { headers: { authorization: `Bearer ${SEGREDO}` } }));
  const txt = await res.text();
  assert.equal(res.status, 200);
  assert.ok(!txt.includes(NOVO_TOKEN) && !txt.includes(TOKEN));
  assert.equal((JSON.parse(txt) as { resultado: string }).resultado, "renovado");
});

// ---------- destravar e stories manuais (rotas) ----------

/** Mesma semântica dos UPDATEs de repositorioManual. */
function manualMemoria(posts: PostMem[]): RepositorioManual {
  return {
    voltarParaAprovado: async (id, antesDe) => {
      const p = posts.find((x) => x.id === id && x.status === "publishing" && x.publish_requested_at === null && Date.parse(x.updated_at) <= Date.parse(antesDe));
      if (!p) return false;
      Object.assign(p, { status: "approved", last_error: NOTA_DESTRAVADO });
      return true;
    },
    publicadoDestravado: async (id, permalink, quando, antesDe) => {
      const p = posts.find((x) => x.id === id && x.status === "publishing" && Date.parse(x.updated_at) <= Date.parse(antesDe));
      if (!p) return false;
      Object.assign(p, { status: "published", published_at: quando, permalink, last_error: null });
      return true;
    },
    manualPublicado: async (id, quando) => {
      const p = posts.find((x) => x.id === id && x.status === "approved" && x.manual);
      if (!p) return false;
      Object.assign(p, { status: "published", published_at: quando, last_error: null });
      return true;
    },
  };
}
function rotas(posts: PostMem[], o: Partial<DependenciasInstagram> & { semAdmin?: boolean } = {}) {
  return criarRotasInstagram({
    autorizar: async () => (o.semAdmin ? null : { cfg: CFG, userId: ADMIN, cookies: null }),
    servidor: () => CFG,
    instagram: () => IG,
    conta: () => contaValida().repo,
    publicacao: () => publicacaoMemoria(posts, { agora: () => T0 }).repo,
    manual: () => manualMemoria(posts),
    buscar: async () => {
      throw new Error("a API não deveria ser chamada");
    },
    agora: () => T0,
    ...o,
  });
}
function form(caminho: string, campos: Record<string, string>): Request {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return new Request(`${ORIGEM}/admin/api/social/${caminho}`, { method: "POST", headers: { origin: ORIGEM }, body: f });
}
const destino = (r: Response) => new URL(r.headers.get("location") ?? "about:blank");

test("destravar: voltar para aprovado só parado há 10 min e sem media_publish; marcar publicado com link opcional", async () => {
  const posts = [
    postAprovado({ id: "preso", status: "publishing", updated_at: iso(T0 - 11 * 60_000) }),
    postAprovado({ id: "preso-pub", status: "publishing", publish_requested_at: iso(T0 - 11 * 60_000), updated_at: iso(T0 - 11 * 60_000) }),
    postAprovado({ id: "recente", status: "publishing", updated_at: iso(T0 - 5 * 60_000) }),
  ];
  const r = rotas(posts);
  assert.equal((await rotas(posts, { semAdmin: true }).destravar(form("destravar", { id: "preso", acao: "aprovado" }))).status, 404);
  assert.equal((await r.destravar(form("destravar", { id: "preso", acao: "apagar" }))).status, 404);
  assert.equal(destino(await r.destravar(form("destravar", { id: "recente", acao: "aprovado" }))).searchParams.get("erro"), "destravar");
  assert.equal(destino(await r.destravar(form("destravar", { id: "preso-pub", acao: "aprovado" }))).searchParams.get("erro"), "destravar");
  assert.equal(posts[1]!.status, "publishing", "com pedido de publish não volta para a fila");
  const ok = await r.destravar(form("destravar", { id: "preso", acao: "aprovado" }));
  assert.equal(destino(ok).searchParams.get("ok"), "destravado");
  assert.equal(destino(ok).pathname, "/admin/instagram/preso");
  assert.equal(posts[0]!.status, "approved");
  assert.equal(posts[0]!.last_error, NOTA_DESTRAVADO);
  // link inválido → erro, nada muda
  for (const ruim of ["http://www.instagram.com/p/X/", "https://evil.example/p/X/", "javascript:alert(1)", "https://instagram.com.evil.example/p/"]) {
    assert.equal(destino(await r.destravar(form("destravar", { id: "preso-pub", acao: "publicado", link: ruim }))).searchParams.get("erro"), "link", ruim);
  }
  assert.equal(posts[1]!.status, "publishing");
  const m = await r.destravar(form("destravar", { id: "preso-pub", acao: "publicado", link: " https://www.instagram.com/p/ABC123/ " }));
  assert.equal(destino(m).searchParams.get("ok"), "marcado");
  assert.deepEqual([posts[1]!.status, posts[1]!.permalink, posts[1]!.published_at, posts[1]!.ig_media_id], ["published", "https://www.instagram.com/p/ABC123/", iso(T0), null]);
  // sem link também vale
  posts.push(postAprovado({ id: "sem-link", status: "publishing", updated_at: iso(T0 - 30 * 60_000) }));
  assert.equal(destino(await r.destravar(form("destravar", { id: "sem-link", acao: "publicado", link: "" }))).searchParams.get("ok"), "marcado");
  assert.equal(posts[3]!.permalink, null);
  assert.equal(linkInstagram("https://instagram.com/stories/laudousg/1/"), "https://instagram.com/stories/laudousg/1/");
  assert.equal(linkInstagram("https://user:x@www.instagram.com/p/X/"), null);
});

test("repositório manual: cadeia do PostgREST com as condições de segurança", async () => {
  const log: string[] = [];
  const cadeia = () => {
    const c: Record<string, unknown> = {};
    for (const m of ["update", "eq", "is", "lte", "select"]) {
      c[m] = (...args: unknown[]) => {
        log.push(`${m}(${args.map((a) => JSON.stringify(a)).join(",")})`);
        return m === "select" ? Promise.resolve({ data: [{ id: "x" }], error: null }) : c;
      };
    }
    return c;
  };
  const sb = { from: (t: string) => (log.push(`from(${t})`), cadeia()) } as unknown as Parameters<typeof repositorioManual>[1];
  const repo = repositorioManual(CFG, sb);
  assert.equal(await repo.voltarParaAprovado("x", "2026-10-22T14:50:00.000Z"), true);
  assert.deepEqual(log.splice(0).slice(2, 6), ['eq("id","x")', 'eq("status","publishing")', 'is("publish_requested_at",null)', 'lte("updated_at","2026-10-22T14:50:00.000Z")']);
  await repo.publicadoDestravado("x", null, "2026-10-22T15:00:00.000Z", "2026-10-22T14:50:00.000Z");
  const l2 = log.splice(0);
  assert.ok(l2.includes('eq("status","publishing")') && l2.includes('lte("updated_at","2026-10-22T14:50:00.000Z")'));
  assert.ok(!l2.some((x) => x.includes("ig_media_id")));
  await repo.manualPublicado("x", "2026-10-22T15:00:00.000Z");
  assert.deepEqual(log.splice(0).slice(1, 5), ['update({"status":"published","published_at":"2026-10-22T15:00:00.000Z","last_error":null})', 'eq("id","x")', 'eq("status","approved")', 'eq("manual",true)']);
});

test("stories manuais: o cron nunca publica; marcar como publicado só para manual aprovado", async () => {
  const posts = [story({ id: "enquete", manual: true, scheduled_at: iso(T0 - 30 * 60_000) }), postAprovado({ id: "auto" , scheduled_at: iso(T0 + H)})];
  const g = graphSimulado();
  const pub = publicacaoMemoria(posts, { agora: () => T0 });
  const resumo = await executarFila({ repo: pub.repo, conta: contaValida().repo, chave: CHAVE, buscar: g.buscar, opcoes: { esperar: async () => {} }, agora: () => T0 });
  assert.deepEqual(resumo.posts, []);
  assert.equal(g.chamadas.length, 0);
  // "Publicar agora" também não aceita manual
  assert.equal((await publicarPost("enquete", { repo: pub.repo, conta: contaValida().repo, chave: CHAVE, opcoes: { buscar: g.buscar }, agora: () => T0 })).resultado, "status");
  const r = rotas(posts);
  assert.equal(destino(await r.manual(form("manual", { id: "auto" }))).searchParams.get("erro"), "manual_status");
  assert.equal(posts[1]!.status, "approved");
  const ok = await r.manual(form("manual", { id: "enquete", voltar: "calendario" }));
  assert.equal(destino(ok).pathname, "/admin/instagram");
  assert.equal(destino(ok).searchParams.get("ok"), "marcado");
  assert.deepEqual([posts[0]!.status, posts[0]!.published_at, posts[0]!.ig_media_id], ["published", iso(T0), null]);
  assert.equal((await rotas(posts, { semAdmin: true }).manual(form("manual", { id: "enquete" }))).status, 404);
  // janela da faixa: horário chegou, até 2 h
  const base = { status: "approved" as const, manual: true };
  assert.equal(manualAgora({ ...base, scheduled_at: iso(T0 - H) }, T0), true);
  assert.equal(manualAgora({ ...base, scheduled_at: iso(T0) }, T0), true);
  assert.equal(manualAgora({ ...base, scheduled_at: iso(T0 - 2 * H - 1000) }, T0), false);
  assert.equal(manualAgora({ ...base, scheduled_at: iso(T0 + 60_000) }, T0), false);
  assert.equal(manualAgora({ ...base, manual: false, scheduled_at: iso(T0 - H) }, T0), false);
});

test("publicar agora (rota): aceita carrossel e story; recusa manual", async () => {
  const posts = [carrossel(), story(), story({ id: "enquete", manual: true })];
  const g = graphSimulado();
  const conta = contaValida();
  const base = { publicacao: () => publicacaoMemoria(posts, { agora: () => T0 }).repo, conta: () => conta.repo, buscar: g.buscar, opcoes: { esperar: async () => {} } };
  for (const id of ["c-01", "st-01"]) {
    const res = await rotas(posts, base).publicar(form("publicar", { id, confirmacao: id }));
    assert.equal(destino(res).searchParams.get("ok"), "publicado", id);
  }
  assert.equal(destino(await rotas(posts, base).publicar(form("publicar", { id: "enquete", confirmacao: "enquete" }))).searchParams.get("erro"), "pub_status");
  assert.deepEqual(posts.map((p) => p.status), ["published", "published", "approved"]);
  assert.equal(g.publishes(), 2);
});

// ---------- painel ----------

const linha = (o: Partial<LinhaPost> = {}): LinhaPost => ({
  id: "s1-01",
  scheduled_at: iso(T0 + H),
  format: "image",
  caption: "",
  hashtags: "",
  alt_text: "",
  status: "approved",
  manual: false,
  interaction: null,
  pillar: "",
  angle: "",
  title: "Post",
  notes: [],
  attempts: 0,
  last_error: null,
  permalink: null,
  published_at: null,
  updated_at: iso(T0 - H),
  publish_requested_at: null,
  ...o,
});

test("selos do calendário: Agendado, Atrasado, Manual, Publicando, Publicado com link, Falhou com motivo", () => {
  const s = (o: Partial<LinhaPost>) => seloPost(linha(o), T0);
  assert.equal(s({}).rotulo, "Agendado");
  assert.equal(s({ scheduled_at: iso(T0 - 5 * H) }).rotulo, "Agendado");
  assert.equal(s({ scheduled_at: iso(T0 - 7 * H) }).rotulo, "Atrasado");
  assert.equal(s({ manual: true, format: "story", scheduled_at: iso(T0 - 7 * H) }).rotulo, "Manual");
  assert.equal(s({ status: "publishing" }).rotulo, "Publicando");
  assert.match(s({ status: "publishing", updated_at: iso(T0 - 11 * 60_000) }).dica ?? "", /destravar/);
  assert.equal(s({ status: "publishing", updated_at: iso(T0 - 5 * 60_000) }).dica, undefined);
  assert.deepEqual(s({ status: "published", permalink: "https://www.instagram.com/p/A/" }), { rotulo: "Publicado", classe: "ok", dica: "https://www.instagram.com/p/A/" });
  assert.deepEqual(s({ status: "failed", last_error: "Tentativa 3/3 falhou: x" }), { rotulo: "Falhou", classe: "err", dica: "Tentativa 3/3 falhou: x" });
  assert.equal(s({ status: "draft" }).rotulo, "Rascunho");
  assert.equal(preso(linha({ status: "publishing", updated_at: iso(T0 - 10 * 60_000) }), T0), true);

  const itens: LinhaItem[] = [{ post_id: "s1-01", position: 1, storage_path: "posts/s1-01/a.jpg", public_url: img("s1-01", 1), slide_text: "", visual_brief: "", alt_text: "" }];
  const pub = renderToStaticMarkup(ChipPost({ post: linha({ status: "published", permalink: "https://www.instagram.com/p/A/" }), itens, agora: T0 }));
  assert.match(pub, />Publicado</);
  assert.match(pub, /href="https:\/\/www\.instagram\.com\/p\/A\/"/);
  assert.match(pub, /Ver no Instagram/);
  const fal = renderToStaticMarkup(ChipPost({ post: linha({ status: "failed", last_error: "Resultado incerto, confira no Instagram" }), itens, agora: T0 }));
  assert.match(fal, />Falhou</);
  assert.match(fal, /Resultado incerto, confira no Instagram/);
  assert.match(renderToStaticMarkup(ChipPost({ post: linha({ scheduled_at: iso(T0 - 7 * H) }), itens, agora: T0 })), />Atrasado</);
  assert.match(renderToStaticMarkup(ChipPost({ post: linha({ manual: true, format: "story" }), itens, agora: T0 })), />Manual</);
  assert.match(renderToStaticMarkup(ChipPost({ post: linha({ attempts: 1, last_error: "Tentativa 1/3 falhou: x" }), itens, agora: T0 })), /Tentativa 1\/3 falhou/);
});

test("faixa manual: imagem para baixar, sticker sugerido e Marcar como publicado", () => {
  const p = linha({ id: "st-enquete", format: "story", manual: true, scheduled_at: iso(T0 - 30 * 60_000), interaction: { tipo: "enquete", opcoes: ["Sim", "Não"] }, title: "Você dita laudos?" });
  const itens: LinhaItem[] = [{ post_id: "st-enquete", position: 1, storage_path: "posts/st-enquete/a.jpg", public_url: img("st-enquete", 1), slide_text: "", visual_brief: "", alt_text: "Arte" }];
  const h = renderToStaticMarkup(FaixaManual({ posts: [p], itens }));
  assert.match(h, /Para publicar à mão agora/);
  assert.match(h, new RegExp(`href="${img("st-enquete", 1).replace(/[.?]/g, "\\$&")}"[^>]*download`));
  assert.match(h, /Sticker: <b>enquete<\/b> \(Sim · Não\)/);
  assert.match(h, /action="\/admin\/api\/social\/manual"/);
  assert.match(h, /name="id" value="st-enquete"/);
  assert.match(h, /Marcar como publicado/);
  assert.equal(renderToStaticMarkup(FaixaManual({ posts: [], itens: [] })), "");
});

test("cartão da conta: aviso com menos de 7 dias e quando a renovação falhou", () => {
  const D = 86400_000;
  const conta = { ig_user_id: "1", username: "laudousg", connected_at: iso(T0 - 50 * D) };
  const ok = renderToStaticMarkup(CartaoConta({ disponivel: true, conta: { ...conta, token_expires_at: iso(T0 + 20 * D) }, agora: T0 }));
  assert.doesNotMatch(ok, /vence em|falhou/);
  assert.match(ok, /renovado todo dia/);
  const logo = renderToStaticMarkup(CartaoConta({ disponivel: true, conta: { ...conta, token_expires_at: iso(T0 + 3 * D) }, agora: T0 }));
  assert.match(logo, /O token vence em 3 dias/);
  assert.match(logo, /role="alert"/);
  const falhou = renderToStaticMarkup(
    CartaoConta({ disponivel: true, conta: { ...conta, token_expires_at: iso(T0 + 12 * D), token_refresh_failed_at: iso(T0 - H), token_refresh_error: "Renovação recusada: renovar: HTTP 400" }, agora: T0 }),
  );
  assert.match(falhou, /A última renovação automática falhou/);
  assert.match(falhou, /HTTP 400/);
  assert.match(falhou, /O token anterior continua salvo/);
  assert.deepEqual(avisoToken({ token_expires_at: iso(T0 + 6 * D) }, T0), { vencido: false, venceLogo: true, diasRestantes: 6, falhou: false });
  assert.deepEqual(avisoToken({ token_expires_at: iso(T0 - 1) }, T0), { vencido: true, venceLogo: false, diasRestantes: 0, falhou: false });
});

test("código: crons e ações novas sem token em log e sem select literal", () => {
  const lib = join(RAIZ, "src", "lib", "social");
  for (const f of ["cron.ts", "token.ts", "manual.ts", "politica.ts", "publicacao.ts", "instagram.ts"]) {
    const txt = readFileSync(join(lib, f), "utf8");
    for (const m of txt.matchAll(/console\.(?:log|warn|error|info)\(([^)]*)\)/g)) assert.match(m[1]!, /^"[^"]*"$/, `${f}: ${m[0]}`);
    assert.doesNotMatch(txt, /from\("social_accounts"\)/, f);
  }
  const editor = readFileSync(join(RAIZ, "src", "app", "(painel)", "instagram", "[id]", "page.tsx"), "utf8");
  assert.match(editor, /api\/social\/destravar/);
  assert.match(editor, /publish_requested_at/);
  assert.doesNotMatch(editor, /"use client"|confirm\(/);
});
