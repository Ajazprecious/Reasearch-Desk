import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getSupervisorPortal } from "@/lib/supervisor-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { KpiTile } from "@/components/supervisor/portal/KpiTile";
import { SideCard, DaysPill, ProgressPill, TrackStatusPill } from "@/components/supervisor/portal/SideCard";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/supervisor/")({
  head: () => ({ meta: [{ title: "Supervisor dashboard — ResearchDesk" }] }),
  component: SupervisorDashboard,
});

function SupervisorDashboard() {
  const { user } = useAuth();
  const load = useServerFn(getSupervisorPortal);
  const { data, loading } = useAsync(() => load(), [user?.email]);

  const totals = data?.totals || {};
  const profile = data?.profile;
  const capacity = Number(profile?.max_capacity || 0);
  const used = Number(profile?.current_load || 0);

  return (
    <div className="animate-fade">
      <PageHeader
        eyebrow="Supervision"
        title="Supervisor dashboard"
        description="Your review workload, assigned students and progress overview."
        actions={
          <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            <Link to="/supervisor/reviews">
              <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden="true" /> Open review queue
            </Link>
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Assigned students" value={totals.students ?? 0} hint="Active supervision" tone="teal" />
            <KpiTile label="Awaiting review" value={totals.awaitingReview ?? 0} hint="Drafts pending" tone="amber" />
            <KpiTile label="Revision cycles" value={totals.revisions ?? 0} hint="Open corrections" tone="rose" />
            <KpiTile label="Milestones due" value={totals.dueSoon ?? 0} hint="Within 7 days" tone="green" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SideCard title="Supervision capacity" description={profile ? `${profile.academic_rank || "Supervisor"} • ${profile.department || ""}` : "No expertise profile yet"}>
              <p className="text-[13px] font-medium text-[#111827]">{used} of {capacity || "—"} slots used</p>
              <ProgressBar className="mt-3" value={capacity ? Math.round((used / capacity) * 100) : 0} tone={capacity && used >= capacity ? "rose" : "teal"} />
              <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
                {capacity - used > 0
                  ? `${capacity - used} supervision slot${capacity - used === 1 ? "" : "s"} remain available for new assignments.`
                  : "You are at capacity — new matches pause until a slot opens."}
              </p>
              <Link to="/supervisor/profile" className="mt-2 inline-flex text-[12px] font-medium text-[#00796B] hover:underline">
                Update expertise & capacity →
              </Link>
            </SideCard>

            <SideCard
              title="Priority"
              description={`${totals.awaitingReview || 0} draft${totals.awaitingReview === 1 ? "" : "s"} awaiting review`}
            >
              <p className="text-[11.5px] leading-relaxed text-slate-500">
                {totals.oldestWaiting
                  ? `The oldest pending review has been waiting for ${totals.oldestWaiting} day${totals.oldestWaiting === 1 ? "" : "s"}.`
                  : "Nothing is waiting on you right now."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild className="h-9 rounded-lg bg-[#00695C] px-3.5 text-[12.5px] font-medium hover:bg-[#00594E]">
                  <Link to="/supervisor/reviews">Review drafts</Link>
                </Button>
                <Button asChild variant="outline" className="h-9 rounded-lg border-slate-300 px-3.5 text-[12.5px] font-medium text-slate-700">
                  <Link to="/supervisor/timeline">Timeline & defences</Link>
                </Button>
              </div>
            </SideCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SideCard
              title="Priority review queue"
              action={
                <Link to="/supervisor/reviews" className="text-[12px] font-medium text-[#00796B] hover:underline">
                  All reviews
                </Link>
              }
            >
              {data?.pending?.length ? (
                <div className="divide-y divide-slate-100">
                  {data.pending.slice(0, 4).map((draft) => (
                    <div key={draft.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-[#111827]">
                          {draft.student_name} — {draft.milestone_title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Version {draft.version} • {draft.submitted_date ? formatDate(draft.submitted_date) : "recently"}
                        </p>
                      </div>
                      <Button asChild variant="outline" className="h-8 rounded-lg border-slate-300 px-3 text-[11.5px] font-medium text-slate-700">
                        <Link to="/supervisor/reviews/$draftId" params={{ draftId: draft.id }}>Review</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={ClipboardCheck} title="Queue is clear" description="New submissions appear here the moment a student uploads." />
              )}
            </SideCard>

            <SideCard title="Student progress">
              {data?.students?.length ? (
                <div className="divide-y divide-slate-100">
                  {data.students.slice(0, 5).map((student) => (
                    <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-[#111827]">{student.student_name}</p>
                        <p className="text-[11px] text-slate-500">
                          {student.progress}% complete • {student.stage}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DaysPill days={student.days_left} />
                        <TrackStatusPill status={student.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No students yet" description="Assignments confirmed by the research office appear here." />
              )}
            </SideCard>
          </div>

          {data?.nearestDefence && (
            <div className="rounded-xl border border-[#FBEFC8] bg-[#FFF9E6] px-4 py-3 text-[12.5px] text-[#8C3B00]">
              Nearest defence in {data.nearestDefence.days_left} days · {formatDate(data.nearestDefence.scheduled_date)}
              {data.nearestDefence.venue ? ` · ${data.nearestDefence.venue}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}