import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Flag, Layers } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { ProgressBar } from "@/components/workspace/ProgressBar";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/workspace/EmptyState";
import { MilestoneRow } from "@/components/student/MilestoneRow";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/student/milestones")({
  head: () => ({ meta: [{ title: "Milestones — ResearchDesk" }] }),
  component: StudentMilestonesPage,
});

function StudentMilestonesPage() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => {
    const [milestones, drafts] = await Promise.all([
      localClient.entities.Milestone.filter({ student_email: user.email }, { sort: "order", limit: 50 }),
      localClient.entities.Draft.filter({ student_email: user.email }, { sort: "-submitted_date", limit: 100 }),
    ]);
    const list = milestones.items;
    const approved = list.filter((milestone) => milestone.status === "approved").length;
    return {
      milestones: list,
      drafts: drafts.items,
      approved,
      progress: list.length ? Math.round((approved / list.length) * 100) : 0,
    };
  }, [user?.email]);

  return (
    <div className="animate-fade">
      <PageHeader title="Milestones" description="Every stage of your research with its deadline, status and the drafts attached to it." />

      {loading ? (
        <LoadingBlock rows={5} />
      ) : !data?.milestones?.length ? (
        <EmptyState
          icon={Flag}
          title="No milestones yet"
          description="Milestones are opened by the research office once your supervisor assignment is confirmed."
          action={
            <Link to="/student/profile" className="text-[12.5px] font-medium text-[#00796B] hover:underline">
              Check your research profile
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <SectionCard bodyClassName="px-5 py-4">
              <p className="text-[11.5px] uppercase tracking-[0.08em] text-slate-400">Confirmed progress</p>
              <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[#0A1929]">{data.progress}%</p>
              <ProgressBar value={data.progress} className="mt-3" />
            </SectionCard>
            <SectionCard bodyClassName="px-5 py-4">
              <p className="text-[11.5px] uppercase tracking-[0.08em] text-slate-400">Milestones complete</p>
              <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[#0A1929]">
                {data.approved}
                <span className="text-[15px] font-normal text-slate-400"> / {data.milestones.length}</span>
              </p>
              <p className="mt-2 text-[12px] text-slate-500">Confirmed by your supervisor</p>
            </SectionCard>
            <SectionCard bodyClassName="px-5 py-4">
              <p className="text-[11.5px] uppercase tracking-[0.08em] text-slate-400">Next deadline</p>
              <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[#0A1929]">
                {formatDate(data.milestones.find((milestone) => milestone.status !== "approved")?.due_date)}
              </p>
              <p className="mt-2 text-[12px] text-slate-500">
                {data.milestones.find((milestone) => milestone.status !== "approved")?.title || "All milestones complete"}
              </p>
            </SectionCard>
          </div>

          <SectionCard title="Timeline" description="Statuses reflect confirmed work only." bodyClassName="px-5 py-2 sm:px-6">
            {data.milestones.map((milestone) => {
              const count = data.drafts.filter((draft) => draft.milestone_id === milestone.id).length;
              return (
                <MilestoneRow
                  key={milestone.id}
                  milestone={milestone}
                  draftCount={count}
                  action={
                    <Link
                      to="/student/drafts"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-600 transition-colors hover:border-[#00796B] hover:text-[#00796B]"
                    >
                      <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Drafts
                    </Link>
                  }
                />
              );
            })}
          </SectionCard>

          <p className="flex items-center gap-2 px-1 text-[11.5px] text-slate-400">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Deadlines are set by the research office. Progress is descriptive — it never predicts completion.
          </p>
        </div>
      )}
    </div>
  );
}