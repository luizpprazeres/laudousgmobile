/** Instância única das rotas sociais (dependências reais: sessão de admin + Supabase). */
import { criarRotasSocial } from "./rotas";
export const rotasSocial = criarRotasSocial();
