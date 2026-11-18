import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Sparkles, TrendingUp, UserCheck, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { StatCard } from "@/components/workspace/StatCard";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { DepartmentCard } from "@/components/admin/DepartmentCard";
import { getAdminOverview } from "@/lib/server-fns";
import { dueLabel, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/")({
  head: () => ({ meta: [{ title: "Department overview — ResearchDesk" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const load = useServerFn(getAdminOverview);
  const { data, loading, error, reload } = useAsync(() => load(), []);

  return (
    <div className="animate-fade">
      <PageHeader
        eyebrow="Research office"
        title="Postgraduate overview"
        description="Supervision across every department — progress, capacity and the work that needs attention."
        actions={
          <button
            type="button"
            onClick={reload}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition-colors hover:border-slate-300"
          >
            Refresh data
          </button>
        }
      />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load the overview" description={error.message} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Students" value={data?.totals?.students || 0} hint={`${data?.totals?.activeAssignments || 0} active supervisions`} icon={Users} tone="teal" />
            <StatCard label="Awaiting supervisor" value={data?.totals?.awaitingSupervisor || 0} hint="Research profiles ready to match" icon={UserCheck} tone={data?.totals?.awaitingSupervisor ? "amber" : "mint"} />
            <StatCard label="Matches to review" value={data?.totals?.pendingRecommendations || 0} hint="Ranked suggestions in the queue" icon={Sparkles} tone={data?.totals?.pendingRecommendations ? "blue" : "mint"} />
            <StatCard label="Overdue milestones" value={data?.totals?.overdueMilestones || 0} hint="Past their deadline" icon={CalendarClock} tone={data?.totals?.overdueMilestones ? "rose" : "mint"} />
          </div>

          <SectionCard
            title="Departments"
            description="Confirmed progress per department, with on-track and needs-attention labels."
            action={
              <Link to="/admin/progress" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
                Progress monitoring
              </Link>
            }
            bodyClassName="px-5 py-5 sm:px-6"
          >
            {data?.departmentCards?.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.departmentCards.map((department) => (
                  <DepartmentCard key={department.name} department={department} />
                ))}
              </div>
            ) : (
              <EmptyState icon={TrendingUp} title="No department data yet" description="Department cards appear as students and supervisors join." />
            )}
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="Needs attention"
              description="Milestones past their deadline."
              action={
                <Link to="/admin/progress" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
                  Open monitoring
                </Link>
              }
              bodyClassName="px-5 py-2 sm:px-6"
            >
              {data?.attention?.length ? (
                data.attention.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3.5 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#0A1929]">
                        {item.student_name} · {item.title}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">
                        Due {formatDate(item.due_date)} · <span className="font-medium text-[#C62828]">{dueLabel(item.due_date)}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-[#FFEBEE] px-2.5 py-1 text-[11px] font-medium text-[#C62828]">Delayed</span>
                  </div>
                ))
              ) : (
                <div className="py-4">
                  <EmptyState icon={CalendarClock} title="Nothing overdue" description="Every open milestone is still within its deadline." />
                </div>
              )}
            </SectionCard>

            <div className="space-y-5">
              <SectionCard title="Supervisor capacity" description="Closest to full first.">
                {data?.capacity?.length ? (
                  <ul className="space-y-3">
                    {data.capacity.map((supervisor) => {
                      const used = supervisor.max ? Math.round((supervisor.load / supervisor.max) * 100) : 0;
                      return (
                        <li key={supervisor.name}>
                          <div className="mb-1.5 flex items-center justify-between text-[12px]">
                            <span className="truncate pr-2 font-medium text-[#0A1929]">{supervisor.name}</span>
                            <span className="shrink-0 tabular-nums text-slate-500">
                              {supervisor.load}/{supervisor.max}
                            </span>
                          </div>
                          <ProgressBar value={used} tone={used >= 90 ? "rose" : used >= 70 ? "amber" : "teal"} />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-slate-500">No supervisor profiles yet.</p>
                )}
              </SectionCard>

              <SectionCard
                title="Awaiting assignment"
                action={
                  <Link to="/admin/recommendations" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
                    Match
                  </Link>
                }
              >
                {data?.awaiting?.length ? (
                  <ul className="space-y-2.5">
                    {data.awaiting.map((student) => (
                      <li key={student.student_email} className="rounded-lg bg-[#FBFCFC] px-3 py-2">
                        <p className="truncate text-[12.5px] font-medium text-[#0A1929]">{student.student_name || student.student_email}</p>
                        <p className="truncate text-[11.5px] text-slate-500">{student.research_title}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-slate-500">Every submitted profile has a supervisor.</p>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}