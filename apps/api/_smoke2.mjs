import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync("./.env.local", "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const API = "https://laudousgmobile.vercel.app";
const WS = "11111111-1111-4111-8111-111111111111";
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// mint token do Luiz (usuário autorizado da TESTE) via magiclink admin (não envia email)
const { data: link, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email: "luizp02121@gmail.com" });
if (le) { console.error("generateLink falhou:", le.message); process.exit(1); }
const hashed = link.properties?.hashed_token;
const { data: sess, error: ve } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: hashed });
if (ve) { console.error("verifyOtp falhou:", ve.message); process.exit(1); }
const token = sess.session.access_token;
console.log("token do Luiz OK, user:", sess.user.id);
const H = { authorization: `Bearer ${token}`, "content-type": "application/json" };

const cats = await fetch(`${API}/api/categories`, { headers: H }).then((r) => r.json()).catch(() => null);
const codes = Array.isArray(cats?.categories) ? cats.categories.map((c) => c.code) : (Array.isArray(cats) ? cats.map((c) => c.code) : []);
console.log("categorias visíveis (conta AUTORIZADA/Luiz):", codes.length, "| LIVRE?", codes.includes("LIVRE"), "| TESTE?", codes.includes("TESTE"));

async function gen(label, body) {
  const res = await fetch(`${API}/api/generate`, { method: "POST", headers: { ...H, accept: "text/event-stream" }, body: JSON.stringify(body) });
  if (!res.ok) { const t = await res.text().catch(() => ""); console.log(`${label}: HTTP ${res.status} ${t.slice(0, 140)}`); return; }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let done = false; let text = ""; let err = ""; const t0 = Date.now();
  while (true) { const { value, done: d } = await reader.read(); if (d) break; buf += dec.decode(value, { stream: true });
    for (const line of buf.split("\n")) { if (!line.startsWith("data:")) continue;
      try { const ev = JSON.parse(line.slice(5).trim());
        if (ev.type === "token") text += ev.delta ?? "";
        if (ev.type === "done") done = true;
        if (ev.type === "error" || ev.type === "blocked") err = ev.message ?? ev.reason ?? ev.type;
      } catch {} }
    buf = buf.slice(buf.lastIndexOf("\n") + 1); if (done) break; }
  console.log(`${label}: done=${done} ${Date.now() - t0}ms ${err ? "ERR=" + err : ""}\n  trecho: ${text.replace(/\s+/g, " ").slice(0, 130)}`);
}

await gen("LIVRE (writer puro, default model)", { raw_input: "Tireoide de dimensões normais, ecotextura homogênea, sem nódulos.", category_hint: "LIVRE", writing_style_id: WS, mode: "standard" });
await gen("TESTE (DeepSeek v4-flash)", { raw_input: "Bexiga de paredes finas, sem cálculos. Próstata de dimensões normais.", category_hint: "TESTE", writing_style_id: WS, mode: "standard" });
