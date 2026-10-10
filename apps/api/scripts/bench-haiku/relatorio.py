"""Gera o relatório HTML (local, NÃO publicar — contém ditados reais) de uma rodada da bancada.

Uso: python3 apps/api/scripts/bench-haiku/relatorio.py tmp-review/bench-haiku/<rodada>
Saída: <rodada>/relatorio.html
"""
import json
import sys
from pathlib import Path

run = Path(sys.argv[1])
results = json.loads((run / "results.json").read_text())
results.sort(key=lambda r: (r["data"], r["id8"]))

# Notas conferidas à mão ficam em <rodada>/notas.json (contêm detalhes clínicos dos casos).
NOTAS = {}

extra = run / "notas.json"
if extra.exists():
    NOTAS.update(json.loads(extra.read_text()))
meta = run / "meta.json"
data = {"cases": results, "notas": NOTAS, "rodada": run.name, **(json.loads(meta.read_text()) if meta.exists() else {})}
payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")

html = r"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bancada Haiku Abdome</title>
<style>
:root{
  --bg:#f6f5f2;--surface:#fff;--surface-2:#faf9f7;--ink:#1d1b18;--muted:#6b6660;--line:#e6e2dc;
  --accent:#2f5d8a;--good:#1f7a4d;--good-bg:#e5f3ea;--warn:#9a6200;--warn-bg:#fbf0d9;--bad:#a8322b;--bad-bg:#f9e3e0;
  --ins-bg:#fff0b3;--ins-ink:#5b4500;--del-ink:#a8322b;
  --mono:ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#141312;--surface:#1d1c1a;--surface-2:#232220;--ink:#ece9e4;--muted:#a19b93;--line:#33302c;
  --accent:#8db6e0;--good:#6fcf9b;--good-bg:#173226;--warn:#e6b450;--warn-bg:#352a12;--bad:#f08a80;--bad-bg:#3a1c19;
  --ins-bg:#4a3d0c;--ins-ink:#ffe9a3;--del-ink:#f08a80;}}
:root[data-theme="dark"]{
  --bg:#141312;--surface:#1d1c1a;--surface-2:#232220;--ink:#ece9e4;--muted:#a19b93;--line:#33302c;
  --accent:#8db6e0;--good:#6fcf9b;--good-bg:#173226;--warn:#e6b450;--warn-bg:#352a12;--bad:#f08a80;--bad-bg:#3a1c19;
  --ins-bg:#4a3d0c;--ins-ink:#ffe9a3;--del-ink:#f08a80;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1500px;margin:0 auto;padding:28px 16px 80px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}
h2{font-size:18px;margin:0 0 12px}
.sub{color:var(--muted);margin:0 0 24px}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:18px}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.step{background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.step b{display:block;margin-bottom:4px}
.step .flow{font-family:var(--mono);font-size:12.5px;color:var(--muted)}
.tag{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid var(--line);background:var(--surface-2);color:var(--muted);white-space:nowrap}
.tag.good{background:var(--good-bg);color:var(--good);border-color:transparent}
.tag.warn{background:var(--warn-bg);color:var(--warn);border-color:transparent}
.tag.bad{background:var(--bad-bg);color:var(--bad);border-color:transparent}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}
td.num{font-variant-numeric:tabular-nums}
.scroll{overflow-x:auto}
.controls{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-bottom:1px solid var(--line);margin-bottom:18px}
.controls label{display:flex;gap:6px;align-items:center;font-size:14px;cursor:pointer}
.controls select,.controls button{font:inherit;font-size:14px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.case{background:var(--surface);border:1px solid var(--line);border-radius:14px;margin-bottom:22px;overflow:hidden}
.case-head{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.case-head h3{margin:0;font-size:16px;font-family:var(--mono)}
.case-body{padding:16px 18px}
.dictation{background:var(--surface-2);border:1px dashed var(--line);border-radius:10px;padding:10px 14px;white-space:pre-wrap;font-size:14px;margin-bottom:12px}
.label{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.nota{border-left:3px solid var(--accent);background:var(--surface-2);padding:10px 14px;border-radius:0 10px 10px 0;margin-bottom:14px;font-size:14px}
.cols{display:grid;grid-template-columns:repeat(var(--n,4),minmax(280px,1fr));gap:12px;overflow-x:auto}
.col{border:1px solid var(--line);border-radius:10px;display:flex;flex-direction:column;min-width:0;background:var(--surface)}
.col-head{padding:10px 12px;border-bottom:1px solid var(--line);background:var(--surface-2);border-radius:10px 10px 0 0}
.col-head .t{font-weight:700;font-size:14px}
.col-head .s{font-size:12px;color:var(--muted)}
.score{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.laudo{padding:12px;white-space:pre-wrap;font-family:var(--mono);font-size:12.5px;line-height:1.6;flex:1}
ins{background:var(--ins-bg);color:var(--ins-ink);text-decoration:none;border-radius:3px;padding:0 1px}
del{color:var(--del-ink);text-decoration:line-through;opacity:.85}
.judge{border-top:1px solid var(--line);padding:10px 12px;font-size:13px}
.judge ul{margin:4px 0 6px 18px;padding:0}
.judge .k{font-weight:700;font-size:12px}
.judge .k.bad{color:var(--bad)} .judge .k.warn{color:var(--warn)}
.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--muted)}
.hidden{display:none!important}
@media (max-width:700px){.cols{grid-template-columns:1fr}.wrap{padding:18px 16px 60px}}
</style>
</head>
<body>
<div class="wrap">
  <h1 id="titulo">Haiku 5.5 no abdome total — o que foi testado</h1>
  <p class="sub">Bancada de 09/10/2026 · <span id="nCasos"></span> laudos reais de <span id="exameNome"></span> com versão final salva · rodada <span id="rodada"></span> · <b>arquivo local, contém ditados reais — não compartilhar</b></p>

  <div class="panel">
    <h2>O que foi feito</h2>
    <div class="steps">
      <div class="step"><b>1. Ditado real</b>O mesmo texto que o médico ditou no app, tirado do histórico (<code>reports</code>).</div>
      <div class="step"><b>Produção (o que saiu de verdade)</b><div class="flow">ditado → gpt-4.1-mini extrai achados → renderer monta o texto</div><span id="prodNote">Quando a extração falha, o laudo inteiro é escrito pelo gpt-5.4-mini.</span></div>
      <div class="step" id="stepR" style="display:none"><b>Produção hoje (R)</b><div class="flow">os achados que o gpt-4.1-mini extraiu na época → renderer de HOJE</div>O renderer mudou durante o mês; este é o comparador justo do cenário A, porque só o modelo muda.</div>
      <div class="step"><b>Cenário A — Haiku extrai</b><div class="flow">ditado → <b>Haiku 5.5</b> extrai achados → mesmo renderer de hoje</div>Troca mínima: só o modelo que lê o ditado.</div>
      <div class="step" id="stepB"><b>Cenário B — Haiku escreve tudo</b><div class="flow">ditado → <b>Haiku 5.5</b> escreve o laudo (prompt do Laudo Livre roteado)</div>Sem renderer; mesmo caminho que o Laudo Livre já usa.</div>
      <div class="step" id="stepL" style="display:none"><b>Cenário L — GPT-6 Luna extrai</b><div class="flow">ditado → <b>GPT-6 Luna</b> extrai achados → mesmo renderer de hoje</div>Igual ao A, trocando o Haiku pelo Luna (frases livres também no Luna). Rodou pelo Codex com a assinatura do ChatGPT.</div>
      <div class="step" id="stepB2" style="display:none"><b>Cenário B2 — B com o prompt corrigido</b><div class="flow">igual ao B, com a regra global reescrita: “compatível com” só na conclusão; corpo descritivo</div>Testa a correção sem alterar o prompt de produção.</div>
      <div class="step"><b>Comparação</b>Cada saída é comparada com o <b>laudo final que o médico salvou</b>. O Opus 5.5 avaliou todas as saídas juntas, sem saber de onde veio cada uma.</div>
    </div>
    <p id="provaFidelidade" style="margin:14px 0 0;font-size:14px;color:var(--muted)">Prova de fidelidade: reprocessando os achados que a produção extraiu, a bancada gerou <span id="replayInfo">o mesmo texto da produção</span>. O Haiku rodou pela assinatura (<code>claude -p</code>), sem API.</p>
  </div>

  <div class="panel">
    <h2>Placar</h2>
    <div class="scroll"><table id="placar"></table></div>
    <p style="margin:12px 0 0;font-size:13px;color:var(--muted)">Viés a favor da produção: o médico editou a partir do texto que a produção gerou; nos <span id="nSemEd"></span> casos sem edição, ela empata com o final por construção. Nota 10 = assinaria sem editar · 7 = edição de redação · 4 = edição clínica · 0 = perigoso.</p>
  </div>

  <div class="controls">
    <label><input type="checkbox" id="diff" checked> Marcar diferenças em relação ao final</label>
    <label><input type="checkbox" id="onlyEdited"> Só casos que o médico editou</label>
    <label><input type="checkbox" id="onlyProblems"> Só casos com nota ≤ 4</label>
    <select id="jump"><option value="">Ir para o caso…</option></select>
    <span class="legend"><span><ins>texto amarelo</ins> = não está no final</span><span><del>riscado</del> = está no final e faltou</span></span>
  </div>

  <div id="cases"></div>
</div>

<script id="data" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
document.getElementById('rodada').textContent = D.rodada;
const CATNOME = {ABDOMEN_TOTAL:'abdome total', OBSTETRICA:'obstetrícia', DOPPLER_OBSTETRICO:'Doppler obstétrico',
  MORFOLOGICO:'morfológico', MUSCULOESQUELETICO_V2:'musculoesquelético', PELVE_FEMININA:'pelve feminina', DOPPLER_CAROTIDAS:'Doppler de carótidas',
  MAMARIA:'mamas', TIREOIDE:'tireoide', CERVICAL:'cervical', VIAS_URINARIAS:'vias urinárias', PROSTATA_SUPRAPUBICA:'próstata',
  PAREDE_ABDOMINAL:'parede abdominal', ESCROTAL:'bolsa escrotal', PARTES_MOLES:'partes moles', ABDOMEN_SUPERIOR:'abdome superior'};
const cats = [...new Set(D.cases.map(r => r.categoria || 'ABDOMEN_TOTAL'))];
const ehObst = cats.every(c => ['OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO'].includes(c));
document.getElementById('nCasos').textContent = D.cases.length;
document.getElementById('exameNome').textContent = ehObst ? 'obstetrícia e Doppler obstétrico' : cats.map(c => CATNOME[c] || c).join(', ');
const examTag = r => r.categoria === 'DOPPLER_OBSTETRICO' ? 'Doppler isolado' : r.hint === 'DOPPLER_OBSTETRICO' ? 'obstétrico + Doppler' : r.categoria === 'OBSTETRICA' ? 'obstétrico' : '';
if (D.cases.some(r => r.B2)) document.getElementById("stepB2").style.display="";
if (!D.cases.some(r => r.B)) document.getElementById("stepB").style.display="none";
document.getElementById("nSemEd").textContent = D.cases.filter(r=>!r.editadoPeloMedico).length;
if (D.cases.some(r => r.juiz && r.juiz.R)) document.getElementById("stepR").style.display="";
(function(){ const rp = D.cases.filter(r => r.replay); const eq = rp.filter(r => r.replayIgualProducao).length;
  if (!rp.length) { document.getElementById('provaFidelidade').style.display = 'none'; return; }
  document.getElementById('replayInfo').textContent = `o mesmo texto da produção em ${eq} de ${rp.length} casos` + (D.replayNota ? ` (${D.replayNota})` : ''); })();
if (D.titulo) document.title = D.titulo;
if (ehObst) document.getElementById("titulo").textContent = "Haiku 5.5 na obstetrícia — o que foi testado";
if (D.cases.some(r => r.L)) { document.getElementById("stepL").style.display=""; document.getElementById("titulo").textContent="Haiku 5.5 e GPT-6 Luna no abdome total — o que foi testado"; }
if (D.titulo) document.getElementById("titulo").textContent = D.titulo;
if (D.passos) document.querySelector(".steps").innerHTML = D.passos
  .map((p) => `<div class="step"><b>${p.t}</b>${p.flow ? `<div class="flow">${p.flow}</div>` : ""}${p.s ?? ""}</div>`).join("");
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const KEYS = [
  {k:'gpt', t:'Produção', s:'o que o app gerou (gpt)'},
  {k:'R', t:'Produção hoje', s:'mesmos achados do gpt-4.1-mini, renderer de hoje'},
  {k:'A', t:'Cenário A', s:'Haiku no caminho atual (extrai + renderer; ou escreve, no writer dedicado/genérico)'},
  {k:'AR', t:'Cenário AR', s:'Haiku extrai + renderer (categoria que hoje sai por outro caminho)'},
  {k:'B', t:'Cenário B', s:'Haiku escreve o laudo inteiro'},
  {k:'L', t:'Cenário L', s:'GPT-6 Luna extrai + renderer atual'},
  {k:'B2', t:'Cenário B2', s:'Haiku escreve tudo + prompt “corpo descritivo”'},
  {k:'AS', t:'Cenário AS', s:'Sonnet 5.5 no caminho atual'},
  {k:'A2', t:'Cenário A2', s:'Haiku 5.5 no caminho atual, prompt revisado'},
  {k:'AS2', t:'Cenário AS2', s:'Sonnet 5.5 no caminho atual, prompt revisado'},
  {k:'A3', t:'Cenário A3', s:'Haiku 5.5 no caminho atual, prompt revisado (2ª iteração)'},
  {k:'AS3', t:'Cenário AS3', s:'Sonnet 5.5 no caminho atual, prompt revisado (2ª iteração)'},
  {k:'A4', t:'Cenário A4', s:'Haiku 5.5, prompt revisado (versão final)'},
  {k:'AS4', t:'Cenário AS4', s:'Sonnet 5.5, prompt revisado (versão final)'},
  {k:'BS', t:'Cenário BS', s:'Sonnet 5.5 escreve o laudo inteiro (writer genérico)'},
  {k:'B2S', t:'Cenário B2S', s:'Sonnet 5.5 escreve tudo + prompt “corpo descritivo”'},
  {k:'A4', t:'Cenário A4', s:'caminho atual, prompt revisado (3ª iteração)'},
  ...['B3','B4','B5','B6','B7','B8','B9'].map((k, i) => ({k, t:`Cenário ${k}`, s:`writer, prompt revisado (${i + 1}ª iteração)`})),
].map(x => ({...x, ...((D.rotulos || {})[x.k] || {})})).filter(x => x.k==='gpt' || (x.k==='R' ? D.cases.some(r => r.juiz && r.juiz.R) : D.cases.some(r => r[x.k])));
const textOf = (r,k) => {
  if (k==='gpt') return r.gpt||'';
  if (k==='R') return r.replay?.text || '(sem replay)';
  const x = r[k]?.[0];
  if (k==='A' && x?.error && (r.B2?.[0]?.text || r.B?.[0]?.text)) return (r.B2?.[0]?.text || r.B[0].text);
  return x?.text || `(falhou: ${x?.error})`;
};
const fallbackA = r => r.A?.[0]?.error && (r.B2?.[0]?.text || r.B?.[0]?.text);
const tone = n => n>=8 ? 'good' : n>=5 ? 'warn' : 'bad';

// diff por palavra (LCS), preservando espaços/quebras
function tokens(s){ return s.match(/\s+|[^\s]+/g) || []; }
function diff(a, b){ // a = final (referência), b = candidato
  const A = tokens(a), B = tokens(b);
  const n=A.length, m=B.length;
  const dp = Array.from({length:n+1}, () => new Uint16Array(m+1));
  for (let i=n-1;i>=0;i--) for (let j=m-1;j>=0;j--)
    dp[i][j] = A[i]===B[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]);
  let i=0,j=0,out='',lastDel=false;
  const delTok = t => { if (/^\s+$/.test(t)) { if (lastDel) out+='<del> </del>'; } else { out+='<del>'+esc(t)+'</del>'; lastDel=true; } };
  const keep = t => { out+=esc(t); lastDel=false; };
  const insTok = t => { if (/^\s+$/.test(t)) out+=esc(t); else out+='<ins>'+esc(t)+'</ins>'; lastDel=false; };
  while(i<n && j<m){
    if (A[i]===B[j]){ keep(B[j]); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]){ delTok(A[i]); i++; }
    else { insTok(B[j]); j++; }
  }
  while(i<n){ delTok(A[i]); i++; }
  while(j<m){ insTok(B[j]); j++; }
  return out;
}

// placar
(function(){
  const avg = xs => xs.length ? (xs.reduce((a,b)=>a+b,0)/xs.length) : NaN;
  const rows = KEYS.map(({k,t,s}) => {
    const all = D.cases.map(r=>r.juiz?.[k]).filter(Boolean);
    const ed = D.cases.filter(r=>r.editadoPeloMedico).map(r=>r.juiz?.[k]).filter(Boolean);
    const sum = f => all.reduce((a,x)=>a+f(x),0);
    return `<tr><td><b>${t}</b><br><span style="color:var(--muted);font-size:12.5px">${s}</span></td>
      <td class="num"><span class="tag ${tone(avg(all.map(x=>x.nota)))}">${avg(all.map(x=>x.nota)).toFixed(2)}</span></td>
      <td class="num"><span class="tag ${tone(avg(ed.map(x=>x.nota)))}">${avg(ed.map(x=>x.nota)).toFixed(2)}</span></td>
      <td class="num">${all.filter(x=>x.nota<=4).length}</td>
      <td class="num">${sum(x=>x.omissoes.length)}</td><td class="num">${sum(x=>x.invencoes.length)}</td>
      <td class="num">${all.filter(x=>x.impressao_ok).length}/${all.length}</td></tr>`;
  }).join('');
  document.getElementById('placar').innerHTML =
    `<tr><th></th><th>Nota média (${D.cases.length})</th><th>Nota média — editados (${D.cases.filter(r=>r.editadoPeloMedico).length})</th><th>Casos nota ≤ 4</th><th>Omissões</th><th>Invenções</th><th>Impressão igual ao final</th></tr>${rows}`;
})();

function judgeHtml(j){
  if(!j) return '';
  const list = (arr, label, cls) => arr.length ? `<div class="k ${cls}">${label}</div><ul>${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : '';
  return `<div class="judge">${list(j.omissoes,'Omissões','bad')}${list(j.invencoes,'Invenções','bad')}${list(j.erros_medida_lateralidade,'Medida / lateralidade','bad')}
    <div class="k">Comentário do juiz</div><div>${esc(j.comentario)}</div></div>`;
}

function render(){
  const showDiff = document.getElementById('diff').checked;
  const onlyEd = document.getElementById('onlyEdited').checked;
  const onlyProb = document.getElementById('onlyProblems').checked;
  const html = D.cases.map(r => {
    const worst = Math.min(...KEYS.map(({k}) => r.juiz?.[k]?.nota ?? 10));
    const hide = (onlyEd && !r.editadoPeloMedico) || (onlyProb && worst > 4);
    const cols = [
      `<div class="col"><div class="col-head"><div class="t">Laudo final do médico</div><div class="s">referência (salvo no histórico)</div></div><div class="laudo">${esc(r.final)}</div></div>`,
      ...KEYS.map(({k,t,s}) => {
        const j = r.juiz?.[k];
        const txt = textOf(r,k);
        const body = showDiff ? diff(r.final||'', txt) : esc(txt);
        const sub = k==='gpt' ? (r.prodPath==='renderer' ? 'gpt-4.1-mini extraiu + renderer (código da época)' : 'writer gpt-5.4-mini (renderer falhou)') : (k==='A' && fallbackA(r)) ? 'renderer recusou a extração → caiu no Haiku escritor (= B2)' : s;
        return `<div class="col"><div class="col-head"><div class="t">${t}</div><div class="s">${esc(sub)}</div>
          ${j ? `<div class="score"><span class="tag ${tone(j.nota)}">nota ${j.nota}</span><span class="tag">estilo ${j.estilo}</span><span class="tag ${j.impressao_ok?'good':'bad'}">impressão ${j.impressao_ok?'igual':'diferente'}</span></div>`:''}
          </div><div class="laudo">${body}</div>${judgeHtml(j)}</div>`;
      })
    ].join('');
    const nota = D.notas[r.id8];
    return `<section class="case ${hide?'hidden':''}" id="c-${r.id8}">
      <div class="case-head"><h3>${r.id8}</h3><span class="tag">${r.data.split('-').reverse().join('/')}</span>${examTag(r) ? `<span class="tag">${examTag(r)}</span>` : ''}
        <span class="tag">${r.prodPath==='renderer'?'produção: renderer':'produção: writer'}</span>
        <span class="tag ${r.editadoPeloMedico?'warn':'good'}">${r.editadoPeloMedico?'médico editou':'assinado sem edição'}</span>
        ${KEYS.map(({k,t})=> r.juiz?.[k] ? `<span class="tag ${tone(r.juiz[k].nota)}">${t}: ${r.juiz[k].nota}</span>`:'').join('')}
      </div>
      <div class="case-body">
        <div class="label">Ditado do médico</div><div class="dictation">${esc(r.ditado)}</div>
        ${nota ? `<div class="nota"><b>Conferido por Claude:</b> ${esc(nota)}</div>` : ''}
        <div class="cols" style="--n:${KEYS.length+1}">${cols}</div>
      </div></section>`;
  }).join('');
  document.getElementById('cases').innerHTML = html;
}
const jump = document.getElementById('jump');
D.cases.forEach(r => { const o=document.createElement('option'); o.value=r.id8; o.textContent=`${r.id8} · ${r.data.split('-').reverse().join('/')}`; jump.appendChild(o); });
jump.addEventListener('change', e => { const el=document.getElementById('c-'+e.target.value); if(el) el.scrollIntoView({behavior:'smooth'}); });
['diff','onlyEdited','onlyProblems'].forEach(id => document.getElementById(id).addEventListener('change', render));
render();
</script>
</body>
</html>
"""

out = run / "relatorio.html"
out.write_text(html.replace("__DATA__", payload))
print(out)
