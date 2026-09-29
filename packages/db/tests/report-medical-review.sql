-- Run only in an isolated test database containing the migration.
-- The runner seeds these two profiles and this generated report.
DO $$
DECLARE result jsonb; v integer;
BEGIN
  result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 1, 'Laudo sintético');
  IF result->>'error' <> 'not_found' THEN RAISE EXCEPTION 'wrong owner approved'; END IF;
  result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'Texto diferente');
  IF result->>'error' <> 'content_changed' THEN RAISE EXCEPTION 'wrong text approved'; END IF;
  result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 2, 'Laudo sintético');
  IF result->>'error' <> 'content_changed' THEN RAISE EXCEPTION 'wrong revision approved'; END IF;
  result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'Laudo sintético');
  IF result->>'reviewStatus' <> 'reviewed' THEN RAISE EXCEPTION 'valid approval failed'; END IF;
  UPDATE public.reports SET updated_at = now(), content_revision = 900 WHERE id = '10000000-0000-4000-8000-000000000001';
  SELECT content_revision INTO v FROM public.reports WHERE id = '10000000-0000-4000-8000-000000000001';
  IF v <> 1 THEN RAISE EXCEPTION 'touch invalidated or revision forged'; END IF;
END $$;
-- Simulates the existing authenticated PostgREST PATCH path, bypassing API.
SET ROLE authenticated;
UPDATE public.reports SET final_output = 'Laudo corrigido', content_revision = 1 WHERE id = '10000000-0000-4000-8000-000000000001';
RESET ROLE;
DO $$
DECLARE result jsonb; current_revision integer; approved_revision integer;
BEGIN
 SELECT content_revision INTO current_revision FROM public.reports WHERE id = '10000000-0000-4000-8000-000000000001';
 SELECT reviewed_revision INTO approved_revision FROM public.report_medical_reviews WHERE report_id = '10000000-0000-4000-8000-000000000001';
 IF current_revision <> 2 OR approved_revision = current_revision THEN RAISE EXCEPTION 'legacy edit retained approval'; END IF;
 result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 1, 'Laudo sintético');
 IF result->>'error' <> 'content_changed' THEN RAISE EXCEPTION 'stale approval accepted'; END IF;
 IF has_function_privilege('authenticated', 'public.review_report_content(uuid,uuid,integer,text)', 'execute') OR has_function_privilege('anon', 'public.review_report_content(uuid,uuid,integer,text)', 'execute') THEN RAISE EXCEPTION 'RPC exposed'; END IF;
 IF has_table_privilege('authenticated', 'public.report_medical_reviews', 'INSERT') OR has_table_privilege('anon', 'public.report_medical_reviews', 'SELECT') THEN RAISE EXCEPTION 'approval table exposed'; END IF;
 UPDATE public.reports SET status = 'blocked' WHERE id = '10000000-0000-4000-8000-000000000001';
 result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 3, 'Laudo corrigido');
 IF result->>'error' <> 'report_not_ready' THEN RAISE EXCEPTION 'blocked report approved'; END IF;
END $$;

DO $$
DECLARE result jsonb; v integer;
BEGIN
 UPDATE public.reports SET status = 'generated', sanity_result = '{"verdict":"critical","issues":[]}'::jsonb WHERE id = '10000000-0000-4000-8000-000000000001';
 SELECT content_revision INTO v FROM public.reports WHERE id = '10000000-0000-4000-8000-000000000001';
 result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', v, 'Laudo corrigido');
 IF result->>'error' <> 'report_not_ready' THEN RAISE EXCEPTION 'generated plus critical approved'; END IF;
 UPDATE public.reports SET sanity_result = '{"verdict":"ok","issues":[]}'::jsonb WHERE id = '10000000-0000-4000-8000-000000000001';
 SELECT content_revision INTO v FROM public.reports WHERE id = '10000000-0000-4000-8000-000000000001';
 result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', v, 'Laudo corrigido');
 IF result->>'reviewStatus' <> 'reviewed' THEN RAISE EXCEPTION 'sanity ok approval failed'; END IF;
 UPDATE public.reports SET sanity_result = '{"verdict":"critical","issues":[]}'::jsonb WHERE id = '10000000-0000-4000-8000-000000000001';
 IF EXISTS(SELECT 1 FROM public.reports r JOIN public.report_medical_reviews m ON m.report_id = r.id AND m.reviewed_revision = r.content_revision WHERE r.id = '10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'late critical retained review'; END IF;
 UPDATE public.reports SET sanity_result = '{"verdict":"warning","issues":[{"severity":"critical"}]}'::jsonb WHERE id = '10000000-0000-4000-8000-000000000001';
 SELECT content_revision INTO v FROM public.reports WHERE id = '10000000-0000-4000-8000-000000000001';
 result := public.review_report_content('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', v, 'Laudo corrigido');
 IF result->>'error' <> 'report_not_ready' THEN RAISE EXCEPTION 'critical issue with warning verdict approved'; END IF;
END $$;
