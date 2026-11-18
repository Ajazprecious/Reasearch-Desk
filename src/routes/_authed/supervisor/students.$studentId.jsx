import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getSupervisorPortal } from "@/lib/supervisor-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { DaysPill, ProgressPill, SideCard, TrackStatusPill } from "@/components/supervisor/portal/SideCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { formatDate, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/supervisor/students/$studentId")({
  head: () => ({ meta: [{ title: "Student workspace — ResearchDesk" }] }),
  component: StudentWorkspacePage,
});

function StudentWorkspacePage() {
  const { studentId } = useParams({ from: "/_authed/supervisor/students/$studentId" });
  const { user } = useAuth();
  const load = useServerFn(getSupervisorPortal);
  const { data, loading } = useAsync(() => load(), [user?.email]);

  const student = (data?.students || []).find((item) => item.student_email === studentId || item.id === studentId);

  if (loading) return <LoadingBlock rows={5} />;
  if (!student) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Student not found"
        description="This student is not on your supervision list."
        action={
          <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 text-[12.5px]">
            <Link to="/supervisor/students">Back to assigned students</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="animate-fade space-y-5">
      <Link to="/supervisor/students" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#00796B] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Assigned students
      </Link>

      <PageHeader
        eyebrow="Student workspace"
        title={student.student_name}
        description="Review the student's research record, submissions, milestones and overall supervision progress."
      />

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-[#111827]">{student.research_title || "Research title pending"}</h2>
                <p className="mt-1 text-[12px] text-slate-500">{student.programme || student.department}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <TrackStatusPill status={student.status} />
                <ProgressPill value={student.progress} />
              </div>
            </div>

            <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-3 text-[11.5px] sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Current stage</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">{student.stage}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Latest version</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">
                  {student.drafts[0] ? `V${student.drafts[0].version} • ${student.drafts[0].milestone_title}` : "No submission yet"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Next milestone</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">
                  {student.next_milestone
                    ? `${student.next_milestone.title}${student.next_milestone.due_date ? ` • ${formatDate(student.next_milestone.due_date)}` : ""}`
                    : "All milestones approved"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Last activity</dt>
                <dd className="mt-0.5 font-medium text-[#111827]">{student.last_activity ? timeAgo(student.last_activity) : "No activity yet"}</dd>
              </div>
            </dl>

            {student.defence?.scheduled_date && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#FFF9E6] px-3 py-2 text-[11.5px] text-[#8C3B00]">
                <span className="font-medium">Final defence {formatDate(student.defence.scheduled_date)}</span>
                <DaysPill days={student.defence.days_left} />
              </div>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-[#111827]">Needs your attention</h2>
              <span className="rounded-md bg-[#FFF3E0] px-2 py-0.5 text-[11px] font-medium text-[#B25E00]">
                {student.pending_draft ? "1 item" : "0 items"}
              </span>
            </div>
            {student.pending_draft ? (
              <>
                <p className="mt-2 text-[12px] text-slate-600">
                  {student.pending_draft.milestone_title} • Version {student.pending_draft.version} was submitted{" "}
                  {timeAgo(student.pending_draft.submitted_date)} and is waiting for review.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild className="h-9 rounded-lg bg-[#00796B] px-3.5 text-[12.5px] font-medium hover:bg-[#007D6D]">
                    <Link to="/supervisor/reviews/$draftId" params={{ draftId: student.pending_draft.id }}>
                      Review submitted draft
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 px-3.5 text-[12.5px] font-medium text-slate-700">
                    <Link to="/supervisor/progress">Open student progress</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[12px] text-slate-500">Nothing is waiting for you on this student right now.</p>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-[13px] font-semibold text-[#111827]">Recent supervision activity</h2>
            {student.drafts.length ? (
              <ul className="mt-2 divide-y divide-slate-100">
                {student.drafts.slice(0, 5).map((draft) => (
                  <li key={draft.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] text-[#111827]">
                        {draft.milestone_title} Version {draft.version} submitted
                      </p>
                      <p className="text-[11px] text-slate-400">{timeAgo(draft.submitted_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={draft.status} />
                      <Button asChild variant="outline" className="h-8 rounded-lg border-slate-300 px-3 text-[11.5px] font-medium text-slate-700">
                        <Link to="/supervisor/reviews/$draftId" params={{ draftId: draft.id }}>Open</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-slate-500">No submissions recorded yet.</p>
            )}
          </article>
        </div>

        <div className="space-y-4">
          <SideCard title="Milestone progress">
            <p className="text-[12px] text-slate-500">
              {student.approved} of {student.total} milestones approved
            </p>
            <ProgressBar className="mt-2.5" value={student.progress} showLabel />
            <ul className="mt-3 space-y-2">
              {student.milestones.slice(0, 4).map((milestone) => (
                <li key={milestone.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11.5px] text-slate-600">{milestone.title}</span>
                  <StatusBadge status={milestone.status} />
                </li>
              ))}
            </ul>
          </SideCard>

          <SideCard title="Quick actions">
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 text-[11.5px] font-medium text-slate-700">
                <Link to="/supervisor/reviews">Review queue</Link>
              </Button>
              <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 text-[11.5px] font-medium text-slate-700">
                <Link to="/supervisor/progress">Student progress</Link>
              </Button>
              <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 text-[11.5px] font-medium text-slate-700">
                <Link to="/supervisor/timeline">Timeline & defences</Link>
              </Button>
              <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 text-[11.5px] font-medium text-slate-700">
                <Link to="/supervisor/students">All students</Link>
              </Button>
            </div>
          </SideCard>
        </div>
      </div>
    </div>
  );
}