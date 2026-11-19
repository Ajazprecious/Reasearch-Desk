import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { getAdminSupervision } from "@/lib/server-fns";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/records")({
  validateSearch: (search) => ({ q: typeof search.q === "string" ? search.q : "" }),
  head: () => ({ meta: [{ title: "Supervision records — ResearchDesk" }] }),
  component: AdminRecordsPage,
});

function AdminRecordsPage() {
  const search = Route.useSearch();
  const load = useServerFn(getAdminSupervision);
  const { data, loading, error } = useAsync(() => load(), []);
  const [query, setQuery] = useState(search.q || "");
  const [department, setDepartment] = useState("all");
  const [expanded, setExpanded] = useState("");
  const records = data?.assignments || [];
  const departments = useMemo(() => [...new Set(records.map((item) => item.department).filter(Boolean))].sort(), [records]);
  const visible = records.filter((item) => {
    const needle = query.trim().toLowerCase();
    return (department === "all" || item.department === department) &&
      (!needle || [item.student_name, item.supervisor_name, item.research_title, item.department].some((value) => String(value || "").toLowerCase().includes(needle)));
  });

  return (
    <div className="animate-fade">
      <PageHeader title="Supervision Records" description="View the current supervision record for every research project, including assignment, milestones, draft activity and defence status." />
      {loading ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load supervision records" description={error.message} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
            <label className="relative block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Search</span>
              <Search className="absolute left-3 top-[31px] h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, supervisor or topic…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] outline-none focus:border-[#00796B]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-medium text-slate-500">Department</span>
              <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] outline-none focus:border-[#00796B]">
                <option value="all">All departments</option>
                {departments.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
          </div>

          <SectionCard bodyClassName="px-5 py-2 sm:px-6">
            {visible.length ? visible.map((record) => (
              <article key={record.id} className="border-b border-slate-100 py-4 last:border-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#22343A]">{record.student_name} <span className="text-slate-400">•</span> {record.supervisor_name}</p>
                    <p className="mt-0.5 text-[10.8px] text-slate-500">{record.department || "Department not set"} · {record.research_title || record.programme || "Research title not set"}</p>
                    <p className="mt-0.5 text-[10.5px] text-slate-400">Assigned {formatDate(record.assigned_date)} · {record.approved} of {record.milestones} milestones complete</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={record.overdue ? "needs_attention" : "on_track"} label={record.overdue ? "Needs attention" : "On track"} />
                    <button type="button" onClick={() => setExpanded((current) => current === record.id ? "" : record.id)} className="h-8 rounded-lg border border-slate-200 px-3 text-[10.8px] font-medium text-slate-600 hover:bg-slate-50">
                      {expanded === record.id ? "Close record" : "Open record"}
                    </button>
                  </div>
                </div>
                {expanded === record.id && (
                  <div className="mt-3 rounded-xl bg-[#F8FAFA] p-3">
                    <div className="flex items-center justify-between text-[10.8px] text-slate-500">
                      <span>Research progress</span>
                      <span className="font-semibold text-[#22343A]">{record.progress}%</span>
                    </div>
                    <ProgressBar className="mt-1.5" value={record.progress} />
                    <div className="mt-3 grid gap-2 text-[10.8px] text-slate-500 sm:grid-cols-3">
                      <p>Assignment status: <strong className="text-[#22343A]">{record.status}</strong></p>
                      <p>Approved milestones: <strong className="text-[#22343A]">{record.approved} / {record.milestones}</strong></p>
                      <p>Overdue milestones: <strong className={record.overdue ? "text-[#A15D00]" : "text-[#22343A]"}>{record.overdue}</strong></p>
                    </div>
                  </div>
                )}
              </article>
            )) : (
              <div className="py-4">
                <EmptyState title="No supervision records match" description="Try a different search or department filter." />
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
