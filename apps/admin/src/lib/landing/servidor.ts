import { createClient } from "@supabase/supabase-js";
import type { ContagemLanding } from "./validar";
/** Only the whitelist reaches the RPC, never headers, cookies, UA or IP. */
export async function incrementarLanding(c: ContagemLanding): Promise<void> {
  try {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const sb = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const { error } = await sb.rpc("landing_increment", {
      p_day:c.day,p_path:c.path,p_event:c.event,p_src:c.src,p_ref_host:c.ref_host,
      p_utm_source:c.utm_source,p_utm_campaign:c.utm_campaign,p_device:c.device,
    }).abortSignal(AbortSignal.timeout(3000));
    if (error) console.warn("[landing] increment_failed");
  } catch { console.warn("[landing] increment_failed"); }
}
