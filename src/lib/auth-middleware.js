import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";

async function withWorkspace(next, request) {
  const { getCloudflareWorkspace } = await import("./cloudflare-workspace.js");
  const workspace = await getCloudflareWorkspace(request);
  return next({ context: { getWorkspace: () => workspace } });
}

export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const token = typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("researchdesk_session") || window.sessionStorage.getItem("researchdesk_session");
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  })
  .server(({ next }) => {
    const request = getRequest();
    // TanStack prerenders the anonymous SPA document during the build. Do not
    // open D1 or seed demo data while rendering that document; API/server
    // function requests still initialise the workspace normally.
    const acceptsHtml = request.headers.get("Accept")?.includes("text/html");
    if (request.method === "GET" && acceptsHtml) return next();
    return withWorkspace(next, request);
  });

export const workspaceRequestMiddleware = createMiddleware({ type: "request" })
  .server(({ next, request }) => {
    // The app deliberately renders document requests anonymously. In particular,
    // the static SPA shell is prerendered during the build, where a local D1
    // database may not have the production schema. Do not initialize the
    // workspace for HTML document requests; server functions still receive it
    // through authMiddleware below.
    const acceptsHtml = request.headers.get("Accept")?.includes("text/html");
    if (request.method === "GET" && acceptsHtml) return next();
    return withWorkspace(next, request);
  });

const currentUser = async (context) => {
  try { return await context.getWorkspace().auth.me(); }
  catch (error) {
    if (error?.status === 401 || error?.status === 403) return null;
    throw error;
  }
};

export const requireUser = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const user = await currentUser(context);
  if (!user) {
    setResponseStatus(401);
    throw Object.assign(new Error("Sign in to continue"), { status: 401, code: "UNAUTHORIZED" });
  }
  return next({ context: { user } });
});

export const requireUserRoute = createMiddleware({ type: "request" }).server(async ({ next, context }) => {
  const user = await currentUser(context);
  return user ? next({ context: { user } }) : Response.json({ error: "Unauthorized" }, { status: 401 });
});
