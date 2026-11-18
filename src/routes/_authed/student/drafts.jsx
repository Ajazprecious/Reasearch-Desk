import { createFileRoute } from "@tanstack/react-router";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/workspace/PageHeader";
import { SectionCard } from "@/components/workspace/SectionCard";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { DraftWorkspace } from "@/components/student/DraftWorkspace";

export const Route = createFileRoute("/_authed/student/drafts")({
  head: () => ({ meta: [{ title: "Chapter drafts — ResearchDesk" }] }),
  component: StudentDraftsPage,
});

function StudentDraftsPage() {
  const { user } = useAuth();
  const { data, loading, reload } = useAsync(async () => {
    const [milestones, drafts, feedbacks] = await Promise.all([
      localClient.entities.Milestone.filter({ student_email: user.email }, { sort: "order", limit: 50 }),
      localClient.entities.Draft.filter({ student_email: user.email }, { sort: "-submitted_date", limit: 200 }),
      localClient.entities.Feedback.filter({ student_email: user.email }, { sort: "-reviewed_date", limit: 200 }),
    ]);
    return { milestones: milestones.items, drafts: drafts.items, feedbacks: feedbacks.items };
  }, [user?.email]);

  return (
    <div className="animate-fade">
      <PageHeader
        title="Chapter drafts"
        description="Submit a draft, read your supervisor's feedback and resubmit as a new version — nothing is ever overwritten."
      />
      {loading ? (
        <LoadingBlock rows={4} />
      ) : (
        <SectionCard bodyClassName="px-4 py-5 sm:px-5">
          <DraftWorkspace
            milestones={data?.milestones || []}
            drafts={data?.drafts || []}
            feedbacks={data?.feedbacks || []}
            onChanged={reload}
          />
        </SectionCard>
      )}
    </div>
  );
}