/**
 * CONTRATO da personalização — só tipos e schemas, sem transporte.
 *
 * Vive separado de `personalizacao.ts` de propósito: aquele arquivo importa o
 * cliente HTTP do app (expo/fetch, supabase), o que impede validá-lo de fora.
 * Como isto aqui só depende de zod, o backend consegue importar o schema REAL
 * do app e provar que a resposta da rota bate com o que a tela espera
 * (apps/api/src/server/customization/contrato-biblioteca.manual.ts).
 *
 * Uma cópia do schema não serviria: cópias divergem em silêncio, que é
 * exatamente o defeito que este arquivo existe para impedir.
 */

import { z } from "zod";

export type Operacao =
  | { op: "remove_slot"; slot: string }
  | { op: "replace_phrase"; slot: string; variant?: string; value: string }
  | { op: "append_conclusion_item"; value: string }
  | { op: "insert_phrase_after"; anchor: string; value: string };

export const VarianteSchema = z.object({
  id: z.string(),
  frase: z.string().optional(),
  padrao: z.boolean(),
  editavel: z.boolean(),
  motivo: z.string().optional(),
});

export const SlotSchema = z.object({
  id: z.string(),
  obrigatorio: z.boolean(),
  placeholdersObrigatorios: z.array(z.string()),
  condicional: z.boolean(),
  variantes: z.array(VarianteSchema),
});

export const CatalogoSchema = z.object({
  id: z.string(),
  categoria: z.string(),
  estilo: z.string(),
  versao: z.number(),
  variaveis: z.array(z.string()),
  cabecalhos: z.object({
    tecnica: z.string().optional(),
    corpo: z.string(),
    conclusao: z.string(),
  }),
  preambulo: z.string().optional(),
  slots: z.array(SlotSchema),
  ordens: z.array(z.object({ nome: z.string(), slots: z.array(z.string()) })),
});

export const VersaoSchema = z.object({
  id: z.string(),
  versao: z.number(),
  status: z.enum(["draft", "published", "archived"]),
  operations: z.array(z.any()),
  baseCatalogId: z.string(),
  baseVersao: z.number(),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  baseDesatualizado: z.boolean(),
});

/** Espelha `Mudanca` de renderer/catalog/engine.ts — diff por SLOT, não textual. */
export const MudancaSchema = z.object({
  secao: z.enum(["corpo", "conclusao"]),
  tipo: z.enum(["alterada", "removida", "acrescentada"]),
  slot: z.string(),
  instance: z.string().optional(),
  antes: z.string().optional(),
  depois: z.string().optional(),
});

export const PreviaSchema = z.object({
  cenario: z.string(),
  nome: z.string(),
  patologico: z.boolean(),
  mudou: z.boolean(),
  mudancas: z.array(MudancaSchema),
  laudo_padrao: z.string(),
  laudo_personalizado: z.string(),
});

/** Exportado para o teste de contrato em apps/api (contrato-biblioteca.manual.ts). */
/**
 * O que um ACHADO muda no modelo — "com oligoâmnio, esta frase sai e esta
 * entra". Calculado pelo backend sobre o modelo do próprio médico.
 */
export const VariacaoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string(),
  patologico: z.boolean(),
  compara_com_nome: z.string(),
  mudancas: z.array(MudancaSchema),
});

export const EstadoSchema = z.object({
  categoria: z.string(),
  estilo: z.string(),
  base_catalog_id: z.string(),
  base_versao: z.number(),
  catalogo: CatalogoSchema,
  rascunho: VersaoSchema.nullable(),
  publicado: VersaoSchema.nullable(),
  historico: z.array(VersaoSchema),
  previa: z.array(PreviaSchema),
  // Tolera backend anterior ao deploy das variações.
  variacoes: z.array(VariacaoSchema).default([]),
});

export type Catalogo = z.infer<typeof CatalogoSchema>;
export type SlotDescricao = z.infer<typeof SlotSchema>;
export type VersaoPersonalizacao = z.infer<typeof VersaoSchema>;
export type Previa = z.infer<typeof PreviaSchema>;
export type Mudanca = z.infer<typeof MudancaSchema>;
export type Variacao = z.infer<typeof VariacaoSchema>;
export type EstadoPersonalizacao = z.infer<typeof EstadoSchema>;

