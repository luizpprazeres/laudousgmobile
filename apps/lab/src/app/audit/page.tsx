import { AuditClient } from "@/components/audit/AuditClient";
import { getAuditCounts, getAuditDetail, listAuditRows } from "@/lib/supabase/audit-queries";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const [rows, counts] = await Promise.all([listAuditRows(50), getAuditCounts()]);
  const firstRow = rows[0];
  const initialDetail = firstRow ? await getAuditDetail(firstRow.id) : null;

  return <AuditClient rows={rows} initialDetail={initialDetail} counts={counts} />;
}
