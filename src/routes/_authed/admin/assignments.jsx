import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { formatDate } from "@/lib/format";
import { getAdminSupervision } from "@/lib/server-fns";

export const Route = createFileRoute("/_authed/admin/assignments")({
  head: () => ({ meta: [{ title: "Supervision records — ResearchDesk" }] }),
  component: AdminAssignmentsPage,
});

function AdminAssignmentsPage() {
  const load = useServerFn(getAdminSupervision);
  const { data, loading, error } = useAsync(() => load(), []);

  return (
    <div className="animate-fade">
      <PageHeader title="Assignments & supervision records" description="Every confirmed pairing with its live progress, plus supervisor workload across departments." />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load supervision records" description={error.message} />
      ) : (
        <div className="space-y-5">
          <SectionCard title="Confirmed assignments" description={`${data?.assignments?.length || 0} supervision record(s)`} bodyClassName="px-5 py-3 sm:px-6">
            {data?.assignments?.length ? (
              <div className="overflow-x-auto scrollbar-slim">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                      <th className="py-2.5 pr-4 font-medium">Student</th>
                      <th className="py-2.5 pr-4 font-medium">Supervisor</th>
                      <th className="py-2.5 pr-4 font-medium">Department</th>
                      <th className="py-2.5 pr-4 font-medium">Assigned</th>
                      <th className="py-2.5 pr-4 font-medium">Progress</th>
                      <th className="py-2.5 pr-4 font-medium">Overdue</th>
                      <th className="py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b border-slate-50 text-[13px] last:border-0">
                        <td className="py-3.5 pr-4">
                          <p className="font-medium text-[#0A1929]">{assignment.student_name}</p>
                          <p className="text-[11.5px] text-slate-400">{assignment.programme || assignment.student_email}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-slate-600">{assignment.supervisor_name}</td>
                        <td className="py-3.5 pr-4 text-slate-500">{assignment.department || "—"}</td>
                        <td className="py-3.5 pr-4 text-slate-500">{formatDate(assignment.assigned_date)}</td>
                        <td className="py-3.5 pr-4">
                          <div className="w-[130px]">
                            <ProgressBar value={assignment.progress} showLabel />
                          </div>
                        </td>
                        <td className="py-3.5 pr-4">
                          {assignment.overdue ? (
                            <span className="rounded-full bg-[#FFEBEE] px-2 py-0.5 text-[11px] font-medium text-[#C62828]">{assignment.overdue}</span>
                          ) : (
                            <span className="text-[12px] text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <StatusBadge status={assignment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-3">
                <EmptyState icon={Users} title="No assignments yet" description="Confirm a ranked supervisor suggestion to open the first supervision record." />
              </div>
            )}
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard className="lg:col-span-2" title="Supervisor workload" description="Active supervisions against declared capacity." bodyClassName="px-5 py-4 sm:px-6">
              {data?.supervisors?.length ? (
                <div className="space-y-3.5">
                  {data.supervisors.map((supervisor) => {
                    const used = supervisor.max ? Math.round((supervisor.load / supervisor.max) * 100) : 0;
                    return (
                      <div key={supervisor.email}>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                          <span className="font-medium text-[#0A1929]">
                            {supervisor.name} <span className="font-normal text-slate-400">· {supervisor.department}</span>
                          </span>
                          <span className="tabular-nums text-slate-500">
                            {supervisor.load}/{supervisor.max} · {supervisor.students} active
                          </span>
                        </div>
                        <ProgressBar value={used} tone={used >= 100 ? "rose" : used >= 70 ? "amber" : "teal"} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12.5px] text-slate-500">No supervisor profiles yet.</p>
              )}
            </SectionCard>

            <SectionCard title="Unassigned students" description="Profiles without a confirmed supervisor.">
              {data?.unassigned?.length ? (
                <ul className="space-y-2.5">
                  {data.unassigned.map((student) => (
                    <li key={student.student_email} className="rounded-lg bg-[#FBFCFC] px-3 py-2">
                      <p className="truncate text-[12.5px] font-medium text-[#0A1929]">{student.student_name || student.student_email}</p>
                      <p className="truncate text-[11.5px] text-slate-500">{student.research_title}</p>
                      <div className="mt-1.5">
                        <StatusBadge status={student.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px] text-slate-500">Every student has a supervisor.</p>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}