import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

export const Route = createFileRoute("/_authed/supervisor")({
  component: SupervisorWorkspace,
});

function SupervisorWorkspace() {
  return (
    <WorkspaceLayout role="supervisor">
      <Outlet />
    </WorkspaceLayout>
  );
}