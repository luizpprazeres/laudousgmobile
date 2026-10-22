/** Limite de tentativas por IP, só em memória (o IP nunca é gravado). */
const tentativas = new Map<string, number[]>();

export function permitirTentativa(chave: string, max = 5, janelaMs = 10 * 60_000, agora = Date.now()): boolean {
  const recentes = (tentativas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= max) {
    tentativas.set(chave, recentes);
    return false;
  }
  recentes.push(agora);
  tentativas.set(chave, recentes);
  return true;
}

export function ipDaRequisicao(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
