import assert from "node:assert/strict";
import { test } from "node:test";
import { contarPorDia, diaBRT, distintosPorDia, inicioDoDiaBRT, inicioPeriodo, janelaDias, noPeriodo, percentil, periodosDaSerie } from "../src/lib/data/agregar";

test("dia em Brasília vira na meia-noite local, não em UTC", () => {
  assert.equal(diaBRT("2026-10-22T02:59:59Z"), "2026-10-21");
  assert.equal(diaBRT("2026-10-22T03:00:00Z"), "2026-10-22");
  assert.equal(inicioDoDiaBRT("2026-10-21"), "2026-10-21T03:00:00.000Z");
});

test("janela de 30 dias termina hoje", () => {
  const d = janelaDias("2026-10-21");
  assert.equal(d.length, 30);
  assert.equal(d[0], "2026-09-22");
  assert.equal(d[29], "2026-10-21");
  assert.equal(inicioPeriodo(d, "today"), "2026-10-21");
  assert.equal(inicioPeriodo(d, "d7"), "2026-10-15");
});

test("contagens por dia e por período", () => {
  const dias = janelaDias("2026-10-21", 3);
  const linhas = [{ t: "2026-10-19T12:00:00Z", u: "a" }, { t: "2026-10-21T01:00:00Z", u: "a" }, { t: "2026-10-21T15:00:00Z", u: "b" }, { t: "2026-10-21T16:00:00Z", u: "b" }];
  assert.deepEqual(contarPorDia(linhas, dias, (l) => l.t), [1, 1, 2]);
  assert.deepEqual(distintosPorDia(linhas, dias, (l) => l.t, (l) => l.u), [1, 1, 1]);
  const s = periodosDaSerie([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([s.today, s.d7, s.d30], [8, 35, 36]);
  assert.equal(noPeriodo([1, 2, 3], "d7"), 6);
});

test("percentil igual ao percentile_cont do Postgres", () => {
  assert.equal(percentil([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentil([10, null, 30], 0.5), 20);
  assert.equal(percentil([], 0.5), null);
});
