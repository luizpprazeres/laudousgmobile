import assert from "node:assert/strict";
import { salaRouting, salaPairingPayload, salaCanonicalEnabled } from "../domain";

const old = "https://sala.laudousg.com";
const next = "https://sala.laudousg.com.br";
for (const method of ["GET", "HEAD"]) {
  for (const path of ["/", "/sala", "/sala/ABC234?mode=print&x=1%202"]) {
    const result = salaRouting(new URL(old + path), method, true);
    assert.equal(result.kind, "redirect");
    if (result.kind === "redirect") {
      assert.equal(result.url.href, next + path);
      assert.notEqual(salaRouting(result.url, method, true).kind, "redirect");
    }
  }
}
for (const host of [old, next]) {
  for (const path of ["/api/sala/latest?token=ABC234", "/api/sala/push", "/api", "/_next/static/a.js", "/favicon.ico", "/sala/icon.png"]) {
    for (const method of ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"]) {
      assert.equal(salaRouting(new URL(host + path), method, true).kind, "next");
    }
  }
  assert.equal(salaRouting(new URL(host), "POST", true).kind, "next");
  for (const enabled of [false, true]) {
    const root = salaRouting(new URL(next), "GET", enabled);
    assert.equal(root.kind, "rewrite");
    if (root.kind === "rewrite") assert.equal(root.url.pathname, "/sala");
  }
  const short = salaRouting(new URL(host + "/abc234?x=1"), "GET", true);
  assert.notEqual(short.kind, "next");
  if (short.kind !== "next") {
    assert.equal(short.url.pathname, "/sala/ABC234");
    assert.equal(short.url.search, "?x=1");
  }
}
assert.equal(salaRouting(new URL(old), "GET", false).kind, "rewrite");
assert.equal(salaRouting(new URL("https://laudousgmobile.vercel.app/"), "GET", true).kind, "next");
assert.equal(salaRouting(new URL("https://sala.laudousg.com.evil.test/"), "GET", true).kind, "next");
const hostile = salaRouting(new URL(old + "//evil.test/path?redirect=https://evil.test"), "GET", true);
assert.equal(hostile.kind, "redirect");
if (hostile.kind === "redirect") assert.equal(hostile.url.origin, next);
for (const enabled of [false, true]) {
  const p = salaPairingPayload("ABC234", "2027-09-28T00:00:00.000Z", enabled);
  assert.equal(p.salaUrl, `${enabled ? next : old}/sala/ABC234`);
  assert.equal(p.sala_url, p.salaUrl);
  assert.equal(p.sala_short_url, p.salaShortUrl);
  assert.equal(p.expires_at, p.expiresAt);
}
assert.throws(() => salaPairingPayload("../oops", "date"));
assert.equal(salaCanonicalEnabled("true"), true);
assert.equal(salaCanonicalEnabled("false"), false);
console.log("Sala domain: routing, compatibility and phased activation checks passed");
