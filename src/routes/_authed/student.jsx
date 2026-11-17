import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

export const Route = createFileRoute("/_authed/student")({
  component: StudentWorkspace,
});

function StudentWorkspace() {
  return (
    <WorkspaceLayout role="student">
      <Outlet />
    </WorkspaceLayout>
  );
}