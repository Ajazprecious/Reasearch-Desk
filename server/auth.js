import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dataDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../data");
function loadSecret(environmentName, filename) {
  if (process.env[environmentName]) return process.env[environmentName];
  mkdirSync(dataDirectory, { recursive: true });
  const path = resolve(dataDirectory, filename);
  try { return readFileSync(path, "utf8").trim(); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const value = randomBytes(32).toString("hex");
  try { writeFileSync(path, value, { flag: "wx", mode: 0o600 }); } catch (error) {
    if (error.code !== "EEXIST") throw error;
    return readFileSync(path, "utf8").trim();
  }
  return value;
}

const secret = loadSecret("SESSION_SECRET", ".session-secret");
export const localServiceKey = loadSecret("LOCAL_API_SERVICE_KEY", ".service-key");
const hashPassword = (password, salt = randomBytes(16).toString("hex")) =>
  `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;

export function verifyPassword(password, stored) {
  if (!stored || typeof password !== "string") return false;
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function makePasswordHash(password) {
  return hashPassword(password);
}

export function createSessionToken(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, createdAt: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function sessionUserId(request) {
  const value = request.get("authorization") || "";
  const token = value.startsWith("Bearer ") ? value.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Date.now() - data.createdAt > 1000 * 60 * 60 * 24 * 30 ? null : data.userId;
  } catch {
    return null;
  }
}
