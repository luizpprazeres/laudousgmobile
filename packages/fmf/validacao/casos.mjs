import { riscoPreEclampsia, umEmN } from '../src/risco.mjs';
const B={idade:30,peso:69,altura:164,etnia:'branca',paridade:'nulipara',intervaloAnos:null,
  igPartoAnterior:null,zEscorePesoAnterior:null,histFamiliarPE:false,fiv:false,
  hipertensaoCronica:false,diabetes:false,lesSaf:false,fumante:false,gaDias:84};
const C=[
 ['1  Referência: tudo normal, nulípara', B, {pamMmHg:88,utaPiMedio:1.73}],
 ['2  Referência SEM marcadores (só história)', B, {}],
 ['3  Seu caso: 36a, 85kg, IP baixo', {...B,idade:36,peso:85}, {pamMmHg:85,utaPiMedio:1.08}],
 ['4  LIMÍTROFE perto de 1:100', {...B,idade:38,peso:88}, {pamMmHg:95,utaPiMedio:2.10}],
 ['5  Hipertensão crônica, resto normal', {...B,hipertensaoCronica:true}, {pamMmHg:95,utaPiMedio:1.73}],
 ['6  SALVAGUARDA: 120kg + DM + hist.fam + HAS', {...B,peso:120,diabetes:true,histFamiliarPE:true,hipertensaoCronica:true}, {}],
 ['6b MESMA mulher SEM hipertensão crônica', {...B,peso:120,diabetes:true,histFamiliarPE:true}, {}],
 ['7  PE anterior com parto em 32 sem', {...B,paridade:'multipara-com-pe',igPartoAnterior:32,intervaloAnos:3,zEscorePesoAnterior:-1.5}, {pamMmHg:90,utaPiMedio:1.80}],
 ['8  Multípara sem PE, parto 40 sem há 3 anos', {...B,paridade:'multipara-sem-pe',igPartoAnterior:40,intervaloAnos:3}, {pamMmHg:85,utaPiMedio:1.60}],
 ['9  Afro-caribenha, 40 anos', {...B,etnia:'afro',idade:40}, {pamMmHg:92,utaPiMedio:1.90}],
 ['10 LES/SAF', {...B,lesSaf:true}, {pamMmHg:90,utaPiMedio:1.75}],
 ['11 FIV + diabetes', {...B,fiv:true,diabetes:true}, {pamMmHg:90,utaPiMedio:1.70}],
 ['12 MoM extremo (trunca): IP 4,5', B, {pamMmHg:88,utaPiMedio:4.5}],
 ['13 MoM extremo baixo: PAM 62', B, {pamMmHg:62,utaPiMedio:1.20}],
 ['14 Borda da janela: 11s0d (77 dias)', {...B,gaDias:77}, {pamMmHg:88,utaPiMedio:1.85}],
 ['15 Borda da janela: 13s6d (97 dias)', {...B,gaDias:97}, {pamMmHg:88,utaPiMedio:1.55}],
];
const et={branca:'White',afro:'Black','sul-asiatica':'South Asian','leste-asiatica':'East Asian'};
const pa={nulipara:'Nulliparous','multipara-sem-pe':'Parous, no previous PE','multipara-com-pe':'Parous, previous PE'};
console.log('| # | Caso | IG | Idade | Peso | Altura | Etnia | Paridade | Outros | PAM | IP ut. | NOSSO <37s |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for(const [lbl,p,med] of C){
  let r; try{ r=riscoPreEclampsia(p,med,[37]); }catch(e){ console.log(`| ${lbl} | ERRO: ${e.message} |`); continue; }
  const outros=[p.hipertensaoCronica&&'HAS crônica',p.diabetes&&'diabetes',p.lesSaf&&'LES/SAF',
    p.fiv&&'FIV',p.histFamiliarPE&&'hist.fam PE',
    p.igPartoAnterior&&`parto ant. ${p.igPartoAnterior}s, ${p.intervaloAnos}a`].filter(Boolean).join('; ')||'—';
  const sem=Math.floor(p.gaDias/7), d=p.gaDias%7;
  console.log(`| ${lbl.slice(0,3).trim()} | ${lbl.slice(3)} | ${sem}s${d}d | ${p.idade} | ${p.peso} | ${p.altura} | ${et[p.etnia]} | ${pa[p.paridade]} | ${outros} | ${med.pamMmHg??'—'} | ${med.utaPiMedio??'—'} | **1 em ${umEmN(r.riscos[37])}** |`);
}
