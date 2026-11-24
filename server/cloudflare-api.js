import demoSeed from "./cloudflare-demo-seed.json" with { type: "json" };
import {
  createFileToken,
  createSessionToken,
  makePasswordHash,
  PBKDF2_ITERATIONS,
  sessionUserId,
  verifyFileToken,
  verifyPassword,
} from "./cloudflare-auth.js";

const ENTITY_NAMES = new Set([
  "Assignment", "Defence", "Draft", "Feedback", "MatchingConfig", "MatchingRun", "Milestone",
  "Notification", "Recommendation", "ResearchProfile", "SupervisorProfile", "Ticket",
  "TicketUpdate", "User", "WritingDocument",
]);
const validEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const normalizeRole = (role) => {
  const value = String(role || "").toLowerCase();
  return value === "administrator" ? "admin" : value;
};
const DEMO_EMAILS = new Set(demoSeed.users.map((user) => String(user.email).toLowerCase()));
const DEMO_IDS = new Set(demoSeed.users.map((user) => user.id));

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function page(items) {
  Object.defineProperty(items, "items", { value: items, enumerable: false });
  return items;
}

async function batchStatements(db, statements) {
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
}

function matches(row, filters) {
  return Object.entries(filters || {}).every(([key, value]) => {
    const expected = value && typeof value === "object" && "$in" in value ? value.$in : value;
    return Array.isArray(expected) ? expected.includes(row[key]) : row[key] === expected;
  });
}

function publicUser(user) {
  if (!user) return null;
  const role = normalizeRole(user.role || user.app_role);
  const appRole = normalizeRole(user.app_role || role);
  return { ...user, full_name: user.full_name || user.name, app_role: appRole, role };
}

function isPendingSupervisor(user) {
  return normalizeRole(user?.role || user?.app_role) === "supervisor" &&
    String(user?.status || "").toLowerCase() === "pending verification";
}

function isDemoAccount(user) {
  return DEMO_IDS.has(user?.id) || DEMO_EMAILS.has(String(user?.email || "").toLowerCase());
}

async function ensureDemoData(env) {
  if (env.SEED_DEMO_DATA !== "true") return;
  let marker;
  try {
    marker = await env.DB.prepare("SELECT value FROM app_meta WHERE key = ?").bind("demo_seeded").first();
  } catch (error) {
    // Cloudflare Pages builds can use a D1 binding whose migrations have not
    // been applied (and are unavailable during the build). Do not turn that
    // build-only preflight into a database startup failure.
    if (String(error?.message || error).includes("no such table")) return;
    throw error;
  }
  if (marker) {
    const updates = [];
    let sharedPasswordHash;
    for (const account of demoSeed.users) {
      const row = await env.DB.prepare(
        "SELECT id, password_hash, user_json FROM accounts WHERE email = ?",
      ).bind(String(account.email).toLowerCase()).first();
      const role = normalizeRole(account.role || account.app_role);
      const currentUser = parseJson(row?.user_json);
      const seededAdmin = role === "admin";
      const userRecordRow = seededAdmin
        ? await env.DB.prepare("SELECT payload FROM entity_records WHERE entity = ? AND record_id = ?")
          .bind("User", account.id).first()
        : null;
      const currentEntityUser = parseJson(userRecordRow?.payload);
      const needsAccountRoleRepair = seededAdmin && normalizeRole(currentUser?.role) !== "admin";
      const needsEntityRoleRepair = seededAdmin && currentEntityUser &&
        normalizeRole(currentEntityUser.role) !== "admin";
      const validPasswordHash = row?.password_hash?.startsWith(`pbkdf2_sha256$${PBKDF2_ITERATIONS}$`);
      if (validPasswordHash && !needsAccountRoleRepair && !needsEntityRoleRepair) continue;

      const serialized = publicUser({
        ...(currentUser || account),
        ...(seededAdmin ? { role: "admin" } : {}),
        app_role: currentUser?.app_role || role,
      });
      if (!validPasswordHash) {
        sharedPasswordHash ||= await makePasswordHash("ResearchDesk123!");
        updates.push(env.DB.prepare(
          "INSERT INTO accounts (id, email, password_hash, user_json) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, user_json = excluded.user_json",
        ).bind(serialized.id, String(account.email).toLowerCase(), sharedPasswordHash, JSON.stringify(serialized)));
      } else {
        updates.push(env.DB.prepare("UPDATE accounts SET user_json = ? WHERE id = ?")
          .bind(JSON.stringify(serialized), row.id));
      }
      if (needsEntityRoleRepair) {
        const repairedRecord = publicUser({
          ...currentEntityUser,
          role: "admin",
          app_role: currentEntityUser.app_role || "admin",
        });
        updates.push(env.DB.prepare(
          "UPDATE entity_records SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE entity = ? AND record_id = ?",
        ).bind(JSON.stringify(repairedRecord), "User", account.id));
      }
    }
    if (updates.length) await batchStatements(env.DB, updates);
    return;
  }
  const statements = [];
  const sharedPasswordHash = await makePasswordHash("ResearchDesk123!");
  for (const account of demoSeed.users) {
    const role = normalizeRole(account.app_role || account.role);
    const serialized = publicUser({ ...account, app_role: role, role });
    statements.push(env.DB.prepare(
      "INSERT OR IGNORE INTO accounts (id, email, password_hash, user_json) VALUES (?, ?, ?, ?)",
    ).bind(serialized.id, serialized.email.toLowerCase(), sharedPasswordHash, JSON.stringify(serialized)));
  }
  for (const [entity, rows] of Object.entries(demoSeed.entities)) {
    for (const row of rows) {
      if (!row?.id) continue;
      statements.push(env.DB.prepare(
        "INSERT OR IGNORE INTO entity_records (entity, record_id, payload) VALUES (?, ?, ?)",
      ).bind(entity, String(row.id), JSON.stringify(row)));
    }
  }
  statements.push(env.DB.prepare("INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)").bind("demo_seeded", "true"));
  await batchStatements(env.DB, statements);
}

async function currentUser(request, env) {
  const userId = await sessionUserId(request, env);
  if (!userId) return null;
  const row = await env.DB.prepare("SELECT user_json FROM accounts WHERE id = ?").bind(userId).first();
  const user = publicUser(parseJson(row?.user_json));
  return user && !isPendingSupervisor(user) && (env.SEED_DEMO_DATA === "true" || !isDemoAccount(user)) ? user : null;
}

function isAdmin(user) {
  return normalizeRole(user?.role || user?.app_role) === "admin";
}

async function readRecords(env, entity) {
  if (!ENTITY_NAMES.has(entity)) fail(404, "Unknown entity.");
  const result = await env.DB.prepare("SELECT payload FROM entity_records WHERE entity = ?").bind(entity).all();
  return (result.results || []).map((row) => parseJson(row.payload)).filter(Boolean);
}

async function canReadEntity(user, entity, row, env) {
  if (entity === "SupervisorProfile") {
    const account = await env.DB.prepare("SELECT user_json FROM accounts WHERE email = ?")
      .bind(String(row.email || "").toLowerCase()).first();
    const accountUser = publicUser(parseJson(account?.user_json));
    return normalizeRole(accountUser?.role || accountUser?.app_role) === "supervisor";
  }
  if (isAdmin(user)) return true;
  if (entity === "User") return row.id === user.id;
  if (entity === "Defence" && row.scope === "department") {
    const role = normalizeRole(user.role || user.app_role);
    if (role === "student" || role === "supervisor") return row.department === user.department;
  }
  if (["student_email", "user_email", "email"].some((key) => row[key] === user.email)) return true;
  if (normalizeRole(user.role || user.app_role) === "supervisor") {
    if (row.supervisor_email === user.email) return true;
    const assignments = await readRecords(env, "Assignment");
    return assignments.some((item) => item.supervisor_email === user.email && item.student_email === row.student_email);
  }
  return false;
}

function canWriteEntity(user, entity, row) {
  if (isAdmin(user)) return true;
  const role = normalizeRole(user.role || user.app_role);
  if (entity === "SupervisorProfile" && role === "supervisor") return !row.email || row.email === user.email;
  if (["student_email", "user_email", "email"].some((key) => row[key] && row[key] !== user.email)) return false;
  if (role === "student") {
    return ["ResearchProfile", "Draft", "Notification", "Ticket", "TicketUpdate", "WritingDocument"].includes(entity);
  }
  if (role === "supervisor") {
    return ["SupervisorProfile", "Feedback", "Milestone", "TicketUpdate", "Notification"].includes(entity);
  }
  return false;
}

function requireUser(user) {
  if (!user) fail(401, "Sign in to continue.");
  return user;
}

async function writeRecord(env, entity, row) {
  await env.DB.prepare(
    "INSERT INTO entity_records (entity, record_id, payload, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(entity, record_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP",
  ).bind(entity, String(row.id), JSON.stringify(row)).run();
}

function entityClient(request, env, serviceRole = false) {
  const getUser = async () => {
    if (serviceRole) return { id: "local-service", email: "service@local", role: "admin", app_role: "admin" };
    return requireUser(await currentUser(request, env));
  };
  const assertRead = async (user, entity, row) => {
    if (!(await canReadEntity(user, entity, row, env))) fail(404, "Record not found.");
  };
  const assertWrite = (user, entity, row) => {
    if (!canWriteEntity(user, entity, row)) fail(403, "You cannot write this record.");
  };
  const entities = Object.fromEntries([...ENTITY_NAMES].map((entity) => [entity, {
    list: async (options = {}) => {
      const user = await getUser();
      let rows = await readRecords(env, entity);
      rows = await Promise.all(rows.map(async (row) => (await canReadEntity(user, entity, row, env)) ? row : null));
      rows = rows.filter(Boolean);
      if (options.filters) rows = rows.filter((row) => matches(row, options.filters));
      if (options.sort) {
        const descending = String(options.sort).startsWith("-");
        const field = String(options.sort).replace(/^-/, "");
        rows.sort((a, b) => String(a[field] ?? "").localeCompare(String(b[field] ?? "")) * (descending ? -1 : 1));
      }
      const limit = Math.max(0, Math.min(Number(options.limit) || 500, 1000));
      return page(rows.slice(0, limit));
    },
    filter: async (filters = {}, options = {}) => entities[entity].list({ ...options, filters }),
    get: async (id) => {
      const user = await getUser();
      const rows = await readRecords(env, entity);
      const row = rows.find((item) => item.id === id);
      if (!row) fail(404, "Record not found.");
      await assertRead(user, entity, row);
      return row;
    },
    count: async (filters = {}) => (await entities[entity].filter(filters, { limit: 1000 })).length,
    create: async (record) => {
      const user = await getUser();
      const row = record && typeof record === "object" && !Array.isArray(record) ? { ...record } : {};
      assertWrite(user, entity, row);
      row.id ||= `${entity.toLowerCase()}-${crypto.randomUUID()}`;
      row.created_date ||= new Date().toISOString();
      await writeRecord(env, entity, row);
      return row;
    },
    bulkCreate: async (records) => {
      const user = await getUser();
      if (!isAdmin(user)) fail(403, "Only administrators can add records in bulk.");
      if (!Array.isArray(records)) fail(400, "Expected a list of records.");
      const created = records.map((row) => ({
        id: row.id || `${entity.toLowerCase()}-${crypto.randomUUID()}`,
        created_date: new Date().toISOString(),
        ...row,
      }));
      await batchStatements(env.DB, created.map((row) => env.DB.prepare(
        "INSERT INTO entity_records (entity, record_id, payload) VALUES (?, ?, ?) ON CONFLICT(entity, record_id) DO UPDATE SET payload = excluded.payload",
      ).bind(entity, String(row.id), JSON.stringify(row))));
      return created;
    },
    update: async (id, patch) => {
      const user = await getUser();
      const rows = await readRecords(env, entity);
      const row = rows.find((item) => item.id === id);
      if (!row || !(await canReadEntity(user, entity, row, env)) || !canWriteEntity(user, entity, row)) {
        fail(404, "Record not found.");
      }
      if (!isAdmin(user) && ["role", "app_role", "email", "id", "student_email", "supervisor_email", "user_email"]
        .some((key) => key in (patch || {}) && patch[key] !== row[key])) {
        fail(403, "Protected account fields cannot be changed.");
      }
      Object.assign(row, patch || {});
      await writeRecord(env, entity, row);
      if (entity === "User") {
        const account = await env.DB.prepare("SELECT user_json FROM accounts WHERE id = ?").bind(row.id).first();
        if (account) {
          const userJson = publicUser({ ...parseJson(account.user_json), ...row });
          await env.DB.prepare("UPDATE accounts SET email = ?, user_json = ? WHERE id = ?")
            .bind(userJson.email.toLowerCase(), JSON.stringify(userJson), String(row.id)).run();
        }
      }
      return row;
    },
    updateMany: async (filters = {}, update = {}) => {
      const user = await getUser();
      const { $set, $inc, ...rest } = update || {};
      if (Object.keys(rest).some((key) => key.startsWith("$")) || !update || typeof update !== "object" || Array.isArray(update)) {
        fail(400, "Only $set and numeric $inc updates are supported.");
      }
      const set = $set || (Object.keys(update).some((key) => key.startsWith("$")) ? {} : update);
      const increments = $inc || {};
      const rows = (await readRecords(env, entity)).filter((row) => matches(row, filters));
      for (const row of rows) {
        if (!isAdmin(user) && (!(await canReadEntity(user, entity, row, env)) || !canWriteEntity(user, entity, row))) {
          fail(403, "You cannot update these records.");
        }
        for (const [key, amount] of Object.entries(increments)) {
          if (typeof amount !== "number" || !Number.isFinite(amount) ||
            (row[key] !== undefined && (typeof row[key] !== "number" || !Number.isFinite(row[key])))) {
            fail(400, "$inc values and target fields must be finite numbers.");
          }
        }
        Object.assign(row, set);
        for (const [key, amount] of Object.entries(increments)) row[key] = (row[key] || 0) + amount;
        row.updated_date = new Date().toISOString();
      }
      if (rows.length) {
        await batchStatements(env.DB, rows.map((row) => env.DB.prepare(
          "UPDATE entity_records SET payload = ?, updated_at = CURRENT_TIMESTAMP WHERE entity = ? AND record_id = ?",
        ).bind(JSON.stringify(row), entity, String(row.id))));
      }
      return { updated: rows.length };
    },
    deleteMany: async (filters = {}) => {
      const user = await getUser();
      if (!isAdmin(user)) fail(403, "This action requires an administrator.");
      const rows = (await readRecords(env, entity)).filter((row) => matches(row, filters));
      if (rows.length) {
        await batchStatements(env.DB, rows.map((row) => env.DB.prepare(
          "DELETE FROM entity_records WHERE entity = ? AND record_id = ?",
        ).bind(entity, String(row.id))));
      }
      return { deleted: true };
    },
  }]));
  return {
    entities,
    auth: { me: async () => requireUser(await currentUser(request, env)) },
    asServiceRole: { entities },
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers });
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    fail(400, "Request body must be valid JSON.");
  }
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function fileNameFromUri(uri) {
  const match = String(uri || "").match(/^r2:\/\/([A-Za-z0-9._/-]+)$/);
  return match?.[1] || null;
}

async function handleAuth(request, env, route) {
  if (!route.startsWith("/api/auth/")) return null;
  const body = request.method === "POST" || request.method === "PATCH" ? await readBody(request) : {};
  if (route === "/api/auth/register" && request.method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = body.password;
    const role = normalizeRole(body.role || "student");
    const name = String(body.full_name || body.name || "").trim();
    if (!validEmail(email) || typeof password !== "string" || password.length < 8) fail(400, "Enter a valid email and a password of at least 8 characters.");
    if (await env.DB.prepare("SELECT id FROM accounts WHERE email = ?").bind(email).first()) fail(409, "An account with that email already exists.");
    const required = role === "student"
      ? [name, body.identifier, body.program, body.faculty, body.department]
      : role === "supervisor"
        ? [name, body.identifier, body.academic_rank, body.faculty, body.department, body.expertise]
        : role === "admin"
          ? [name, body.identifier, body.administrative_office, body.administrative_scope, body.authorised_unit]
          : null;
    if (!required) fail(400, "Choose student, supervisor, or administrator for a new account.");
    if (!required.every((value) => typeof value === "string" && value.trim())) fail(400, "Complete all required institutional profile fields.");
    if (role === "supervisor" && (!Number.isInteger(Number(body.supervision_capacity)) || Number(body.supervision_capacity) < 1)) fail(400, "Enter a valid supervision capacity.");
    if (role === "admin") {
      const code = String(env.ADMIN_INVITATION_CODE || "");
      if (!code || body.invitation_code !== code) fail(403, "Administrator registration is disabled until the institution configures an approval code.");
    }
    const user = publicUser({
      id: `usr-${crypto.randomUUID()}`,
      name,
      full_name: name,
      email,
      role,
      app_role: role,
      status: role === "supervisor" ? "Pending Verification" : "Active",
      department: String(body.department || body.authorised_unit).trim(),
      faculty: String(body.faculty || body.authorised_unit).trim(),
      identifier: String(body.identifier).trim(),
      ...(body.program ? { program: String(body.program).trim() } : {}),
      ...(body.academic_rank ? { academic_rank: String(body.academic_rank).trim() } : {}),
      ...(body.supervision_capacity !== undefined ? { supervision_capacity: Number(body.supervision_capacity) } : {}),
      ...(body.expertise ? { expertise: String(body.expertise).trim() } : {}),
      ...(body.administrative_office ? { administrative_office: String(body.administrative_office).trim() } : {}),
      ...(body.administrative_scope ? { administrative_scope: String(body.administrative_scope).trim() } : {}),
      ...(body.authorised_unit ? { authorised_unit: String(body.authorised_unit).trim() } : {}),
    });
    const accountInsert = env.DB.prepare(
      "INSERT INTO accounts (id, email, password_hash, user_json) VALUES (?, ?, ?, ?)",
    ).bind(user.id, email, await makePasswordHash(password), JSON.stringify(user));
    const userRecord = { id: user.id, email, full_name: name, app_role: role, role, department: user.department, faculty: user.faculty, status: user.status };
    const statements = [
      accountInsert,
      env.DB.prepare("INSERT INTO entity_records (entity, record_id, payload) VALUES (?, ?, ?)").bind("User", user.id, JSON.stringify(userRecord)),
    ];
    if (role === "supervisor") {
      statements.push(env.DB.prepare(
        "INSERT INTO entity_records (entity, record_id, payload) VALUES (?, ?, ?)",
      ).bind("SupervisorProfile", `supervisor-${user.id}`, JSON.stringify({
        id: `supervisor-${user.id}`,
        email,
        full_name: name,
        department: user.department,
        faculty: user.faculty,
        academic_rank: body.academic_rank,
        research_areas: body.expertise,
        keywords: body.expertise,
        bio: body.expertise,
        max_capacity: Number(body.supervision_capacity),
        current_load: 0,
        availability: "available",
        preferred_level: "Postgraduate",
      })));
    }
    await env.DB.batch(statements);
    if (role === "supervisor") {
      return jsonResponse({ pending_verification: true, user }, 201);
    }
    return jsonResponse({ access_token: await createSessionToken(user.id, env), user }, 201);
  }
  if (route === "/api/auth/login" && request.method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const account = await env.DB.prepare("SELECT id, password_hash, user_json FROM accounts WHERE email = ?").bind(email).first();
    if (!account || !(await verifyPassword(body.password, account.password_hash))) fail(401, "Email or password is incorrect.");
    const user = publicUser(parseJson(account.user_json));
    if (isPendingSupervisor(user)) fail(403, "Your supervisor account is awaiting administrator approval.");
    if (env.SEED_DEMO_DATA !== "true" && isDemoAccount(user)) fail(401, "Email or password is incorrect.");
    return jsonResponse({ access_token: await createSessionToken(account.id, env), user });
  }
  if (route === "/api/auth/me" && request.method === "GET") {
    const user = await currentUser(request, env);
    return user ? jsonResponse(user) : jsonResponse({ error: "Sign in to continue." }, 401);
  }
  if (route === "/api/auth/me" && request.method === "PATCH") {
    const user = requireUser(await currentUser(request, env));
    const allowed = ["full_name", "department", "faculty", "settings"];
    const updated = { ...user };
    for (const key of allowed) if (body[key] !== undefined) updated[key] = body[key];
    updated.name = updated.full_name || updated.name;
    const role = normalizeRole(updated.app_role || updated.role);
    updated.role = role;
    updated.app_role = role;
    await env.DB.prepare("UPDATE accounts SET user_json = ? WHERE id = ?")
      .bind(JSON.stringify(updated), user.id).run();
    const record = await entityClient(request, env, true).entities.User.get(user.id).catch(() => null);
    if (record) await entityClient(request, env, true).entities.User.update(user.id, Object.fromEntries(allowed.filter((key) => updated[key] !== undefined).map((key) => [key, updated[key]])));
    return jsonResponse(updated);
  }
  if (route === "/api/auth/logout" && request.method === "POST") return jsonResponse({ ok: true });
  if (route === "/api/auth/reset" && request.method === "POST") {
    const email = String(body.email || "").toLowerCase();
    const exists = Boolean(await env.DB.prepare("SELECT id FROM accounts WHERE email = ?").bind(email).first());
    return jsonResponse({ ok: true, message: exists ? "Password reset by email is not configured in this installation." : "If the account exists, reset instructions would be sent." });
  }
  if (route === "/api/auth/reset/complete" && request.method === "POST") {
    return jsonResponse({ error: "Password reset is unavailable until an email provider is configured." }, 501);
  }
  return null;
}

async function handleFiles(request, env, url, route) {
  if (route === "/api/files" && request.method === "POST") {
    requireUser(await currentUser(request, env));
    if (!env.FILES) fail(503, "File storage is not configured.");
    const body = await readBody(request);
    if (typeof body.content !== "string" || body.content.length > 11_200_000) fail(400, "File is missing or too large.");
    const safeName = String(body.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${crypto.randomUUID()}-${safeName}`;
    await env.FILES.put(key, decodeBase64(body.content), {
      httpMetadata: { contentType: String(body.type || "application/octet-stream") },
      customMetadata: { originalName: safeName, public: body.public === true ? "true" : "false" },
    });
    const publicUrl = body.public === true ? `${url.origin}/api/public-files/${encodeURIComponent(key)}` : `r2://${key}`;
    return jsonResponse({ file_uri: `r2://${key}`, file_url: publicUrl }, 201);
  }
  const publicFileRoute = route.match(/^\/api\/public-files\/(.+)$/);
  if (publicFileRoute && request.method === "GET") {
    if (!env.FILES) fail(503, "File storage is not configured.");
    const key = decodeURIComponent(publicFileRoute[1]);
    const object = await env.FILES.get(key);
    if (!object || object.customMetadata?.public !== "true") fail(404, "File not found.");
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=3600");
    return new Response(object.body, { headers });
  }
  if (route === "/api/files/signed-url" && request.method === "POST") {
    const user = requireUser(await currentUser(request, env));
    const body = await readBody(request);
    const key = fileNameFromUri(body.file_uri);
    if (!key) fail(400, "The file reference is invalid.");
    const references = [
      ["Draft", "file_uri"],
      ["Ticket", "attachment_uri"],
      ["TicketUpdate", "attachment_uri"],
    ];
    let hasAccess = false;
    for (const [entity, field] of references) {
      const rows = await readRecords(env, entity);
      for (const row of rows) {
        if (row[field] === body.file_uri && await canReadEntity(user, entity, row, env)) {
          hasAccess = true;
          break;
        }
      }
      if (hasAccess) break;
    }
    if (!hasAccess) fail(404, "File not found.");
    const token = await createFileToken(key, env);
    return jsonResponse({ signed_url: `${url.origin}/api/files/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}` });
  }
  const fileRoute = route.match(/^\/api\/files\/(.+)$/);
  if (fileRoute && request.method === "GET") {
    if (!env.FILES) fail(503, "File storage is not configured.");
    const key = decodeURIComponent(fileRoute[1]);
    if (await verifyFileToken(url.searchParams.get("token"), env) !== key) fail(403, "The file link is invalid or expired.");
    const object = await env.FILES.get(key);
    if (!object) fail(404, "File not found.");
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Disposition", `attachment; filename="${String(object.customMetadata?.originalName || key).replace(/["\\\r\n]/g, "_")}"`);
    headers.set("Cache-Control", "private, no-store");
    return new Response(object.body, { headers });
  }
  return null;
}

async function handleEntities(request, env, route, url) {
  const match = route.match(/^\/api\/entities\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (!match) return null;
  const entity = decodeURIComponent(match[1]);
  if (!ENTITY_NAMES.has(entity)) fail(404, "Unknown entity.");
  const id = match[2] ? decodeURIComponent(match[2]) : null;
  const operation = match[3] || null;
  const api = entityClient(request, env).entities[entity];
  if (request.method === "GET" && !id) {
    const options = {};
    for (const key of ["limit", "sort"]) if (url.searchParams.has(key)) options[key] = url.searchParams.get(key);
    if (url.searchParams.has("filters")) options.filters = parseJson(url.searchParams.get("filters"), {});
    return jsonResponse(await api.list(options));
  }
  if (request.method === "GET" && id === "count") {
    return jsonResponse({ count: await api.count(parseJson(url.searchParams.get("filters"), {})) });
  }
  if (request.method === "GET" && id) return jsonResponse(await api.get(id));
  if (request.method === "POST" && !id) return jsonResponse(await api.create(await readBody(request)), 201);
  if (request.method === "POST" && id === "bulk") return jsonResponse(await api.bulkCreate(await readBody(request)), 201);
  if (request.method === "PATCH" && id && !operation) return jsonResponse(await api.update(id, await readBody(request)));
  if (request.method === "POST" && ["update-many", "delete-many"].includes(id)) {
    const body = await readBody(request);
    return jsonResponse(id === "update-many"
      ? await api.updateMany(body.filters, body.update)
      : await api.deleteMany(body.filters));
  }
  return null;
}

export async function handleCloudflareApi(request, env) {
  try {
    await ensureDemoData(env);
    const url = new URL(request.url);
    const route = url.pathname;
    if (route === "/api/health" && request.method === "GET") return jsonResponse({ status: "ok" });
    const files = await handleFiles(request, env, url, route);
    if (files) return files;
    const auth = await handleAuth(request, env, route);
    if (auth) return auth;
    const entities = await handleEntities(request, env, route, url);
    if (entities) return entities;
    return jsonResponse({ error: "API route not found." }, 404);
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error("Cloudflare API request failed:", error);
    if (String(error?.message || "").includes("SESSION_SECRET")) {
      return jsonResponse({
        error: "Server configuration error: SESSION_SECRET is missing or invalid.",
      }, 500);
    }
    return jsonResponse({ error: status >= 500 ? "Unexpected server error." : error.message }, status);
  }
}

export async function createCloudflareWorkspace(request, env) {
  await ensureDemoData(env);
  const visitor = entityClient(request, env);
  const service = entityClient(request, env, true);
  return { ...visitor, asServiceRole: service };
}
