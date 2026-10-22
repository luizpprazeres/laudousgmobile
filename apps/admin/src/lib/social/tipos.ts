/** Tipos do agendador do Instagram (F1: organizar e aprovar; F2/F3: publicar). */

export const FUSO = "America/Sao_Paulo";
export const FORMATOS = ["image", "carousel", "story"] as const;
export const STATUS = ["draft", "approved", "publishing", "published", "failed"] as const;
export type Formato = (typeof FORMATOS)[number];
export type StatusPost = (typeof STATUS)[number];

/** Limites do Instagram e do painel (os mesmos CHECKs da migração admin_social). */
export const LIMITES = {
  legenda: 2200,
  hashtags: 30,
  alt: 1000,
  slides: 20,
  imagemBytes: 8 * 1024 * 1024,
  calendarioBytes: 1024 * 1024,
} as const;

/** Tamanho exigido por formato: feed em 4:5, story em 9:16. */
export const DIMENSOES: Record<Formato, { largura: number; altura: number }> = {
  image: { largura: 1080, altura: 1350 },
  carousel: { largura: 1080, altura: 1350 },
  story: { largura: 1080, altura: 1920 },
};

export const ID_POST = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface Interacao {
  tipo: string;
  opcoes: string[];
}

/** Linha de social_posts (só as colunas da allowlist). */
export interface LinhaPost {
  id: string;
  scheduled_at: string;
  format: Formato;
  caption: string;
  hashtags: string;
  alt_text: string;
  status: StatusPost;
  manual: boolean;
  interaction: Interacao | null;
  pillar: string;
  angle: string;
  title: string;
  notes: string[];
  attempts: number;
  last_error: string | null;
  permalink: string | null;
  published_at: string | null;
  updated_at: string;
  /** F3: quando o media_publish foi pedido nesta tentativa (null = não foi). */
  publish_requested_at: string | null;
}

/** Linha de social_media_items. */
export interface LinhaItem {
  post_id: string;
  position: number;
  storage_path: string | null;
  public_url: string | null;
  slide_text: string;
  visual_brief: string;
  alt_text: string;
}

export interface SlideImportado {
  position: number;
  slide_text: string;
  visual_brief: string;
  alt_text: string;
}

/** O que a importação manda para public.social_import (um por post do calendário). */
export interface PostImportado {
  id: string;
  scheduled_at: string;
  format: Formato;
  caption: string;
  hashtags: string;
  alt_text: string;
  manual: boolean;
  interaction: Interacao | null;
  pillar: string;
  angle: string;
  title: string;
  notes: string[];
  slides: SlideImportado[];
}

export interface ResultadoImportacao {
  criados: number;
  atualizados: number;
  preservados: number;
  orfaos: string[];
}

export const ROTULO_STATUS: Record<StatusPost, string> = {
  draft: "Rascunho",
  approved: "Aprovado",
  publishing: "Publicando",
  published: "Publicado",
  failed: "Falhou",
};

export const ROTULO_FORMATO: Record<Formato, string> = { image: "Foto", carousel: "Carrossel", story: "Story" };
