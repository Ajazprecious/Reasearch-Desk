import { createFileRoute } from "@tanstack/react-router";

// A server route: a raw HTTP endpoint that lives next to the pages. Handlers get
// `context.getWorkspace()` like server functions do. Never define routes under
// Keep this auxiliary route separate from the local Express API routes.
export const Route = createFileRoute("/api/time")({
  server: {
    handlers: {
      GET: async () => Response.json({ now: new Date().toISOString() }, { headers: { "cache-control": "no-store" } }),
    },
  },
});
