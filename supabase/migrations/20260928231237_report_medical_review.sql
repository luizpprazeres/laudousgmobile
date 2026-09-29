-- Additive rollout: old mobile clients remain valid, but never imply review.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS content_revision integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS public.report_medical_reviews (
  report_id uuid PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  reviewed_revision integer NOT NULL CHECK (reviewed_revision > 0),
  reviewed_by uuid NOT NULL REFERENCES public.profiles(id),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.report_medical_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_medical_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_medical_reviews TO service_role;

-- No approval fields on client-writable reports. Every writer, including old
-- PostgREST PATCH clients, invalidates the old revision by changing this number.
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
DROP TRIGGER IF EXISTS reports_content_revision_guard ON public.reports;
CREATE TRIGGER reports_content_revision_guard BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.guard_report_content_revision();

-- Not callable by a room token or by authenticated PostgREST clients. The API
-- derives p_actor_id from a verified JWT, never from JSON supplied by the user.
CREATE OR REPLACE FUNCTION public.review_report_content(
  p_report_id uuid, p_actor_id uuid, p_expected_revision integer, p_expected_text text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.reports%ROWTYPE; approved_at timestamptz;
BEGIN
  SELECT * INTO r FROM public.reports WHERE id = p_report_id AND user_id = p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF r.content_revision IS DISTINCT FROM p_expected_revision
    OR coalesce(r.final_output, r.generated_output) IS DISTINCT FROM p_expected_text THEN
    RETURN jsonb_build_object('ok', false, 'error', 'content_changed');
  END IF;
  IF r.status::text NOT IN ('generated', 'published')
    OR r.sanity_result->>'verdict' = 'critical'
    OR coalesce(r.sanity_result->'issues', '[]'::jsonb) @> '[{"severity":"critical"}]'::jsonb
    OR nullif(btrim(p_expected_text), '') IS NULL
    OR p_expected_text ~ '\[REVISAR\M' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'report_not_ready');
  END IF;
  INSERT INTO public.report_medical_reviews(report_id, reviewed_revision, reviewed_by, reviewed_at)
  VALUES(r.id, r.content_revision, p_actor_id, clock_timestamp())
  ON CONFLICT(report_id) DO UPDATE SET reviewed_revision = excluded.reviewed_revision,
    reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at
  RETURNING reviewed_at INTO approved_at;
  -- A normal broadcast touch does not change content_revision.
  UPDATE public.reports SET updated_at = clock_timestamp() WHERE id = r.id;
  RETURN jsonb_build_object('ok', true, 'contentRevision', r.content_revision,
    'reviewStatus', 'reviewed', 'reviewedAt', approved_at);
END;
$$;
REVOKE ALL ON FUNCTION public.review_report_content(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_report_content(uuid, uuid, integer, text) TO service_role;
