import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ResearchDeskMark } from "@/components/Logo";
import { useServerFn } from "@tanstack/react-start";
import { ROLE_HOME, resolveRole } from "@/lib/roles";
import { setWorkspaceRole } from "@/lib/server-fns";
import { clearIntendedRole, readIntendedRole } from "@/lib/intendedRole";

export const Route = createFileRoute("/_authed/")({
  ssr: false,
  component: RoleRouter,
});

const VALID = ["student", "supervisor", "admin"];

// The entry point after sign-in: opens the workspace the account belongs to. A brand-new
// account takes the role chosen on the sign-in / sign-up screen, once.
function RoleRouter() {
  const { user } = Route.useRouteContext();
  const applyRole = useServerFn(setWorkspaceRole);

  useEffect(() => {
    let cancelled = false;
    async function route() {
      const intended = readIntendedRole();
      const resolved = resolveRole(user);

      // No role chosen on the sign-in screen: open the workspace the account already has.
      if (!intended || !VALID.includes(intended)) {
        if (resolved) {
          window.location.replace(ROLE_HOME[resolved]);
          return;
        }
        const created = await applyRole({ data: { role: "student" } });
        if (!cancelled) window.location.replace(ROLE_HOME[created.role]);
        return;
      }

      // A chosen role wins for a new account, and lets an administrator preview each workspace.
      try {
        const applied = await applyRole({ data: { role: intended } });
        clearIntendedRole();
        if (!cancelled) window.location.replace(ROLE_HOME[applied.role]);
      } catch {
        clearIntendedRole();
        if (!cancelled) window.location.replace(ROLE_HOME[resolved || "student"]);
      }
    }
    route();
    return () => {
      cancelled = true;
    };
  }, [user, applyRole]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-cream">
      <ResearchDeskMark />
      <div className="flex items-center gap-2 text-[13px] text-slate-500">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-[#00796B]" />
        Opening your workspace…
      </div>
    </div>
  );
}