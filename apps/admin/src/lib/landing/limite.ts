/** Bounded, ephemeral per-IP counter. No persistence/logging, cookies or stable IDs. */
export function criarLimiteLanding(max = 120, janela = 60_000) {
  const memoria = new Map<string, { inicio: number; n: number }>();
  return (req: Request, agora = Date.now()): boolean => {
    for (const [k,v] of memoria) if (agora - v.inicio >= janela) memoria.delete(k);
    const ip = (req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").slice(0,64);
    const atual = memoria.get(ip);
    if (atual) { atual.n++; return atual.n <= max; }
    if (memoria.size >= 5000) return false;
    memoria.set(ip, { inicio: agora, n: 1 }); return true;
  };
}
