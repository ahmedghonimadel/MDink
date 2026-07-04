import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

/**
 * جرس الإشعارات — يظهر في رأس لوحة التحكم.
 * يعرض عدد غير المقروء، وقائمة منسدلة بالإشعارات.
 */
export function NotificationsBell() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: userId } = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["my-notifications", userId],
    enabled: !!userId,
    refetchInterval: 60000, // تحديث كل دقيقة
    queryFn: async (): Promise<Notification[]> =>
      (
        await db
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? [],
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markRead(id: string) {
    await db.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-notifications"] });
  }

  async function markAllRead() {
    await db
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["my-notifications"] });
  }

  return (
    <div className="relative z-[60]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute end-0 z-[100] mt-2 flex max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="font-semibold">الإشعارات</span>
              {unreadCount > 0 ? (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> تحديد الكل كمقروء
                </button>
              ) : null}
            </div>
            <div className="overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  لا توجد إشعارات بعد.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => {
                    const inner = (
                      <div
                        className={`flex gap-3 px-4 py-3 transition-colors hover:bg-accent/50 ${
                          n.is_read ? "" : "bg-brand/5"
                        }`}
                      >
                        <div
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            n.is_read ? "bg-transparent" : "bg-brand"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{n.title}</div>
                          {n.body ? (
                            <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                          ) : null}
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("ar-EG")}
                          </div>
                        </div>
                        {!n.is_read ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead(n.id);
                            }}
                            className="shrink-0 text-muted-foreground hover:text-brand"
                            aria-label="تحديد كمقروء"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    );
                    return n.link ? (
                      <Link
                        key={n.id}
                        to={n.link as never}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={n.id}>{inner}</div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * دالة مساعدة لإنشاء إشعار لمستخدم (تُستخدم عند تكليف مهمة).
 */
export async function createNotification(params: {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  type?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  await (supabase as any).from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
    type: params.type ?? "info",
    created_by: auth.user?.id ?? null,
  });
}
