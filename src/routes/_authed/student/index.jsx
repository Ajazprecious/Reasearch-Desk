import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Flag, Layers, NotebookPen, UserRoundCheck } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { StatCard } from "@/components/workspace/StatCard";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { SupervisorCard } from "@/components/student/SupervisorCard";
import { MilestoneRow } from "@/components/student/MilestoneRow";
import { dueLabel, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/student/")({
  head: () => ({ meta: [{ title: "Research overview — ResearchDesk" }] }),
  component: StudentOverview,
});

function StudentOverview() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => {
    const email = user.email;
    const [profiles, assignments, milestones, drafts, feedbacks] = await Promise.all([
      localClient.entities.ResearchProfile.filter({ student_email: email }, { sort: "-created_date", limit: 1 }),
      localClient.entities.Assignment.filter({ student_email: email }, { sort: "-created_date", limit: 1 }),
      localClient.entities.Milestone.filter({ student_email: email }, { sort: "order", limit: 50 }),
      localClient.entities.Draft.filter({ student_email: email }, { sort: "-submitted_date", limit: 50 }),
      localClient.entities.Feedback.filter({ student_email: email }, { sort: "-reviewed_date", limit: 5 }),
    ]);
    const profile = profiles.items[0] || null;
    let supervisor = null;
    if (profile?.supervisor_email) {
      const supervisors = await localClient.entities.SupervisorProfile.filter({ email: profile.supervisor_email }, { limit: 1 });
      supervisor = supervisors.items[0] || null;
    }
    const list = milestones.items;
    const approved = list.filter((milestone) => milestone.status === "approved").length;
    const next = list.filter((milestone) => milestone.status !== "approved")[0] || null;
    return {
      profile,
      assignment: assignments.items[0] || null,
      supervisor,
      milestones: list,
      approved,
      progress: list.length ? Math.round((approved / list.length) * 100) : profile?.progress || 0,
      revisions: list.filter((milestone) => milestone.status === "revision_required").length,
      next,
      drafts: drafts.items,
      feedbacks: feedbacks.items,
    };
  }, [user?.email]);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Dashboard"
        description="Your research supervision at a glance."
        actions={
          <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            <Link to="/student/workspace/submit">
              <Layers className="mr-1.5 h-4 w-4" aria-hidden="true" /> Submit new draft
            </Link>
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-6">
          {(!data?.profile || data.profile.status === "draft") && (
            <div className="flex flex-col gap-4 rounded-2xl border border-[#FFE0B2] bg-[#FFF8F1] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#8A4B00]">
                  {data?.profile ? "Your research profile is still a draft" : "Set up your research profile"}
                </p>
                <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-[#A15D00]">
                  Add your title, area and keywords, then submit it — the research office uses it to match you with the right supervisor.
                </p>
              </div>
              <Button asChild className="h-10 shrink-0 rounded-xl bg-[#EF6C00] px-4 text-[13px] font-medium hover:bg-[#E06200]">
                <Link to="/student/profile">
                  <NotebookPen className="mr-1.5 h-4 w-4" aria-hidden="true" /> Complete profile
                </Link>
              </Button>
            </div>
          )}

          {data?.profile && data.profile.status !== "draft" && (
            <SectionCard
              className="rounded-2xl"
              bodyClassName="px-5 py-4 sm:px-6"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00796B]">Current research</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#0A1929]">
                    {data.profile.title || "Postgraduate research project"}
                  </p>
                  <p className="mt-1 text-[12.5px] text-slate-500">
                    Supervisor: {data.profile.supervisor_name || "Awaiting assignment"}
                  </p>
                  {data.next && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={data.next.status} label={data.next.status === "in_progress" ? "In progress" : data.next.status} />
                      {data.next.status === "in_progress" && <StatusBadge status="under_review" label="Awaiting review" />}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-[12px] text-slate-500">
                    <span>Overall progress</span>
                    <span className="font-medium tabular-nums text-[#0A1929]">{data.progress}%</span>
                  </div>
                  <ProgressBar value={data.progress} />
                  {data.next?.due_date && (
                    <p className="mt-3 text-[12.5px] text-slate-500">
                      Next target: <span className="font-medium text-[#0A1929]">{data.next.title}</span>
                      <span className="text-slate-400"> · {formatDate(data.next.due_date)}</span>
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Current milestone" value={data?.next?.title || "None"} hint={data?.next?.due_date ? `Due ${formatDate(data.next.due_date)}` : "No milestone pending"} icon={Flag} tone="teal" />
            <StatCard label="Pending feedback" value={data?.revisions || 0} hint={data?.revisions ? "Feedback waiting on you" : "Nothing outstanding"} icon={Layers} tone={data?.revisions ? "rose" : "mint"} />
            <StatCard label="Milestones complete" value={`${data?.approved || 0} of ${data?.milestones?.length || 0}`} hint={`${data?.progress || 0}% complete`} icon={CalendarClock} tone="blue" />
            <StatCard
              label="Next deadline"
              value={data?.next?.due_date ? formatDate(data.next.due_date) : "—"}
              hint={data?.next?.due_date ? dueLabel(data.next.due_date) : "No dated milestone"}
              icon={CalendarClock}
              tone="amber"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              title="Milestone tracker"
              description="Descriptive progress only — confirmed work, not predictions."
              action={
                <Link to="/student/milestones" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#00796B] hover:underline">
                  View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
              bodyClassName="px-5 py-1 sm:px-6"
            >
              {data?.milestones?.length ? (
                <>
                  <div className="py-4">
                    <div className="mb-2 flex items-center justify-between text-[12px] text-slate-500">
                      <span>Confirmed progress</span>
                      <span className="font-medium tabular-nums text-[#0A1929]">{data.progress}%</span>
                    </div>
                    <ProgressBar value={data.progress} />
                  </div>
                  {data.milestones.slice(0, 4).map((milestone) => (
                    <MilestoneRow
                      key={milestone.id}
                      milestone={milestone}
                      draftCount={data.drafts.filter((draft) => draft.milestone_id === milestone.id).length}
                    />
                  ))}
                </>
              ) : (
                <div className="py-4">
                  <EmptyState
                    icon={Flag}
                    title="Your milestones open with supervision"
                    description="Once the research office confirms your supervisor, the standard chapter milestones and deadlines appear here."
                  />
                </div>
              )}
            </SectionCard>

            <div className="space-y-5">
              <SectionCard
                title="Your supervisor"
                action={
                  <Link to="/student/supervisor" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
                    Details
                  </Link>
                }
              >
                {data?.profile?.supervisor_email ? (
                  <SupervisorCard supervisor={data.supervisor} supervisorName={data.profile.supervisor_name} />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <UserRoundCheck className="h-4 w-4 text-[#EF6C00]" aria-hidden="true" />
                      <p className="text-[13px] font-medium text-[#0A1929]">Awaiting assignment</p>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-slate-500">
                      {data?.profile?.status === "submitted"
                        ? "Your research profile is with the research office. Ranked supervisor matches are being reviewed."
                        : "Submit your research profile to start the supervisor matching process."}
                    </p>
                    <StatusBadge status={data?.profile?.status === "submitted" ? "under_review" : "draft"} label={data?.profile?.status === "submitted" ? "Matching in progress" : "Profile draft"} />
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Latest feedback" description="From your supervisor's most recent review.">
                {data?.feedbacks?.length ? (
                  <ul className="space-y-3">
                    {data.feedbacks.slice(0, 3).map((feedback) => (
                      <li key={feedback.id} className="rounded-xl border border-slate-100 bg-[#FBFCFC] px-3.5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12.5px] font-medium text-[#0A1929]">{feedback.milestone_title}</p>
                          <StatusBadge status={feedback.outcome} label={feedback.outcome === "approved" ? "Approved" : "Revision"} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-slate-500">{feedback.comments}</p>
                        <p className="mt-1.5 text-[11px] text-slate-400">V{feedback.version} · {formatDate(feedback.reviewed_date)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-slate-500">No feedback yet — it appears here after your supervisor reviews a draft.</p>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}