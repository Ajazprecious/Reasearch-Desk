import express from "express";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createStore } from "./data.js";
import { createSessionToken, localServiceKey, makePasswordHash, sessionUserId, verifyPassword } from "./auth.js";

const validRoles = new Set(["Student", "Supervisor", "Administrator"]);
const SERVICE_KEY = localServiceKey;
const validEmail = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const normalizeRole = (role) => {
  const value = String(role || "").toLowerCase();
  return value === "administrator" ? "admin" : value;
};
const parseObject = (value) => {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
};
const matches = (row, filters) => Object.entries(filters).every(([key, value]) => {
  const expected = value && typeof value === "object" && "$in" in value ? value.$in : value;
  return Array.isArray(expected) ? expected.includes(row[key]) : row[key] === expected;
});
const canReadEntity = (user, name, row, store) => {
  if (isAdminRole(user)) return true;
  if (name === "User") return row.id === user.id;
  if (name === "Defence" && row.scope === "department") {
    const role = normalizeRole(user.role || user.app_role);
    if (role === "student" || role === "supervisor") return row.department === user.department;
  }
  if (name === "SupervisorProfile") return true;
  if (["student_email", "user_email", "email"].some((key) => row[key] === user.email)) return true;
  if (normalizeRole(user.role || user.app_role) === "supervisor") {
    if (row.supervisor_email === user.email) return true;
    return store.entities.Assignment.some((item) => item.supervisor_email === user.email && item.student_email === row.student_email);
  }
  return false;
};
const isAdminRole = (user) => normalizeRole(user?.role || user?.app_role) === "admin";
const canWriteEntity = (user, name, row) => {
  if (isAdminRole(user)) return true;
  if (name === "SupervisorProfile" && normalizeRole(user.role || user.app_role) === "supervisor") {
    return !row.email || row.email === user.email;
  }
  if (["student_email", "user_email", "email"].some((key) => row[key] && row[key] !== user.email)) return false;
  if (normalizeRole(user.role || user.app_role) === "student") {
    return ["ResearchProfile", "Draft", "Notification", "Ticket", "TicketUpdate", "WritingDocument"].includes(name);
  }
  if (normalizeRole(user.role || user.app_role) === "supervisor") {
    return ["SupervisorProfile", "Feedback", "Milestone", "TicketUpdate", "Notification"].includes(name);
  }
  return false;
};

export function createApp(store = createStore()) {
  const app = express();
  app.use(express.json({ limit: "12mb" }));
  app.locals.store = store;
  app.use((request, response, next) => {
    const sendJson = response.json.bind(response);
    response.json = (body) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && response.statusCode < 400) {
        try {
          store.persist?.();
        } catch (error) {
          console.error("Could not persist SQLite workspace state:", error);
          throw error;
        }
      }
      return sendJson(body);
    };
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  const entityNames = new Set(Object.keys(store.entities || {}));
  const getUser = (request) => {
    if (request.get("x-researchdesk-service-key") === SERVICE_KEY) {
      return { id: "local-service", email: "service@local", role: "admin", app_role: "admin", full_name: "Local service" };
    }
    const user = store.users.find((item) => item.id === sessionUserId(request)) || null;
    return normalizeRole(user?.role || user?.app_role) === "supervisor" &&
      String(user?.status || "").toLowerCase() === "pending verification"
      ? null
      : user;
  };
  const publicUser = (user) => {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    const role = normalizeRole(safe.role || safe.app_role);
    const appRole = normalizeRole(safe.app_role || role);
    return {
      ...safe,
      full_name: safe.full_name || safe.name,
      app_role: appRole,
      role,
    };
  };
  const isAdmin = (user) => normalizeRole(user?.role || user?.app_role) === "admin";

  app.post("/api/auth/register", (request, response) => {
    const body = request.body || {};
    const {
      email, password, full_name, name, role = "student", identifier, program,
      faculty, department, administrative_office, administrative_scope,
      authorised_unit, academic_rank, supervision_capacity, expertise,
      invitation_code,
    } = body;
    if (!validEmail(email) || typeof password !== "string" || password.length < 8) {
      return response.status(400).json({ error: "Enter a valid email and a password of at least 8 characters." });
    }
    if (store.users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) {
      return response.status(409).json({ error: "An account with that email already exists." });
    }
    const normalizedRole = normalizeRole(role);
    const fullName = String(full_name || name || "").trim();
    const requiredFields = normalizedRole === "student"
      ? [fullName, identifier, program, faculty, department]
      : normalizedRole === "supervisor"
        ? [fullName, identifier, academic_rank, faculty, department, expertise]
        : normalizedRole === "admin"
          ? [fullName, identifier, administrative_office, administrative_scope, authorised_unit]
          : null;
    if (!requiredFields) {
      return response.status(400).json({ error: "Choose student, supervisor, or administrator for a new account." });
    }
    if (!requiredFields.every((value) => typeof value === "string" && value.trim())) {
      return response.status(400).json({ error: "Complete all required institutional profile fields." });
    }
    if (normalizedRole === "supervisor" && (!Number.isInteger(Number(supervision_capacity)) || Number(supervision_capacity) < 1)) {
      return response.status(400).json({ error: "Enter a valid supervision capacity." });
    }
    if (normalizedRole === "admin") {
      const approvalCode = process.env.ADMIN_INVITATION_CODE;
      if (!approvalCode) {
        return response.status(403).json({ error: "Administrator registration is disabled until the institution configures an approval code." });
      }
      if (typeof invitation_code !== "string" || invitation_code !== approvalCode) {
        return response.status(403).json({ error: "The invitation or approval code is invalid." });
      }
    }
    const registrationProfile = {
      identifier: identifier.trim(),
      ...(program ? { program: program.trim() } : {}),
      ...(academic_rank ? { academic_rank: academic_rank.trim() } : {}),
      ...(supervision_capacity !== undefined ? { supervision_capacity: Number(supervision_capacity) } : {}),
      ...(expertise ? { expertise: expertise.trim() } : {}),
      ...(administrative_office ? { administrative_office: administrative_office.trim() } : {}),
      ...(administrative_scope ? { administrative_scope: administrative_scope.trim() } : {}),
      ...(authorised_unit ? { authorised_unit: authorised_unit.trim() } : {}),
    };
    const user = {
      id: `usr-${randomUUID()}`, email: email.trim().toLowerCase(),
      name: fullName, full_name: fullName,
      role: normalizedRole, app_role: normalizedRole,
      status: normalizedRole === "supervisor" ? "Pending Verification" : "Active",
      department: String(department || authorised_unit).trim(),
      faculty: String(faculty || authorised_unit).trim(),
      ...registrationProfile,
      password_hash: makePasswordHash(password),
    };
    store.users.push(user);
    store.entities.User.push(publicUser(user));
    if (normalizedRole === "supervisor") {
      return response.status(201).json({ pending_verification: true, user: publicUser(user) });
    }
    const access_token = createSessionToken(user.id);
    return response.status(201).json({ access_token, user: publicUser(user) });
  });

  app.post("/api/auth/login", (request, response) => {
    const email = String(request.body?.email || "").trim().toLowerCase();
    const user = store.users.find((item) => item.email.toLowerCase() === email);
    if (!user || !verifyPassword(request.body?.password, user.password_hash)) {
      return response.status(401).json({ error: "Email or password is incorrect." });
    }
    if (normalizeRole(user.role || user.app_role) === "supervisor" &&
      String(user.status || "").toLowerCase() === "pending verification") {
      return response.status(403).json({ error: "Your supervisor account is awaiting administrator approval." });
    }
    return response.json({ access_token: createSessionToken(user.id), user: publicUser(user) });
  });
  app.get("/api/auth/me", (request, response) => {
    const user = getUser(request);
    return user ? response.json(publicUser(user)) : response.status(401).json({ error: "Sign in to continue." });
  });
  app.patch("/api/auth/me", (request, response) => {
    const user = getUser(request);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    const allowed = ["full_name", "department", "faculty", "settings"];
    for (const key of allowed) if (request.body?.[key] !== undefined) user[key] = request.body[key];
    user.name = user.full_name || user.name;
    const record = store.entities.User.find((item) => item.id === user.id);
    if (record) Object.assign(record, Object.fromEntries(allowed.filter((key) => user[key] !== undefined).map((key) => [key, user[key]])));
    return response.json(publicUser(user));
  });
  app.post("/api/auth/logout", (_request, response) => response.json({ ok: true }));
  app.post("/api/auth/reset", (request, response) => {
    const userExists = store.users.some((user) => user.email.toLowerCase() === String(request.body?.email || "").toLowerCase());
    return response.json({ ok: true, message: userExists ? "Password reset by email is not configured in this local installation." : "If the account exists, reset instructions would be sent." });
  });
  app.post("/api/auth/reset/complete", (_request, response) =>
    response.status(501).json({ error: "Password reset is unavailable until an email provider is configured." }));

  app.get("/api/entities/:entity", (request, response) => {
    const user = getUser(request);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    const records = getEntityRecords(request.params.entity);
    if (!records) return response.status(404).json({ error: "Unknown entity." });
    let rows = records.filter((row) => canReadEntity(user, request.params.entity, row, store));
    const filters = parseObject(request.query.filters);
    if (filters) rows = rows.filter((row) => matches(row, filters));
    if (request.query.sort) {
      const desc = String(request.query.sort).startsWith("-");
      const key = String(request.query.sort).replace(/^-/, "");
      rows.sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * (desc ? -1 : 1));
    }
    const limit = Math.max(0, Math.min(Number(request.query.limit) || 500, 1000));
    response.json(rows.slice(0, limit));
  });
  app.get("/api/entities/:entity/count", (request, response) => {
    const user = getUser(request);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    const rows = getEntityRecords(request.params.entity);
    if (!rows) return response.status(404).json({ error: "Unknown entity." });
    const filters = parseObject(request.query.filters) || {};
    response.json({ count: rows.filter((row) => canReadEntity(user, request.params.entity, row, store) && matches(row, filters)).length });
  });
  app.get("/api/entities/:entity/:id", (request, response) => {
    const user = getUser(request);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    const rows = getEntityRecords(request.params.entity);
    const row = rows?.find((item) => item.id === request.params.id);
    if (!row || !canReadEntity(user, request.params.entity, row, store)) return response.status(404).json({ error: "Record not found." });
    response.json(row);
  });
  app.post("/api/entities/:entity", (request, response) => {
    const user = getUser(request);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    const rows = getEntityRecords(request.params.entity);
    if (!rows) return response.status(404).json({ error: "Unknown entity." });
    const row = request.body && typeof request.body === "object" ? { ...request.body } : {};
    if (!canWriteEntity(user, request.params.entity, row)) return response.status(403).json({ error: "You cannot create this record." });
    row.id ||= `${request.params.entity.toLowerCase()}-${randomUUID()}`;
    row.created_date ||= new Date().toISOString();
    rows.push(row);
    response.status(201).json(row);
  });
  app.post("/api/entities/:entity/bulk", (request, response) => {
    const user = getUser(request);
    const rows = getEntityRecords(request.params.entity);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    if (!rows || !Array.isArray(request.body)) return response.status(400).json({ error: "Expected a list of records." });
    if (!isAdmin(user)) return response.status(403).json({ error: "Only administrators can add records in bulk." });
    const created = request.body.map((row) => ({ id: row.id || `${request.params.entity.toLowerCase()}-${randomUUID()}`, created_date: new Date().toISOString(), ...row }));
    rows.push(...created);
    response.status(201).json(created);
  });
  app.patch("/api/entities/:entity/:id", (request, response) => {
    const user = getUser(request);
    const rows = getEntityRecords(request.params.entity);
    const row = rows?.find((item) => item.id === request.params.id);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    if (!row || !canReadEntity(user, request.params.entity, row, store) || !canWriteEntity(user, request.params.entity, row)) {
      return response.status(404).json({ error: "Record not found." });
    }
    if (!isAdmin(user) && ["role", "app_role", "email", "id", "student_email", "supervisor_email", "user_email"]
      .some((key) => key in (request.body || {}) && request.body[key] !== row[key])) {
      return response.status(403).json({ error: "Protected account fields cannot be changed." });
    }
    Object.assign(row, request.body || {});
    if (request.params.entity === "User") {
      const account = store.users.find((item) => item.id === row.id);
      if (account) {
        Object.assign(account, row);
        account.name = row.full_name || row.name || account.name;
        if (row.app_role) {
          account.app_role = row.app_role;
          if (normalizeRole(account.role) !== "admin") {
            account.role = row.app_role === "admin" ? "Administrator" : row.app_role[0].toUpperCase() + row.app_role.slice(1);
          }
        }
      }
    }
    response.json(row);
  });
  app.post("/api/entities/:entity/:operation", (request, response, next) => {
    const user = getUser(request);
    const rows = getEntityRecords(request.params.entity);
    if (["update-many", "delete-many"].includes(request.params.operation)) {
      if (!user) return response.status(401).json({ error: "Sign in to continue." });
      if (!rows) return response.status(404).json({ error: "Unknown entity." });
      const filters = request.body?.filters || {};
      if (request.params.operation === "delete-many") {
        if (!isAdmin(user)) return response.status(403).json({ error: "This action requires an administrator." });
        const kept = rows.filter((row) => !matches(row, filters));
        rows.splice(0, rows.length, ...kept);
        return response.json({ deleted: true });
      }
      const update = request.body?.update;
      if (!update || typeof update !== "object" || Array.isArray(update)) {
        return response.status(400).json({ error: "Provide a valid update object." });
      }
      const set = update.$set || (update.$inc ? {} : update);
      const increments = update.$inc || {};
      if (
        !set ||
        typeof set !== "object" ||
        Array.isArray(set) ||
        !increments ||
        typeof increments !== "object" ||
        Array.isArray(increments) ||
        Object.keys(update).some((key) => key.startsWith("$") && !["$set", "$inc"].includes(key))
      ) {
        return response.status(400).json({ error: "Only $set and numeric $inc updates are supported." });
      }
      const updated = rows.filter((row) => matches(row, filters));
      if (!isAdmin(user) && updated.some((row) => !canReadEntity(user, request.params.entity, row, store) || !canWriteEntity(user, request.params.entity, row))) {
        return response.status(403).json({ error: "You cannot update these records." });
      }
      const invalidIncrement = updated.some((row) =>
        Object.entries(increments).some(([key, amount]) =>
          typeof amount !== "number" ||
          !Number.isFinite(amount) ||
          (row[key] !== undefined && (typeof row[key] !== "number" || !Number.isFinite(row[key]))),
        ),
      );
      if (invalidIncrement) return response.status(400).json({ error: "$inc values and target fields must be finite numbers." });
      updated.forEach((row) => {
        Object.assign(row, set);
        for (const [key, amount] of Object.entries(increments)) row[key] = (row[key] || 0) + amount;
        row.updated_date = new Date().toISOString();
      });
      return response.json({ updated: updated.length });
    }
    return next();
  });
  app.post("/api/files", (request, response) => {
    const user = getUser(request);
    if (!user) return response.status(401).json({ error: "Sign in to continue." });
    const { name, content } = request.body || {};
    if (typeof content !== "string" || content.length > 10 * 1024 * 1024) return response.status(400).json({ error: "File is missing or too large." });
    const directory = resolve(process.env.UPLOADS_PATH || join(process.cwd(), "data", "uploads"));
    mkdirSync(directory, { recursive: true });
    const filename = `${randomUUID()}-${String(name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    writeFileSync(join(directory, filename), Buffer.from(content, "base64"));
    return response.status(201).json({ file_uri: `/uploads/${filename}`, file_url: `/uploads/${filename}` });
  });
  app.use("/uploads", express.static(resolve(process.env.UPLOADS_PATH || join(process.cwd(), "data", "uploads"))));

  function getEntityRecords(name) {
    return entityNames.has(name) ? store.entities[name] : null;
  }

  app.get("/api/users", (request, response) => {
    const search = String(request.query.search || "").trim().toLowerCase();
    const role = String(request.query.role || "");
    const department = String(request.query.department || "");
    const users = store.users.filter((user) => {
      const matchesSearch =
        !search ||
        [user.name, user.email, user.identifier, user.department, user.faculty]
          .join(" ")
          .toLowerCase()
          .includes(search);
      return (
        matchesSearch &&
        (!role || user.role === role) &&
        (!department || user.department === department)
      );
    });
    response.json(users.map(({ password_hash, ...user }) => user));
  });

  app.post("/api/users", (request, response) => {
    const { name, email, identifier, role, department, faculty } =
      request.body || {};
    if (![name, email, identifier, department, faculty].every(isNonEmptyString)) {
      return response.status(400).json({
        error: "Name, email, ID, department and faculty are required.",
      });
    }
    if (!validRoles.has(role)) {
      return response.status(400).json({ error: "Choose a valid user role." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return response.status(400).json({ error: "Enter a valid email address." });
    }
    if (
      store.users.some(
        (user) =>
          user.email.toLowerCase() === email.trim().toLowerCase() ||
          String(user.identifier || "").toLowerCase() === identifier.trim().toLowerCase(),
      )
    ) {
      return response
        .status(409)
        .json({ error: "A user with that email or ID already exists." });
    }

    const user = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      email: email.trim(),
      identifier: identifier.trim(),
      role,
      status: "Active",
      department: department.trim(),
      faculty: faculty.trim(),
    };
    store.users.push(user);
    store.entities.User.push({
      id: user.id,
      email: user.email,
      full_name: user.name,
      app_role: normalizeRole(user.role),
      role: normalizeRole(user.role),
      department: user.department,
      faculty: user.faculty,
      status: user.status,
    });
    if (role === "Supervisor" && store.profiles) {
      store.profiles.set(user.id, {
        id: user.id,
        department: user.department,
        academicRank: "Lecturer",
        researchAreas: "Research expertise to be added",
        keywords: "Research keywords to be added",
        maxCapacity: "8 students",
        currentLoad: "0 active students",
        availability: "Available for new assignment",
        preferredLevel: "Postgraduate",
        researchSummary: "Add a short summary of your research expertise.",
      });
    }
    return response.status(201).json(user);
  });

  app.put("/api/users/:id", (request, response) => {
    const user = store.users.find((item) => item.id === request.params.id);
    if (!user) {
      return response.status(404).json({ error: "User not found." });
    }
    const { name, email, identifier, role, department, faculty } =
      request.body || {};
    if (![name, email, identifier, department, faculty].every(isNonEmptyString)) {
      return response.status(400).json({
        error: "Name, email, ID, department and faculty are required.",
      });
    }
    if (!validRoles.has(role)) {
      return response.status(400).json({ error: "Choose a valid user role." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return response.status(400).json({ error: "Enter a valid email address." });
    }
    if (
      store.users.some(
        (item) =>
          item.id !== user.id &&
          (item.email.toLowerCase() === email.trim().toLowerCase() ||
            String(item.identifier || "").toLowerCase() === identifier.trim().toLowerCase()),
      )
    ) {
      return response
        .status(409)
        .json({ error: "A user with that email or ID already exists." });
    }
    Object.assign(user, {
      name: name.trim(),
      email: email.trim(),
      identifier: identifier.trim(),
      role,
      department: department.trim(),
      faculty: faculty.trim(),
    });
    const account = store.entities.User.find((item) => item.id === user.id);
    if (account) Object.assign(account, {
      email: user.email,
      full_name: user.name,
      app_role: normalizeRole(user.role),
      role: normalizeRole(user.role),
      department: user.department,
      faculty: user.faculty,
    });
    const { password_hash, ...safeUser } = user;
    return response.json(safeUser);
  });

  app.get("/api/supervisors/:id/profile", (request, response) => {
    const profile = store.profiles.get(request.params.id);
    if (!profile) {
      return response.status(404).json({ error: "Supervisor profile not found." });
    }
    const activeLoad = getSupervisorLoad(store, request.params.id);
    return response.json({
      ...profile,
      currentLoad: `${activeLoad} active students`,
    });
  });

  app.put("/api/supervisors/:id/profile", (request, response) => {
    const current = store.profiles.get(request.params.id);
    if (!current) {
      return response.status(404).json({ error: "Supervisor profile not found." });
    }
    const allowedFields = [
      "department",
      "academicRank",
      "researchAreas",
      "keywords",
      "maxCapacity",
      "availability",
      "preferredLevel",
      "researchSummary",
    ];
    const updated = { ...current };
    for (const field of allowedFields) {
      const value = request.body?.[field];
      if (typeof value !== "string" || !value.trim()) {
        return response
          .status(400)
          .json({ error: `Enter a value for ${field}.` });
      }
      updated[field] = value.trim();
    }
    if (
      !["Available for new assignment", "Not available for new assignment"].includes(
        updated.availability,
      )
    ) {
      return response.status(400).json({ error: "Choose a valid availability." });
    }
    const capacity = Number.parseInt(updated.maxCapacity, 10);
    if (!Number.isFinite(capacity) || capacity < 0) {
      return response.status(400).json({ error: "Capacity must be a non-negative number." });
    }
    updated.currentLoad = `${getSupervisorLoad(store, request.params.id)} active students`;
    store.profiles.set(request.params.id, updated);
    return response.json(updated);
  });

  app.get("/api/workload", (_request, response) => {
    const supervisors = store.users
      .filter((user) => user.role === "Supervisor")
      .map((user) => {
        const profile = store.profiles.get(user.id);
        const capacity = Number.parseInt(profile?.maxCapacity, 10) || 0;
        const assigned = getSupervisorLoad(store, user.id);
        return {
          id: user.id,
          name: user.name,
          department: user.department,
          faculty: user.faculty,
          availability: profile?.availability || "Not available for new assignment",
          capacity,
          assigned,
          remaining: Math.max(capacity - assigned, 0),
        };
      });
    const departments = [...new Set(supervisors.map((user) => user.department))]
      .map((department) => {
        const members = supervisors.filter((user) => user.department === department);
        const capacity = members.reduce((total, user) => total + user.capacity, 0);
        const assigned = members.reduce((total, user) => total + user.assigned, 0);
        return {
          department,
          faculty: members[0]?.faculty || "",
          supervisors: members.length,
          capacity,
          assigned,
          remaining: Math.max(capacity - assigned, 0),
          usagePercent: capacity ? Math.round((assigned / capacity) * 100) : 0,
          members,
        };
      });
    return response.json({ departments, supervisors });
  });

  app.post("/api/recommendations/generate", (request, response) => {
    const supervisors = store.users.filter((user) => user.role === "Supervisor");
    const students = store.users.filter((user) => user.role === "Student");
    const recommendations = [];
    for (const student of students) {
      const studentRecommendations = [];
      const research = store.collections.researchProfiles.find(
        (item) => item.owner === student.name,
      );
      if (!research || !["Submitted", "Processing recommendations"].includes(research.status)) {
        continue;
      }
      const researchText = [
        research?.title,
        research?.description,
        research?.researchArea,
        research?.keywords,
      ].filter(Boolean).join(" ");
      for (const supervisor of supervisors) {
        if (supervisor.department !== student.department) continue;
        const profile = store.profiles.get(supervisor.id);
        if (!profile) continue;
        const capacity = Number.parseInt(profile.maxCapacity, 10);
        const load = getSupervisorLoad(store, supervisor.id);
        const available = profile.availability === "Available for new assignment" &&
          Number.isFinite(capacity) && Number.isFinite(load) && load < capacity;
        if (!available) continue;
        const expertise = [
          profile.researchAreas,
          profile.keywords,
          profile.researchSummary,
          profile.department,
        ].join(" ");
        const score = calculateMatchScore(researchText, expertise);
        studentRecommendations.push({
          id: `rec-${student.id}-${supervisor.id}`,
          projectId: research.id,
          studentId: student.id,
          supervisorId: supervisor.id,
          department: student.department,
          title: `${student.name} — ${research?.title || "Research supervision"}`,
          subtitle: `${student.department} · ${score}% expertise match`,
          description: `Department boundary passed. Research relevance was ranked by cosine similarity, then availability and capacity were checked (${capacity - load} slots available). Administrator review is required before assignment.`,
          status: "Pending review",
          owner: supervisor.name,
          updatedAt: "Just now",
          score,
          rankPosition: 0,
          availableSlots: capacity - load,
        });
      }
      if (!studentRecommendations.length) {
        const hasDepartmentSupervisor = supervisors.some(
          (supervisor) => supervisor.department === student.department,
        );
        studentRecommendations.push({
          id: `unmatched-${student.id}`,
          projectId: research.id,
          studentId: student.id,
          department: student.department,
          title: `${student.name} — ${research.title}`,
          subtitle: `${student.department} · No eligible supervisor`,
          description: hasDepartmentSupervisor
            ? "No supervisor in this department currently meets availability and capacity requirements. Resolve within the department; cross-department assignment is not permitted."
            : "No eligible supervisor is available in this department. Resolve within the department; cross-department assignment is not permitted.",
          status: "Needs attention",
          owner: "Unassigned",
          updatedAt: "Just now",
          rankPosition: 0,
          availableSlots: 0,
        });
      }
      studentRecommendations.sort((a, b) => b.score - a.score);
      let rank = 0;
      studentRecommendations.forEach((recommendation) => {
        if (recommendation.supervisorId) recommendation.rankPosition = ++rank;
      });
      recommendations.push(...studentRecommendations);
    }
    recommendations.sort((a, b) => b.score - a.score);
    const eligibleCount = recommendations.filter(
      (recommendation) => Boolean(recommendation.supervisorId),
    ).length;
    store.collections.recommendations.splice(
      0,
      store.collections.recommendations.length,
      ...recommendations,
    );
    return response.json({
      recommendations,
      excludedCount: supervisors.length * students.length - eligibleCount,
      unmatchedCount: recommendations.filter((item) => !item.supervisorId).length,
    });
  });

  app.post("/api/assignments/confirm", (request, response) => {
    const recommendation = store.collections.recommendations.find(
      (item) => item.id === request.body?.recommendationId,
    );
    if (!recommendation) {
      return response.status(404).json({ error: "Recommendation not found." });
    }
    const student = store.users.find((user) => user.id === recommendation.studentId);
    const supervisor = store.users.find((user) => user.id === recommendation.supervisorId);
    if (!student || !supervisor || student.department !== supervisor.department) {
      return response.status(409).json({
        error: "Assignments must stay within the student's department.",
      });
    }
    if (recommendation.status === "Assigned") {
      return response.status(409).json({ error: "This recommendation is already assigned." });
    }
    const profile = store.profiles.get(recommendation.supervisorId);
    if (
      !profile ||
      profile.availability !== "Available for new assignment" ||
      getSupervisorLoad(store, recommendation.supervisorId) >=
        Number.parseInt(profile.maxCapacity, 10)
    ) {
      return response.status(409).json({ error: "The supervisor is no longer eligible by availability or capacity." });
    }
    const assignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${store.users.find((user) => user.id === recommendation.studentId)?.name || "Student"} → ${recommendation.owner}`,
      subtitle: `${recommendation.subtitle} · Confirmed today`,
      description: "Supervisor assignment confirmed by the postgraduate administrator.",
      status: "Assigned",
      owner: "Postgraduate Admin",
      updatedAt: "Today",
      studentId: recommendation.studentId,
      supervisorId: recommendation.supervisorId,
    };
    recommendation.status = "Assigned";
    store.collections.assignments.unshift(assignment);
    const remainingSlots = Math.max(
      Number.parseInt(profile.maxCapacity, 10) - getSupervisorLoad(store, supervisor.id),
      0,
    );
    recommendation.availableSlots = remainingSlots;
    store.collections.recommendations.forEach((item) => {
      if (item.supervisorId === supervisor.id && item.status !== "Assigned") {
        item.availableSlots = remainingSlots;
      }
    });
    store.collections.notifications.unshift({
      id: `notification-${assignment.id}`,
      title: "Supervisor assignment confirmed",
      subtitle: `${assignment.title} · Today`,
      description: "Your postgraduate supervisor assignment has been confirmed.",
      status: "Unread",
      owner: assignment.title.split(" → ")[0],
      updatedAt: "Today",
    });
    return response.status(201).json({ recommendation, assignment });
  });

  app.get("/api/workspace/:collection", (request, response) => {
    const records = store.collections?.[request.params.collection];
    if (!Array.isArray(records)) {
      return response.status(404).json({ error: "Workspace collection not found." });
    }
    const search = String(request.query.search || "").trim().toLowerCase();
    const status = String(request.query.status || "");
    const filtered = records.filter((record) => {
      const matchesSearch =
        !search ||
        [
          record.title,
          record.subtitle,
          record.description,
          record.comment,
          record.activityType,
          record.owner,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      return matchesSearch && (!status || record.status === status);
    });
    return response.json(filtered.map(({ fileData, ...record }) => ({
      ...record,
      hasFile: Boolean(fileData),
    })));
  });

  app.get("/api/workspace/:collection/:id/file", (request, response) => {
    const records = store.collections?.[request.params.collection];
    const record = records?.find((item) => item.id === request.params.id);
    if (!record?.fileData || !record.fileName) {
      return response.status(404).json({ error: "File not found." });
    }
    const content = Buffer.from(record.fileData, "base64");
    const extension = record.fileName.toLowerCase().split(".").pop();
    const contentType = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }[extension] || "application/octet-stream";
    response
      .type(contentType)
      .attachment(record.fileName)
      .send(content);
  });

  app.post("/api/workspace/drafts/:id/versions", (request, response) => {
    const previous = store.collections.drafts.find(
      (item) => item.id === request.params.id,
    );
    if (!previous) {
      return response.status(404).json({ error: "Draft version not found." });
    }
    if (previous.status !== "Revision required") {
      return response.status(409).json({
        error: "Only a draft version marked for revision can be resubmitted.",
      });
    }
    const { fileName = "", fileData = "", fileType = "", description = "" } =
      request.body || {};
    if (!isNonEmptyString(fileName) || !isNonEmptyString(fileData)) {
      return response.status(400).json({ error: "Choose a new draft file before resubmitting." });
    }
    const extension = fileName.toLowerCase().split(".").pop();
    if (!["pdf", "doc", "docx"].includes(extension)) {
      return response.status(400).json({ error: "Upload a PDF, DOC or DOCX file." });
    }
    if (fileData.length > 11_200_000) {
      return response.status(413).json({ error: "The draft file must be 8 MB or smaller." });
    }
    const versions = store.collections.drafts.filter((item) =>
      previous.milestoneId
        ? item.milestoneId === previous.milestoneId
        : item.title === previous.title,
    );
    const versionNo = Math.max(
      ...versions.map((item) => Number(item.versionNo) || 0),
      0,
    ) + 1;
    const revision = {
      ...previous,
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      versionNo,
      subtitle: `Version ${versionNo} · Submitted today`,
      description: isNonEmptyString(description) ? description.trim() : previous.description,
      status: "Awaiting review",
      fileName: fileName.trim(),
      fileData,
      fileType: isNonEmptyString(fileType) ? fileType.trim() : "application/octet-stream",
      updatedAt: "Today",
    };
    store.collections.drafts.unshift(revision);
    upsertDraftReview(store, revision);
    trackProgress(store, revision, "Draft version submitted", "Awaiting review");
    return response.status(201).json({
      ...revision,
      fileData: undefined,
      hasFile: true,
    });
  });

  app.post("/api/workspace/drafts/:id/feedback", (request, response) => {
    const draft = store.collections.drafts.find(
      (item) => item.id === request.params.id,
    );
    if (!draft) {
      return response.status(404).json({ error: "Draft version not found." });
    }
    const { comment, supervisorId = "usr-2", decision = "Revision required" } =
      request.body || {};
    if (!isNonEmptyString(comment)) {
      return response.status(400).json({ error: "Feedback comment is required." });
    }
    if (!["Revision required", "Reviewed", "Approved"].includes(decision)) {
      return response.status(400).json({ error: "Choose a valid review decision." });
    }
    const supervisor = store.users.find(
      (user) => user.id === supervisorId && user.role === "Supervisor",
    );
    if (!supervisor) {
      return response.status(400).json({ error: "Choose a valid supervisor." });
    }
    const feedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      draftId: draft.id,
      supervisorId,
      comment: comment.trim(),
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      owner: supervisor.name,
    };
    store.collections.feedback.unshift(feedback);
    draft.status = decision;
    draft.updatedAt = feedback.createdAt;
    syncDraftReview(store, draft);
    trackProgress(store, draft, `Draft ${decision.toLowerCase()}`, decision, feedback.createdAt);
    store.collections.notifications.unshift({
      id: `notification-${feedback.id}`,
      title: `Feedback received on ${draft.title}`,
      subtitle: `Version ${draft.versionNo || 1} · ${feedback.createdAt}`,
      description: feedback.comment,
      status: "Unread",
      owner: draft.owner,
      updatedAt: feedback.createdAt,
    });
    return response.status(201).json({ feedback, draft });
  });

  app.post("/api/workspace/collaborations/:id/comments", (request, response) => {
    const collaboration = store.collections.collaborations.find(
      (item) => item.id === request.params.id,
    );
    if (!collaboration) {
      return response.status(404).json({ error: "Writing session not found." });
    }
    const { text, author = "Amara Nwosu" } = request.body || {};
    if (!isNonEmptyString(text) || !isNonEmptyString(author)) {
      return response.status(400).json({ error: "Comment text and author are required." });
    }
    const comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: author.trim(),
      text: text.trim(),
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    collaboration.comments = [...(collaboration.comments || []), comment];
    collaboration.updatedAt = comment.createdAt;
    return response.status(201).json({ collaboration, comment });
  });

  app.post("/api/workspace/:collection", (request, response) => {
    const records = store.collections?.[request.params.collection];
    if (!Array.isArray(records)) {
      return response.status(404).json({ error: "Workspace collection not found." });
    }
    const { title, subtitle = "", description = "", researchArea = "", keywords = "", status = "Draft", owner = "", fileName = "", fileData = "", fileType = "", projectId = "", milestoneId = "", dueDate = "", chapterNo, progress, currentVersion = "", latestSupervisorNote = "", sections, comments, activityType = "", activityDate = "" } =
      request.body || {};
    if (!isNonEmptyString(title)) {
      return response.status(400).json({ error: "A title is required." });
    }
    if (fileName || fileData) {
      const extension = String(fileName).toLowerCase().split(".").pop();
      if (!["pdf", "doc", "docx"].includes(extension) || typeof fileData !== "string" || !fileData) {
        return response.status(400).json({ error: "Upload a PDF, DOC or DOCX file." });
      }
      if (fileData.length > 11_200_000) {
        return response.status(413).json({ error: "The draft file must be 8 MB or smaller." });
      }
    }
    const versionNo = request.params.collection === "drafts"
      ? Math.max(
          ...records
            .filter((item) =>
              projectId
                ? item.projectId === projectId && item.title === title.trim()
                : item.title === title.trim(),
            )
            .map((item) => Number(item.versionNo) || 0),
          0,
        ) + 1
      : undefined;
    const record = {
      id: `${request.params.collection}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      subtitle: isNonEmptyString(subtitle) ? subtitle.trim() : "",
      description: isNonEmptyString(description) ? description.trim() : "",
      researchArea: isNonEmptyString(researchArea) ? researchArea.trim() : "",
      keywords: isNonEmptyString(keywords) ? keywords.trim() : "",
      fileName: isNonEmptyString(fileName) ? fileName.trim() : "",
      fileData: typeof fileData === "string" ? fileData : "",
      fileType: isNonEmptyString(fileType) ? fileType.trim() : "",
      status: isNonEmptyString(status) ? status.trim() : "Draft",
      owner: isNonEmptyString(owner) ? owner.trim() : "",
      ...(isNonEmptyString(projectId) ? { projectId: projectId.trim() } : {}),
      ...(isNonEmptyString(milestoneId) ? { milestoneId: milestoneId.trim() } : {}),
      ...(isNonEmptyString(dueDate) ? { dueDate: dueDate.trim() } : {}),
      ...(Number.isInteger(chapterNo) ? { chapterNo } : {}),
      ...(Number.isFinite(progress) ? { progress: Math.max(0, Math.min(100, progress)) } : {}),
      ...(isNonEmptyString(currentVersion) ? { currentVersion: currentVersion.trim() } : {}),
      ...(isNonEmptyString(latestSupervisorNote) ? { latestSupervisorNote: latestSupervisorNote.trim() } : {}),
      ...(Array.isArray(sections) ? { sections } : {}),
      ...(Array.isArray(comments) ? { comments } : {}),
      ...(isNonEmptyString(activityType) ? { activityType: activityType.trim() } : {}),
      ...(isNonEmptyString(activityDate) ? { activityDate: activityDate.trim() } : {}),
      ...(versionNo ? { versionNo } : {}),
      ...(request.params.collection === "chapters"
        ? {
            chapterNo: Number.isInteger(chapterNo)
              ? chapterNo
              : Math.max(0, ...records.map((item) => Number(item.chapterNo) || 0)) + 1,
            progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
            sections: Array.isArray(sections) ? sections : [],
          }
        : {}),
      updatedAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    records.unshift(record);
    if (
      request.params.collection === "drafts" &&
      ["Submitted", "Awaiting review"].includes(record.status)
    ) {
      upsertDraftReview(store, record);
      trackProgress(store, record, "Draft submitted", record.status);
    }
    if (request.params.collection === "milestones") {
      store.collections.progress.unshift({
        id: `progress-${record.id}`,
        projectId: record.projectId || "",
        milestoneId: record.id,
        title: record.title,
        activityType: `Milestone ${record.status.toLowerCase()}`,
        activityDate: record.updatedAt,
        status: record.status,
        owner: record.owner,
      });
    }
    return response.status(201).json(record);
  });

  app.patch("/api/workspace/:collection/:id", (request, response) => {
    const records = store.collections?.[request.params.collection];
    if (!Array.isArray(records)) {
      return response.status(404).json({ error: "Workspace collection not found." });
    }
    const record = records.find((item) => item.id === request.params.id);
    if (!record) {
      return response.status(404).json({ error: "Workspace item not found." });
    }
    const allowedFields = ["title", "subtitle", "description", "comment", "researchArea", "keywords", "status", "owner", "progress", "currentVersion", "latestSupervisorNote", "dueDate", "sections"];
    const previousStatus = record.status;
    if (
      request.params.collection === "drafts" &&
      ["Submitted", "Awaiting review", "Reviewed", "Approved", "Revision required"].includes(previousStatus) &&
      ["title", "subtitle", "description"].some((field) => request.body?.[field] !== undefined)
    ) {
      return response.status(409).json({
        error: "Submitted draft versions are immutable. Create a new version to make changes.",
      });
    }
    for (const field of allowedFields) {
      if (request.body?.[field] === undefined) continue;
      if (field === "progress") {
        const progressValue = request.body[field];
        if (!Number.isFinite(progressValue) || progressValue < 0 || progressValue > 100) {
          return response.status(400).json({ error: "Progress must be between 0 and 100." });
        }
        record.progress = progressValue;
        continue;
      }
      if (field === "sections") {
        const sections = request.body[field];
        if (
          !Array.isArray(sections) ||
          sections.some(
            (section) =>
              !isNonEmptyString(section?.title) ||
              !["Ready", "In progress", "Not started"].includes(section.status),
          )
        ) {
          return response.status(400).json({ error: "Chapter sections must include a title and valid status." });
        }
        record.sections = sections.map((section) => ({
          title: section.title.trim(),
          status: section.status,
        }));
        record.progress = sections.length
          ? Math.round((sections.filter((section) => section.status === "Ready").length / sections.length) * 100)
          : 0;
        record.status = record.progress === 100
          ? "Completed"
          : record.progress > 0
            ? "In progress"
            : "Not started";
        continue;
      }
      if (!isNonEmptyString(request.body[field])) {
        return response.status(400).json({ error: `${field} must be a non-empty string.` });
      }
      record[field] = request.body[field].trim();
    }
    record.updatedAt = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (request.params.collection === "drafts") {
      if (["Submitted", "Awaiting review"].includes(record.status)) {
        upsertDraftReview(store, record);
      } else {
        syncDraftReview(store, record);
      }
    } else if (request.params.collection === "reviews") {
      syncReviewDecision(store, record);
    } else if (request.params.collection === "milestones" && previousStatus !== record.status) {
      store.collections.progress.unshift({
        id: `progress-${record.id}-${Date.now()}`,
        projectId: record.projectId || "",
        milestoneId: record.id,
        title: record.title,
        activityType: `Milestone ${record.status.toLowerCase()}`,
        activityDate: record.updatedAt,
        status: record.status,
        owner: record.owner,
      });
    } else if (
      request.params.collection === "researchProfiles" &&
      record.status === "Processing recommendations"
    ) {
      store.collections.notifications.unshift({
        id: `notification-${record.id}-${Date.now()}`,
        title: "Research profile submitted for matching",
        subtitle: record.owner || "Student",
        description: `${record.title} is ready for administrator review and supervisor matching.`,
        status: "Unread",
        owner: "Postgraduate Admin",
        updatedAt: "Just now",
      });
    }
    return response.json(record);
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && "body" in error) {
      return response.status(400).json({ error: "Request body must be valid JSON." });
    }
    if (error?.type === "entity.too.large") {
      return response.status(413).json({ error: "Request body exceeds the allowed size." });
    }
    return response.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getSupervisorLoad(store, supervisorId) {
  return store.collections.assignments.filter(
    (assignment) =>
      assignment.supervisorId === supervisorId &&
      ["Assigned", "Active"].includes(assignment.status),
  ).length;
}

function trackProgress(store, record, activityType, status, activityDate = record.updatedAt) {
  store.collections.progress.unshift({
    id: `progress-${record.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    projectId: record.projectId || "",
    milestoneId: record.milestoneId || "",
    title: record.title,
    activityType,
    activityDate,
    status,
    owner: record.owner,
  });
}

function calculateMatchScore(studentText, expertiseText) {
  const stopWords = new Set([
    "and", "for", "the", "with", "from", "into", "that", "this", "research",
    "postgraduate", "systems", "system", "design", "study", "using", "about",
    "which", "their", "they", "have", "will", "been", "this", "that",
  ]);
  const vectorize = (text) => {
    const vector = new Map();
    for (const word of String(text || "").toLowerCase().match(/[a-z0-9]+/g) || []) {
      if (word.length <= 2 || stopWords.has(word)) continue;
      vector.set(word, (vector.get(word) || 0) + 1);
    }
    return vector;
  };
  const researchVector = vectorize(studentText);
  const expertiseVector = vectorize(expertiseText);
  if (!researchVector.size || !expertiseVector.size) return 0;
  let dotProduct = 0;
  let researchMagnitude = 0;
  let expertiseMagnitude = 0;
  for (const [word, frequency] of researchVector) {
    researchMagnitude += frequency ** 2;
    dotProduct += frequency * (expertiseVector.get(word) || 0);
  }
  for (const frequency of expertiseVector.values()) {
    expertiseMagnitude += frequency ** 2;
  }
  const cosine = dotProduct / Math.sqrt(researchMagnitude * expertiseMagnitude);
  return Math.round(cosine * 100);
}

function upsertDraftReview(store, draft) {
  const reviews = store.collections.reviews;
  const existing = reviews.find((item) => item.draftId === draft.id);
  const review = {
    id: existing?.id || `review-${draft.id}`,
    draftId: draft.id,
    title: `${draft.title} · ${draft.owner || "Student"}`,
    subtitle: draft.subtitle || "New submission",
    description: draft.description || "New draft submitted for supervisor review.",
    status: "Awaiting review",
    owner: "Dr. Amina Yusuf",
    updatedAt: draft.updatedAt,
  };
  if (existing) Object.assign(existing, review);
  else reviews.unshift(review);
}

function syncDraftReview(store, draft) {
  const review = store.collections.reviews.find((item) => item.draftId === draft.id);
  if (!review) return;
  review.status = draft.status;
  review.updatedAt = draft.updatedAt;
}

function syncReviewDecision(store, review) {
  if (!review.draftId) return;
  const draft = store.collections.drafts.find((item) => item.id === review.draftId);
  if (!draft) return;
  if (["Revision required", "Reviewed", "Approved"].includes(review.status)) {
    draft.status = review.status;
    draft.updatedAt = review.updatedAt;
    const comment = review.comment || review.description || "";
    const supervisor = store.users.find((user) => user.name === review.owner);
    store.collections.feedback.unshift({
      id: `feedback-${review.id}-${Date.now()}`,
      draftId: draft.id,
      supervisorId: supervisor?.id || "",
      comment,
      createdAt: review.updatedAt,
      owner: review.owner,
    });
    trackProgress(store, draft, `Draft ${review.status.toLowerCase()}`, review.status, review.updatedAt);
    store.collections.notifications.unshift({
      id: `notification-${review.id}-${Date.now()}`,
      title: `Feedback received on ${draft.title}`,
      subtitle: "Supervisor review · Just now",
      description: comment || "A supervisor has updated the review decision.",
      status: "Unread",
      owner: draft.owner,
      updatedAt: "Just now",
    });
  }
}
