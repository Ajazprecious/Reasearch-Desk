import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/admin/ai-model")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/recommendations" });
  },
});
