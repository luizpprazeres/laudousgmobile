import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { criarRotasLanding } from "../src/lib/landing/rotas";
import { criarLimiteLanding } from "../src/lib/landing/limite";
import { origemSrc, type ContagemLanding } from "../src/lib/landing/validar";
import { rotaSemSessao } from "../src/lib/auth/acesso";
const origem="https://app.laudousg.com.br";
function setup() {
  const rows:ContagemLanding[]=[];const tasks:(()=>Promise<void>)[]=[];
  const d={gravar:async(c:ContagemLanding)=>{rows.push(c);},agendar:(t:()=>Promise<void>)=>{tasks.push(t);},origem:()=>origem,agora:()=>new Date("2026-10-22T02:59:59Z"),permitir:()=>true};
  return {rows,tasks,d,rotas:criarRotasLanding(d),flush:async()=>{for(const t of tasks)await t();}};
}
function beacon(body:unknown,headers:Record<string,string>={}){return new Request(origem+"/admin/api/collect",{method:"POST",headers:{origin:origem,"content-type":"text/plain;charset=UTF-8","user-agent":"iPhone Safari",...headers},body:JSON.stringify(body)});}
test("beacon text/plain: stores only aggregate whitelist, Sao Paulo day, never IP/UA/cookie/identifier",async()=>{
 const s=setup();const r=await s.rotas.collect(beacon({e:"view",p:"/",ref:"https://google.com/search?private=identifier",us:"google",uc:"campanha-1",user_id:"PRIVATE"},{"x-forwarded-for":"203.0.113.20",cookie:"admin-sb=PRIVATE"}));
 assert.equal(r.status,204);assert.equal(await r.text(),"");assert.equal(s.rows.length,0);await s.flush();
 assert.deepEqual(s.rows,[{day:"2026-10-21",path:"/",event:"view",src:"",ref_host:"google.com",utm_source:"google",utm_campaign:"campanha-1",device:"iphone"}]);
 assert.doesNotMatch(JSON.stringify(s.rows),/PRIVATE|203\.0\.113|Safari|private/);
});
test("invalid paths/events/large beacon and bots are ignored, always 204",async()=>{
 for(const b of [{e:"bad",p:"/"},{e:"view",p:"/patients/123"},{e:"view",p:"/?patient=123"},{e:"view",p:"/",x:"x".repeat(1025)}]){
  const s=setup();assert.equal((await s.rotas.collect(beacon(b))).status,204);await s.flush();assert.equal(s.rows.length,0);
 }
 const s=setup();await s.rotas.collect(beacon({e:"view",p:"/"},{"user-agent":"Googlebot"}));await s.flush();assert.equal(s.rows.length,0);
});
test("origin must match public origin, referer fallback only without conflicting Origin",async()=>{
 const s=setup();await s.rotas.collect(beacon({e:"view",p:"/"},{origin:"https://evil.example",referer:origem+"/"}));
 const noOrigin=new Request(origem+"/admin/api/collect",{method:"POST",headers:{referer:origem+"/"},body:JSON.stringify({e:"qr_open",p:"/"})});
 await s.rotas.collect(noOrigin);await s.flush();assert.equal(s.rows.length,1);assert.equal(s.rows[0]?.event,"qr_open");
});
test("normalizes invalid UTM/ref, device inferred on server (including iPad desktop UA)",async()=>{
 const s=setup();await s.rotas.collect(beacon({e:"view",p:"/privacidade/",us:"bad space",uc:"x".repeat(41),ref:"127.0.0.1",device:"iphone"},{"user-agent":"Mozilla/5.0 Macintosh Mobile Safari"}));await s.flush();
 assert.equal(s.rows[0]?.device,"ipad");assert.equal(s.rows[0]?.path,"/privacidade");assert.equal(s.rows[0]?.ref_host,"");assert.equal(s.rows[0]?.utm_source,"");assert.equal(s.rows[0]?.utm_campaign,"");
});
test("baixar redirects even with DB failure; src whitelist, campaign PT optional",async()=>{
 for(const src of ["nav","hero","precos","final","dialogo","qr","INVALID/<id>"]){
  const tasks:(()=>Promise<void>)[]=[];const rows:ContagemLanding[]=[];
  const r=criarRotasLanding({gravar:async c=>{rows.push(c);throw Error("down");},agendar:t=>tasks.push(t),pt:()=>"123456"});
  const res=await r.baixar(new Request(origem+"/baixar?src="+encodeURIComponent(src),{headers:{"user-agent":"Android"}}));
  assert.equal(res.status,302);const u=new URL(res.headers.get("location")!);assert.equal(u.origin,"https://apps.apple.com");assert.equal(u.searchParams.get("ct"),"landing-"+origemSrc(src));assert.equal(u.searchParams.get("pt"),"123456");assert.equal(u.searchParams.get("mt"),"8");
  for(const t of tasks)await t();assert.equal(rows[0]?.src,origemSrc(src));
 }
 const noPt=await criarRotasLanding({pt:()=>undefined,agendar:()=>{}}).baixar(new Request(origem+"/baixar"));assert.equal(new URL(noPt.headers.get("location")!).searchParams.has("pt"),false);
});
test("IP rate limit is bounded memory only and expires",()=>{
 const allow=criarLimiteLanding(2,1000);const req=beacon({}, {"x-real-ip":"203.0.113.5"});assert.equal(allow(req,0),true);assert.equal(allow(req,1),true);assert.equal(allow(req,2),false);assert.equal(allow(req,1000),true);
});
test("public ingestion bypasses all cookie/session code before config",()=>{
 for(const p of ["/api/collect","/api/baixar","/api/cron/apple"])assert.equal(rotaSemSessao(p),true);
 for(const p of ["/","/api/collect/secret","/api/cron/apple-extra"])assert.equal(rotaSemSessao(p),false);
 const middleware=readFileSync(new URL("../src/middleware.ts",import.meta.url),"utf8");assert.ok(middleware.indexOf("if (rotaSemSessao")<middleware.indexOf("const cfg = configServidor()"));
 for(const file of ["rotas","servidor"]){const txt=readFileSync(new URL(`../src/lib/landing/${file}.ts`,import.meta.url),"utf8");assert.doesNotMatch(txt,/clienteSessao|\.cookies|verificarSessao|getUser\(/);}
});
