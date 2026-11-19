import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CalendarClock, TrendingUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { getAdminOverview } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/admin/")({
  head: () => ({ meta: [{ title: "Administrator dashboard — ResearchDesk" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const load = useServerFn(getAdminOverview);
  const { data, loading, error } = useAsync(() => load(), []);
  const [faculty, setFaculty] = useState("all");
  const [department, setDepartment] = useState("all");

  const departments = data?.departmentCards || [];
  const faculties = useMemo(() => [...new Set(departments.map((item) => item.faculty).filter(Boolean))].sort(), [departments]);
  const departmentOptions = useMemo(
    () => departments.filter((item) => faculty === "all" || item.faculty === faculty),
    [departments, faculty],
  );
  const visible = departmentOptions.filter((item) => department === "all" || item.name === department);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Administrator Dashboard"
        description="Work by faculty and department so assignments and progress stay within the correct academic unit."
        actions={
          <Link
            to="/admin/recommendations"
            className="inline-flex h-10 items-center rounded-xl bg-[#00796B] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#00695C]"
          >
            Review recommendations
          </Link>
        }
      />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load the dashboard" description={error.message} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr]">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Faculty / School</span>
              <select
                value={faculty}
                onChange={(event) => {
                  setFaculty(event.target.value);
                  setDepartment("all");
                }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-[#00796B]"
              >
                <option value="all">All faculties</option>
                {faculties.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Department</span>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-[#00796B]"
              >
                <option value="all">All departments</option>
                {departmentOptions.map((item) => <option key={item.name}>{item.name}</option>)}
              </select>
            </label>
          </div>

          <SectionCard
            title="Department overview"
            description="Progress bars summarise completed research milestones within each department."
            action={<span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10.5px] font-medium text-[#5275A5]">Grouped by academic unit</span>}
            bodyClassName="px-5 py-2 sm:px-6"
          >
            {visible.length ? visible.map((item) => (
              <div key={item.name} className="grid gap-3 border-b border-slate-100 py-3.5 last:border-0 md:grid-cols-[1fr_1.25fr_0.8fr] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-[#22343A]">{item.name}</p>
                  <p className="mt-0.5 truncate text-[10.8px] text-slate-400">{item.faculty || "Faculty not set"}</p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10.8px] text-slate-500">
                    <span>Milestone completion</span>
                    <span className="font-semibold tabular-nums text-[#293C41]">{item.progress}%</span>
                  </div>
                  <ProgressBar value={item.progress} tone={item.status === "needs_attention" ? "amber" : "teal"} />
                  <p className="mt-1 text-[10.5px] text-slate-400">
                    {item.overdue ? `${item.overdue} overdue milestone${item.overdue === 1 ? "" : "s"}` : "Progress based on recorded milestones"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <StatusBadge status={item.status} label={item.status === "needs_attention" ? "Needs attention" : "On track"} />
                  <span className="text-right text-[10.5px] text-slate-400">
                    {item.awaitingSupervisor ? `${item.awaitingSupervisor} awaiting assignment` : `${item.students} students`}
                  </span>
                </div>
              </div>
            )) : (
              <div className="py-4">
                <EmptyState icon={TrendingUp} title="No departments in this view" description="Choose a different faculty or department." />
              </div>
            )}
          </SectionCard>

          <div className="grid gap-3 lg:grid-cols-2">
            <SectionCard title="Assignment work" description="Review students waiting for a supervisor.">
              {data?.awaiting?.length ? (
                <div className="space-y-2.5">
                  {data.awaiting.slice(0, 3).map((student) => (
                    <div key={student.student_email} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-[#22343A]">{student.student_name || student.student_email}</p>
                        <p className="truncate text-[10.8px] text-slate-500">{student.department || "Department not set"}</p>
                      </div>
                      <StatusBadge status="awaiting" label="Awaiting assignment" />
                    </div>
                  ))}
                </div>
              ) : <p className="text-[12px] text-slate-500">No students are waiting for assignment.</p>}
              <Link to="/admin/recommendations" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#00796B] hover:underline">
                Open recommendation queue <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </SectionCard>

            <SectionCard title="Progress attention" description="Departments with overdue milestone work.">
              <p className="text-[12px] leading-relaxed text-slate-500">
                {data?.totals?.overdueMilestones
                  ? `${data.totals.overdueMilestones} open milestone${data.totals.overdueMilestones === 1 ? "" : "s"} are past deadline. Review department progress for details.`
                  : "No overdue milestones are currently recorded."}
              </p>
              <Link to="/admin/progress" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#00796B] hover:underline">
                Open department progress <CalendarClock className="h-3 w-3" aria-hidden="true" />
              </Link>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
