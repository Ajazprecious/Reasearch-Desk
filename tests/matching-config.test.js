import assert from "node:assert/strict";
import { test } from "node:test";
import { GEMINI_MODEL } from "../src/lib/ai-model.js";
import { MATCHING_DEFAULTS, modelLabel, normaliseConfig } from "../src/lib/matching-config.js";

test("matching defaults to Gemini 3.8 Flash", () => {
  assert.equal(MATCHING_DEFAULTS.provider, "gemini");
  assert.equal(MATCHING_DEFAULTS.model, GEMINI_MODEL);
  assert.equal(modelLabel(), "Legacy local");
});

test("legacy local matching settings migrate to Gemini without losing tuned weights", () => {
  const config = normaliseConfig({
    id: "matching-config-1",
    provider: "local",
    model: "tfidf-cosine",
    embedding_model: "local-keyword-vector",
    embedding_dimensions: 384,
    capacity_weight: 0.2,
  });

  assert.equal(config.provider, "gemini");
  assert.equal(config.model, GEMINI_MODEL);
  assert.equal(config.capacity_weight, 0.2);
  assert.equal("embedding_model" in config, false);
  assert.equal("embedding_dimensions" in config, false);
});
