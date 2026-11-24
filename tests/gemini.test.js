import assert from "node:assert/strict";
import { test } from "node:test";
import { generateGeminiJson, generateGeminiJsonWithModel, generateGeminiText } from "../server/gemini.js";
import { GEMINI_MODEL, GEMINI_FALLBACK_MODEL } from "../src/lib/ai-model.js";

function restoreGeminiKey(t) {
  const previous = process.env.GEMINI_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  });
}
const ok = (text) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
const failure = (status, message) => ({ ok: false, status, json: async () => ({ error: { message } }) });

test("Gemini requests fail explicitly when the server key is missing", async (t) => {
  restoreGeminiKey(t);
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(generateGeminiText({ system: "test", prompt: "test" }), /Set GEMINI_API_KEY/);
});

test("Gemini JSON calls use the configured primary model and server-side key", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`);
    assert.equal(options.headers["x-goog-api-key"], "test-gemini-key");
    assert.equal(JSON.parse(options.body).generationConfig.responseMimeType, "application/json");
    return ok('{"matches":[]}');
  });
  assert.deepEqual(await generateGeminiJson({ system: "test", prompt: "test" }), { matches: [] });
});

test("Gemini API errors are surfaced without exposing the API key", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  t.mock.method(globalThis, "fetch", async () => failure(403, "Invalid key: test-gemini-key"));
  await assert.rejects(generateGeminiText({ system: "test", prompt: "test" }), (error) => {
    assert.match(error.message, /403/);
    assert.match(error.message, /\[redacted\]/);
    assert.doesNotMatch(error.message, /test-gemini-key/);
    return true;
  });
});

test("503 retries primary and succeeds with the configured fallback model", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  const urls=[];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(String(url));
    if (String(url).includes(GEMINI_MODEL)) return failure(503, "high demand");
    return ok('{"answer":"fallback worked"}');
  });
  const result = await generateGeminiJsonWithModel({ system: "test", prompt: "test" });
  assert.deepEqual(result.data, { answer: "fallback worked" });
  assert.equal(result.model, GEMINI_FALLBACK_MODEL);
  assert.equal(urls.filter((url) => url.includes(GEMINI_MODEL)).length, 3);
  assert.equal(urls.filter((url) => url.includes(GEMINI_FALLBACK_MODEL)).length, 1);
});

test("fallback is not attempted for permanent authentication errors", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  let calls=0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; return failure(403, "forbidden"); });
  await assert.rejects(generateGeminiText({ system: "test", prompt: "test" }), /403/);
  assert.equal(calls, 1);
});

test("all-model outage returns a clear safe error", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  t.mock.method(globalThis, "fetch", async () => failure(503, "high demand"));
  await assert.rejects(generateGeminiText({ system: "test", prompt: "test" }), (error) => {
    assert.equal(error.code, "GEMINI_ALL_MODELS_UNAVAILABLE");
    assert.match(error.message, /both configured models/);
    return true;
  });
});
