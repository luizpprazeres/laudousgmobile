import { timingSafeEqual } from "node:crypto";

/**
 * Quem pode ler o catálogo — autenticação de SISTEMA, não de usuário.
 *
 * O catálogo não tem dado de paciente e não depende de identidade: é função
 * pura de (categoria, estilo). Mesmo assim não é público (Codex, 19/08) — ele é
 * a redação clínica proprietária da casa, inteira, e uma rota aberta convida a
 * raspagem em massa.
 *
 * O consumidor é UM e é confiável: o backend da web. Ele autentica o médico na
 * conta dele e chama esta API com um segredo de servidor. O navegador nunca vê
 * a chave. mTLS foi descartado — acrescenta operação sem ganho proporcional
 * para um consumidor só.
 *
 * FAIL-CLOSED: sem `CATALOG_SERVICE_TOKEN` configurado, ninguém entra. Uma rota
 * de leitura que se abre sozinha quando falta configuração é pior que uma rota
 * que não responde.
 */
export type Autorizacao = { ok: true } | { ok: false; status: 401 | 503; erro: string };

export function autorizarServico(req: Request): Autorizacao {
  const esperado = process.env.CATALOG_SERVICE_TOKEN;
  if (!esperado || esperado.length < 24) {
    return {
      ok: false,
      status: 503,
      erro: "catálogo indisponível: serviço não configurado",
    };
  }

  const header = req.headers.get("authorization") ?? "";
  const recebido = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (recebido === "") return { ok: false, status: 401, erro: "não autorizado" };

  /**
   * Comparação em tempo constante. `===` vaza o comprimento do prefixo comum e
   * permite descobrir o segredo byte a byte — o mesmo cuidado que o webhook do
   * GitHub já toma aqui.
   */
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return { ok: false, status: 401, erro: "não autorizado" };
  if (!timingSafeEqual(a, b)) return { ok: false, status: 401, erro: "não autorizado" };

  return { ok: true };
}
