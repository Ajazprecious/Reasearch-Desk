const TOKEN_KEY = "researchdesk_session";
const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function token() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${apiBase}/api/${path}`, {
    method,
    credentials: "omit",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data?.error || "The local service could not complete this request"), {
      status: response.status,
      data,
    });
  }
  return data;
}

const entity = (name) => ({
  list: (options = {}) => request(`entities/${name}${query(options)}`).then(page),
  filter: (filters = {}, options = {}) =>
    request(`entities/${name}${query({ ...options, filters })}`).then(page),
  get: (id) => request(`entities/${name}/${encodeURIComponent(id)}`),
  count: (filters = {}) => request(`entities/${name}/count${query({ filters })}`).then((result) => result.count),
  create: (record) => request(`entities/${name}`, { method: "POST", body: record }),
  bulkCreate: (records) => request(`entities/${name}/bulk`, { method: "POST", body: records }),
  update: (id, patch) => request(`entities/${name}/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  updateMany: (filters, update) => request(`entities/${name}/update-many`, { method: "POST", body: { filters, update } }),
  deleteMany: (filters) => request(`entities/${name}/delete-many`, { method: "POST", body: { filters } }),
  subscribe: () => () => {},
});

function page(items) {
  Object.defineProperty(items, "items", { value: items, enumerable: false });
  return items;
}

function query(options) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  return params.size ? `?${params}` : "";
}

const entityNames = [
  "Assignment", "Defence", "Draft", "Feedback", "MatchingConfig", "MatchingRun", "Milestone",
  "Notification", "Recommendation", "ResearchProfile", "SupervisorProfile", "Ticket",
  "TicketUpdate", "User", "WritingDocument",
];
const entities = Object.fromEntries(entityNames.map((name) => [name, entity(name)]));

export const localClient = {
  entities,
  auth: {
    hasToken: () => !!token(),
    setToken: (value, remember = true) => {
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, value);
    },
    me: () => request("auth/me"),
    login: async ({ email, password, remember = false }) => {
      const result = await request("auth/login", { method: "POST", body: { email, password } });
      localClient.auth.setToken(result.access_token, remember);
      return result;
    },
    register: async (data) => {
      const result = await request("auth/register", { method: "POST", body: data });
      if (result?.access_token) localClient.auth.setToken(result.access_token);
      return result;
    },
    logout: async () => {
      const result = await request("auth/logout", { method: "POST" }).catch(() => null);
      window.localStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(TOKEN_KEY);
      return result;
    },
    updateMe: (data) => request("auth/me", { method: "PATCH", body: data }),
    resetPasswordRequest: (email) => request("auth/reset", { method: "POST", body: { email } }),
    resetPassword: (data) => request("auth/reset/complete", { method: "POST", body: data }),
    verifyOtp: async () => { throw new Error("Email verification is not configured for this local installation."); },
    resendOtp: async () => { throw new Error("Email delivery is not configured for this local installation."); },
    loginWithProvider: async () => { throw new Error("Google sign-in requires OAuth credentials and is not configured locally."); },
    redirectToLogin: (returnTo) => { window.location.href = `/login?returnTo=${encodeURIComponent(returnTo || "/")}`; },
  },
  integrations: {
    Core: {
      UploadPrivateFile: async ({ file }) => upload(file),
      UploadPublicFile: async ({ file }) => upload(file, true),
      CreateFileSignedUrl: async ({ file_uri }) => request("files/signed-url", {
        method: "POST",
        body: { file_uri },
      }),
    },
  },
  functions: { invoke: (name, data) => request(`functions/${name}`, { method: "POST", body: data }) },
};

async function upload(file, isPublic = false) {
  const content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
  return request("files", {
    method: "POST",
    body: { name: file.name, type: file.type, content, public: isPublic },
  });
}
