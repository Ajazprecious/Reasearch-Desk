import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { WorkspaceTabs } from "@/components/student/WorkspaceTabs";

export const Route = createFileRoute("/_authed/student/workspace")({
  head: () => ({ meta: [{ title: "My Workspace — ResearchDesk" }] }),
  component: StudentWorkspaceLayout,
});

function StudentWorkspaceLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="animate-fade">
      <PageHeader
        title="My Workspace"
        description="Manage chapters, drafts, supervisor feedback and submission activity in one place."
        actions={
          <Button asChild className="h-10 rounded-xl bg-[#00796B] px-4 text-[13px] font-medium hover:bg-[#007D6D]">
            <Link to="/student/workspace/submit">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Submit new draft
            </Link>
          </Button>
        }
      />
      <WorkspaceTabs pathname={pathname} />
      <Outlet />
    </div>
  );
}