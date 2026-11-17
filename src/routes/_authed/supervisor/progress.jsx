import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getSupervisorPortal } from "@/lib/supervisor-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { DaysPill, ProgressPill, TrackStatusPill } from "@/components/supervisor/portal/SideCard";

export const Route = createFileRoute("/_authed/supervisor/progress")({
  head: () => ({ meta: [{ title: "Student progress — ResearchDesk" }] }),
  component: StudentProgressPage,
});

function Summary({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <p className="text-[11.5px] font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.02em] text-[#111827]">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function StudentProgressPage() {
  const { user } = useAuth();
  const load = useServerFn(getSupervisorPortal);
  const { data, loading } = useAsync(() => load(), [user?.email]);
  const totals = data?.totals || {};

  return (
    <div className="animate-fade">
      <PageHeader
        eyebrow="Supervision"
        title="Student progress"
        description="Monitor supervision progress across your assigned students and identify where attention is needed."
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary label="Assigned students" value={totals.students ?? 0} hint="Active supervision" />
            <Summary label="Milestones completed" value={totals.milestonesApproved ?? 0} hint="Across current students" />
            <Summary label="Awaiting review" value={totals.awaitingReview ?? 0} hint="Pending drafts" />
            <Summary label="Revision required" value={totals.revisions ?? 0} hint="Open correction cycles" />
          </div>

          {data?.students?.length ? (
            <div className="space-y-2.5">
              {data.students.map((student) => (
                <article key={student.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-[13.5px] font-semibold text-[#111827]">{student.student_name}</h2>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">
                        {student.approved} of {student.total} milestones • {student.stage}
                        {student.pending_draft ? ` • V${student.pending_draft.version} awaiting review` : ""}
                        {!student.pending_draft && student.revisions ? " • revision open" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <DaysPill days={student.days_left} />
                      <ProgressPill value={student.progress} />
                      <TrackStatusPill status={student.status} />
                      <Button asChild variant="outline" className="h-8 rounded-lg border-slate-300 px-3 text-[11.5px] font-medium text-slate-700">
                        <Link to="/supervisor/students/$studentId" params={{ studentId: student.student_email }}>
                          Open student
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No students assigned" description="Confirmed assignments appear here with their supervision progress." />
          )}
        </div>
      )}
    </div>
  );
}