// Shared between the local matching settings screen and recommendation service
// function, so the numbers an administrator tunes are the numbers the matcher uses.

export const MATCHING_DEFAULTS = {
  engine_enabled: true,
  provider: "local",
  model: "tfidf-cosine",
  embedding_model: "local-keyword-vector",
  embedding_dimensions: 384,
  similarity_weight: 0.55,
  capacity_weight: 0.1,
  department_boost: 0.04,
  level_boost: 0.03,
  min_score: 25,
  top_matches: 3,
  auto_run: true,
};

export const MODEL_OPTIONS = [
  { value: "tfidf-cosine", label: "Deterministic TF-IDF cosine" },
];

export const EMBEDDING_OPTIONS = [
  { value: "local-keyword-vector", label: "Local keyword vector · 384d", dimensions: 384 },
];

export const modelLabel = (value) => MODEL_OPTIONS.find((option) => option.value === value)?.label || value || "Deterministic TF-IDF cosine";

export const embeddingLabel = (value) =>
  EMBEDDING_OPTIONS.find((option) => option.value === value)?.label || value || "Local keyword vector · 384d";

/** Merges a stored configuration record over the defaults, ignoring empty cells. */
export function normaliseConfig(record) {
  if (!record) return { ...MATCHING_DEFAULTS };
  const stored = Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
  return { ...MATCHING_DEFAULTS, ...stored, id: record.id };
}