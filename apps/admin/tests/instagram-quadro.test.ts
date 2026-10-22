/**
 * Quadro do Instagram (story admin-instagram-quadro): nome do arquivo → destino, mover mantendo a hora
 * em São Paulo, reordenação completa, montagem S1–S4, rota de lote (com repositório falso e com SQL
 * real no PGlite) e a resposta JSON do upload usada pelo envio em lote.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EnvioLote } from "../src/components/EnvioLote";
import { QuadroInstagram } from "../src/components/QuadroInstagram";
import type { ConfigServidor } from "../src/lib/env";
import { lerCalendario } from "../src/lib/social/calendario";
import { criarRotaLote, LIMITE_CORPO_LOTE } from "../src/lib/social/lote";
import {
  aplicarOrdem,
  catalogoDe,
  classificarArquivo,
  classificarArquivos,
  idsDoLote,
  LIMITE_ENVIO_BYTES,
  mensagemLote,
  montarQuadro,
  moverPara,
  ordemArrastando,
  ordemValida,
  podeMover,
  semanasQuadro,
  type Catalogo,
} from "../src/lib/social/quadro";
import { criarRotasSocial } from "../src/lib/social/rotas";
import type { RepositorioLote, RepositorioSocial, ResultadoAcao } from "../src/lib/social/servidor";
import type { LinhaItem, LinhaPost, PostImportado } from "../src/lib/social/tipos";

// O tsx compila o JSX no modo clássico (React.createElement) fora do Next.
Object.assign(globalThis, { React });

const RAIZ = join(__dirname, "..");
const MIGRACOES = ["20261022212039_admin_social.sql", "20261022225129_admin_social_f3.sql", "20261022230954_admin_social_quadro.sql"];
const ORIGEM = "https://app.laudousg.com.br";
const CFG = { origemPublica: ORIGEM, supabaseUrl: "https://x.supabase.co" } as ConfigServidor;
const T0 = Date.parse("2026-10-22T15:00:00Z");

// ---------- nome do arquivo → destino ----------

const CAT: Catalogo = {
  "s1-01": { formato: "image", status: "draft", comImagem: [true] },
  "s1-02": { formato: "carousel", status: "draft", comImagem: [false, false, false, false, false] },
  "s2-01": { formato: "carousel", status: "approved", comImagem: [true, true] },
  "st-1026-1": { formato: "story", status: "draft", comImagem: [false] },
  "st-1026-3": { formato: "story", status: "published", comImagem: [true] },
};

test("envio em lote: nomes válidos viram post + slide", () => {
  const ok = (caminho: string) => {
    const c = classificarArquivo(caminho, 900_000, CAT);
    assert.ok(c.ok, `${caminho}: ${JSON.stringify(c)}`);
    return c.ok ? [c.id, c.posicao, c.formato, c.substitui] : null;
  };
  assert.deepEqual(ok("s1-02-3.jpg"), ["s1-02", 3, "carousel", false]);
  assert.deepEqual(ok("semana-1/s1-02-5.jpg"), ["s1-02", 5, "carousel", false]);
  assert.deepEqual(ok("output/instagram/semana-1/S1-02-2.JPG"), ["s1-02", 2, "carousel", false]);
  assert.deepEqual(ok("s1-02-1.jpeg"), ["s1-02", 1, "carousel", false]);
  // story: o id já termina em número; o nome sem slide vale como slide 1 (como em output/instagram)
  assert.deepEqual(ok("st-1026-1.jpg"), ["st-1026-1", 1, "story", false]);
  assert.deepEqual(ok("st-1026-1-1.jpg"), ["st-1026-1", 1, "story", false]);
  // foto que já tem imagem: vai, avisando que substitui
  assert.deepEqual(ok("s1-01-1.jpg"), ["s1-01", 1, "image", true]);
  assert.deepEqual(ok("s1-01.jpg"), ["s1-01", 1, "image", true]);
  assert.deepEqual(ok("C:\\Users\\luiz\\semana-1\\s1-02-4.jpg"), ["s1-02", 4, "carousel", false]);
});

test("envio em lote: inválidos com motivo; prévias, _fontes e nomes fora do padrão ignorados", () => {
  const motivo = (caminho: string, tamanho = 900_000) => {
    const c = classificarArquivo(caminho, tamanho, CAT);
    assert.equal(c.ok, false, caminho);
    return c.ok ? null : [c.motivo, c.ignorado];
  };
  assert.deepEqual(motivo("s1-02-6.jpg"), ["slide_inexistente", false]);
  assert.deepEqual(motivo("s1-02-0.jpg"), ["slide_inexistente", false]);
  assert.deepEqual(motivo("st-1026-1-2.jpg"), ["slide_inexistente", false]);
  assert.deepEqual(motivo("s9-01-1.jpg"), ["post_inexistente", false]);
  assert.deepEqual(motivo("s2-01-1.jpg"), ["nao_rascunho", false]);
  assert.deepEqual(motivo("st-1026-3.jpg"), ["nao_rascunho", false]);
  assert.deepEqual(motivo("s1-02-3.png"), ["nao_jpeg", false]);
  assert.deepEqual(motivo("semana-1/revisao.html"), ["nao_jpeg", false]);
  assert.deepEqual(motivo("s1-02-3.jpg", LIMITE_ENVIO_BYTES + 1), ["grande", false]);
  assert.deepEqual(motivo("s1-02-3.jpg", 0), ["vazio", false]);
  // prévias (nomes reais da pasta output/instagram/semana-1)
  for (const p of ["s1-01-1-v2a.jpg", "s1-01-1-v2b.jpg", "s1-01-1-v1.jpg", "st-1026-2-v1.jpg", "s1-01-1-v2b-com-gravacao-do-site.jpg", "s1-02-3-V2.jpg"]) assert.deepEqual(motivo(p), ["previa", true], p);
  // _fontes em qualquer nível
  for (const p of ["semana-1/_fontes/gpt/s1-02-1.jpg", "_fontes/s1-02-1.jpg", "semana-1/_FONTES/capturas/s1-01-1.jpg"]) assert.deepEqual(motivo(p), ["fontes", true], p);
  assert.deepEqual(motivo("s1-01-captura.jpg"), ["fora_do_padrao", true]);
  assert.deepEqual(motivo("foto final.jpg"), ["fora_do_padrao", true]);
  assert.deepEqual(motivo("capa.jpg"), ["fora_do_padrao", true]);
  assert.deepEqual(motivo(".DS_Store"), ["sistema", true]);
  assert.deepEqual(motivo("semana-1/._s1-02-1.jpg"), ["sistema", true]);
  // "x-1.jpg" casa com o post "x-1" (slide 1) e com o post "x" (slide 1): ambíguo, não vai
  const amb: Catalogo = { x: { formato: "carousel", status: "draft", comImagem: [false, false] }, "x-1": { formato: "image", status: "draft", comImagem: [false] } };
  assert.equal((classificarArquivo("x-1.jpg", 10, amb) as { motivo?: string }).motivo, "ambiguo");
});

test("envio em lote: dois arquivos para o mesmo slide derrubam os dois; o resto segue", () => {
  const r = classificarArquivos(
    [
      { caminho: "semana-1/s1-02-1.jpg", tamanho: 10 },
      { caminho: "copia/s1-02-1.jpg", tamanho: 10 },
      { caminho: "semana-1/s1-02-2.jpg", tamanho: 10 },
      { caminho: "semana-1/s1-02-2-v2.jpg", tamanho: 10 },
    ],
    CAT,
  );
  assert.deepEqual(r.map((c) => (c.ok ? "ok" : c.motivo)), ["duplicado", "duplicado", "ok", "previa"]);
});

// ---------- mover ----------

test("mover de dia mantém a hora no fuso de São Paulo (inclusive quando o UTC já é o dia seguinte)", () => {
  // s1-02: 27/10 12:15 em SP = 15:15Z
  assert.equal(moverPara("2026-10-27T15:15:00.000Z", "2026-10-29"), "2026-10-29T15:15:00.000Z");
  assert.equal(moverPara("2026-10-27T15:15:00+00:00", "2026-11-03"), "2026-11-03T15:15:00.000Z");
  // story das 21:00 de 26/10 em SP = 00:00Z de 27/10; mover para 30/10 dá 21:00 de 30/10, não 00:00 de 30/10
  assert.equal(moverPara("2026-10-27T00:00:00.000Z", "2026-10-30"), "2026-10-31T00:00:00.000Z");
  // trocar a hora junto
  assert.equal(moverPara("2026-10-27T15:15:00.000Z", "2026-10-27", "20:30"), "2026-10-27T23:30:00.000Z");
  assert.equal(moverPara("2026-10-27T15:15:00.000Z", "2026-10-28", "07:30"), "2026-10-28T10:30:00.000Z");
  assert.throws(() => moverPara("2026-10-27T15:15:00.000Z", "2026-02-30"));
  assert.throws(() => moverPara("2026-10-27T15:15:00.000Z", "2026-10-28", "25:00"));
  assert.throws(() => moverPara("ontem", "2026-10-28"));
  // só rascunho; só futuro
  const futuro = "2026-10-29T15:15:00.000Z";
  assert.equal(podeMover({ status: "draft" }, futuro, T0), "ok");
  for (const s of ["approved", "publishing", "published", "failed"] as const) assert.equal(podeMover({ status: s }, futuro, T0), "status", s);
  assert.equal(podeMover({ status: "draft" }, new Date(T0).toISOString(), T0), "passado");
  assert.equal(mensagemLote("mover", "status"), "Só rascunho pode ser movido ou reordenado. Volte o post para rascunho primeiro.");
});

// ---------- reordenar ----------

test("reordenação completa: permutação, arrastar e aplicar", () => {
  assert.deepEqual(ordemArrastando(5, 4, 1), [4, 1, 2, 3, 5]);
  assert.deepEqual(ordemArrastando(5, 1, 5), [2, 3, 4, 5, 1]);
  assert.deepEqual(ordemArrastando(5, 2, 3), [1, 3, 2, 4, 5]);
  assert.deepEqual(ordemArrastando(3, 2, 2), [1, 2, 3]);
  assert.deepEqual(ordemArrastando(3, 9, 1), [1, 2, 3]);
  assert.deepEqual(aplicarOrdem(["a", "b", "c", "d", "e"], [4, 1, 2, 3, 5]), ["d", "a", "b", "c", "e"]);
  assert.equal(ordemValida([3, 1, 2], 3), true);
  for (const ruim of [[1, 1, 2], [0, 1, 2], [1, 2], [1, 2, 4], [1.5, 2, 3], ["1", 2, 3], null, "1,2,3"]) assert.equal(ordemValida(ruim, 3), false, JSON.stringify(ruim));
  assert.equal(ordemValida(Array.from({ length: 21 }, (_, i) => i + 1), 21), false);
});

// ---------- montagem S1–S4 ----------

const linha = (o: Partial<LinhaPost> & Pick<LinhaPost, "id" | "scheduled_at" | "format">): LinhaPost => ({
  caption: "",
  hashtags: "",
  alt_text: "",
  status: "draft",
  manual: false,
  interaction: null,
  pillar: "",
  angle: "",
  title: "",
  notes: [],
  attempts: 0,
  last_error: null,
  permalink: null,
  published_at: null,
  updated_at: "2026-10-22T12:00:00Z",
  publish_requested_at: null,
  ...o,
});
const item = (post_id: string, position: number, com = true): LinhaItem => ({ post_id, position, storage_path: com ? `posts/${post_id}/${String(position).repeat(32)}.jpg` : null, public_url: com ? `https://x/${post_id}/${position}.jpg` : null, slide_text: `Slide ${position}\nresto`, visual_brief: "", alt_text: `alt ${position}` });

test("quadro: quatro semanas de segunda a domingo, posts no dia de São Paulo, prontos e catálogo", () => {
  const { semanas, inicio, fim } = semanasQuadro("2026-10-28");
  assert.equal(semanas.length, 4);
  assert.deepEqual([semanas[0]![0], semanas[3]![6]], ["2026-10-26", "2026-11-22"]);
  assert.equal(inicio, "2026-10-26T03:00:00.000Z");
  assert.equal(fim, "2026-11-23T03:00:00.000Z");
  const posts = [
    linha({ id: "s1-02", scheduled_at: "2026-10-27T15:15:00Z", format: "carousel", title: "Carrossel" }),
    linha({ id: "s1-01", scheduled_at: "2026-10-26T15:15:00Z", format: "image" }),
    linha({ id: "st-1026-4", scheduled_at: "2026-10-27T00:00:00Z", format: "story" }), // 21:00 de 26/10 em SP
    linha({ id: "s2-01", scheduled_at: "2026-11-03T15:15:00Z", format: "carousel", status: "approved" }),
    linha({ id: "fora", scheduled_at: "2026-12-01T15:15:00Z", format: "image" }),
  ];
  const itens = [item("s1-02", 2), item("s1-02", 1), item("s1-02", 3, false), item("s1-01", 1), item("st-1026-4", 1), item("s2-01", 1), item("s2-01", 2)];
  const q = montarQuadro(semanas, posts, itens, T0);
  assert.deepEqual(q.map((s) => s.rotulo), ["S1", "S2", "S3", "S4"]);
  assert.equal(q[0]!.intervalo, "26/10 a 01/11");
  const seg = q[0]!.dias[0]!;
  assert.equal(seg.rotulo, "seg 26/10");
  assert.deepEqual(seg.feed.map((c) => c.id), ["s1-01"]);
  assert.deepEqual(seg.stories.map((c) => [c.id, c.hora]), [["st-1026-4", "21:00"]]);
  const car = q[0]!.dias[1]!.feed[0]!;
  assert.deepEqual(car.slides.map((s) => [s.posicao, s.url !== null, s.texto]), [[1, true, "Slide 1"], [2, true, "Slide 2"], [3, false, "Slide 3"]]);
  assert.equal(car.faltam, 1);
  assert.equal(car.pronto, false);
  assert.match(car.bloqueio ?? "", /Falta imagem/);
  assert.equal(q[0]!.dias[0]!.feed[0]!.pronto, true);
  const aprovado = q[1]!.dias[1]!.feed[0]!;
  assert.deepEqual([aprovado.id, aprovado.editavel, aprovado.pronto, aprovado.selo.rotulo], ["s2-01", false, false, "Agendado"]);
  // fora das 4 semanas não aparece
  assert.equal(q.flatMap((s) => s.dias.flatMap((d) => [...d.feed, ...d.stories])).length, 4);
  const cat = catalogoDe(q);
  assert.deepEqual(cat["s1-02"], { formato: "carousel", status: "draft", comImagem: [true, true, false] });
  assert.equal(cat.fora, undefined);
});

test("tela: o Quadro renderiza semanas, cartões com miniaturas, selos, alertas e as ações de seleção", () => {
  const { semanas } = semanasQuadro("2026-10-26");
  const posts = [
    linha({ id: "s1-02", scheduled_at: "2026-10-27T15:15:00Z", format: "carousel", title: "Carrossel do laudo" }),
    linha({ id: "s1-01", scheduled_at: "2026-10-26T15:15:00Z", format: "image", title: "Foto" }),
    linha({ id: "st-1026-4", scheduled_at: "2026-10-27T00:00:00Z", format: "story", manual: true, status: "approved" }),
    linha({ id: "s2-01", scheduled_at: "2026-11-03T15:15:00Z", format: "carousel", status: "approved", title: "Aprovado" }),
  ];
  const itens = [item("s1-02", 1), item("s1-02", 2, false), item("s1-01", 1), item("st-1026-4", 1), item("s2-01", 1), item("s2-01", 2)];
  const q = montarQuadro(semanas, posts, itens, T0);
  const roteador = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
  const h = renderToStaticMarkup(
    React.createElement(AppRouterContext.Provider, { value: roteador as never }, React.createElement(React.Fragment, null, React.createElement(EnvioLote, { catalogo: catalogoDe(q) }), React.createElement(QuadroInstagram, { semanas: q }))),
  );
  for (const s of ["S1", "S2", "S3", "S4"]) assert.match(h, new RegExp(`<h2 id="qd-${s}">${s}</h2>`));
  assert.match(h, /Selecionar tudo que está pronto \(1\)/);
  assert.equal((h.match(/Selecionar semana/g) ?? []).length, 4);
  assert.match(h, /aria-label="Selecionar s1-02"/);
  assert.match(h, /Falta imagem em 1 slide/);
  assert.match(h, /Para mover ou reordenar, volte para rascunho\./);
  // Link do Next (o basePath /admin entra em tempo de execução): título → editor
  assert.match(h, /title="Abrir no editor" href="\/instagram\/s1-02">Carrossel do laudo/);
  assert.match(h, /<img src="https:\/\/x\/s1-02\/1\.jpg"/);
  assert.match(h, /Slide 2 de 2 \(sem imagem\)/);
  // só rascunho é arrastável (alça e miniaturas do carrossel)
  assert.match(h, /draggable="true"[^>]*title="Arraste para outro dia"/);
  assert.match(h, /draggable="false"[^>]*title="Aprovado não se move/);
  assert.match(h, /class="qd-minis story"/);
  assert.match(h, /Enviar imagens em lote/);
  assert.match(h, /webkitdirectory=""/);
  assert.doesNotMatch(h, /confirm\(/);
});

// ---------- rota de lote (repositório falso) ----------

function pedido(corpo: unknown, o: { tipo?: string; bruto?: string } = {}): Request {
  return new Request(`${ORIGEM}/admin/api/social/lote`, {
    method: "POST",
    headers: { origin: ORIGEM, "content-type": o.tipo ?? "application/json" },
    body: o.bruto ?? JSON.stringify(corpo),
  });
}

function repoLoteFalso(resultados: Record<string, ResultadoAcao> = {}) {
  const chamadas: string[] = [];
  const repo: RepositorioLote = {
    mudarStatus: async (id, s) => (chamadas.push(`status:${id}:${s}`), resultados[id] ?? "ok"),
    reagendar: async (id, de, para) => (chamadas.push(`reagendar:${id}:${de}:${para}`), resultados[id] ?? "ok"),
    reordenar: async (id, ordem) => (chamadas.push(`reordenar:${id}:${ordem.join("")}`), resultados[id] ?? "ok"),
  };
  return { repo, chamadas };
}

test("lote: sem admin → 404 e o banco nem é chamado; pedido malformado → 400", async () => {
  const { repo, chamadas } = repoLoteFalso();
  const negado = criarRotaLote({ autorizar: async () => null, repo: () => repo });
  for (const corpo of [{ acao: "aprovar", ids: ["s1-01"] }, { acao: "mover", id: "s1-01", de: "2026-10-26T15:15:00Z", data: "2026-10-28" }, { acao: "reordenar", id: "s1-02", ordem: [2, 1] }]) {
    assert.equal((await negado(pedido(corpo))).status, 404);
  }
  const rota = criarRotaLote({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repo, agora: () => T0 });
  const ruins: [unknown, { tipo?: string; bruto?: string }?][] = [
    [{ acao: "aprovar", ids: ["s1-01"] }, { tipo: "application/x-www-form-urlencoded" }],
    [{ acao: "aprovar", ids: ["s1-01"] }, { tipo: "text/plain" }],
    [null, { bruto: "{nao é json" }],
    [null, { bruto: JSON.stringify({ acao: "aprovar", ids: ["a"], x: "y".repeat(LIMITE_CORPO_LOTE) }) }],
    [[1, 2]],
    [{ acao: "publicar", ids: ["s1-01"] }],
    [{ acao: "aprovar", ids: [] }],
    [{ acao: "aprovar", ids: "s1-01" }],
    [{ acao: "aprovar", ids: ["../x"] }],
    [{ acao: "aprovar", ids: Array.from({ length: 101 }, (_, i) => `p-${i}`) }],
    [{ acao: "mover", id: "s1-01", data: "2026-10-28" }],
    [{ acao: "mover", id: "s1-01", de: "2026-10-26T15:15:00Z", data: "2026-02-30" }],
    [{ acao: "mover", id: "s1-01", de: "2026-10-26T15:15:00Z", data: "2026-10-28", hora: "7h" }],
    [{ acao: "reordenar", id: "s1-02", ordem: [1, 1] }],
    [{ acao: "reordenar", id: "s1-02", ordem: [] }],
    [{ acao: "reordenar", id: "s1-02", ordem: "2,1" }],
  ];
  for (const [corpo, o] of ruins) assert.equal((await rota(pedido(corpo, o))).status, 400, JSON.stringify(corpo)?.slice(0, 80));
  assert.deepEqual(chamadas, []);
  assert.deepEqual(idsDoLote(Array.from({ length: 100 }, (_, i) => `p-${i}`))?.length, 100);
  assert.deepEqual(idsDoLote(["a", "b", "a"]), ["a", "b"]);
});

test("lote: aprovação mista devolve quantos aprovaram e o motivo de cada um que não aprovou", async () => {
  const { repo, chamadas } = repoLoteFalso({ "s1-02": "sem_imagem", "s1-03": "passado", "s2-01": "status", "s2-02": "slides", fantasma: "nao_encontrado", "s2-03": "falha" });
  const rota = criarRotaLote({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repo, agora: () => T0 });
  const ids = ["s1-01", "s1-02", "s1-03", "s2-01", "s2-02", "fantasma", "s2-03", "st-1026-1", "s1-01"];
  const r = await rota(pedido({ acao: "aprovar", ids }));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const j = (await r.json()) as { total: number; ok: number; resultados: { id: string; resultado: string }[] };
  assert.equal(j.total, 8);
  assert.equal(j.ok, 2);
  assert.deepEqual(j.resultados.map((x) => `${x.id}:${x.resultado}`), ["s1-01:ok", "s1-02:sem_imagem", "s1-03:passado", "s2-01:status", "s2-02:slides", "fantasma:nao_encontrado", "s2-03:falha", "st-1026-1:ok"]);
  assert.deepEqual(chamadas.sort(), ids.slice(0, 8).map((id) => `status:${id}:approved`).sort());
  // os motivos que o Quadro mostra
  assert.match(mensagemLote("aprovar", "sem_imagem"), /Falta imagem/);
  assert.match(mensagemLote("aprovar", "passado"), /horário já passou/);
  assert.match(mensagemLote("aprovar", "slides"), /Quantidade de slides/);
  assert.equal(mensagemLote("aprovar", "status"), "Só rascunho pode ser aprovado.");
  assert.match(mensagemLote("rascunho", "status"), /aprovado/);
  // voltar para rascunho
  const v = (await (await rota(pedido({ acao: "rascunho", ids: ["s1-01", "s2-01"] }))).json()) as { ok: number; resultados: { id: string; resultado: string }[] };
  assert.equal(v.ok, 1);
  assert.deepEqual(v.resultados.map((x) => x.resultado), ["ok", "status"]);
  assert.ok(chamadas.includes("status:s1-01:draft") && chamadas.includes("status:s2-01:draft"));
});

test("lote: mover manda o horário visto e o novo mantendo a hora; passado nem chega no banco; reordenar", async () => {
  const { repo, chamadas } = repoLoteFalso({ "s2-01": "status" });
  const rota = criarRotaLote({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repo, agora: () => T0 });
  let j = (await (await rota(pedido({ acao: "mover", id: "st-1026-4", de: "2026-10-27T00:00:00.000Z", data: "2026-10-30" }))).json()) as Record<string, string>;
  assert.deepEqual(j, { resultado: "ok", scheduled_at: "2026-10-31T00:00:00.000Z" });
  j = (await (await rota(pedido({ acao: "mover", id: "s1-02", de: "2026-10-27T15:15:00.000Z", data: "2026-10-27", hora: "20:30" }))).json()) as Record<string, string>;
  assert.equal(j.scheduled_at, "2026-10-27T23:30:00.000Z");
  j = (await (await rota(pedido({ acao: "mover", id: "s2-01", de: "2026-11-03T15:15:00.000Z", data: "2026-11-04" }))).json()) as Record<string, string>;
  assert.deepEqual(j, { resultado: "status" });
  j = (await (await rota(pedido({ acao: "mover", id: "s1-02", de: "2026-10-27T15:15:00.000Z", data: "2026-10-21" }))).json()) as Record<string, string>;
  assert.deepEqual(j, { resultado: "passado" });
  j = (await (await rota(pedido({ acao: "reordenar", id: "s1-02", ordem: [4, 1, 2, 3, 5] }))).json()) as Record<string, string>;
  assert.deepEqual(j, { resultado: "ok" });
  assert.deepEqual(chamadas, [
    "reagendar:st-1026-4:2026-10-27T00:00:00.000Z:2026-10-31T00:00:00.000Z",
    "reagendar:s1-02:2026-10-27T15:15:00.000Z:2026-10-27T23:30:00.000Z",
    "reagendar:s2-01:2026-11-03T15:15:00.000Z:2026-11-04T15:15:00.000Z",
    "reordenar:s1-02:41235",
  ]);
});

// ---------- SQL real (PGlite) ----------

async function banco() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);`);
  for (const m of MIGRACOES) await db.exec(readFileSync(join(RAIZ, "..", "..", "supabase", "migrations", m), "utf8"));
  return db;
}
const um = async <T>(db: PGlite, sql: string, args: unknown[] = []) => (await db.query<{ v: T }>(sql, args)).rows[0]!.v;
const caminho = (id: string, n: number) => `posts/${id}/${n.toString(16).padStart(32, "0")}.jpg`;
async function importar(db: PGlite, posts: PostImportado[]) {
  await db.query("select public.social_import($1::jsonb)", [JSON.stringify(posts)]);
}
async function comImagens(db: PGlite, id: string, ate?: number) {
  const n = ate ?? (await um<number>(db, "select count(*)::int v from public.social_media_items where post_id=$1", [id]));
  for (let p = 1; p <= n; p++) await db.query("select public.social_set_media($1,$2,$3,$4)", [id, p, caminho(id, p), `https://x.supabase.co/storage/v1/object/public/social/${caminho(id, p)}`]);
}
const fixture = () => JSON.parse(readFileSync(join(RAIZ, "tests", "fixtures", "social", "calendario.json"), "utf8")) as Record<string, unknown>;
const quando = async (db: PGlite, id: string) => um<string>(db, "select to_json(scheduled_at)#>>'{}' v from public.social_posts where id=$1", [id]);

/** RepositorioLote sobre o SQL real (o que o servidor faz pelo PostgREST). */
function repoSql(db: PGlite): RepositorioLote {
  return {
    mudarStatus: (id, s) => um<ResultadoAcao>(db, "select public.social_set_status($1,$2) v", [id, s]),
    reagendar: (id, de, para) => um<ResultadoAcao>(db, "select public.social_reschedule($1,$2::timestamptz,$3::timestamptz) v", [id, de, para]),
    reordenar: (id, ordem) => um<ResultadoAcao>(db, "select public.social_reorder_items($1,$2::integer[]) v", [id, ordem]),
  };
}

test("SQL: funções novas só para o service_role, RLS continua ligado", async () => {
  const db = await banco();
  try {
    for (const f of ["social_reschedule(text,timestamptz,timestamptz)", "social_reorder_items(text,integer[])"]) {
      for (const papel of ["anon", "authenticated"]) assert.equal(await um(db, `select has_function_privilege('${papel}','public.${f}','EXECUTE') v`), false, `${papel} ${f}`);
      assert.equal(await um(db, `select has_function_privilege('service_role','public.${f}','EXECUTE') v`), true, f);
      assert.equal(await um(db, `select prosecdef v from pg_proc where oid = 'public.${f}'::regprocedure`), false, `${f} é SECURITY INVOKER`);
    }
    const rls = (await db.query<{ relname: string; r: boolean }>("select relname, relrowsecurity r from pg_class where relname in ('social_posts','social_media_items') order by 1")).rows;
    assert.deepEqual(rls.map((x) => x.r), [true, true]);
    assert.equal((await db.query("select 1 from pg_policies where schemaname='public'")).rows.length, 0);
  } finally {
    await db.close();
  }
});

test("SQL: aprovação em lote mista pela rota, com as regras do banco", async () => {
  const db = await banco();
  try {
    await importar(db, lerCalendario(fixture()).posts);
    await db.query("update public.social_posts set scheduled_at = now() + interval '3 days'");
    await comImagens(db, "s1-01"); // foto pronta
    await comImagens(db, "s1-02", 3); // carrossel com 3 de 5 imagens
    await comImagens(db, "s1-03");
    await db.query("update public.social_posts set scheduled_at = now() - interval '1 hour' where id='s1-03'"); // passou
    await comImagens(db, "st-1026-1"); // story pronto
    await comImagens(db, "st-1026-3");
    await db.query("update public.social_posts set status='published' where id='st-1026-3'");
    const rota = criarRotaLote({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repoSql(db) });
    const j = (await (await rota(pedido({ acao: "aprovar", ids: ["s1-01", "s1-02", "s1-03", "st-1026-1", "st-1026-3", "nao-existe"] }))).json()) as { ok: number; resultados: { id: string; resultado: string }[] };
    assert.equal(j.ok, 2);
    assert.deepEqual(Object.fromEntries(j.resultados.map((r) => [r.id, r.resultado])), { "s1-01": "ok", "s1-02": "sem_imagem", "s1-03": "passado", "st-1026-1": "ok", "st-1026-3": "status", "nao-existe": "nao_encontrado" });
    const st = (await db.query<{ id: string; status: string }>("select id, status from public.social_posts order by id")).rows.map((r) => `${r.id}:${r.status}`);
    assert.deepEqual(st, ["s1-01:approved", "s1-02:draft", "s1-03:draft", "st-1026-1:approved", "st-1026-3:published"]);
    // voltar para rascunho em lote: aprovados voltam; rascunho e publicado não
    const v = (await (await rota(pedido({ acao: "rascunho", ids: ["s1-01", "st-1026-1", "s1-02", "st-1026-3"] }))).json()) as { ok: number; resultados: { id: string; resultado: string }[] };
    assert.equal(v.ok, 2);
    assert.deepEqual(v.resultados.map((r) => r.resultado), ["ok", "ok", "status", "status"]);
  } finally {
    await db.close();
  }
});

test("SQL: reagendar só rascunho, só futuro e só sobre o horário que o painel viu", async () => {
  const db = await banco();
  try {
    await importar(db, lerCalendario(fixture()).posts);
    await db.query("update public.social_posts set scheduled_at = date_trunc('minute', now()) + interval '5 days'");
    const repo = repoSql(db);
    const de = await quando(db, "s1-02");
    const para = new Date(Date.parse(de) + 86_400_000).toISOString();
    assert.equal(await repo.reagendar("s1-02", "2020-01-01T00:00:00Z", para), "mudou");
    assert.equal(await repo.reagendar("s1-02", de, "2020-01-01T00:00:00Z"), "passado");
    assert.equal(Date.parse(await quando(db, "s1-02")), Date.parse(de));
    assert.equal(await repo.reagendar("s1-02", de, para), "ok");
    assert.equal(Date.parse(await quando(db, "s1-02")), Date.parse(para));
    // a segunda aba (com o horário antigo) não sobrescreve
    assert.equal(await repo.reagendar("s1-02", de, new Date(Date.parse(de) + 2 * 86_400_000).toISOString()), "mudou");
    assert.equal(await repo.reagendar("nao-existe", de, para), "nao_encontrado");
    // aprovado não move
    await comImagens(db, "s1-01");
    assert.equal(await repo.mudarStatus("s1-01", "approved"), "ok");
    const deA = await quando(db, "s1-01");
    assert.equal(await repo.reagendar("s1-01", deA, para), "status");
    assert.equal(Date.parse(await quando(db, "s1-01")), Date.parse(deA));
    // pela rota, de ponta a ponta, mantendo a hora em SP
    const rota = criarRotaLote({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repo });
    await db.query("update public.social_posts set scheduled_at = '2027-01-12T00:00:00Z' where id='st-1026-1'"); // 21:00 de 11/01 em SP
    const j = (await (await rota(pedido({ acao: "mover", id: "st-1026-1", de: await quando(db, "st-1026-1"), data: "2027-01-14" }))).json()) as Record<string, string>;
    assert.deepEqual(j, { resultado: "ok", scheduled_at: "2027-01-15T00:00:00.000Z" });
    assert.equal(Date.parse(await quando(db, "st-1026-1")), Date.parse("2027-01-15T00:00:00Z"));
  } finally {
    await db.close();
  }
});

test("SQL: reordenação completa leva imagem, texto, briefing e alt; só rascunho; permutação inválida recusada", async () => {
  const db = await banco();
  try {
    await importar(db, lerCalendario(fixture()).posts);
    await db.query("update public.social_posts set scheduled_at = now() + interval '3 days'");
    await comImagens(db, "s1-02");
    await db.query("update public.social_media_items set visual_brief = 'brief ' || position, alt_text = 'alt ' || position where post_id='s1-02'");
    const slides = async () =>
      (await db.query<{ slide_text: string; storage_path: string; visual_brief: string; alt_text: string }>("select slide_text, storage_path, visual_brief, alt_text from public.social_media_items where post_id='s1-02' order by position")).rows;
    const antes = await slides();
    const repo = repoSql(db);
    for (const ruim of [[1, 2, 3, 4], [1, 2, 3, 4, 5, 6], [1, 1, 2, 3, 4], [0, 1, 2, 3, 4], [2, 3, 4, 5, 6]]) assert.equal(await repo.reordenar("s1-02", ruim), "ordem", JSON.stringify(ruim));
    assert.equal(await um(db, "select public.social_reorder_items('s1-02', null) v"), "ordem");
    assert.equal(await um(db, "select public.social_reorder_items('s1-02', '{{1,2},{3,4}}'::integer[]) v"), "ordem");
    assert.deepEqual(await slides(), antes);
    assert.equal(await repo.reordenar("s1-02", [1, 2, 3, 4, 5]), "ok");
    assert.deepEqual(await slides(), antes);
    assert.equal(await repo.reordenar("s1-02", [4, 1, 2, 3, 5]), "ok");
    assert.deepEqual(await slides(), aplicarOrdem(antes, [4, 1, 2, 3, 5]));
    assert.equal(await repo.reordenar("s1-02", [5, 4, 3, 2, 1]), "ok");
    assert.deepEqual(await slides(), aplicarOrdem(aplicarOrdem(antes, [4, 1, 2, 3, 5]), [5, 4, 3, 2, 1]));
    assert.equal(await repo.reordenar("nao-existe", [1]), "nao_encontrado");
    // aprovado não reordena
    assert.equal(await repo.mudarStatus("s1-02", "approved"), "ok");
    const travado = await slides();
    assert.equal(await repo.reordenar("s1-02", [2, 1, 3, 4, 5]), "status");
    assert.deepEqual(await slides(), travado);
    // a rota recusa a permutação inválida antes do banco
    const rota = criarRotaLote({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repo });
    assert.equal((await rota(pedido({ acao: "reordenar", id: "s1-02", ordem: [2, 2, 3, 4, 5] }))).status, 400);
    const j = (await (await rota(pedido({ acao: "reordenar", id: "s1-02", ordem: [2, 1, 3, 4, 5] }))).json()) as Record<string, string>;
    assert.deepEqual(j, { resultado: "status" });
  } finally {
    await db.close();
  }
});

// ---------- upload em JSON (envio em lote) ----------

function jpeg(largura: number, altura: number): Uint8Array<ArrayBuffer> {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, altura >> 8, altura & 255, largura >> 8, largura & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  const b = new Uint8Array(2 + app0.length + sof.length + 2);
  b.set([0xff, 0xd8], 0);
  b.set(app0, 2);
  b.set(sof, 2 + app0.length);
  b.set([0xff, 0xd9], b.length - 2);
  return b;
}

test("upload: com Accept JSON responde { resultado } com as mesmas checagens; sem ele, o redirect de sempre", async () => {
  const chamadas: string[] = [];
  const repo: RepositorioSocial = {
    formato: async (id) => (id === "st-1026-1" ? "story" : id === "s1-02" ? "carousel" : null),
    importar: async () => ({ criados: 0, atualizados: 0, preservados: 0, orfaos: [] }),
    salvar: async () => "ok",
    mover: async () => "ok",
    mudarStatus: async () => "ok",
    enviarImagem: async (id, p) => (chamadas.push(`${id}:${p}`), id === "s1-02" && p === 5 ? "status" : "ok"),
  };
  const rotas = criarRotasSocial({ autorizar: async () => ({ cfg: CFG, cookies: null }), repo: () => repo });
  const envio = (id: string, posicao: number, arq: Blob, json = true) => {
    const f = new FormData();
    f.append("id", id);
    f.append("posicao", String(posicao));
    f.append("arquivo", arq, `${id}-${posicao}.jpg`);
    return rotas.midia(new Request(`${ORIGEM}/admin/api/social/midia`, { method: "POST", headers: { origin: ORIGEM, ...(json ? { accept: "application/json" } : {}) }, body: f }));
  };
  const corpo = async (r: Response) => ((await r.json()) as { resultado: string }).resultado;
  assert.equal(await corpo(await envio("s1-02", 3, new Blob([jpeg(1080, 1350)], { type: "image/jpeg" }))), "ok");
  assert.equal(await corpo(await envio("st-1026-1", 1, new Blob([jpeg(1080, 1350)], { type: "image/jpeg" }))), "dimensao");
  assert.equal(await corpo(await envio("s1-02", 1, new Blob([jpeg(1080, 1350)], { type: "image/png" }))), "tipo");
  assert.equal(await corpo(await envio("s1-02", 5, new Blob([jpeg(1080, 1350)], { type: "image/jpeg" }))), "status");
  assert.equal(await corpo(await envio("nao-existe", 1, new Blob([jpeg(1080, 1350)], { type: "image/jpeg" }))), "nao_encontrado");
  const r = await envio("s1-02", 2, new Blob([jpeg(1080, 1350)], { type: "image/jpeg" }), false);
  assert.equal(r.status, 303);
  assert.equal(new URL(r.headers.get("location")!).searchParams.get("ok"), "imagem");
  assert.deepEqual(chamadas, ["s1-02:3", "s1-02:5", "s1-02:2"]);
  // sem admin continua 404, com ou sem JSON
  const negado = criarRotasSocial({ autorizar: async () => null, repo: () => repo });
  const f = new FormData();
  f.append("id", "s1-02");
  f.append("posicao", "1");
  assert.equal((await negado.midia(new Request(`${ORIGEM}/admin/api/social/midia`, { method: "POST", headers: { origin: ORIGEM, accept: "application/json" }, body: f }))).status, 404);
});

// ---------- código ----------

test("código: rota de lote atrás da sessão; telas sem confirm(), sem service role; lib sem 'use client'", () => {
  assert.match(readFileSync(join(RAIZ, "src", "app", "api", "social", "lote", "route.ts"), "utf8"), /export const POST = rotaLote;/);
  const lote = readFileSync(join(RAIZ, "src", "lib", "social", "lote.ts"), "utf8");
  assert.match(lote, /autorizar: autorizarAdmin/);
  assert.match(lote, /if \(!a\) return naoEncontrado\(\);/);
  const rotas = readFileSync(join(RAIZ, "src", "lib", "social", "rotas.ts"), "utf8");
  assert.match(rotas, /contextoPost\(req as NextRequest\)/);
  for (const f of ["QuadroInstagram.tsx", "EnvioLote.tsx"]) {
    const txt = readFileSync(join(RAIZ, "src", "components", f), "utf8");
    assert.match(txt, /^"use client";/, f);
    assert.doesNotMatch(txt, /confirm\(|SERVICE_ROLE|clienteServico|servidor"|NEXT_PUBLIC_|localStorage/, f);
  }
  const pagina = readFileSync(join(RAIZ, "src", "app", "(painel)", "instagram", "quadro", "page.tsx"), "utf8");
  assert.doesNotMatch(pagina, /"use client"/);
  assert.match(pagina, /await exigirAdmin\(\)/);
  for (const f of ["quadro.ts", "lote.ts"]) assert.doesNotMatch(readFileSync(join(RAIZ, "src", "lib", "social", f), "utf8"), /"use client"|NEXT_PUBLIC_/, f);
  // quadro.ts roda no navegador: nada de Node nem de servidor
  assert.doesNotMatch(readFileSync(join(RAIZ, "src", "lib", "social", "quadro.ts"), "utf8"), /from "node:|from "\.\/servidor"|from "\.\.\/supabase|from "\.\/conta"/);
  // aba Quadro ao lado de Semana/Mês
  assert.match(readFileSync(join(RAIZ, "src", "app", "(painel)", "instagram", "page.tsx"), "utf8"), /\/instagram\/quadro\?d=/);
});
