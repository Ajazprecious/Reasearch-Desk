import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileClock, FileText, Flag, TrendingUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatCard } from "@/components/workspace/StatCard";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { CycleStages } from "@/components/admin/CycleStages";
import { StudentProgressRow } from "@/components/admin/StudentProgressRow";
import { getAdminProgress } from "@/lib/server-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/admin/progress")({
  head: () => ({ meta: [{ title: "Progress monitoring — ResearchDesk" }] }),
  component: AdminProgressPage,
});

const LEGEND = [
  { label: "Approved", tone: "bg-[#2E7D32]" },
  { label: "Submitted", tone: "bg-[#1565C0]" },
  { label: "Revision needed", tone: "bg-[#C62828]" },
  { label: "Not started", tone: "border border-slate-300 bg-white" },
];

function AdminProgressPage() {
  const load = useServerFn(getAdminProgress);
  const { data, loading, error } = useAsync(() => load(), []);
  const [department, setDepartment] = useState("all");
  const [onlyAttention, setOnlyAttention] = useState(false);

  const students = data?.students || [];
  const totals = data?.totals;
  const departments = useMemo(
    () => [...new Set(students.map((student) => student.department).filter(Boolean))].sort(),
    [students],
  );
  const visible = students.filter(
    (student) =>
      (department === "all" || student.department === department) && (!onlyAttention || student.status !== "on_track"),
  );

  return (
    <div className="animate-fade space-y-5">
      <PageHeader
        title="Progress monitoring"
        description="Every student's supervision cycle at a glance — core milestones confirmed, work submitted and drafts awaiting review."
      />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load progress" description={error.message} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Students tracked" value={totals.students} hint="With a research profile on file" icon={Flag} tone="teal" />
            <StatCard
              label="Awaiting review"
              value={totals.awaitingReview}
              hint="Drafts sitting with supervisors"
              icon={FileClock}
              tone="blue"
            />
            <StatCard label="In revision" value={totals.revisions} hint="Drafts returned to students" icon={FileText} tone="rose" />
            <StatCard label="Overdue milestones" value={totals.overdue} hint="Past deadline, not yet approved" icon={AlertTriangle} tone="amber" />
          </div>

          <SectionCard
            title="Core research milestones"
            description="The supervision cycle every student is opened on, counted in weeks from assignment."
            bodyClassName="px-5 py-4 sm:px-6"
          >
            <CycleStages />
          </SectionCard>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#00796B]"
            >
              <option value="all">All departments</option>
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOnlyAttention((value) => !value)}
              className={cn(
                "h-10 rounded-xl border px-3.5 text-[12.5px] font-medium",
                onlyAttention
                  ? "border-[#00796B] bg-[#00796B]/[0.07] text-[#00574C]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              Needs attention only
            </button>
            <span className="text-[12px] text-slate-400">
              {visible.length} of {students.length} students
            </span>
          </div>

          <SectionCard
            title="Student cycles"
            description="Numbered chips follow the milestone order — hover for the stage, state and deadline."
            action={
              <ul className="flex flex-wrap items-center gap-3">
                {LEGEND.map((item) => (
                  <li key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className={cn("h-2.5 w-2.5 rounded-full", item.tone)} aria-hidden="true" />
                    {item.label}
                  </li>
                ))}
              </ul>
            }
            bodyClassName="px-5 py-2 sm:px-6"
          >
            {visible.length ? (
              visible.map((student) => <StudentProgressRow key={student.student_email} student={student} />)
            ) : (
              <div className="py-3">
                <EmptyState
                  icon={TrendingUp}
                  title="No students in this view"
                  description="Try another department or clear the attention filter."
                />
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}