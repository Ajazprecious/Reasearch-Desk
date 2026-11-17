import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getSupervisorPortal } from "@/lib/supervisor-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { DaysPill, ProgressPill, TrackStatusPill } from "@/components/supervisor/portal/SideCard";
import { formatDate, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/supervisor/students/")({
  validateSearch: (search) => ({ q: typeof search.q === "string" ? search.q : undefined }),
  head: () => ({ meta: [{ title: "Assigned students — ResearchDesk" }] }),
  component: AssignedStudentsPage,
});

const STATUS_FILTERS = [
  { key: "all", label: "All students" },
  { key: "on_track", label: "On track" },
  { key: "needs_attention", label: "Needs attention" },
  { key: "awaiting_review", label: "Awaiting review" },
];

function AssignedStudentsPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const load = useServerFn(getSupervisorPortal);
  const { data, loading } = useAsync(() => load(), [user?.email]);
  const [term, setTerm] = useState(search.q || "");
  const [status, setStatus] = useState("all");
  const [stage, setStage] = useState("all");

  const students = data?.students || [];
  const stages = [...new Set(students.map((student) => student.stage).filter(Boolean))];
  const needle = term.trim().toLowerCase();
  const filtered = students.filter((student) => {
    const matchesTerm =
      !needle ||
      `${student.student_name} ${student.research_title} ${student.student_email}`.toLowerCase().includes(needle);
    const matchesStatus = status === "all" || student.status === status;
    const matchesStage = stage === "all" || student.stage === stage;
    return matchesTerm && matchesStatus && matchesStage;
  });

  return (
    <div className="animate-fade">
      <PageHeader
        eyebrow="Supervision"
        title="Assigned students"
        description="Open a student's supervision workspace to review research activity, drafts, milestones and progress."
      />

      <div className="mb-4 grid gap-2 rounded-2xl border border-slate-200/70 bg-white p-3 sm:grid-cols-[1fr_180px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search student or research topic…"
            aria-label="Search student or research topic"
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[13px] text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#00796B]/60 focus:ring-2 focus:ring-[#00796B]/10"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#00796B]/60"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <select
          value={stage}
          onChange={(event) => setStage(event.target.value)}
          aria-label="Filter by research stage"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#00796B]/60"
        >
          <option value="all">All research stages</option>
          {stages.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingBlock rows={4} />
      ) : filtered.length ? (
        <div className="space-y-3">
          {filtered.map((student) => (
            <article key={student.id} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.4)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-[14px] font-semibold text-[#111827]">{student.student_name}</h2>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">{student.research_title || "Research title pending"}</p>
                  <p className="mt-0.5 text-[11.5px] text-slate-400">
                    {student.stage}
                    {student.last_activity ? ` • Last activity ${timeAgo(student.last_activity)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <TrackStatusPill status={student.status} />
                  <DaysPill days={student.days_left} />
                  <ProgressPill value={student.progress} />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-[11.5px] text-slate-500">
                  <p>
                    {student.next_milestone
                      ? `Next: ${student.next_milestone.title}${student.next_milestone.due_date ? ` • ${formatDate(student.next_milestone.due_date)}` : ""}`
                      : "All milestones approved"}
                    {student.defence?.scheduled_date ? ` • Defence ${formatDate(student.defence.scheduled_date)}` : ""}
                  </p>
                  <p className="mt-0.5">
                    {student.pending_draft
                      ? `Version ${student.pending_draft.version} awaiting your review`
                      : student.revisions
                        ? `${student.revisions} revision${student.revisions === 1 ? "" : "s"} open`
                        : "No pending review"}
                  </p>
                </div>
                <Button asChild className="h-9 shrink-0 rounded-lg bg-[#00796B] px-3.5 text-[12.5px] font-medium hover:bg-[#007D6D]">
                  <Link to="/supervisor/students/$studentId" params={{ studentId: student.student_email }}>Open workspace</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={students.length ? "No students match these filters" : "No students assigned yet"}
          description={
            students.length
              ? "Adjust the search or filters to see the rest of your supervision list."
              : "Assignments confirmed by the research office appear here with their milestones and drafts."
          }
        />
      )}
    </div>
  );
}