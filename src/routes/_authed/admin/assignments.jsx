import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Search, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { TintedStat } from "@/components/workspace/TintedStat";
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const assignments = data?.assignments || [];
  const unassigned = data?.unassigned || [];
  const visible = useMemo(() => assignments.filter((item) => {
    const needle = query.trim().toLowerCase();
    return (status === "all" || item.status === status) &&
      (!needle || [item.student_name, item.supervisor_name, item.department].some((value) => String(value || "").toLowerCase().includes(needle)));
  }), [assignments, query, status]);
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="animate-fade">
      <PageHeader title="Supervisor Assignments" description="View active student-supervisor assignments, assignment history and unassigned research profiles." />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load supervision records" description={error.message} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <TintedStat label="Active assignments" value={assignments.filter((item) => item.status === "active").length} hint="Current supervision pairs" tone="mint" />
            <TintedStat label="Assigned this month" value={assignments.filter((item) => String(item.assigned_date || "").startsWith(currentMonth)).length} hint="New confirmed assignments" tone="blue" />
            <TintedStat label="Assignment history" value={assignments.length} hint="All confirmed pairs on record" tone="cream" />
            <TintedStat label="Unassigned" value={unassigned.length} hint="Still awaiting confirmation" tone="rose" />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block flex-1">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Search</span>
              <Search className="absolute left-3 top-[31px] h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or supervisor…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-[#00796B]" />
            </label>
            <label className="block sm:w-48">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All assignments</option>
                <option value="active">Active assignments</option>
                <option value="inactive">Inactive assignments</option>
              </select>
            </label>
          </div>

          <SectionCard bodyClassName="px-5 py-2 sm:px-6">
            {visible.length ? visible.map((assignment) => (
              <div key={assignment.id} className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#22343A]">{assignment.student_name} <span className="text-slate-400">→</span> {assignment.supervisor_name}</p>
                  <p className="mt-0.5 text-[10.8px] text-slate-500">Confirmed {formatDate(assignment.assigned_date)} · {assignment.department || "Department not set"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={assignment.status} />
                  <Link to="/admin/records" search={{ q: assignment.student_name }} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-[10.8px] font-medium text-slate-600 hover:bg-slate-50">
                    View record
                  </Link>
                </div>
              </div>
            )) : (
              <div className="py-4">
                <EmptyState icon={Users} title="No assignments in this view" description="Adjust the search or status filter." />
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}