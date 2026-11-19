import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { getAdminProgress } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/admin/progress")({
  head: () => ({ meta: [{ title: "Department progress — ResearchDesk" }] }),
  component: AdminProgressPage,
});

function AdminProgressPage() {
  const load = useServerFn(getAdminProgress);
  const { data, loading, error } = useAsync(() => load(), []);
  const [faculty, setFaculty] = useState("all");
  const [department, setDepartment] = useState("all");
  const students = data?.students || [];
  const faculties = useMemo(() => [...new Set(students.map((item) => item.faculty).filter(Boolean))].sort(), [students]);
  const departments = useMemo(
    () => [...new Set(students.filter((item) => faculty === "all" || item.faculty === faculty).map((item) => item.department).filter(Boolean))].sort(),
    [students, faculty],
  );
  const visibleStudents = students.filter(
    (item) => (faculty === "all" || item.faculty === faculty) && (department === "all" || item.department === department),
  );
  const departmentRows = useMemo(() => {
    const groups = new Map();
    visibleStudents.forEach((student) => {
      const name = student.department || "Department not set";
      const row = groups.get(name) || { name, faculty: student.faculty || "", count: 0, progress: 0, overdue: 0, awaitingReview: 0, stages: new Map() };
      row.count += 1;
      row.progress += student.progress || 0;
      row.overdue += student.overdue || 0;
      row.awaitingReview += student.drafts?.awaitingReview || 0;
      if (student.next?.title) row.stages.set(student.next.title, (row.stages.get(student.next.title) || 0) + 1);
      groups.set(name, row);
    });
    return [...groups.values()]
      .map((row) => ({
        ...row,
        progress: row.count ? Math.round(row.progress / row.count) : 0,
        stage: [...row.stages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
      }))
      .sort((a, b) => b.count - a.count);
  }, [visibleStudents]);
  const attention = departmentRows.filter((item) => item.overdue > 0 || item.progress < 35);
  const attentionDepartment = attention[0];

  return (
    <div className="animate-fade">
      <PageHeader title="Department Progress" description="Compare research progress across departments at a glance, then open the department that needs attention." />
      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load department progress" description={error.message} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr]">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Faculty / School</span>
              <select value={faculty} onChange={(event) => { setFaculty(event.target.value); setDepartment("all"); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All faculties</option>
                {faculties.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Department</span>
              <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All departments</option>
                {departments.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
          </div>

          <SectionCard
            title="How progress is shown"
            description="Bars represent completed research milestones across active projects. They describe recorded progress, not predictions."
            action={<span className="rounded-full bg-[#EFF4FF] px-2.5 py-1 text-[10.5px] font-medium text-[#5275A5]">Descriptive, not predictive</span>}
            bodyClassName="hidden"
          >
            <span />
          </SectionCard>

          <SectionCard bodyClassName="px-5 py-2 sm:px-6">
            {departmentRows.length ? departmentRows.map((item) => {
              const status = item.overdue ? "Needs attention" : item.progress < 35 ? "Needs attention" : "On track";
              const attentionStyle = status === "Needs attention";
              return (
                <div key={item.name} className="grid gap-3 border-b border-slate-100 py-3.5 last:border-0 md:grid-cols-[1fr_1.15fr_1fr] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-[#22343A]">{item.name}</p>
                    <p className="mt-0.5 truncate text-[10.8px] text-slate-400">{item.faculty || "Faculty not set"}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10.8px] text-slate-500">
                      <span>Milestone completion</span><strong className="text-[#293C41]">{item.progress}%</strong>
                    </div>
                    <ProgressBar value={item.progress} tone={attentionStyle ? "amber" : "teal"} />
                    <p className="mt-1 text-[10.5px] text-slate-400">
                      {item.stage ? `Most projects: ${item.stage}.` : `${item.count} active research project${item.count === 1 ? "" : "s"}.`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium ${attentionStyle ? "bg-[#FFF3E0] text-[#A15D00]" : "bg-[#E8F5E9] text-[#367C55]"}`}>
                      {status}
                    </span>
                    <span className="text-right text-[10.5px] text-slate-400">
                      {item.overdue ? `${item.overdue} overdue items` : `${item.awaitingReview} review${item.awaitingReview === 1 ? "" : "s"} pending`}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="py-4">
                <EmptyState icon={TrendingUp} title="No department progress to show" description="Student milestone data will appear here once research profiles and milestones are recorded." />
              </div>
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard title={attentionDepartment ? `${attentionDepartment.name} — attention snapshot` : "Department attention snapshot"} description={
              attentionDepartment
                ? `This department has ${attentionDepartment.overdue} overdue milestone${attentionDepartment.overdue === 1 ? "" : "s"} or is progressing below the expected recorded rate.`
                : "No department currently requires an attention follow-up."
            }>
              {attentionDepartment && (
                <Link to="/admin/records" search={{ q: attentionDepartment.name }} className="inline-flex h-8 items-center rounded-lg bg-[#00796B] px-3 text-[10.8px] font-medium text-white hover:bg-[#00695C]">
                  Open department records
                </Link>
              )}
            </SectionCard>
            <SectionCard title="Progress status">
              <div className="space-y-2 text-[10.8px]">
                <p><span className="mr-2 rounded-full bg-[#E8F5E9] px-2 py-1 font-medium text-[#367C55]">On track</span> Milestones generally progressing as scheduled</p>
                <p><span className="mr-2 rounded-full bg-[#FFF3E0] px-2 py-1 font-medium text-[#A15D00]">Needs attention</span> Delay, revision or review bottleneck</p>
                <p><span className="mr-2 rounded-full bg-[#FFEBEE] px-2 py-1 font-medium text-[#B34B56]">Delayed</span> Material overdue milestone or unresolved delay</p>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
