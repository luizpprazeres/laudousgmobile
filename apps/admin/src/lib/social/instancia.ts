/** Instâncias únicas das rotas sociais (dependências reais: sessão de admin + Supabase + Instagram). */
import { criarRotaLote } from "./lote";
import { criarRotasInstagram } from "./rotas-instagram";
import { criarRotasSocial } from "./rotas";
export const rotasSocial = criarRotasSocial();
export const rotasInstagram = criarRotasInstagram();
export const rotaLote = criarRotaLote();
