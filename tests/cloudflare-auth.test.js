import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createFileToken,
  createSessionToken,
  makePasswordHash,
  sessionUserId,
  verifyFileToken,
  verifyPassword,
} from "../server/cloudflare-auth.js";

const env = { SESSION_SECRET: "test-session-secret-with-more-than-32-characters" };

test("Worker password hashes accept only the matching password", async () => {
  const hash = await makePasswordHash("ResearchDesk123!");
  assert.equal(await verifyPassword("ResearchDesk123!", hash), true);
  assert.equal(await verifyPassword("incorrect", hash), false);
});

test("Worker sessions are signed and resolve to the account id", async () => {
  const token = await createSessionToken("usr-6", env);
  const request = new Request("https://api.example.test/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(await sessionUserId(request, env), "usr-6");
  assert.equal(await sessionUserId(request, { SESSION_SECRET: "another-session-secret-with-32-characters" }), null);
});

test("R2 file links are signed and contain the expected object key", async () => {
  const token = await createFileToken("uploads/draft.pdf", env);
  assert.equal(await verifyFileToken(token, env), "uploads/draft.pdf");
  assert.equal(await verifyFileToken(token, { SESSION_SECRET: "another-session-secret-with-32-characters" }), null);
});
