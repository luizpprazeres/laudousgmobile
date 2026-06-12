// DET-3 — prova E2E de que trocar a preferência de máscara muda o laudo.
// Sem preferência → máscara padrão (default); preferência "enxuta" (LAUDO
// RESUMIDO) → muda o laudo; volta para padrão → volta. Determinístico.
//
// Uso: GOLDEN_AUTH_TOKEN=... [GOLDEN_API_URL=http://localhost:3000] \
//      node tests/det3/preference-e2e.mjs
//
// Descobre os variant_id de MAMARIA (padrao/enxuta) via GET — não hardcoda.
import "dotenv/config";

const API = process.env.GOLDEN_API_URL ?? "https://laudousgmobile.vercel.app";
const TOKEN = process.env.GOLDEN_AUTH_TOKEN;
const STYLE = "11111111-1111-4111-8111-111111111111"; // CLASSICO_COMPLETO
const INPUT = "mamas, mama direita com cisto simples de 1,2 cm, BI-RADS 2";

if (!TOKEN) throw new Error("GOLDEN_AUTH_TOKEN ausente");
const H = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function variantIds() {
  const r = await fetch(`${API}/api/me/report-preferences`, { headers: H });
  const { available_variants } = await r.json();
  const mama = available_variants.filter(
    (v) => v.category_code === "MAMARIA" && v.writing_style_id === STYLE,
  );
  const byKey = (k) => mama.find((v) => v.variant_key === k)?.id ?? null;
  return { padrao: byKey("padrao"), enxuta: byKey("enxuta") };
}

async function setPref(variantId) {
  const r = await fetch(`${API}/api/me/report-preferences`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({ category_code: "MAMARIA", default_variant_id: variantId }),
  });
  if (!r.ok) throw new Error(`PATCH falhou: ${r.status}`);
}

async function generate() {
  const r = await fetch(`${API}/api/generate`, {
    method: "POST",
    headers: { ...H, Accept: "text/event-stream" },
    body: JSON.stringify({
      raw_input: INPUT,
      category_hint: "MAMARIA",
      writing_style_id: STYLE,
      source: "web",
    }),
  });
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = frame
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n");
      if (!data) continue;
      const ev = JSON.parse(data);
      if (ev.type === "done") return ev.final_text;
      if (ev.type === "error") throw new Error(`${ev.code}: ${ev.message}`);
    }
  }
  throw new Error("stream sem done");
}

const detect = (t) =>
  /LAUDO RESUMIDO/.test(t)
    ? "ENXUTA"
    : /REGIÕES AXILARES|OS SEGUINTES ASPECTOS/.test(t)
      ? "PADRÃO"
      : "?";

const ids = await variantIds();
if (!ids.padrao || !ids.enxuta) throw new Error("variantes MAMARIA não encontradas");

await setPref(null);
const t1 = detect(await generate());
await setPref(ids.enxuta);
const t2 = detect(await generate());
await setPref(ids.padrao);
const t3 = detect(await generate());
await setPref(null); // limpa

console.log(`1) sem preferência → ${t1}`);
console.log(`2) preferência ENXUTA → ${t2}`);
console.log(`3) preferência PADRÃO → ${t3}`);
const ok = t1 === "PADRÃO" && t2 === "ENXUTA" && t3 === "PADRÃO";
console.log(ok ? "\n✅ DET-3 OK" : "\n❌ FALHOU");
process.exit(ok ? 0 : 1);
