import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { authMiddleware, workspaceRequestMiddleware } from "@/lib/auth-middleware";

function isTrustedOrigin(origin, request) {
  return origin === new URL(request.url).origin ||
    String(import.meta.env.VITE_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .includes(origin);
}

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
  origin: (origin, context) => isTrustedOrigin(origin, context.request),
  secFetchSite: (site, context) => {
    const origin = context.request.headers.get("Origin");
    return origin
      ? isTrustedOrigin(origin, context.request)
      : site === "same-origin";
  },
});

const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

// Every server function and server route gets `context.getWorkspace()`, acting as the visitor.
export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, workspaceRequestMiddleware],
  functionMiddleware: [authMiddleware],
  serverFns: {
    fetch: (url, init) => fetch(apiBase ? new URL(url, `${apiBase}/`) : url, {
      ...init,
      credentials: "omit",
    }),
  },
}));
