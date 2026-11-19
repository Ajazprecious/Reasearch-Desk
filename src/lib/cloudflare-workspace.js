import { env } from "cloudflare:workers";
import { createCloudflareWorkspace } from "../../server/cloudflare-api.js";

export function getCloudflareWorkspace(request) {
  return createCloudflareWorkspace(request, env);
}
