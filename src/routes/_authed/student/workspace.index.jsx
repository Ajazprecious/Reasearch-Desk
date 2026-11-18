import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, FileText, MessageSquarePlus, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/workspace/SectionCard";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { useStudentWorkspace, versionsFor } from "@/hooks/useStudentWorkspace";
import { dueLabel, formatDate, formatDateTime, initials, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authed/student/workspace/")({
  head: () => ({ meta: [{ title: "My Workspace — ResearchDesk" }] }),
  component: StudentWorkspaceOverview,
});

function StudentWorkspaceOverview() {
  const { data, loading } = useStudentWorkspace();

  if (loading) return <LoadingBlock rows={4} />;

  const milestones = data?.milestones || [];
  const drafts = data?.drafts || [];
  const feedbacks = data?.feedbacks || [];
  const current = milestones.find((milestone) => milestone.status !== "approved") || milestones[milestones.length - 1] || null;
  const currentVersions = current ? versionsFor(drafts, current.id) : [];
  const recent = drafts.slice(0, 4);
  const latest = drafts[0];
  const latestFeedback = latest ? feedbacks.find((feedback) => feedback.draft_id === latest.id) : null;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Supervisor assignment"
        action={
          <StatusBadge
            status={data?.profile?.supervisor_email ? "assigned" : "awaiting"}
            label={data?.profile?.supervisor_email ? "Assigned" : "Awaiting assignment"}
          />
        }
      >
        {data?.profile?.supervisor_email ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0F2F1] text-[12.5px] font-semibold text-[#00695C]">
                {initials(data.profile.supervisor_name)}
              </span>
              <div>
                <p className="text-[13.5px] font-medium text-[#0A1929]">{data.profile.supervisor_name}</p>
                <p className="text-[12px] text-slate-500">
                  {[data.supervisor?.department, data.assignment?.assigned_date ? `Assigned ${formatDate(data.assignment.assigned_date)}` : null]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            </div>
            <Link to="/student/supervisor" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
              Supervisor details
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.8px] text-slate-500">Your supervisor appears here once the research office confirms the assignment.</p>
            <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 text-[12.5px]">
              <Link to="/student/profile">Complete research profile</Link>
            </Button>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <SectionCard
            title={current ? current.title : "Current chapter"}
            description={current ? "The chapter your workspace is focused on right now." : undefined}
            action={current ? <StatusBadge status={current.status} /> : null}
          >
            {current ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E0] px-2.5 py-1 text-[11.5px] font-medium text-[#92400E]">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> {current.due_date ? `Due ${formatDate(current.due_date)}` : "No date set"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600">
                    {currentVersions.length ? `Current version: V${currentVersions[0].version}` : "No version submitted"}
                  </span>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[12px] text-slate-500">
                    <span>Overall progress</span>
                    <span className="font-medium tabular-nums text-[#0A1929]">{data.progress}%</span>
                  </div>
                  <ProgressBar value={data.progress} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-[13px]">
                    <Link to="/student/workspace/chapters">Open chapter</Link>
                  </Button>
                  <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
                    <Link to="/student/workspace/submit" search={{ chapter: current.id }}>
                      Submit chapter draft
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No chapters open yet"
                description="Your chapter list opens as soon as the research office confirms your supervisor."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Recent submissions"
            action={
              <Link to="/student/workspace/drafts" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#00796B] hover:underline">
                All versions <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
            bodyClassName="px-5 py-2 sm:px-6"
          >
            {recent.length ? (
              <ul className="divide-y divide-slate-100">
                {recent.map((draft) => (
                  <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#0A1929]">{draft.milestone_title || draft.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">
                        Version {draft.version} • {timeAgo(draft.submitted_date)} • {formatDateTime(draft.submitted_date)}
                      </p>
                    </div>
                    <StatusBadge status={draft.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4">
                <EmptyState icon={FileText} title="No drafts submitted yet" description="Upload your first chapter draft to start the supervision record." />
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Latest submission activity">
            {latest ? (
              <ol className="space-y-3">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />
                  <div>
                    <p className="text-[12.8px] font-medium text-[#0A1929]">Uploaded</p>
                    <p className="text-[11.5px] text-slate-500">
                      {latest.milestone_title} • V{latest.version} • {timeAgo(latest.submitted_date)}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />
                  <div>
                    <p className="text-[12.8px] font-medium text-[#0A1929]">Submitted for review</p>
                    <p className="text-[11.5px] text-slate-500">{formatDateTime(latest.submitted_date)}</p>
                  </div>
                </li>
                {latestFeedback && (
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00796B]" aria-hidden="true" />
                    <div>
                      <p className="text-[12.8px] font-medium text-[#0A1929]">
                        {latestFeedback.outcome === "approved" ? "Approved by supervisor" : "Feedback received"}
                      </p>
                      <p className="text-[11.5px] text-slate-500">{formatDateTime(latestFeedback.reviewed_date)}</p>
                    </div>
                  </li>
                )}
              </ol>
            ) : (
              <p className="text-[12.5px] text-slate-500">Your submission timeline starts with your first draft.</p>
            )}
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="space-y-2">
              <Button asChild className="h-10 w-full rounded-xl bg-[#00796B] text-[13px] font-medium hover:bg-[#007D6D]">
                <Link to="/student/workspace/feedback">
                  <MessageSquarePlus className="mr-1.5 h-4 w-4" aria-hidden="true" /> View feedback
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 w-full rounded-xl border-slate-200 text-[13px]">
                <Link to="/student/milestones">
                  <UserRoundCheck className="mr-1.5 h-4 w-4" aria-hidden="true" /> Milestones
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
              View feedback opens My Workspace → Feedback & Revision with your latest review.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}