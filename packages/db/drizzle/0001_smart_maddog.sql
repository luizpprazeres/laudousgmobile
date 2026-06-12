-- DET-3 — variantes de máscara (entidade de 1ª classe) + preferência da conta.
-- NOTA: o drizzle-kit gerou também statements de subscriptions/product_events/
-- generation_audit/ALTER TYPE por drift do snapshot (essas mudanças já existem
-- em prod via SQL vivos 0004-0007). Foram removidas à mão — esta migration cria
-- SOMENTE as 2 tabelas novas do DET-3.
-- IDEMPOTENTE (review dex1): aplicada via MCP no DB mobile; o IF NOT EXISTS /
-- DROP POLICY IF EXISTS garante que rodar migrate() de novo não quebre.
CREATE TABLE IF NOT EXISTS "report_template_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_code" text NOT NULL,
	"writing_style_id" uuid NOT NULL,
	"variant_key" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "rag_block_status" DEFAULT 'draft' NOT NULL,
	"template_body" text,
	"renderer_schema" jsonb,
	"rules" jsonb,
	"created_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_template_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_report_preferences" (
	"user_id" uuid NOT NULL,
	"category_code" text NOT NULL,
	"default_variant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_report_preferences_user_id_category_code_pk" PRIMARY KEY("user_id","category_code")
);
--> statement-breakpoint
ALTER TABLE "account_report_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "report_template_variants" ADD CONSTRAINT "report_template_variants_category_code_categories_code_fk" FOREIGN KEY ("category_code") REFERENCES "public"."categories"("code") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "report_template_variants" ADD CONSTRAINT "report_template_variants_writing_style_id_writing_styles_id_fk" FOREIGN KEY ("writing_style_id") REFERENCES "public"."writing_styles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "report_template_variants" ADD CONSTRAINT "report_template_variants_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "account_report_preferences" ADD CONSTRAINT "account_report_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "account_report_preferences" ADD CONSTRAINT "account_report_preferences_category_code_categories_code_fk" FOREIGN KEY ("category_code") REFERENCES "public"."categories"("code") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "account_report_preferences" ADD CONSTRAINT "account_report_preferences_default_variant_id_report_template_variants_id_fk" FOREIGN KEY ("default_variant_id") REFERENCES "public"."report_template_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rtv_category_style_variant_key" ON "report_template_variants" USING btree ("category_code","writing_style_id","variant_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rtv_category_style_status_idx" ON "report_template_variants" USING btree ("category_code","writing_style_id","status");--> statement-breakpoint
DROP POLICY IF EXISTS "rtv_select_validated" ON "report_template_variants";--> statement-breakpoint
CREATE POLICY "rtv_select_validated" ON "report_template_variants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (status = 'validated');--> statement-breakpoint
DROP POLICY IF EXISTS "rtv_admin_all" ON "report_template_variants";--> statement-breakpoint
CREATE POLICY "rtv_admin_all" ON "report_template_variants" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
DROP POLICY IF EXISTS "arp_select_own" ON "account_report_preferences";--> statement-breakpoint
CREATE POLICY "arp_select_own" ON "account_report_preferences" AS PERMISSIVE FOR SELECT TO "authenticated" USING (auth.uid() = "account_report_preferences"."user_id");--> statement-breakpoint
DROP POLICY IF EXISTS "arp_insert_own" ON "account_report_preferences";--> statement-breakpoint
CREATE POLICY "arp_insert_own" ON "account_report_preferences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (auth.uid() = "account_report_preferences"."user_id");--> statement-breakpoint
DROP POLICY IF EXISTS "arp_update_own" ON "account_report_preferences";--> statement-breakpoint
CREATE POLICY "arp_update_own" ON "account_report_preferences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (auth.uid() = "account_report_preferences"."user_id") WITH CHECK (auth.uid() = "account_report_preferences"."user_id");--> statement-breakpoint
DROP POLICY IF EXISTS "arp_delete_own" ON "account_report_preferences";--> statement-breakpoint
CREATE POLICY "arp_delete_own" ON "account_report_preferences" AS PERMISSIVE FOR DELETE TO "authenticated" USING (auth.uid() = "account_report_preferences"."user_id");
