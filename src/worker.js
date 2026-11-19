import handler from "@tanstack/react-start/server-entry";

function allowedOrigin(origin, env, requestUrl) {
  if (origin === new URL(requestUrl).origin) return true;
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

function addCorsHeaders(response, request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigin(origin, env, request.url)) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, x-tsr-serverfn");
  headers.set("Access-Control-Expose-Headers", "x-tss-raw, x-tss-serialized");
  headers.set("Access-Control-Max-Age", "86400");
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, context) {
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (!origin || !allowedOrigin(origin, env, request.url)) return new Response(null, { status: 403 });
      return addCorsHeaders(new Response(null, { status: 204 }), request, env);
    }
    const response = await handler.fetch(request, env, context);
    return addCorsHeaders(response, request, env);
  },
};
