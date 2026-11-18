import { createFileRoute } from "@tanstack/react-router";
import { LoadingBlock } from "@/components/workspace/EmptyState";
import { WritingEditor } from "@/components/student/WritingEditor";
import { useStudentWorkspace } from "@/hooks/useStudentWorkspace";

export const Route = createFileRoute("/_authed/student/workspace/writing")({
  head: () => ({ meta: [{ title: "Collaborative Writing — ResearchDesk" }] }),
  component: WritingTab,
});

function WritingTab() {
  const { data, loading, user } = useStudentWorkspace();

  if (loading) return <LoadingBlock rows={4} />;

  return <WritingEditor milestones={data?.milestones || []} drafts={data?.drafts || []} user={user} />;
}