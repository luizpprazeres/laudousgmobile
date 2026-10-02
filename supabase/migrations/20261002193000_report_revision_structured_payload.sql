-- A revisão médica pertence ao payload clínico inteiro, não apenas ao texto.
-- Mantém a migração original intacta e amplia o mesmo trigger de versão.
CREATE OR REPLACE FUNCTION public.guard_report_content_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_revision := 1;
  ELSE
    NEW.content_revision := OLD.content_revision;
    IF NEW.generated_output IS DISTINCT FROM OLD.generated_output
      OR NEW.final_output IS DISTINCT FROM OLD.final_output
      OR NEW.category_code IS DISTINCT FROM OLD.category_code
      OR NEW.structured_findings IS DISTINCT FROM OLD.structured_findings
      OR NEW.generation_metadata IS DISTINCT FROM OLD.generation_metadata
      OR NEW.sanity_result IS DISTINCT FROM OLD.sanity_result
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      NEW.content_revision := OLD.content_revision + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_report_content_revision() FROM PUBLIC, anon, authenticated;
