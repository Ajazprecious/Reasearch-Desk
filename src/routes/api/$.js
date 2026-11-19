import { createFileRoute } from "@tanstack/react-router";

async function handle(request) {
  const { handleCloudflareApi } = await import("../../../server/cloudflare-api.js");
  const { env } = await import("cloudflare:workers");
  return handleCloudflareApi(request, env);
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      PATCH: ({ request }) => handle(request),
      PUT: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
