import { supabase } from "@/integrations/supabase/client";

/**
 * يسجّل عملية حساسة في سجل النشاط (audit_logs).
 * يُستخدم عند: إنشاء/تعديل/حذف، تغيير صلاحية، تصدير بيانات.
 */
export async function logAudit(params: {
  action: "create" | "update" | "delete" | "login" | "export" | "role_change";
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await (supabase as any).from("audit_logs").insert({
      actor_id: auth.user?.id ?? null,
      actor_email: auth.user?.email ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
    });
  } catch {
    // فشل تسجيل النشاط لا يجب أن يكسر العملية الأساسية
  }
}
