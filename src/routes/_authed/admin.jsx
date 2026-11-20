import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { ROLE_HOME, resolveRole } from "@/lib/roles";

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: ({ context }) => {
    const role = resolveRole(context.user);
    if (role !== "admin") throw redirect({ to: ROLE_HOME[role] || ROLE_HOME.student });
  },
  component: AdminWorkspace,
});

function AdminWorkspace() {
  return (
    <WorkspaceLayout role="admin">
      <Outlet />
    </WorkspaceLayout>
  );
}