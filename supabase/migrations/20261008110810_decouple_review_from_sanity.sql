-- A confirmação explícita do médico não apaga nem depende dos alertas
-- automáticos. A revisão continua vinculada atomicamente ao proprietário, ao
-- texto e à content_revision atuais.
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
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      NEW.content_revision := OLD.content_revision + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_report_content_revision()
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_report_content(
  p_report_id uuid, p_actor_id uuid, p_expected_revision integer, p_expected_text text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.reports%ROWTYPE; approved_at timestamptz;
BEGIN
  SELECT * INTO r FROM public.reports
  WHERE id = p_report_id AND user_id = p_actor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF r.content_revision IS DISTINCT FROM p_expected_revision
    OR coalesce(r.final_output, r.generated_output) IS DISTINCT FROM p_expected_text THEN
    RETURN jsonb_build_object('ok', false, 'error', 'content_changed');
  END IF;

  IF r.status::text NOT IN ('generated', 'published')
    OR nullif(btrim(p_expected_text), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'report_not_ready');
  END IF;

  INSERT INTO public.report_medical_reviews(
    report_id, reviewed_revision, reviewed_by, reviewed_at
  ) VALUES (
    r.id, r.content_revision, p_actor_id, clock_timestamp()
  )
  ON CONFLICT(report_id) DO UPDATE SET
    reviewed_revision = excluded.reviewed_revision,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at
  RETURNING reviewed_at INTO approved_at;

  UPDATE public.reports SET updated_at = clock_timestamp() WHERE id = r.id;

  RETURN jsonb_build_object(
    'ok', true,
    'contentRevision', r.content_revision,
    'reviewStatus', 'reviewed',
    'reviewedAt', approved_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_report_content(uuid, uuid, integer, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_report_content(uuid, uuid, integer, text)
TO service_role;
