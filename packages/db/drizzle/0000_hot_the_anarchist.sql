CREATE TABLE IF NOT EXISTS "generation_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid,
	"user_id" uuid,
	"category" text NOT NULL,
	"writing_style_id" uuid,
	"raw_input" text,
	"category_hint" text,
	"structured_output" jsonb,
	"validator_result" jsonb,
	"rag_blocks_retrieved" jsonb,
	"system_message_full" text,
	"output_text" text,
	"sanity_result" jsonb,
	"total_duration_ms" integer,
	"structurer_duration_ms" integer,
	"validator_duration_ms" integer,
	"rag_duration_ms" integer,
	"writer_duration_ms" integer,
	"sanity_duration_ms" integer,
	"openai_input_tokens" integer,
	"openai_output_tokens" integer,
	"openai_cost_usd" numeric(10, 6),
	"model_writer" text,
	"model_structurer" text,
	"error_code" text,
	"error_message" text,
	"error_stage" text,
	"prompt_version" text NOT NULL,
	"pipeline_version" text DEFAULT 'v1' NOT NULL,
	"contract_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "generation_audit" ADD CONSTRAINT "generation_audit_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "generation_audit" ADD CONSTRAINT "generation_audit_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "generation_audit" ADD CONSTRAINT "generation_audit_writing_style_id_writing_styles_id_fk" FOREIGN KEY ("writing_style_id") REFERENCES "public"."writing_styles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gen_audit_report" ON "generation_audit" USING btree ("report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gen_audit_user_created" ON "generation_audit" USING btree ("user_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gen_audit_category_style_created" ON "generation_audit" USING btree ("category","writing_style_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gen_audit_contract_hash" ON "generation_audit" USING btree ("contract_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gen_audit_error" ON "generation_audit" USING btree ("error_code") WHERE "generation_audit"."error_code" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "generation_audit" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "audit_service_role_all" ON "generation_audit";
--> statement-breakpoint
CREATE POLICY "audit_service_role_all" ON "generation_audit" AS PERMISSIVE FOR ALL TO public USING (((SELECT auth.jwt() ->> 'role') = 'service_role')) WITH CHECK (((SELECT auth.jwt() ->> 'role') = 'service_role'));
--> statement-breakpoint
DROP POLICY IF EXISTS "audit_admin_select" ON "generation_audit";
--> statement-breakpoint
CREATE POLICY "audit_admin_select" ON "generation_audit" AS PERMISSIVE FOR SELECT TO public USING (((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'));
