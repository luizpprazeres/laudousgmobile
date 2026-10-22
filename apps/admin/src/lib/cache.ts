/**
 * Cache em memória do processo, com TTL e deduplicação de chamadas simultâneas.
 * Usado para a Apple (TestFlight: 10 min) e para o snapshot do banco (1 min).
 * Na Vercel cada instância tem o seu; para os relatórios diários da Apple, o desenho final
 * guarda em tabelas `apple_*_daily` (depende de G1 + G3).
 */
type Entrada<T> = { ate: number; valor?: T; promessa?: Promise<T> };
const mapa = new Map<string, Entrada<unknown>>();

export async function emCache<T>(chave: string, ttlMs: number, carregar: () => Promise<T>, agora = Date.now()): Promise<T> {
  const e = mapa.get(chave) as Entrada<T> | undefined;
  if (e?.valor !== undefined && e.ate > agora) return e.valor;
  if (e?.promessa) return e.promessa;
  const promessa = carregar()
    .then((valor) => {
      mapa.set(chave, { ate: Date.now() + ttlMs, valor });
      return valor;
    })
    .catch((err) => {
      mapa.delete(chave);
      throw err;
    });
  mapa.set(chave, { ate: 0, promessa });
  return promessa;
}

export function limparCache(prefixo?: string): void {
  for (const k of mapa.keys()) if (!prefixo || k.startsWith(prefixo)) mapa.delete(k);
}
