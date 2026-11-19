import { Link } from "@tanstack/react-router";
import { Bell, Check, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/format";

/** Topbar notification bell: unread counter, latest six events and a link to the centre. */
export function NotificationBell({ withLabel = false, showUnread = true }) {
  const { user } = useAuth();
  const { data, reload } = useAsync(async () => {
    if (!user?.email) return { items: [], unread: 0 };
    const [page, unread] = await Promise.all([
      localClient.entities.Notification.filter({ user_email: user.email }, { sort: "-created_date", limit: 6 }),
      localClient.entities.Notification.count({ user_email: user.email, is_read: false }),
    ]);
    return { items: page.items, unread };
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return undefined;
    return localClient.entities.Notification.subscribe(() => reload());
  }, [user?.email, reload]);

  const unread = data?.unread || 0;

  async function markAll() {
    await localClient.entities.Notification.updateMany(
      { user_email: user.email, is_read: false },
      { $set: { is_read: true } },
    );
    reload();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className={
            withLabel
              ? "flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-[#00796B]"
              : "relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-[#00796B]"
          }
        >
          <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
          {withLabel && <span className="hidden sm:inline">Notifications</span>}
          {showUnread && unread > 0 &&
            (withLabel ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C62828] px-1 text-[10.5px] font-semibold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C62828] px-1 text-[10.5px] font-semibold text-white ring-2 ring-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ))}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[330px] rounded-2xl border-slate-200 p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-[13.5px] font-semibold text-[#0A1929]">Notifications</p>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#00796B] hover:underline">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto scrollbar-slim">
          {!data?.items?.length && <p className="px-4 py-6 text-center text-[12.5px] text-slate-500">Nothing yet — updates appear here.</p>}
          {data?.items?.map((item) => (
            <div key={item.id} className="border-b border-slate-50 px-4 py-3 last:border-0">
              <div className="flex items-start gap-2">
                {!item.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />}
                <div className={item.is_read ? "pl-4" : ""}>
                  <p className="text-[12.8px] font-medium leading-snug text-[#0A1929]">{item.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(item.created_date)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/notifications"
          className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12.5px] font-medium text-[#00796B] hover:bg-slate-50"
        >
          Open notification centre
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </PopoverContent>
    </Popover>
  );
}