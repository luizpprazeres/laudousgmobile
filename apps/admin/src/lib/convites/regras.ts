/**
 * Convites (story cortesias): validação do formulário, senha provisória, texto do convite e situação
 * de cada cortesia. Funções puras — o banco e o Supabase Auth ficam em `servidor.ts`.
 */

export const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"] as const;
export const DIAS_PADRAO = 30;
export const DIAS_MAX = 365;
export const LINK_DOWNLOAD = "https://app.laudousg.com.br/baixar?src=convite";

export interface DadosConvite {
  nome: string;
  email: string;
  crm: string | null;
  uf: string | null;
  dias: number;
}

export type ErroConvite = "nome" | "email" | "crm" | "uf" | "crm_e_uf_juntos" | "dias";

export const MENSAGEM_ERRO_CONVITE: Record<ErroConvite | "pedido" | "banco" | "conta", string> = {
  nome: "Informe o nome (até 120 caracteres).",
  email: "E-mail inválido.",
  crm: "O CRM é só o número, de 4 a 10 dígitos.",
  uf: "UF inválida.",
  crm_e_uf_juntos: "CRM e UF vão juntos: preencha os dois ou nenhum.",
  dias: `Dias entre 1 e ${DIAS_MAX}.`,
  pedido: "Pedido inválido.",
  banco: "Não consegui liberar o Pro (banco indisponível ou migração não aplicada). Nada foi criado.",
  conta: "O Supabase não criou a conta. Confira o e-mail e tente de novo.",
};

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Mesmas regras do PATCH /api/me/profile: CRM só dígitos (4–10), UF do Brasil, os dois juntos. */
export function lerConvite(corpo: Record<string, unknown>): { ok: true; dados: DadosConvite } | { ok: false; erro: ErroConvite } {
  const nome = texto(corpo.nome).replace(/\s+/g, " ");
  if (!nome || nome.length > 120) return { ok: false, erro: "nome" };
  const email = texto(corpo.email).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "email" };
  const crm = texto(corpo.crm) || null;
  if (crm !== null && !/^\d{4,10}$/.test(crm)) return { ok: false, erro: "crm" };
  const uf = texto(corpo.uf).toUpperCase() || null;
  if (uf !== null && !(UFS as readonly string[]).includes(uf)) return { ok: false, erro: "uf" };
  if ((crm === null) !== (uf === null)) return { ok: false, erro: "crm_e_uf_juntos" };
  const d = corpo.dias === undefined || corpo.dias === "" ? DIAS_PADRAO : Number(corpo.dias);
  if (!Number.isInteger(d) || d < 1 || d > DIAS_MAX) return { ok: false, erro: "dias" };
  return { ok: true, dados: { nome, email, crm, uf, dias: d } };
}

/** Sem 0/O, 1/l/I: a senha é lida e digitada por alguém do outro lado. */
export const ALFABETO_SENHA = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Inteiro uniforme em [0, n) pelo Web Crypto (rejeição evita o viés do módulo). Roda no Node e no navegador. */
export function sortearSeguro(n: number): number {
  const limite = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0]! < limite) return buf[0]! % n;
  }
}

/** 12 caracteres (crypto) em 3 grupos com hífen; sempre com maiúscula, minúscula e dígito. */
export function gerarSenha(sortear: (n: number) => number = sortearSeguro): string {
  for (;;) {
    const c = Array.from({ length: 12 }, () => ALFABETO_SENHA[sortear(ALFABETO_SENHA.length)]!).join("");
    if (/[A-Z]/.test(c) && /[a-z]/.test(c) && /\d/.test(c)) return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
  }
}

/** DD/MM/AAAA no fuso de São Paulo. */
export function dataBR(d: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export function textoConvite(p: { nome: string; email: string; senha: string | null; fim: string }): { assunto: string; corpo: string } {
  const primeiro = p.nome.split(" ")[0] ?? p.nome;
  const acesso = p.senha
    ? ["Seus dados de acesso:", `E-mail: ${p.email}`, `Senha provisória: ${p.senha}`, "", 'Para trocar a senha, toque em "Esqueci a senha" na tela de entrada do app.']
    : [`Entre com o seu e-mail de sempre (${p.email}) e a sua senha.`];
  const corpo = [
    `Olá, ${primeiro}!`,
    "",
    "Separei uma conta do LaudoUSG para você conhecer: é o app que transforma o seu ditado em laudo de ultrassonografia, no iPhone ou no iPad.",
    "",
    `O plano Pro já está liberado até ${dataBR(p.fim)}, sem cobrança e sem cartão.`,
    "",
    `Baixe o app: ${LINK_DOWNLOAD}`,
    "",
    ...acesso,
    "",
    "Se puder, me conte depois o que achou.",
    "",
    "Abraço,",
    "Luiz",
  ].join("\n");
  return { assunto: "Sua conta no LaudoUSG está pronta", corpo };
}

export function mailto(email: string, assunto: string, corpo: string): string {
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export interface LinhaCortesia {
  id: string;
  user_id: string;
  tier: string;
  origem: string;
  inicio: string;
  fim: string | null;
  revogada_em: string | null;
  created_at: string;
}

export type Situacao = { rotulo: string; classe: "ok" | "warn" | "err" | "neutral" | "real" };

const DIA_MS = 86_400_000;

/** Ordem: revogada > assinou (tem assinatura Apple vigente) > expirou > vigente / expira em N dias. */
export function situacao(c: Pick<LinhaCortesia, "inicio" | "fim" | "revogada_em">, agora: number, assinou: boolean): Situacao {
  if (c.revogada_em) return { rotulo: "Revogada", classe: "neutral" };
  if (assinou) return { rotulo: "Assinou", classe: "real" };
  if (c.fim && Date.parse(c.fim) <= agora) return { rotulo: "Expirou", classe: "err" };
  if (Date.parse(c.inicio) > agora) return { rotulo: "Começa depois", classe: "neutral" };
  if (!c.fim) return { rotulo: "Vigente (sem prazo)", classe: "ok" };
  const dias = Math.ceil((Date.parse(c.fim) - agora) / DIA_MS);
  return dias <= 7 ? { rotulo: dias === 1 ? "Expira em 1 dia" : `Expira em ${dias} dias`, classe: "warn" } : { rotulo: "Vigente", classe: "ok" };
}

/** Pode estender: não revogada e com prazo. */
export const podeEstender = (c: Pick<LinhaCortesia, "fim" | "revogada_em">) => !c.revogada_em && c.fim !== null;
