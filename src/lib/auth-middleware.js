import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
const tokenFrom = (request) => request?.headers?.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

function entityApi(request, service = false) {
  const authorization = tokenFrom(request);
  const headers = {
    ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
  };
  const send = async (path, method = "GET", body) => {
    const url = new URL(path, process.env.LOCAL_API_URL || "http://127.0.0.1:4000");
    const serviceHeaders = service ? {
      "X-ResearchDesk-Service-Key": (await import("../../server/auth.js")).localServiceKey,
    } : {};
    const response = await fetch(url, {
      method,
      headers: { ...headers, ...serviceHeaders, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(result?.error || "Local workspace request failed"), { status: response.status });
    return result;
  };
  const names = ["Assignment", "Defence", "Draft", "Feedback", "MatchingConfig", "MatchingRun", "Milestone", "Notification", "Recommendation", "ResearchProfile", "SupervisorProfile", "Ticket", "TicketUpdate", "User", "WritingDocument"];
  const entities = Object.fromEntries(names.map((name) => [name, {
    list: async (options = {}) => page(await send(`/api/entities/${name}${optionsQuery(options)}`)),
    filter: async (filters, options = {}) => page(await send(`/api/entities/${name}${optionsQuery({ ...options, filters })}`)),
    get: (id) => send(`/api/entities/${name}/${encodeURIComponent(id)}`),
    count: async (filters = {}) => (await send(`/api/entities/${name}/count${optionsQuery({ filters })}`)).count,
    create: (record) => send(`/api/entities/${name}`, "POST", record),
    bulkCreate: (records) => send(`/api/entities/${name}/bulk`, "POST", records),
    update: (id, patch) => send(`/api/entities/${name}/${encodeURIComponent(id)}`, "PATCH", patch),
    updateMany: (filters, update) => send(`/api/entities/${name}/update-many`, "POST", { filters, update }),
    deleteMany: (filters) => send(`/api/entities/${name}/delete-many`, "POST", { filters }),
  }]));
  return {
    entities,
    auth: { me: () => send("/api/auth/me") },
    asServiceRole: { entities },
  };
}

function page(items) {
  Object.defineProperty(items, "items", { value: items, enumerable: false });
  return items;
}

function optionsQuery(options) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value != null) params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  return params.size ? `?${params}` : "";
}

const withWorkspace = (next, request) => {
  const visitor = entityApi(request);
  const service = entityApi(request, true);
  return next({ context: { getWorkspace: () => ({ ...visitor, asServiceRole: service }) } });
};

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

