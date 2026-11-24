import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { ScheduleDefenceDialog } from "@/components/admin/ScheduleDefenceDialog";
import { formatDate, dueLabel } from "@/lib/format";
import { getAdminOperations, updateDefenceStatus } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/admin/defence")({
  head: () => ({ meta: [{ title: "Defences & timeline — ResearchDesk" }] }),
  component: AdminDefencePage,
});

function AdminDefencePage() {
  const load = useServerFn(getAdminOperations);
  const setStatus = useServerFn(updateDefenceStatus);
  const { data, loading, error, reload } = useAsync(() => load(), []);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState("");

  async function changeStatus(defence, status) {
    setBusyId(defence.id);
    try {
      await setStatus({ data: { defenceId: defence.id, status } });
      toast.success(status === "completed" ? "Defence marked completed" : "Defence postponed");
      reload();
    } catch (err) {
      toast.error(err?.message || "Could not update this defence");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="animate-fade">
      <PageHeader
        title="Timeline & Defences"
        description="Monitor upcoming milestones and defence dates across postgraduate research projects."
        actions={
          <Button onClick={() => setOpen(true)} className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Schedule defence
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load the timeline" description={error.message} />
      ) : (
        <div className="space-y-5">
          <SectionCard title="Defence schedule" description={`${data?.defences?.length || 0} defence(s) on record`} bodyClassName="px-5 py-3 sm:px-6">
            {data?.defences?.length ? (
              <div className="overflow-x-auto scrollbar-slim">
                <table className="w-full min-w-[880px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                      <th className="py-2.5 pr-4 font-medium">Department</th>
                      <th className="py-2.5 pr-4 font-medium">Scope</th>
                      <th className="py-2.5 pr-4 font-medium">Date</th>
                      <th className="py-2.5 pr-4 font-medium">Venue</th>
                      <th className="py-2.5 pr-4 font-medium">Panel</th>
                      <th className="py-2.5 pr-4 font-medium">Status</th>
                      <th className="py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.defences.map((defence) => (
                      <tr key={defence.id} className="border-b border-slate-50 text-[13px] last:border-0">
                        <td className="py-3.5 pr-4">
                          <p className="font-medium text-[#0A1929]">{defence.department || defence.student_name || "Department not set"}</p>
                          <p className="text-[11.5px] text-slate-400">{defence.department ? "Department-wide" : "Individual record"}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-slate-600">{defence.scope === "department" ? "All department students and supervisors" : defence.supervisor_name || "—"}</td>
                        <td className="py-3.5 pr-4 text-slate-600">
                          {formatDate(defence.scheduled_date)}
                          {defence.scheduled_time && <span className="block text-[11.5px] text-slate-400">{defence.scheduled_time}</span>}
                        </td>
                        <td className="py-3.5 pr-4 text-slate-500">{defence.venue || "—"}</td>
                        <td className="max-w-[220px] py-3.5 pr-4">
                          <p className="truncate text-[12px] text-slate-500">{defence.panel || "—"}</p>
                        </td>
                        <td className="py-3.5 pr-4">
                          <StatusBadge status={defence.status} />
                        </td>
                        <td className="py-3.5 text-right">
                          {defence.status === "scheduled" && (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                onClick={() => changeStatus(defence, "completed")}
                                disabled={busyId === defence.id}
                                className="h-8 rounded-lg bg-[#00796B] px-2.5 text-[11.5px] font-medium hover:bg-[#007D6D]"
                              >
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => changeStatus(defence, "postponed")}
                                disabled={busyId === defence.id}
                                className="h-8 rounded-lg border-slate-200 px-2.5 text-[11.5px] shadow-none"
                              >
                                Postpone
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-3">
                <EmptyState
                  icon={CalendarClock}
                  title="No defences scheduled"
                  description="Schedule an examination slot for a student with an active supervision record."
                  action={
                    <Button onClick={() => setOpen(true)} variant="outline" className="h-9 rounded-lg border-slate-200 text-[12.5px]">
                      Schedule the first defence
                    </Button>
                  }
                />
              </div>
            )}
          </SectionCard>

          <SectionCard title="Upcoming deadlines" description="The next open milestones across departments." bodyClassName="px-5 py-2 sm:px-6">
            {data?.upcoming?.length ? (
              data.upcoming.map((milestone) => (
                <div key={milestone.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#0A1929]">
                      {milestone.student_name} · {milestone.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-slate-500">
                      {formatDate(milestone.due_date)} · {dueLabel(milestone.due_date)}
                    </p>
                  </div>
                  <StatusBadge status={milestone.status} />
                </div>
              ))
            ) : (
              <p className="py-4 text-[12.5px] text-slate-500">No upcoming deadlines on record.</p>
            )}
          </SectionCard>
        </div>
      )}

      <ScheduleDefenceDialog open={open} onOpenChange={setOpen} departments={data?.departments || []} onScheduled={reload} />
    </div>
  );
}