import { GEMINI_MODEL, GEMINI_MODEL_LABEL } from "./ai-model.js";

// Shared between the Gemini matching settings screen and recommendation service
// function, so the numbers an administrator tunes are the numbers the matcher uses.

export const MATCHING_DEFAULTS = {
  engine_enabled: true,
  provider: "gemini",
  model: GEMINI_MODEL,
  similarity_weight: 0.55,
  capacity_weight: 0.1,
  department_boost: 0.04,
  level_boost: 0.03,
  min_score: 25,
  top_matches: 3,
  auto_run: true,
};

export const MODEL_OPTIONS = [{ value: GEMINI_MODEL, label: GEMINI_MODEL_LABEL }];

export const modelLabel = (value) =>
  MODEL_OPTIONS.find((option) => option.value === value)?.label ||
  (value === "tfidf-cosine" ? "Legacy local TF-IDF" : value || "Legacy local");

/** Merges a stored configuration record over the defaults, ignoring empty cells. */
export function normaliseConfig(record) {
  if (!record) return { ...MATCHING_DEFAULTS };
  const stored = Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
  delete stored.embedding_model;
  delete stored.embedding_dimensions;
  return {
    ...MATCHING_DEFAULTS,
    ...stored,
    provider: "gemini",
    model: GEMINI_MODEL,
    id: record.id,
  };
}