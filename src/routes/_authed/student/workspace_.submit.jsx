import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/workspace/PageHeader";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { SubmitWizard } from "@/components/student/SubmitWizard";
import { useStudentWorkspace } from "@/hooks/useStudentWorkspace";

export const Route = createFileRoute("/_authed/student/workspace_/submit")({
  validateSearch: (search) => ({
    chapter: typeof search.chapter === "string" ? search.chapter : undefined,
  }),
  head: () => ({ meta: [{ title: "Submit a new draft — ResearchDesk" }] }),
  component: SubmitDraftPage,
});

function SubmitDraftPage() {
  const { chapter } = Route.useSearch();
  const { data, loading } = useStudentWorkspace();

  return (
    <div className="animate-fade">
      <PageHeader
        title="Submit a new draft"
        description="Upload the document you want your supervisor to review."
      />
      {loading ? (
        <LoadingBlock rows={3} />
      ) : (
        <SubmitWizard milestones={data?.milestones || []} drafts={data?.drafts || []} initialChapterId={chapter} />
      )}
    </div>
  );
}