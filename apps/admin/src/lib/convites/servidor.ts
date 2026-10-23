/**
 * Convites: Supabase Auth (criar conta) + tabela `cortesias` (funções da migração), só no servidor,
 * com service role, sempre DEPOIS da checagem de admin.
 *
 * A senha provisória só passa por `criarUsuario` (vai ao Supabase Auth, que guarda o hash). Nunca
 * entra no banco do app, em log ou em mensagem de erro.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { colunas } from "../data/colunas";
import type { ConfigServidor } from "../env";
import { clienteServico } from "../supabase/clientes";
import type { LinhaCortesia } from "./regras";

export type ResultadoCortesia = "ok" | "nao_encontrado" | "revogada" | "sem_prazo" | "dias" | "falha";

export interface ConviteListado extends LinhaCortesia {
  email: string | null;
  nome: string | null;
  assinou: boolean;
}

export interface RepositorioConvites {
  /** id da conta com este e-mail no Supabase Auth, ou null. */
  usuarioPorEmail(email: string): Promise<string | null>;
  /** "existe" se o e-mail já tem conta (corrida com outra criação). */
  criarUsuario(p: { email: string; senha: string; nome: string; crm: string | null; uf: string | null }): Promise<{ id: string } | "existe" | "falha">;
  apagarUsuario(id: string): Promise<void>;
  conceder(userId: string, dias: number, criadoPor: string | null): Promise<{ resultado: "ok"; fim: string } | { resultado: "dias" | "sem_perfil" | "falha" }>;
  estender(id: string, dias: number): Promise<ResultadoCortesia>;
  revogar(id: string): Promise<ResultadoCortesia>;
  listar(): Promise<ConviteListado[]>;
}

const RESULTADOS = new Set<ResultadoCortesia>(["ok", "nao_encontrado", "revogada", "sem_prazo", "dias"]);
const resultado = (v: unknown): ResultadoCortesia => (typeof v === "string" && RESULTADOS.has(v as ResultadoCortesia) ? (v as ResultadoCortesia) : "falha");

interface UsuarioAuth {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

/** Base pequena (dezenas de contas): percorre as páginas do Auth. */
async function todosUsuarios(sb: SupabaseClient): Promise<UsuarioAuth[]> {
  const todos: UsuarioAuth[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("auth_list_failed");
    todos.push(...(data.users as UsuarioAuth[]));
    if (data.users.length < 1000) break;
  }
  return todos;
}

export function repositorioConvites(cfg: ConfigServidor, sb: SupabaseClient = clienteServico(cfg)): RepositorioConvites {
  return {
    async usuarioPorEmail(email) {
      const alvo = email.toLowerCase();
      return (await todosUsuarios(sb)).find((u) => u.email?.toLowerCase() === alvo)?.id ?? null;
    },
    async criarUsuario({ email, senha, nome, crm, uf }) {
      // O trigger handle_new_user cria o profile (role user, plan free) com nome, CRM e UF do metadata.
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { name: nome, ...(crm && uf ? { crm, uf } : {}) },
      });
      if (error) {
        const codigo = (error as { code?: string }).code ?? "";
        if (codigo === "email_exists" || /already (been )?registered/i.test(error.message)) return "existe";
        console.warn(`[convites] auth_create_failed ${codigo || error.status || ""}`.trim());
        return "falha";
      }
      return data.user ? { id: data.user.id } : "falha";
    },
    async apagarUsuario(id) {
      const { error } = await sb.auth.admin.deleteUser(id);
      if (error) console.warn("[convites] auth_delete_failed");
    },
    async conceder(userId, dias, criadoPor) {
      const { data, error } = await sb.rpc("cortesia_conceder", { p_user: userId, p_dias: dias, p_criado_por: criadoPor });
      const r = (data ?? {}) as { resultado?: string; fim?: string };
      if (error || !r.resultado) return { resultado: "falha" };
      if (r.resultado === "ok" && typeof r.fim === "string") return { resultado: "ok", fim: new Date(r.fim).toISOString() };
      return { resultado: r.resultado === "dias" || r.resultado === "sem_perfil" ? r.resultado : "falha" };
    },
    async estender(id, dias) {
      const { data, error } = await sb.rpc("cortesia_estender", { p_id: id, p_dias: dias });
      return error ? "falha" : resultado(data);
    },
    async revogar(id) {
      const { data, error } = await sb.rpc("cortesia_revogar", { p_id: id });
      return error ? "falha" : resultado(data);
    },
    async listar() {
      const { data, error } = await sb.from("cortesias").select(colunas("cortesias")).order("created_at", { ascending: false }).limit(500);
      if (error) throw new Error("cortesias indisponível");
      const linhas = (data ?? []) as unknown as LinhaCortesia[];
      if (!linhas.length) return [];
      const ids = [...new Set(linhas.map((l) => l.user_id))];
      const agora = new Date().toISOString();
      const [usuarios, subs] = await Promise.all([
        todosUsuarios(sb).catch(() => [] as UsuarioAuth[]),
        sb.from("subscriptions").select(colunas("subscriptions")).in("user_id", ids).in("status", ["active", "grace"]).gt("expires_at", agora).eq("environment", "Production"),
      ]);
      const porId = new Map(usuarios.map((u) => [u.id, u]));
      const assinantes = new Set(((subs.data ?? []) as unknown as { user_id: string }[]).map((s) => s.user_id));
      return linhas.map((l) => {
        const u = porId.get(l.user_id);
        const nome = u?.user_metadata?.name;
        return { ...l, email: u?.email ?? null, nome: typeof nome === "string" ? nome : null, assinou: assinantes.has(l.user_id) };
      });
    },
  };
}
