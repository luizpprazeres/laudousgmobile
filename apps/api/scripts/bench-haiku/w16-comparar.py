"""W16A — extração COM × SEM raciocínio (e o experimento de omitir nulos), campo a campo.

Lê as rodadas da bancada gravadas em <w16>/com, <w16>/sem e <w16>/nulos (bench-abdomen.ts com
--a-key A7 / A8 / AS8), junta por caso e produz:
  <w16>/comparacao.json      números por grupo e por caso (sem texto clínico)
  <w16>/html/results.json    casos de obstetrícia, Doppler obstétrico e morfológico, lado a lado
  <w16>/html/meta.json       colunas, placar e métricas para o relatorio.py
e roda o relatorio.py → <w16>/html/relatorio.html. Tudo em tmp-review (gitignored: ditados reais).

Uso (de apps/api): python3 scripts/bench-haiku/w16-comparar.py <w16> [w16a|w16c]
  w16c: braços em <w16>/c/{com,sem,comsemleitor}<n> (data do caso + leitores determinísticos);
        réplicas com1×com2 e sem1×sem2; HTML em <w16>/html (o da W16A fica em <w16>/html-w16a).
"""
import html
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path

W = Path(sys.argv[1])
HERE = Path(__file__).resolve().parent
API = HERE.parent.parent
ARMS = [
    ("com", "A7", "com raciocínio"),
    ("sem", "A8", "sem raciocínio (ferramenta forçada)"),
    ("auto", "A6", "sem raciocínio (tool_choice auto)"),
    ("low", "A5", "raciocínio adaptativo, esforço low"),
    ("nulos", "AS8", "sem raciocínio + omitir nulos"),
]
HTML_ARMS = {"A7", "A8", "A6", "A5"}
GRUPOS = [("obstetrica+doppler_obstetrico", "Obstétrica + Doppler"), ("morfologico", "Morfológico"), ("tireoide", "Tireoide")]
CONFIG = sys.argv[2] if len(sys.argv) > 2 else "w16a"
REPLICAS = [("com", "com2", "A7"), ("sem", "sem2", "A8")]
SAIDA = "comparacao.json"
MERGED = "merged"
HTML_KEYS = [
    {"k": "A7", "t": "Com raciocínio", "s": "Haiku 5.5, thinking adaptativo, esforço medium (produção de hoje)"},
    {"k": "A8", "t": "Sem raciocínio — forçado", "s": "thinking desligado, ferramenta forçada"},
    {"k": "A6", "t": "Sem raciocínio — auto", "s": "thinking desligado, tool_choice auto (plano curto em texto antes)"},
    {"k": "A5", "t": "Raciocínio low", "s": "thinking adaptativo, esforço low"},
]
PASSOS = [
    {"t": "1. Ditado real", "s": "O texto que o médico ditou no app (histórico), o mesmo nos três braços."},
    {"t": "Com raciocínio", "flow": "Haiku 5.5 · thinking adaptativo · tool_choice auto", "s": "Como a produção está hoje."},
    {"t": "Sem raciocínio — forçado", "flow": "thinking disabled · ferramenta forçada", "s": "A proposta inicial da W16."},
    {"t": "Sem raciocínio — auto", "flow": "thinking disabled · tool_choice auto", "s": "O modelo escreve um plano curto em texto e depois chama a ferramenta."},
    {"t": "Raciocínio low", "flow": "thinking adaptativo · esforço low", "s": "Menos raciocínio, sem desligar."},
]
if CONFIG == "w16c":
    ARMS = [
        # com<N>r = a execução N re-renderizada com o código final (BENCH_REPLAY_CALLS: mesma extração);
        # sem3/sem4 = execuções novas com o código final (a exigência do módulo Doppler muda a extração).
        ("c/com1r", "A7", "com raciocínio (+ leitores)"),
        ("c/sem3r", "A8", "sem raciocínio + leitores (W16C)"),
        ("c/comsemleitor1", "A5", "com raciocínio, sem os leitores (produção de hoje)"),
    ]
    HTML_ARMS = {"A7", "A8", "A5"}
    REPLICAS = [("c/com1r", "c/com2r", "A7"), ("c/sem3r", "c/sem4r", "A8")]
    GRUPOS = GRUPOS[:2]
    SAIDA = "comparacao-w16c.json"
    MERGED = "merged-w16c"
    HTML_KEYS = [
        {"k": "A7", "t": "Com raciocínio", "s": "thinking adaptativo + leitores determinísticos da W16C"},
        {"k": "A8", "t": "Sem raciocínio + leitores", "s": "W16C: obstétrica, Doppler e morfológico sem raciocínio; IG de referência e bloco Doppler lidos do ditado"},
        {"k": "A5", "t": "Produção de hoje", "s": "com raciocínio, sem os leitores"},
    ]
    PASSOS = [
        {"t": "1. Ditado real", "s": "O texto que o médico ditou no app (histórico), o mesmo em todos os braços, gerado na data em que o caso foi gerado em produção."},
        {"t": "Sem raciocínio + leitores (W16C)", "flow": "thinking disabled nas categorias da lista · IG de referência ditada · bloco Doppler do app", "s": "Os leitores determinísticos só preenchem o que a extração deixou vazio; nunca sobrescrevem."},
        {"t": "Com raciocínio", "flow": "thinking adaptativo · os mesmos leitores", "s": "A régua: o mesmo código com raciocínio."},
        {"t": "Produção de hoje", "flow": "thinking adaptativo · sem os leitores", "s": "Como está no ar."},
    ]
BASE = ARMS[0][0]


def rodada(arm, sufixo):
    ds = sorted((W / arm).glob(f"*-{sufixo}")) if (W / arm).exists() else []
    ds = [d for d in ds if (d / "results.json").exists()]
    return ds[-1] if ds else None


def extracoes(d):
    """Por caso: o JSON da extração (última chamada estruturada que não é FreeSlots) e as medidas do 1º turno."""
    out = {}
    for line in (d / "calls.jsonl").read_text().splitlines():
        c = json.loads(line)
        if c.get("mode") != "haiku" or not c.get("schemaName") or c["schemaName"] == "FreeSlots":
            continue
        api = c.get("api") or {}
        prev = out.get(c["case"])
        try:
            js = json.loads(c["content"])
        except Exception:
            js = None
        out[c["case"]] = {
            "json": js,
            "output": api.get("output", c["usage"]["completion_tokens"]) + (prev["output"] if prev else 0),
            "thinking": api.get("thinkingTokens", c.get("thinking_tokens") or 0) + (prev["thinking"] if prev else 0),
            "ms": api.get("ms", c["ms"]) + (prev["ms"] if prev else 0),
            "cacheRead": api.get("cacheRead", 0),
            "chamadas": (prev["chamadas"] if prev else 0) + 1,
            "blocos": api.get("blocks", []),
        }
    return out


def achata(v, p=""):
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            out.update(achata(x, f"{p}.{k}" if p else k))
        return out or {p: None}
    if isinstance(v, list):
        out = {}
        for i, x in enumerate(v):
            out.update(achata(x, f"{p}[{i}]"))
        return out or {p: None}
    return {p: v}


def norm(v):
    if v in ("", [], {}):
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return round(float(v), 3)
    if isinstance(v, str):
        return re.sub(r"[\s.;,:]+", " ", v.strip().lower()).strip()
    return v


def tipo(v):
    return "texto" if isinstance(v, str) and len(v) > 25 else "valor"


def difs(a, b):
    """Campos diferentes entre duas extrações (ausente = null)."""
    if a is None or b is None:
        return [("(sem extração)", a is not None, b is not None, "valor")]
    fa, fb = achata(a), achata(b)
    out = []
    for k in sorted(set(fa) | set(fb)):
        x, y = fa.get(k), fb.get(k)
        if norm(x) != norm(y):
            out.append((k, x, y, tipo(x if x is not None else y)))
    return out


def conclusao(t):
    m = re.search(r"^[\s*#_]*(CONCLUS[ÃA]O|IMPRESS[ÃA]O)\b.*$", t or "", re.M | re.I)
    return (t or "")[m.start():] if m else ""


def igs(t):
    return {f"{a}s{b or 0}d" for a, b in re.findall(r"(\d{1,2}) semanas(?: e (\d) dias?)?", t or "")}


def numeros(t):
    return {n.replace(".", ",") for n in re.findall(r"\d+(?:[.,]\d+)?", t or "") if n not in ("1", "2", "3")}


def dorso(t):
    m = re.search(r"dorso (à |a )?(esquerd|direit|anterior|posterior|superior|inferior)", (t or "").lower())
    return m.group(2) if m else None


def clinico(cand, final):
    """Placar clínico do laudo contra o final do médico (determinístico)."""
    fin_ig, cand_ig = igs(conclusao(final)), igs(conclusao(cand))
    nf, nc = numeros(final), numeros(cand)
    df, dc = dorso(final), dorso(cand)
    return {
        "ig_final_ausente": len(fin_ig - igs(cand)),
        "ig_conclusao_extra": len(cand_ig - igs(final)),
        "num_final_ausente": len(nf - nc),
        "num_extra": len(nc - nf),
        "dorso_diverge": int(bool(df) and dc != df),
    }


def pct(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(round(q * (len(xs) - 1))))] if xs else 0


def placar(results_dir, keys):
    r = subprocess.run(
        ["pnpm", "exec", "tsx", "scripts/bench-haiku/placar.ts", str(results_dir), "--keys", ",".join(keys)],
        cwd=API, capture_output=True, text=True,
    )
    return r.stdout + r.stderr[-500:], None


comparacao = {"grupos": {}, "casos": []}
casos_html = []
for sufixo, nome in GRUPOS:
    ds = {arm: rodada(arm, sufixo) for arm, _, _ in ARMS}
    if not ds[BASE] or not ds[ARMS[1][0]]:
        print(f"{nome}: falta rodada ({ds})")
        continue
    res = {arm: {r["id"]: r for r in json.loads((d / "results.json").read_text())} for arm, d in ds.items() if d}
    ext = {arm: extracoes(d) for arm, d in ds.items() if d}
    base = res[BASE]
    merged = []
    g = {"n": 0, "arms": {}, "dif": {}}
    for arm, key, rot in ARMS:
        if arm not in res:
            continue
        e = [ext[arm][i] for i in base if i in ext[arm]]
        g["arms"][arm] = {
            "rotulo": rot,
            "n": len(e),
            "saida_media": round(statistics.mean(x["output"] for x in e)) if e else 0,
            "saida_p50": pct([x["output"] for x in e], 0.5),
            "saida_p90": pct([x["output"] for x in e], 0.9),
            "thinking_medio": round(statistics.mean(x["thinking"] for x in e)) if e else 0,
            "ms_p50": pct([x["ms"] for x in e], 0.5),
            "ms_p90": pct([x["ms"] for x in e], 0.9),
            "ms_max": max((x["ms"] for x in e), default=0),
            "com_thinking_bloco": sum(1 for x in e if "thinking" in x["blocos"]),
            "reparos": sum(1 for x in e if x["chamadas"] > 1),
            "falhas": sum(1 for i in base if i in res[arm] and (res[arm][i].get(key) or [{}])[0].get("error")),
            "clinico": {
                k: sum(clinico(((res[arm][i].get(key) or [{}])[0].get("text") or ""), base[i]["final"] or "")[k] for i in base if i in res[arm])
                for k in ("ig_final_ausente", "ig_conclusao_extra", "num_final_ausente", "num_extra", "dorso_diverge")
            },
            "sim_final": round(statistics.mean(res[arm][i]["m_" + key]["simFinal"] for i in base if i in res[arm] and res[arm][i].get("m_" + key)), 3),
        }
    for i, r in base.items():
        row = {k: r.get(k) for k in ("id", "id8", "data", "categoria", "hint", "dopplerMode", "ditado", "final", "gpt", "editadoPeloMedico", "prodPath")}
        metr = {}
        caso = {"id8": r["id8"], "grupo": nome}
        textos = {}
        for arm, key, rot in ARMS:
            if arm not in res or i not in res[arm]:
                continue
            row[key] = res[arm][i].get(key)
            if res[arm][i].get("m_" + key):
                row["m_" + key] = res[arm][i]["m_" + key]
            textos[arm] = ((res[arm][i].get(key) or [{}])[0].get("text") or "")
            caso[f"clin_{arm}"] = clinico(textos[arm], r.get("final") or "")
            x = ext[arm].get(i)
            if x:
                metr[key] = [
                    {"t": f"saída {x['output']} tok"},
                    {"t": f"raciocínio {x['thinking']} tok", "tone": "warn" if x["thinking"] else "good"},
                    {"t": f"{x['ms'] / 1000:.1f} s", "tone": "good" if x["ms"] < 8000 else "warn" if x["ms"] < 15000 else "bad"},
                ]
                caso[arm] = {"saida": x["output"], "thinking": x["thinking"], "ms": x["ms"]}
        metr.pop("AS8", None)
        row["metricas"] = metr
        # campo a campo: com × sem (e com × nulos)
        partes = []
        for arm, key, rot in ARMS[1:]:
            if arm not in ext or i not in ext[arm] or i not in ext[BASE]:
                continue
            mostrar = key in HTML_ARMS
            d = difs(ext[BASE][i]["json"], ext[arm][i]["json"])
            vals = [x for x in d if x[3] == "valor"]
            txts = [x for x in d if x[3] == "texto"]
            caso[f"dif_{arm}"] = {"valores": len(vals), "textos": len(txts), "laudo_igual": textos.get(BASE) == textos.get(arm)}
            g["dif"].setdefault(arm, {"casos_valor": 0, "campos_valor": 0, "casos_texto": 0, "laudos_iguais": 0, "campos": {}})
            gd = g["dif"][arm]
            gd["casos_valor"] += bool(vals)
            gd["campos_valor"] += len(vals)
            gd["casos_texto"] += bool(txts)
            gd["laudos_iguais"] += textos.get(BASE) == textos.get(arm)
            for k, *_ in vals:
                kk = re.sub(r"\[\d+\]", "[]", k)
                gd["campos"][kk] = gd["campos"].get(kk, 0) + 1
            if not mostrar:
                pass
            elif d:
                lis = "".join(
                    f"<tr><td><code>{html.escape(k)}</code></td><td>{html.escape(json.dumps(a, ensure_ascii=False))}</td><td>{html.escape(json.dumps(b, ensure_ascii=False))}</td></tr>"
                    for k, a, b, _ in d[:40]
                )
                partes.append(
                    f"<b>Extração: com raciocínio × {html.escape(rot)}</b> — {len(vals)} valor(es), {len(txts)} texto(s) diferente(s)"
                    + (" · laudo final idêntico" if textos.get(BASE) == textos.get(arm) else " · laudo muda")
                    + f"<div class='scroll'><table><tr><th>campo</th><th>com raciocínio</th><th>{html.escape(rot)}</th></tr>{lis}</table></div>"
                )
            else:
                partes.append(f"<b>Extração: com raciocínio × {html.escape(rot)}</b> — JSON idêntico campo a campo" + (" · laudo idêntico" if textos.get(BASE) == textos.get(arm) else " · laudo muda (free-slot/ordem)"))
        row["notaHtml"] = "<br>".join(partes)
        g["n"] += 1
        merged.append(row)
        comparacao["casos"].append(caso)
    # placar determinístico (frases-padrão, título, técnica, lacunas…) no conjunto juntado
    mdir = W / f"{MERGED}-{sufixo}"
    mdir.mkdir(exist_ok=True)
    (mdir / "results.json").write_text(json.dumps(merged, ensure_ascii=False))
    keys = ["gpt"] + [k for a, k, _ in ARMS if a in res]
    saida, _ = placar(mdir, keys)
    (mdir / "placar.txt").write_text(saida)
    g["placar"] = saida
    comparacao["grupos"][nome] = g
    if sufixo != "tireoide":
        casos_html += [{k: v for k, v in r.items() if k not in ("AS8", "m_AS8")} for r in merged]
    print(f"\n=== {nome}: {g['n']} casos")
    for arm, a in g["arms"].items():
        print(f"  {a['rotulo']:<32} clínico {a['clinico']}")
        print(f"  {a['rotulo']:<32} saída média {a['saida_media']:>5} (p50 {a['saida_p50']}, p90 {a['saida_p90']}) · raciocínio {a['thinking_medio']:>5} · tempo p50 {a['ms_p50'] / 1000:.1f}s p90 {a['ms_p90'] / 1000:.1f}s máx {a['ms_max'] / 1000:.1f}s · reparos {a['reparos']} · falhas {a['falhas']} · sim(final) {a['sim_final']}")
    for arm, d in g["dif"].items():
        top = sorted(d["campos"].items(), key=lambda x: -x[1])[:8]
        print(f"  {BASE} × {arm}: {d['casos_valor']}/{g['n']} casos com valor diferente ({d['campos_valor']} campos) · {d['casos_texto']} com texto livre diferente · laudo idêntico {d['laudos_iguais']}/{g['n']} · campos: {top}")
    print(saida)

# Linha de base: a mesma configuração rodada duas vezes (obstétrica) — quanto muda só por rodar de novo.
base_rep = {}
for a1, a2, key in REPLICAS:
    d1, d2 = rodada(a1, "obstetrica+doppler_obstetrico"), rodada(a2, "obstetrica+doppler_obstetrico")
    if not (d1 and d2):
        continue
    e1, e2 = extracoes(d1), extracoes(d2)
    r1 = {r["id"]: r for r in json.loads((d1 / "results.json").read_text())}
    r2 = {r["id"]: r for r in json.loads((d2 / "results.json").read_text())}
    ids = [i for i in e1 if i in e2]
    dd = [difs(e1[i]["json"], e2[i]["json"]) for i in ids]
    vals = [[x for x in d if x[3] == "valor"] for d in dd]
    iguais = sum(1 for i in ids if ((r1[i].get(key) or [{}])[0].get("text")) == ((r2[i].get(key) or [{}])[0].get("text")))
    clin2 = {k: sum(clinico(((r2[i].get(key) or [{}])[0].get("text") or ""), r2[i]["final"] or "")[k] for i in ids)
             for k in ("ig_final_ausente", "ig_conclusao_extra", "num_final_ausente", "num_extra", "dorso_diverge")}
    base_rep[f"{a1}×{a2}"] = {"n": len(ids), "casos_valor": sum(1 for v in vals if v), "campos_valor": sum(len(v) for v in vals), "laudos_iguais": iguais, "clinico_replica": clin2}
    print(f"linha de base {a1}×{a2}: {base_rep[f'{a1}×{a2}']}")
comparacao["linha_de_base"] = base_rep

(W / SAIDA).write_text(json.dumps(comparacao, ensure_ascii=False, indent=1, default=str))

# HTML: obstetrícia, Doppler obstétrico e morfológico
hdir = W / "html"
hdir.mkdir(exist_ok=True)
(hdir / "results.json").write_text(json.dumps(casos_html, ensure_ascii=False))


def placar_html():
    linhas = []
    for nome, g in comparacao["grupos"].items():
        for arm, a in g["arms"].items():
            d = g["dif"].get(arm)
            linhas.append(
                f"<tr><td><b>{html.escape(nome)}</b> · {html.escape(a['rotulo'])}</td><td class='num'>{g['n']}</td>"
                f"<td class='num'>{a['saida_media']} <span style='color:var(--muted)'>(p90 {a['saida_p90']})</span></td>"
                f"<td class='num'>{a['thinking_medio']}</td><td class='num'>{a['ms_p50'] / 1000:.1f} s · {a['ms_p90'] / 1000:.1f} s</td>"
                f"<td class='num'>{a['sim_final']}</td>"
                f"<td class='num'>{'—' if not d else str(d['casos_valor']) + '/' + str(g['n'])}</td>"
                f"<td class='num'>{'—' if not d else str(d['laudos_iguais']) + '/' + str(g['n'])}</td></tr>"
            )
    return (
        "<tr><th></th><th>Casos</th><th>Tokens de saída (média)</th><th>Raciocínio (média)</th><th>Tempo da extração p50 · p90</th>"
        "<th>Semelhança com o final</th><th>Casos com algum valor extraído ≠ do com raciocínio</th><th>Laudo idêntico ao com raciocínio</th></tr>"
        + "".join(linhas)
    )


meta = {
    "titulo": "Extração com × sem raciocínio — W16",
    "rodada": f"{CONFIG.upper()} · " + " · ".join(f"{nome}" for nome in comparacao["grupos"]),
    "keys": [x for x in HTML_KEYS if any(r.get(x["k"]) for r in casos_html)],
    "refs": [{"k": "final", "t": "laudo final do médico"}, {"k": "A7", "t": "com raciocínio"}],
    "placarHtml": placar_html(),
    "passos": PASSOS + [
        {"t": "Medição", "s": "Pela assinatura (claude -p), com um proxy local que reproduz o pedido da produção e mede o 1º turno na API: tokens de saída, raciocínio e tempo. O mesmo renderer monta os dois laudos."},
        {"t": "Como ler", "s": "Cada caso traz a diferença campo a campo dos JSONs extraídos. Troque a referência das marcas para “com raciocínio” para ver só o que mudou entre os dois."},
    ],
}
# Veredito e notas conferidas à mão (contêm detalhe clínico): <w16>/html/passos-extra.json e notas.json.
if (hdir / "passos-extra.json").exists():
    meta["passos"] += json.loads((hdir / "passos-extra.json").read_text())
(hdir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False))
print(subprocess.run(["python3", str(HERE / "relatorio.py"), str(hdir)], capture_output=True, text=True).stdout)
