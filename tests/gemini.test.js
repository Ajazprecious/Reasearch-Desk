import assert from "node:assert/strict";
import { test } from "node:test";
import { generateGeminiJson, generateGeminiText } from "../server/gemini.js";
import { GEMINI_MODEL } from "../src/lib/ai-model.js";

function restoreGeminiKey(t) {
  const previous = process.env.GEMINI_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  });
}

test("Gemini requests fail explicitly when the server key is missing", async (t) => {
  restoreGeminiKey(t);
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(generateGeminiText({ system: "test", prompt: "test" }), /Set GEMINI_API_KEY/);
});

test("Gemini JSON calls use the configured model and server-side API key", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`);
    assert.equal(options.headers["x-goog-api-key"], "test-gemini-key");
    const request = JSON.parse(options.body);
    assert.equal(request.generationConfig.responseMimeType, "application/json");
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"matches":[]}' }] } }] }),
    };
  });

  assert.deepEqual(await generateGeminiJson({ system: "test", prompt: "test" }), { matches: [] });
});

test("Gemini API errors are surfaced without exposing the API key", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: { message: "Invalid key: test-gemini-key" } }),
  }));

  await assert.rejects(generateGeminiText({ system: "test", prompt: "test" }), (error) => {
    assert.match(error.message, /403/);
    assert.match(error.message, /\[redacted\]/);
    assert.doesNotMatch(error.message, /test-gemini-key/);
    return true;
  });
});

test("Gemini overloaded responses are classified for local fallback", async (t) => {
  restoreGeminiKey(t);
  process.env.GEMINI_API_KEY = "test-gemini-key";
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: { message: "The model is currently experiencing high demand." } }),
  }));

  await assert.rejects(generateGeminiText({ system: "test", prompt: "test" }), (error) => {
    assert.equal(error.status, 503);
    assert.equal(error.code, "GEMINI_OVERLOADED");
    return true;
  });
});
