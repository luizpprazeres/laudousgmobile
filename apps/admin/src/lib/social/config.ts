/**
 * Configuração da conexão com o Instagram (F2). Só servidor. Faltou qualquer peça → null, e aí a
 * seção mostra "Conexão indisponível" e as rotas de conexão/publicação respondem 404.
 */
import { comBase } from "../base";
import { lerChaveSocial } from "./cifra";

export interface ConfigInstagram {
  appId: string;
  appSecret: string;
  /** SOCIAL_TOKEN_KEY decodificada (32 bytes). */
  chave: Buffer;
  /** Precisa ser idêntica à cadastrada no app da Meta. */
  redirectUri: string;
}

export const CAMINHO_CALLBACK = "/api/social/callback";

export function configInstagram(origemPublica: string | null, env: Record<string, string | undefined> = process.env): ConfigInstagram | null {
  const appId = env.INSTAGRAM_APP_ID?.trim();
  const appSecret = env.INSTAGRAM_APP_SECRET?.trim();
  const chave = lerChaveSocial(env.SOCIAL_TOKEN_KEY);
  if (!appId || !/^[0-9]{5,32}$/.test(appId) || !appSecret || !chave || !origemPublica) return null;
  return { appId, appSecret, chave, redirectUri: `${origemPublica}${comBase(CAMINHO_CALLBACK)}` };
}
