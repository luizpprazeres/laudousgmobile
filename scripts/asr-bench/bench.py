#!/usr/bin/env python3
"""Harness de keyterms do Deepgram: mesmo áudio, configurações diferentes.

Mede o que importa pra laudo: o TERMO saiu certo? (não WER global)
"""
import json, os, re, sys, unicodedata, urllib.parse, urllib.request, concurrent.futures

SP = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(SP))

KEY = os.environ.get("DEEPGRAM_API_KEY")
if not KEY:
    env_path = os.path.join(REPO, ".env")
    if os.path.exists(env_path):
        for line in open(env_path):
            if line.startswith("DEEPGRAM_API_KEY="):
                KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
assert KEY, f"sem DEEPGRAM_API_KEY (nem no ambiente nem em {REPO}/.env)"

if not os.path.exists(f"{SP}/keyterms.json"):
    sys.exit("falta keyterms.json — rode: pnpm asr:bench:keyterms")
if not os.path.isdir(f"{SP}/audio"):
    sys.exit("falta audio/ — rode: ./scripts/asr-bench/gen-audio.sh")

corpus = json.load(open(f"{SP}/corpus.json"))
KT = json.load(open(f"{SP}/keyterms.json"))
CUSTOM = json.load(open(f"{SP}/custom.json")) if os.path.exists(f"{SP}/custom.json") else {}


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9 ]", " ", s)


def transcribe(wav, keyterms):
    p = [("model", "nova-3"), ("language", "pt-BR"), ("smart_format", "true"),
         ("punctuate", "true"), ("numerals", "true")]
    p += [("keyterm", k) for k in keyterms]
    url = "https://api.deepgram.com/v1/listen?" + urllib.parse.urlencode(p)
    req = urllib.request.Request(url, data=open(wav, "rb").read(), method="POST",
                                 headers={"Authorization": f"Token {KEY}",
                                          "Content-Type": "audio/wav"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            return d["results"]["channels"][0]["alternatives"][0]["transcript"]
        except Exception as e:
            if attempt == 2:
                return f"__ERRO__ {e}"
    return "__ERRO__"


def score(transcript, termos):
    t = norm(transcript)
    hits = [x for x in termos if norm(x).strip() in t]
    return hits, [x for x in termos if x not in hits]


CONFIGS = {
    "sem keyterms": lambda c: [],
    "110 (producao)": lambda c: KT["ALL"],
    "por categoria": lambda c: KT.get(c["categoria"], KT["ALL"]),
}
for name, terms in CUSTOM.items():
    CONFIGS[name] = (lambda tl: (lambda c: tl.get(c["categoria"], [])))(terms)

VOICES = ["normal", "rapido", "ruido"]
jobs = []
for c in corpus:
    for v in VOICES:
        for cfg, fn in CONFIGS.items():
            jobs.append((c, v, cfg, fn(c)))

results = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
    futs = {ex.submit(transcribe, f"{SP}/audio/{c['id']}__{v}.wav", kt): (c, v, cfg)
            for c, v, cfg, kt in jobs}
    for f in concurrent.futures.as_completed(futs):
        c, v, cfg = futs[f]
        results[(c["id"], v, cfg)] = f.result()

totals = {cfg: [0, 0] for cfg in CONFIGS}
print(f"{'caso':<26}{'voz':<10}" + "".join(f"{cfg:<18}" for cfg in CONFIGS))
print("-" * (36 + 18 * len(CONFIGS)))
misses = {cfg: [] for cfg in CONFIGS}
for c in corpus:
    for v in VOICES:
        row = f"{c['id'] + ' (' + str(len(c['termos'])) + ')':<26}{v:<10}"
        for cfg in CONFIGS:
            tr = results[(c["id"], v, cfg)]
            hits, miss = score(tr, c["termos"])
            totals[cfg][0] += len(hits); totals[cfg][1] += len(c["termos"])
            misses[cfg] += [(c["id"], m) for m in miss]
            row += f"{len(hits)}/{len(c['termos'])}".ljust(18)
        print(row)

print("-" * (36 + 18 * len(CONFIGS)))
row = f"{'TOTAL':<26}{'':<10}"
for cfg in CONFIGS:
    h, t = totals[cfg]
    row += f"{h}/{t} ({100*h//t}%)".ljust(18)
print(row)

print("\n=== termos que MAIS falham (por config) ===")
for cfg in CONFIGS:
    from collections import Counter
    cnt = Counter(m for _, m in misses[cfg])
    top = ", ".join(f"{k}×{v}" for k, v in cnt.most_common(8))
    print(f"{cfg:<18} {top}")

json.dump({f"{k[0]}|{k[1]}|{k[2]}": v for k, v in results.items()},
          open(f"{SP}/bench_results.json", "w"), ensure_ascii=False, indent=1)
