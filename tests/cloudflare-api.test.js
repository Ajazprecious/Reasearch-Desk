import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionToken } from "../server/cloudflare-auth.js";
import { handleCloudflareApi } from "../server/cloudflare-api.js";

class MemoryD1 {
  constructor() {
    this.accounts = new Map();
    this.entities = new Map();
  }

  prepare(query) {
    return {
      bind: (...values) => ({
        first: () => this.first(query, values),
        all: () => this.all(query, values),
        run: () => this.run(query, values),
      }),
    };
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }

  async first(query, values) {
    if (query.includes("FROM accounts WHERE email = ?")) {
      const account = [...this.accounts.values()].find((item) => item.email === values[0]);
      if (!account) return null;
      if (query.startsWith("SELECT id FROM")) return { id: account.id };
      return { id: account.id, password_hash: account.password_hash, user_json: account.user_json };
    }
    if (query.includes("FROM accounts WHERE id = ?")) {
      const account = this.accounts.get(values[0]);
      return account ? { user_json: account.user_json } : null;
    }
    throw new Error(`Unsupported D1 query: ${query}`);
  }

  async all(query, values) {
    if (query.includes("FROM entity_records WHERE entity = ?")) {
      return {
        results: [...(this.entities.get(values[0])?.values() || [])].map((payload) => ({ payload: JSON.stringify(payload) })),
      };
    }
    throw new Error(`Unsupported D1 query: ${query}`);
  }

  async run(query, values) {
    if (query.startsWith("INSERT INTO accounts")) {
      const [id, email, password_hash, user_json] = values;
      this.accounts.set(id, { id, email, password_hash, user_json });
      return { success: true };
    }
    if (query.startsWith("INSERT INTO entity_records")) {
      const [entity, id, payload] = values;
      const records = this.entities.get(entity) || new Map();
      records.set(id, JSON.parse(payload));
      this.entities.set(entity, records);
      return { success: true };
    }
    if (query.startsWith("UPDATE entity_records SET payload = ?")) {
      const [payload, entity, id] = values;
      this.entities.get(entity)?.set(id, JSON.parse(payload));
      return { success: true };
    }
    if (query.startsWith("UPDATE accounts SET email = ?")) {
      const [email, user_json, id] = values;
      const account = this.accounts.get(id);
      if (account) this.accounts.set(id, { ...account, email, user_json });
      return { success: true };
    }
    throw new Error(`Unsupported D1 mutation: ${query}`);
  }
}

test("Cloudflare supervisor registrations require administrator approval", async () => {
  const env = {
    DB: new MemoryD1(),
    SEED_DEMO_DATA: "false",
    SESSION_SECRET: "test-session-secret-with-more-than-32-characters",
  };
  const admin = {
    id: "admin-1",
    email: "test-admin@university.example",
    full_name: "Test Administrator",
    role: "admin",
    app_role: "admin",
    status: "Active",
  };
  env.DB.accounts.set(admin.id, {
    id: admin.id,
    email: admin.email,
    password_hash: "",
    user_json: JSON.stringify(admin),
  });
  env.DB.entities.set("User", new Map([[admin.id, admin]]));

  const registration = await handleCloudflareApi(new Request("https://api.example.test/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "new.supervisor@example.edu",
      password: "A-worker-password-123",
      role: "supervisor",
      full_name: "New Supervisor",
      identifier: "STAFF-001",
      academic_rank: "Lecturer II",
      faculty: "Faculty of Science",
      department: "Computer Science",
      supervision_capacity: 5,
      expertise: "Information systems",
    }),
  }), env);
  assert.equal(registration.status, 201);
  const registered = await registration.json();
  assert.equal(registered.pending_verification, true);
  assert.equal(registered.access_token, undefined);
  assert.equal(registered.user.status, "Pending Verification");

  const pendingToken = await createSessionToken(registered.user.id, env);
  const pendingSession = await handleCloudflareApi(new Request("https://api.example.test/api/auth/me", {
    headers: { Authorization: `Bearer ${pendingToken}` },
  }), env);
  assert.equal(pendingSession.status, 401);

  const deniedLogin = await handleCloudflareApi(new Request("https://api.example.test/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: registered.user.email, password: "A-worker-password-123" }),
  }), env);
  assert.equal(deniedLogin.status, 403);

  const adminToken = await createSessionToken(admin.id, env);
  const approval = await handleCloudflareApi(new Request(
    `https://api.example.test/api/entities/User/${registered.user.id}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Active" }),
    },
  ), env);
  assert.equal(approval.status, 200);

  const activeSession = await handleCloudflareApi(new Request("https://api.example.test/api/auth/me", {
    headers: { Authorization: `Bearer ${pendingToken}` },
  }), env);
  assert.equal(activeSession.status, 200);
  assert.equal((await activeSession.json()).status, "Active");
});
