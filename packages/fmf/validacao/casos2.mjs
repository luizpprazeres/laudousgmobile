import { riscoPreEclampsia, umEmN } from '../src/risco.mjs';
// PAM = (PAS + 2*PAD)/3.  Escolhendo PAS = m+22 e PAD = m-11 dá exatamente m.
const bp = m => `${Math.round(m+22)}/${Math.round(m-11)}`;
const B={idade:30,peso:69,altura:164,etnia:'branca',paridade:'nulipara',intervaloAnos:null,
  igPartoAnterior:null,zEscorePesoAnterior:null,histFamiliarPE:false,fiv:false,
  hipertensaoCronica:false,diabetes:false,lesSaf:false,fumante:false,gaDias:84};
const C=[
 ['1','Referência: tudo normal', B, {pamMmHg:88,utaPiMedio:1.73}],
 ['2','Referência SÓ história (sem marcadores)', B, {}],
 ['3','O seu caso: 36a, 85kg, IP baixo', {...B,idade:36,peso:85}, {pamMmHg:85,utaPiMedio:1.08}],
 ['4','LIMÍTROFE perto de 1:100', {...B,idade:38,peso:88}, {pamMmHg:95,utaPiMedio:2.10}],
 ['5','Hipertensão crônica', {...B,hipertensaoCronica:true}, {pamMmHg:95,utaPiMedio:1.73}],
 ['6','⭐ 120kg + DM + hist.fam + HAS', {...B,peso:120,diabetes:true,histFamiliarPE:true,hipertensaoCronica:true}, {}],
 ['6b','⭐ MESMA mulher, SEM HAS', {...B,peso:120,diabetes:true,histFamiliarPE:true}, {}],
 ['7','PE anterior, parto em 32 sem', {...B,paridade:'multipara-com-pe',igPartoAnterior:32,intervaloAnos:3,zEscorePesoAnterior:-1.5}, {pamMmHg:90,utaPiMedio:1.80}],
 ['8','Multípara sem PE (parto 40s, 3 anos)', {...B,paridade:'multipara-sem-pe',igPartoAnterior:40,intervaloAnos:3}, {pamMmHg:85,utaPiMedio:1.60}],
 ['9','Afro-caribenha, 40 anos', {...B,etnia:'afro',idade:40}, {pamMmHg:92,utaPiMedio:1.90}],
 ['10','LES/SAF', {...B,lesSaf:true}, {pamMmHg:90,utaPiMedio:1.75}],
 ['11','FIV + diabetes', {...B,fiv:true,diabetes:true}, {pamMmHg:90,utaPiMedio:1.70}],
 ['12','IP muito alto (4,5)', B, {pamMmHg:88,utaPiMedio:4.5}],
 ['13','PAM muito baixa (62)', B, {pamMmHg:62,utaPiMedio:1.20}],
 ['14','Borda: 11s0d', {...B,gaDias:77}, {pamMmHg:88,utaPiMedio:1.85}],
 ['15','Borda: 13s6d', {...B,gaDias:97}, {pamMmHg:88,utaPiMedio:1.55}],
];
const et={branca:'White',afro:'Black'};
const pa={nulipara:'Nulliparous','multipara-sem-pe':'Parous — no previous PE','multipara-com-pe':'Parous — previous PE'};
console.log('| # | Caso | IG | Idade | Peso/Alt | Etnia | Paridade | Marcar também | PA (as 4 medidas) | IP dir / esq | NOSSO | FMF |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for(const [n,lbl,p,med] of C){
  const r=riscoPreEclampsia(p,med,[37]);
  const extras=[p.hipertensaoCronica&&'Chronic hypertension',p.diabetes&&'Diabetes',
    p.lesSaf&&'SLE/APS',p.fiv&&'IVF',p.histFamiliarPE&&'Family history of PE',
    p.igPartoAnterior&&`parto ant.: ${p.igPartoAnterior} sem, há ${p.intervaloAnos} anos`].filter(Boolean).join('; ')||'—';
  const sem=Math.floor(p.gaDias/7), d=p.gaDias%7;
  const pa4 = med.pamMmHg? `${bp(med.pamMmHg)} nas 4` : '— (deixar vazio)';
  const ip  = med.utaPiMedio? `${med.utaPiMedio.toFixed(2)} / ${med.utaPiMedio.toFixed(2)}` : '— (deixar vazio)';
  console.log(`| **${n}** | ${lbl} | ${sem}s${d}d | ${p.idade} | ${p.peso}kg / ${p.altura}cm | ${et[p.etnia]} | ${pa[p.paridade]} | ${extras} | ${pa4} | ${ip} | **1 em ${umEmN(r.riscos[37])}** |  |`);
}
