import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminWorkspace,
});

function AdminWorkspace() {
  return (
    <WorkspaceLayout role="admin">
      <Outlet />
    </WorkspaceLayout>
  );
}