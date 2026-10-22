import { after } from "next/server";
import { diaBRT } from "../data/agregar";
import { incrementarLanding } from "./servidor";
import { criarLimiteLanding } from "./limite";
import { aparelho, bot, lerBeacon, normalizarBeacon, origemPermitida, origemSrc, type ContagemLanding } from "./validar";
const limitar = criarLimiteLanding();
export interface DependenciasLanding {
  gravar: (c: ContagemLanding) => Promise<void>;
  agendar: (tarefa: () => Promise<void>) => void;
  permitir: (req: Request) => boolean;
  agora: () => Date;
  origem: () => string | undefined;
  pt: () => string | undefined;
}
const padrao: DependenciasLanding = {
  gravar: incrementarLanding, permitir: limitar, agora: () => new Date(), origem: () => process.env.ADMIN_PUBLIC_ORIGIN, pt: () => process.env.APPLE_CAMPAIGN_PT,
  agendar: tarefa => { try { after(tarefa); } catch { void tarefa(); } },
};
export function criarRotasLanding(deps: Partial<DependenciasLanding> = {}) {
  const d = { ...padrao, ...deps };
  const agendar = (c: ContagemLanding) => { try { d.agendar(async () => { try { await d.gravar(c); } catch { console.warn("[landing] increment_failed"); } }); } catch { /* Redirect/beacon must always succeed. */ } };
  return {
    async collect(req: Request): Promise<Response> {
      const resposta = () => new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
      try {
        const ua = req.headers.get("user-agent") ?? "";
        if (!origemPermitida(req,d.origem()) || bot(ua) || !d.permitir(req)) return resposta();
        const c = normalizarBeacon(await lerBeacon(req));
        if (c) agendar({ ...c, src:"",device:aparelho(ua),day:diaBRT(d.agora()) });
      } catch { /* Best effort, including malformed bodies. */ }
      return resposta();
    },
    async baixar(req: Request): Promise<Response> {
      const src = origemSrc(new URL(req.url).searchParams.get("src"));
      const target = new URL("https://apps.apple.com/br/app/laudousg/id6770609540");
      target.searchParams.set("ct",`landing-${src}`);target.searchParams.set("mt","8");
      const pt = d.pt(); if (pt && /^[0-9]{1,32}$/.test(pt)) target.searchParams.set("pt",pt);
      try {
        const ua = req.headers.get("user-agent") ?? "";
        if (!bot(ua) && d.permitir(req)) agendar({day:diaBRT(d.agora()),path:"/baixar",event:"baixar",src,ref_host:"",utm_source:"",utm_campaign:"",device:aparelho(ua)});
      } catch { /* Always redirect, even without database/config. */ }
      return new Response(null,{status:302,headers:{Location:target.toString(),"Cache-Control":"no-store"}});
    },
  };
}
