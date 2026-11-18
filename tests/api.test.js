import assert from "node:assert/strict";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createApp } from "../server/app.js";
import { createStore } from "../server/data.js";

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("lists users and applies role filters", async () => {
  const response = await fetch(`${baseUrl}/api/users?role=Supervisor`);
  assert.equal(response.status, 200);
  const users = await response.json();
  assert.equal(users.length, 2);
  assert.ok(users.every((user) => user.role === "Supervisor"));
});

test("local signup and login issue an authenticated session", async () => {
  const registered = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "local.user@example.edu",
      password: "A-local-password-123",
      role: "student",
      full_name: "Local User",
      identifier: "MIT/IMS/2026/099",
      program: "MSc",
      faculty: "Faculty of Graduate Studies",
      department: "Information Management Systems",
    }),
  });
  assert.equal(registered.status, 201);
  const { access_token, user } = await registered.json();
  assert.equal(user.app_role, "student");
  assert.equal(user.identifier, "MIT/IMS/2026/099");
  assert.equal(user.department, "Information Management Systems");
  const current = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  assert.equal(current.status, 200);
  assert.equal((await current.json()).email, "local.user@example.edu");

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "local.user@example.edu", password: "A-local-password-123" }),
  });
  assert.equal(login.status, 200);
  assert.ok((await login.json()).access_token);
});

test("administrator self-registration rejects an invalid approval code", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "new.admin@example.edu",
      password: "A-local-password-123",
      role: "admin",
      full_name: "New Admin",
      identifier: "STAFF-009",
      administrative_office: "Postgraduate School",
      administrative_scope: "Institution",
      authorised_unit: "Faculty of Graduate Studies",
      invitation_code: "not-the-configured-code",
    }),
  });
  assert.equal(response.status, 403);
});

test("entity CRUD requires authentication and enforces record ownership", async () => {
  const anonymous = await fetch(`${baseUrl}/api/entities/ResearchProfile`);
  assert.equal(anonymous.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "amara.nwosu@example.edu", password: "ResearchDesk123!" }),
  });
  const { access_token } = await login.json();
  const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };
  const create = await fetch(`${baseUrl}/api/entities/ResearchProfile`, {
    method: "POST",
    headers,
    body: JSON.stringify({ student_email: "amara.nwosu@example.edu", research_title: "Local matching study" }),
  });
  assert.equal(create.status, 201);
  const created = await create.json();

  const forbidden = await fetch(`${baseUrl}/api/entities/ResearchProfile/${created.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ student_email: "someone-else@example.edu" }),
  });
  assert.equal(forbidden.status, 403);
});

test("supports supervisor profile reads, owned profile edits, and numeric bulk updates", async () => {
  const studentLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "amara.nwosu@example.edu", password: "ResearchDesk123!" }),
  });
  const studentToken = (await studentLogin.json()).access_token;
  const studentHeaders = { Authorization: `Bearer ${studentToken}`, "Content-Type": "application/json" };

  const visibleProfiles = await fetch(`${baseUrl}/api/entities/SupervisorProfile`, { headers: studentHeaders });
  assert.equal(visibleProfiles.status, 200);
  assert.equal((await visibleProfiles.json()).length, 2);

  const profileList = await fetch(
    `${baseUrl}/api/entities/ResearchProfile?filters=${encodeURIComponent(JSON.stringify({ student_email: "amara.nwosu@example.edu" }))}`,
    { headers: studentHeaders },
  );
  const [profile] = await profileList.json();
  const edited = await fetch(`${baseUrl}/api/entities/ResearchProfile/${profile.id}`, {
    method: "PATCH",
    headers: studentHeaders,
    body: JSON.stringify({ student_email: profile.student_email, research_title: "Updated owned research title" }),
  });
  assert.equal(edited.status, 200);
  assert.equal((await edited.json()).research_title, "Updated owned research title");

  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.edu", password: "ResearchDesk123!" }),
  });
  const adminHeaders = { Authorization: `Bearer ${(await adminLogin.json()).access_token}`, "Content-Type": "application/json" };
  const supervisorList = await fetch(`${baseUrl}/api/entities/SupervisorProfile`, { headers: adminHeaders });
  const [supervisor] = await supervisorList.json();
  const increment = await fetch(`${baseUrl}/api/entities/SupervisorProfile/update-many`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ filters: { id: supervisor.id }, update: { $inc: { current_load: 2 } } }),
  });
  assert.equal(increment.status, 200);
  const updatedProfiles = await fetch(`${baseUrl}/api/entities/SupervisorProfile`, { headers: adminHeaders });
  const updatedSupervisor = (await updatedProfiles.json()).find((item) => item.id === supervisor.id);
  assert.equal(updatedSupervisor.current_load, supervisor.current_load + 2);
});

test("migrates demo students and supervisors into local matching entities", async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.edu", password: "ResearchDesk123!" }),
  });
  const { access_token } = await login.json();
  const headers = { Authorization: `Bearer ${access_token}` };
  const [supervisors, profiles] = await Promise.all([
    fetch(`${baseUrl}/api/entities/SupervisorProfile`, { headers }).then((response) => response.json()),
    fetch(`${baseUrl}/api/entities/ResearchProfile`, { headers }).then((response) => response.json()),
  ]);
  assert.equal(supervisors.length, 2);
  assert.ok(profiles.length >= 3);
  assert.ok(profiles.filter((profile) => profile.status === "submitted").length >= 2);
});

test("persists workspace changes across API server restarts", async () => {
  const databasePath = join(process.cwd(), "data", `test-${randomUUID()}.sqlite`);
  const start = async () => {
    const app = createApp(createStore(databasePath));
    const instance = app.listen(0);
    await new Promise((resolve) => instance.once("listening", resolve));
    return { app, instance, url: `http://127.0.0.1:${instance.address().port}` };
  };
  const stop = async ({ app, instance }) => {
    await new Promise((resolve, reject) =>
      instance.close((error) => (error ? reject(error) : resolve())),
    );
    app.locals.store.close();
  };

  let running;
  try {
    running = await start();
    const created = await fetch(`${running.url}/api/workspace/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Persistent support request",
        description: "This ticket must survive a restart.",
        status: "Open",
      }),
    });
    assert.equal(created.status, 201);
    const login = await fetch(`${running.url}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "amara.nwosu@example.edu", password: "ResearchDesk123!" }),
    });
    const { access_token } = await login.json();
    const entityResponse = await fetch(`${running.url}/api/entities/ResearchProfile`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ student_email: "amara.nwosu@example.edu", research_title: "SQLite entity persistence" }),
    });
    assert.equal(entityResponse.status, 201);
    const entity = await entityResponse.json();
    await stop(running);
    running = null;

    running = await start();
    const response = await fetch(`${running.url}/api/workspace/tickets?search=Persistent`);
    assert.equal(response.status, 200);
    const [ticket] = await response.json();
    assert.equal(ticket.title, "Persistent support request");
    const entityList = await fetch(`${running.url}/api/entities/ResearchProfile?filters=${encodeURIComponent(JSON.stringify({ student_email: "amara.nwosu@example.edu" }))}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    assert.equal(entityList.status, 200);
    assert.ok((await entityList.json()).some((record) => record.id === entity.id));
  } finally {
    if (running) await stop(running);
    if (existsSync(databasePath)) unlinkSync(databasePath);
  }
});

test("creates a user and rejects duplicate email addresses", async () => {
  const user = {
    name: "Test Student",
    email: "test.student@example.edu",
    identifier: "TEST/2026/001",
    role: "Student",
    department: "Computer Science",
    faculty: "Faculty of Computing",
  };
  const created = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).name, user.name);

  const duplicate = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  assert.equal(duplicate.status, 409);
});

test("updates a user record", async () => {
  const updated = await fetch(`${baseUrl}/api/users/usr-1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Amara Nwosu",
      email: "amara.updated@example.edu",
      identifier: "MIT/IMS/2026/014",
      role: "Student",
      department: "Information Technology",
      faculty: "Faculty of Computing",
    }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).email, "amara.updated@example.edu");
});

test("updates a supervisor profile and validates capacity", async () => {
  const profileResponse = await fetch(
    `${baseUrl}/api/supervisors/usr-2/profile`,
  );
  const profile = await profileResponse.json();
  profile.maxCapacity = "10 students";
  const updated = await fetch(`${baseUrl}/api/supervisors/usr-2/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).maxCapacity, "10 students");

  profile.maxCapacity = "not a number";
  const invalid = await fetch(`${baseUrl}/api/supervisors/usr-2/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  assert.equal(invalid.status, 400);
});

test("derives supervisor workload from active assignment records", async () => {
  const response = await fetch(`${baseUrl}/api/workload`);
  assert.equal(response.status, 200);
  const workload = await response.json();
  const supervisor = workload.supervisors.find((item) => item.id === "usr-2");
  assert.equal(supervisor.assigned, 1);
  assert.equal(supervisor.capacity, 10);
  assert.equal(supervisor.remaining, 9);
  assert.equal(workload.departments.find((item) => item.department === "Information Technology").assigned, 1);

  const profile = await fetch(`${baseUrl}/api/supervisors/usr-2/profile`);
  assert.equal((await profile.json()).currentLoad, "1 active students");
});

test("lists seeded research workspace records", async () => {
  const response = await fetch(`${baseUrl}/api/workspace/drafts?status=Awaiting%20review`);
  assert.equal(response.status, 200);
  const drafts = await response.json();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].title, "Chapter 1 — Introduction");
});

test("creates and updates a workspace item", async () => {
  const created = await fetch(`${baseUrl}/api/workspace/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test support request",
      description: "A request created by the API test.",
      status: "Open",
    }),
  });
  assert.equal(created.status, 201);
  const ticket = await created.json();

  const updated = await fetch(`${baseUrl}/api/workspace/tickets/${ticket.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Resolved" }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).status, "Resolved");
});

test("updates chapter readiness and shared writing comments", async () => {
  const chaptersResponse = await fetch(`${baseUrl}/api/workspace/chapters`);
  const chapters = await chaptersResponse.json();
  const chapterThree = chapters.find((item) => item.id === "chapter-3");
  assert.ok(chapterThree.sections.length > 0);

  const updated = await fetch(`${baseUrl}/api/workspace/chapters/chapter-3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sections: chapterThree.sections.map((section) => ({ ...section, status: "Ready" })),
    }),
  });
  assert.equal(updated.status, 200);
  const readyChapter = await updated.json();
  assert.equal(readyChapter.progress, 100);
  assert.equal(readyChapter.status, "Completed");

  const comment = await fetch(`${baseUrl}/api/workspace/collaborations/collab-1/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Updated the methods section." }),
  });
  assert.equal(comment.status, 201);
  assert.equal((await comment.json()).comment.text, "Updated the methods section.");
});

test("rejects unknown workspace collections and invalid items", async () => {
  const unknown = await fetch(`${baseUrl}/api/workspace/missing`);
  assert.equal(unknown.status, 404);
  const invalid = await fetch(`${baseUrl}/api/workspace/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: " " }),
  });
  assert.equal(invalid.status, 400);
});

test("generates eligible supervisor matches and confirms an assignment", async () => {
  const unsubmitted = await fetch(`${baseUrl}/api/recommendations/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.deepEqual((await unsubmitted.json()).recommendations, []);

  const submitted = await fetch(`${baseUrl}/api/workspace/researchProfiles/research-1`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Submitted" }),
  });
  assert.equal(submitted.status, 200);

  const generated = await fetch(`${baseUrl}/api/recommendations/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(generated.status, 200);
  const { recommendations } = await generated.json();
  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.every((item) => item.status === "Pending review"));
  assert.ok(recommendations.every((item) => item.department === "Information Technology"));
  assert.ok(recommendations.every((item) => item.score > 0 && item.rankPosition > 0));

  const confirmed = await fetch(`${baseUrl}/api/assignments/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recommendationId: recommendations[0].id }),
  });
  assert.equal(confirmed.status, 201);
  const result = await confirmed.json();
  assert.equal(result.recommendation.status, "Assigned");
  assert.equal(result.assignment.status, "Assigned");

  const workload = await fetch(`${baseUrl}/api/workload`);
  assert.equal((await workload.json()).supervisors.find((item) => item.id === "usr-2").assigned, 2);
});

test("keeps unmatched students in their department for administrator resolution", async () => {
  const research = await fetch(`${baseUrl}/api/workspace/researchProfiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Digital financial inclusion",
      owner: "Zainab Bello",
      status: "Submitted",
      researchArea: "Economics",
      keywords: "financial inclusion",
      description: "Study of digital access to financial services.",
    }),
  });
  assert.equal(research.status, 201);

  const generated = await fetch(`${baseUrl}/api/recommendations/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const result = await generated.json();
  const unresolved = result.recommendations.find((item) => item.studentId === "usr-4");
  assert.equal(unresolved.status, "Needs attention");
  assert.equal(unresolved.department, "Economics");
  assert.equal(unresolved.supervisorId, undefined);
  assert.match(unresolved.description, /cross-department assignment is not permitted/i);

  const attemptedAssignment = await fetch(`${baseUrl}/api/assignments/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recommendationId: unresolved.id }),
  });
  assert.equal(attemptedAssignment.status, 409);
});

test("connects draft submissions with supervisor review and revision feedback", async () => {
  const created = await fetch(`${baseUrl}/api/workspace/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Chapter 3 — Methodology",
      description: "Initial methodology draft.",
      status: "Draft",
      owner: "Amara Nwosu",
    }),
  });
  const draft = await created.json();
  await fetch(`${baseUrl}/api/workspace/drafts/${draft.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Awaiting review" }),
  });

  const reviewsResponse = await fetch(
    `${baseUrl}/api/workspace/reviews?search=${encodeURIComponent(draft.title)}`,
  );
  const reviews = await reviewsResponse.json();
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].status, "Awaiting review");

  const decision = await fetch(`${baseUrl}/api/workspace/reviews/${reviews[0].id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "Revision required",
      comment: "Clarify the participant selection criteria.",
    }),
  });
  assert.equal(decision.status, 200);
  const draftsResponse = await fetch(
    `${baseUrl}/api/workspace/drafts?search=${encodeURIComponent(draft.title)}`,
  );
  const updatedDrafts = await draftsResponse.json();
  assert.equal(updatedDrafts[0].status, "Revision required");
  assert.equal(updatedDrafts[0].description, "Initial methodology draft.");
  assert.equal(updatedDrafts[0].versionNo, 1);

  const feedback = await fetch(`${baseUrl}/api/workspace/feedback?search=participant%20selection`);
  const feedbackEntries = await feedback.json();
  assert.equal(feedbackEntries.length, 1);
  assert.equal(feedbackEntries[0].draftId, draft.id);
  assert.match(feedbackEntries[0].comment, /participant selection/);

  const immutable = await fetch(`${baseUrl}/api/workspace/drafts/${draft.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "Attempt to overwrite submitted version." }),
  });
  assert.equal(immutable.status, 409);

  const nextVersion = await fetch(`${baseUrl}/api/workspace/drafts/${draft.id}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: "chapter-v2.pdf",
      fileData: Buffer.from("revised chapter").toString("base64"),
      fileType: "application/pdf",
    }),
  });
  assert.equal(nextVersion.status, 201);
  const nextDraft = await nextVersion.json();
  assert.equal(nextDraft.versionNo, 2);
  assert.notEqual(nextDraft.id, draft.id);
  const originalDraft = await fetch(`${baseUrl}/api/workspace/drafts?search=${encodeURIComponent(draft.title)}`);
  const versions = await originalDraft.json();
  assert.equal(versions.find((item) => item.id === draft.id).description, "Initial methodology draft.");

  const versionFeedback = await fetch(`${baseUrl}/api/workspace/drafts/${nextDraft.id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supervisorId: "usr-2",
      decision: "Approved",
      comment: "The revised version addresses the selection criteria.",
    }),
  });
  assert.equal(versionFeedback.status, 201);
  const result = await versionFeedback.json();
  assert.equal(result.feedback.draftId, nextDraft.id);
  assert.equal(result.draft.status, "Approved");
  assert.equal(result.feedback.supervisorId, "usr-2");
});

test("stores, lists and downloads an uploaded draft file", async () => {
  const contents = Buffer.from("sample thesis chapter");
  const created = await fetch(`${baseUrl}/api/workspace/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Uploaded chapter",
      status: "Draft",
      owner: "Amara Nwosu",
      fileName: "chapter.pdf",
      fileType: "application/pdf",
      fileData: contents.toString("base64"),
    }),
  });
  assert.equal(created.status, 201);
  const draft = await created.json();

  const list = await fetch(`${baseUrl}/api/workspace/drafts?search=Uploaded%20chapter`);
  const [listedDraft] = await list.json();
  assert.equal(listedDraft.hasFile, true);
  assert.equal(Object.hasOwn(listedDraft, "fileData"), false);

  const download = await fetch(`${baseUrl}/api/workspace/drafts/${draft.id}/file`);
  assert.equal(download.status, 200);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), contents);
});

test("rejects unsupported draft file types", async () => {
  const response = await fetch(`${baseUrl}/api/workspace/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Unsupported file",
      fileName: "script.exe",
      fileData: Buffer.from("not allowed").toString("base64"),
    }),
  });
  assert.equal(response.status, 400);
});
