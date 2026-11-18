import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Flag, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { StatCard } from "@/components/workspace/StatCard";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { useStudentWorkspace, versionsFor } from "@/hooks/useStudentWorkspace";
import { dueLabel, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/student/progress")({
  head: () => ({ meta: [{ title: "Progress — ResearchDesk" }] }),
  component: StudentProgressPage,
});

function StudentProgressPage() {
  const { data, loading } = useStudentWorkspace();

  return (
    <div className="animate-fade">
      <PageHeader
        title="Progress"
        description="Confirmed progress against your supervision milestones, and every version on record."
      />
      {loading ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Overall progress" value={`${data.progress}%`} hint={`${data.approved} of ${data.milestones.length} milestones approved`} icon={Flag} tone="teal" />
            <StatCard label="Milestones approved" value={`${data.approved}/${data.milestones.length}`} hint="Confirmed by your supervisor" icon={CheckCircle2} tone="mint" />
            <StatCard label="Versions submitted" value={data.drafts.length} hint="Every revision stays in history" icon={FileText} tone="blue" />
            <StatCard label="Feedback received" value={data.feedbacks.length} hint="Reviews from your supervisor" icon={MessageSquare} tone="amber" />
          </div>

          <SectionCard title="Milestone progress" description="Only confirmed work counts towards completion.">
            {data.milestones.length ? (
              <ul className="divide-y divide-slate-100">
                {data.milestones.map((milestone, index) => {
                  const versions = versionsFor(data.drafts, milestone.id);
                  return (
                    <li key={milestone.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-500">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#0A1929]">{milestone.title}</p>
                          <p className="text-[11.5px] text-slate-500">
                            {versions.length ? `Latest V${versions[0].version}` : "No version yet"}
                            {milestone.due_date ? ` • ${formatDate(milestone.due_date)} (${dueLabel(milestone.due_date)})` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={milestone.status === "approved" ? 100 : milestone.status === "revision_required" ? 45 : versions.length ? 60 : 0}
                          className="hidden w-32 sm:flex"
                        />
                        <StatusBadge status={milestone.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={Flag}
                title="No milestones yet"
                description="Milestones open once the research office confirms your supervisor."
                action={
                  <Link to="/student/profile" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
                    Complete your research profile
                  </Link>
                }
              />
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}