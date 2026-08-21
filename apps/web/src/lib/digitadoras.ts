/**
 * AS DIGITADORAS — quem transcreveu o laudo.
 *
 * As iniciais saem discretamente no fim do documento ("/ha"). Antes eram um
 * texto solto: um campo em Preferências, um único valor no `localStorage`, e um
 * botão "/ha · iniciais" ocupando espaço na barra do preview. Quem trabalha com
 * mais de uma auxiliar tinha de reeditar o campo a cada troca.
 *
 * Agora são uma LISTA cadastrada, e a escolha vive onde a decisão acontece — na
 * barra do topo, junto da categoria —, não no rodapé do texto pronto.
 *
 * Guardado no navegador de propósito: é preferência de estação de trabalho, não
 * dado clínico, e muda conforme quem está na sala. Quando as preferências
 * subirem para o `profiles` do Supabase, este módulo é o único ponto a trocar.
 */

const CHAVE_LISTA = "laudousg.digitadoras";
/** A escolhida agora. Continua sendo `laudousg.initials` — ver `migrar()`. */
const CHAVE_ATUAL = "laudousg.initials";

export type Digitadora = {
  /** Como ela aparece no seletor. */
  nome: string;
  /** O que sai no laudo, minúsculo e sem acento. */
  iniciais: string;
};

/** Minúsculo, só letras, no máximo quatro — é o que o laudo aceita. */
export function normalizarIniciais(bruto: string): string {
  return bruto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 4);
}

/** As iniciais que um nome sugere: "Helena Alves" → "ha". */
export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const letras = partes.length === 1 ? partes[0]!.slice(0, 2) : partes.map((p) => p[0]!).join("");
  return normalizarIniciais(letras);
}

function seguro<T>(fn: () => T, padrao: T): T {
  try {
    return typeof window === "undefined" ? padrao : fn();
  } catch {
    /** localStorage lança em modo privado de alguns navegadores. */
    return padrao;
  }
}

/**
 * Quem já usava a versão de campo único não perde a configuração.
 *
 * Havia só `laudousg.initials` com algo como "ha". Vira uma digitadora sem
 * nome, que o médico renomeia quando quiser. Perder a configuração de alguém
 * numa mudança de tela é o tipo de detalhe que faz o usuário desconfiar do
 * resto.
 */
function migrar(): Digitadora[] {
  const antigo = normalizarIniciais(window.localStorage.getItem(CHAVE_ATUAL) ?? "");
  if (!antigo) return [];
  const lista: Digitadora[] = [{ nome: antigo.toUpperCase(), iniciais: antigo }];
  window.localStorage.setItem(CHAVE_LISTA, JSON.stringify(lista));
  return lista;
}

export function lerDigitadoras(): Digitadora[] {
  return seguro(() => {
    const cru = window.localStorage.getItem(CHAVE_LISTA);
    if (!cru) return migrar();
    const dados: unknown = JSON.parse(cru);
    if (!Array.isArray(dados)) return [];
    return dados
      .filter((d): d is Digitadora => !!d && typeof d === "object" && "iniciais" in d)
      .map((d) => ({ nome: String(d.nome ?? "").trim(), iniciais: normalizarIniciais(String(d.iniciais)) }))
      .filter((d) => d.iniciais !== "");
  }, []);
}

export function gravarDigitadoras(lista: Digitadora[]): void {
  seguro(() => window.localStorage.setItem(CHAVE_LISTA, JSON.stringify(lista)), undefined);
}

/** As iniciais escolhidas agora, ou `""` quando nenhuma — e aí o laudo sai sem. */
export function lerAtual(): string {
  return seguro(() => normalizarIniciais(window.localStorage.getItem(CHAVE_ATUAL) ?? ""), "");
}

export function gravarAtual(iniciais: string): void {
  seguro(() => window.localStorage.setItem(CHAVE_ATUAL, normalizarIniciais(iniciais)), undefined);
}
