import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware } from '../../../middleware';
const original = process.env.SALA_CANONICAL_ENABLED;
try {
  for (const host of ['sala.laudousg.com', 'sala.laudousg.com.br']) {
    process.env.SALA_CANONICAL_ENABLED = 'false';
    for (const [path, expected] of [['/', '/sala'], ['/ABC234?test=1', '/sala/ABC234?test=1']]) {
      const response = middleware(new NextRequest(`http://localhost:3197${path}`, { headers: { host } }));
      assert.equal(response.headers.get('x-middleware-rewrite'), `http://localhost:3197${expected}`);
    }
  }
  process.env.SALA_CANONICAL_ENABLED = 'true';
  const redirected = middleware(new NextRequest('http://localhost:3197/ABC234?test=1', { headers: { host: 'sala.laudousg.com' } }));
  assert.equal(redirected.status, 307);
  assert.equal(redirected.headers.get('location'), 'https://sala.laudousg.com.br/sala/ABC234?test=1');
  assert.equal(redirected.headers.get('cache-control'), 'private, no-store');
  const api = middleware(new NextRequest('http://localhost:3197/api/sala/push', { method: 'POST', headers: { host: 'sala.laudousg.com' } }));
  assert.equal(api.headers.get('location'), null);
  const arbitrary = middleware(new NextRequest('http://localhost:3197/ABC234', { headers: { host: 'evil.test' } }));
  assert.equal(arbitrary.headers.get('location'), null);
  assert.equal(arbitrary.headers.get('x-middleware-rewrite'), null);
} finally {
  if (original === undefined) delete process.env.SALA_CANONICAL_ENABLED;
  else process.env.SALA_CANONICAL_ENABLED = original;
}
console.log('PASS middleware real NextRequest host, internal rewrite and redirect isolation');
