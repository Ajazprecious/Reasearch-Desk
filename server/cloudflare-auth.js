const textEncoder = new TextEncoder();
const PBKDF2_ITERATIONS = 210_000;

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function requireSessionSecret(env) {
  const secret = String(env.SESSION_SECRET || "").trim();
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

async function signingKey(secret, usage) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

export async function makePasswordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  ));
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") return false;
  const [algorithm, iterationText, saltText, hashText] = stored.split("$");
  const iterations = Number(iterationText);
  if (algorithm !== "pbkdf2_sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) {
    return false;
  }
  try {
    const salt = base64UrlDecode(saltText);
    const expected = base64UrlDecode(hashText);
    const key = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const actual = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      expected.length * 8,
    ));
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function createSessionToken(userId, env) {
  const payload = base64UrlEncode(textEncoder.encode(JSON.stringify({
    userId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })));
  const key = await signingKey(requireSessionSecret(env), ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload)));
  return `${payload}.${base64UrlEncode(signature)}`;
}

export async function sessionUserId(request, env) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const key = await signingKey(requireSessionSecret(env), ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      textEncoder.encode(payload),
    );
    if (!valid) return null;
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (typeof decoded.userId !== "string" || decoded.expiresAt < Date.now()) return null;
    return decoded.userId;
  } catch (error) {
    if (error?.message?.startsWith("SESSION_SECRET")) throw error;
    return null;
  }
}

export async function createFileToken(key, env) {
  const payload = base64UrlEncode(textEncoder.encode(JSON.stringify({
    key,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })));
  const signing = await signingKey(requireSessionSecret(env), ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", signing, textEncoder.encode(payload)));
  return `${payload}.${base64UrlEncode(signature)}`;
}

export async function verifyFileToken(token, env) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  try {
    const key = await signingKey(requireSessionSecret(env), ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      textEncoder.encode(payload),
    );
    if (!valid) return null;
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    return typeof decoded.key === "string" && decoded.expiresAt >= Date.now() ? decoded.key : null;
  } catch (error) {
    if (error?.message?.startsWith("SESSION_SECRET")) throw error;
    return null;
  }
}
