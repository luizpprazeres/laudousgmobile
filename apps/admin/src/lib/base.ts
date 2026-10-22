/** basePath do painel (igual ao next.config.ts). Formulários HTML e redirects de Route Handler precisam dele à mão. */
export const BASE = "/admin";
export const comBase = (caminho: string) => `${BASE}${caminho === "/" ? "" : caminho}` || "/";
