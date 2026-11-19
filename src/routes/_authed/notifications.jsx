import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/button";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { PageHeader } from "@/components/workspace/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { FilterPills } from "@/components/supervisor/portal/KpiTile";
import { timeAgo } from "@/lib/format";
import { resolveRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ResearchDesk" }] }),
  component: NotificationsPage,
});

const ACTION_LABEL = {
  submission: "Open review",
  feedback: "Open review",
  assignment: "View assignment",
  milestone: "Open student",
  system: "Open",
};

const TABS = ["all", "unread", "reviews", "milestones", "assignments"];
const ADMIN_TABS = ["all", "unread", "assignments", "tickets", "progress", "defences"];

function matches(item, filter) {
  if (filter === "all") return true;
  if (filter === "unread") return !item.is_read;
  if (filter === "reviews") return item.type === "submission" || item.type === "feedback";
  if (filter === "milestones") return item.type === "milestone";
  if (filter === "assignments") return item.type === "assignment";
  if (filter === "tickets") return item.type === "ticket" || `${item.title} ${item.message}`.toLowerCase().includes("ticket");
  if (filter === "progress") return item.type === "progress" || `${item.title} ${item.message}`.toLowerCase().includes("progress");
  if (filter === "defences") return item.type === "defence" || `${item.title} ${item.message}`.toLowerCase().includes("defence");
  return true;
}

function NotificationsPage() {
  const { user } = useAuth();
  const isAdmin = resolveRole(user) === "admin";
  const [filter, setFilter] = useState("all");

  const { data, loading, reload } = useAsync(async () => {
    const page = await localClient.entities.Notification.filter({ user_email: user.email }, { sort: "-created_date", limit: 60 });
    return page.items;
  }, [user?.email]);

  const items = data || [];
  const unread = items.filter((item) => !item.is_read);
  const visible = items.filter((item) => matches(item, filter));

  const tabs = isAdmin ? ADMIN_TABS : TABS;
  const counts = Object.fromEntries(tabs.map((tab) => [tab, items.filter((item) => matches(item, tab)).length]));

  async function markAll() {
    await localClient.entities.Notification.updateMany({ user_email: user.email, is_read: false }, { $set: { is_read: true } });
    reload();
  }

  async function markOne(item) {
    if (item.is_read) return;
    await localClient.entities.Notification.update(item.id, { is_read: true });
    reload();
  }

  return (
    <WorkspaceLayout role={resolveRole(user) || "student"}>
      <div className="animate-fade">
        <PageHeader
          eyebrow="Activity"
          title="Notifications"
          description={isAdmin
            ? "Administrative updates about assignments, capacity, tickets, progress exceptions and defence activity."
            : "Updates about submissions, student replies, milestones, assignments and supervision activity."}
          actions={
            unread.length > 0 && (
              <Button onClick={markAll} variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px] font-medium text-slate-600">
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Mark all read
              </Button>
            )
          }
        />

        <FilterPills
          className="mb-4"
          value={filter}
          onChange={setFilter}
          options={tabs.map((tab) => ({
            key: tab,
            label: tab === "all" ? "All" : tab === "reviews" ? "Reviews" : tab === "defences" ? "Defences" : tab.charAt(0).toUpperCase() + tab.slice(1),
            count: counts[tab],
          }))}
        />

        {loading ? (
          <LoadingBlock rows={4} />
        ) : visible.length ? (
          <div className={isAdmin ? "divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white px-5" : "space-y-2.5"}>
            {visible.map((item) => (
              <article
                key={item.id}
                className={cn(
                  "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
                  isAdmin ? "py-4" : "rounded-xl border bg-white px-4 py-3.5",
                  !isAdmin && (item.is_read ? "border-slate-200" : "border-[#C8E6E3]"),
                )}
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[#111827]">{item.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(item.created_date)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium",
                      item.is_read ? "bg-slate-100 text-slate-600" : "bg-[#CCFBF1] text-[#065F46]",
                    )}
                  >
                    {item.is_read ? "Read" : "Unread"}
                  </span>
                  {isAdmin && (
                    <span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10.5px] font-medium text-[#5275A5]">
                      {item.type === "assignment" ? "Assignments" : item.type === "ticket" ? "Tickets" : item.type === "defence" ? "Defences" : item.type === "progress" ? "Progress" : item.type}
                    </span>
                  )}
                  {item.link ? (
                    <a
                      href={item.link}
                      onClick={() => markOne(item)}
                      className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {ACTION_LABEL[item.type] || "Open"}
                    </a>
                  ) : (
                    <Button onClick={() => markOne(item)} variant="outline" className="h-8 rounded-lg border-slate-300 px-3 text-[11.5px] font-medium text-slate-700">
                      Mark read
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={Bell} title="Nothing here" description="Assignment decisions, submissions and feedback all land in this list." />
        )}
      </div>
    </WorkspaceLayout>
  );
}