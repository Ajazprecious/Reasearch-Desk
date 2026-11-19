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
  .server(({ next }) => withWorkspace(next, getRequest()));

export const workspaceRequestMiddleware = createMiddleware({ type: "request" })
  .server(({ next, request }) => withWorkspace(next, request));

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
